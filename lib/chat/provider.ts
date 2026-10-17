import "server-only";

/**
 * Klien HTTP untuk penyedia LLM (OpenAI-compatible).
 *
 * Berkas ini menangani dua perilaku penyedia yang ditemukan lewat pengujian
 * langsung dan TIDAK terdokumentasi. Tanpa penanganan ini, sebagian besar model
 * gratis tampak "mati" padahal hidup:
 *
 * 1. Body respons selalu diakhiri `data: [DONE]` meskipun `stream` tidak
 *    diminta. `JSON.parse` mentah akan gagal dengan pesan
 *    "Invalid JSON primitive: ata: [DONE]".
 *
 * 2. Banyak model gratis adalah model *reasoning*: token habis di
 *    `reasoning_content` sehingga `content` kosong. Dengan `max_tokens` kecil
 *    bahkan "ping" pun mengembalikan string kosong.
 */

export const PROVIDER_URL =
    process.env.LLM_URL?.trim() || "https://openagentic.id/api/v1/chat/completions";

export const PROVIDER_KEY = (() => {
    // Mendukung dua gaya penulisan: URL penuh (dipakai crawler) atau base URL.
    const key = process.env.CHAT_LLM_API_KEY?.trim() || process.env.LLM_API_KEY?.trim() || "";
    return key && !/^ISI_/i.test(key) ? key : "";
})();

export interface ChatMessage {
    role: "system" | "user" | "assistant";
    content: string;
}

export interface CallOptions {
    messages: ChatMessage[];
    /** 700-900 cukup untuk reasoning internal + jawaban singkat. */
    maxTokens?: number;
    temperature?: number;
    timeoutMs?: number;
    signal?: AbortSignal;
    stream?: boolean;
}

export type ProviderErrorKind =
    | "auth"
    | "no_quota"
    | "model_unavailable"
    | "rate_limit"
    /** Semua model berbagi 1 slot bersamaan di plan FREE. */
    | "concurrent"
    | "provider_busy"
    | "timeout"
    | "empty"
    | "network"
    | "unknown";

export class ProviderError extends Error {
    kind: ProviderErrorKind;
    status: number;
    retryAfterSeconds?: number;
    /** Lama request sampai gagal; dipakai memutuskan penalti cooldown. */
    elapsedMs?: number;

    constructor(
        kind: ProviderErrorKind,
        message: string,
        status = 0,
        retryAfter?: number,
        elapsedMs?: number
    ) {
        super(message);
        this.name = "ProviderError";
        this.kind = kind;
        this.status = status;
        this.retryAfterSeconds = retryAfter;
        this.elapsedMs = elapsedMs;
    }
}

/**
 * Buang ekor `data: [DONE]` lalu ambil objek JSON pertama yang seimbang.
 * Penyedia kadang mengirim beberapa potongan; kita hanya perlu yang pertama
 * berisi `choices`.
 */
export function extractJson(body: string): unknown {
    let text = body;

    const done = text.indexOf("data: [DONE]");
    if (done >= 0) text = text.slice(0, done);

    // Kalau isinya potongan SSE "data: {...}", ambil objeknya saja.
    text = text.replace(/^\s*data:\s*/gm, "").trim();

    try {
        return JSON.parse(text);
    } catch {
        // Cari objek JSON seimbang pertama.
        const start = text.indexOf("{");
        if (start < 0) throw new Error("Respons bukan JSON");
        let depth = 0;
        let inStr = false;
        let esc = false;
        for (let i = start; i < text.length; i++) {
            const ch = text[i];
            if (inStr) {
                if (esc) esc = false;
                else if (ch === "\\") esc = true;
                else if (ch === '"') inStr = false;
                continue;
            }
            if (ch === '"') inStr = true;
            else if (ch === "{") depth++;
            else if (ch === "}") {
                depth--;
                if (depth === 0) return JSON.parse(text.slice(start, i + 1));
            }
        }
        throw new Error("JSON tidak lengkap");
    }
}

function classify(status: number, code: string, message: string): ProviderErrorKind {
    // Penyedia membungkus galat upstream dengan status 503 + kode 402.
    if (code === "no_provider_under_bid") return "provider_busy";

    // Plan FREE hanya mengizinkan 1 request bersamaan untuk SEMUA model.
    // Galat ini berbeda dari batas per-menit dan harus dipisahkan, karena
    // masa tunggunya pendek (request sebelumnya harus selesai) dan menyebut
    // model mana pun tidak akan berhasil selama slot masih terpakai.
    if (/request\s+bersamaan|concurrent|parallel/i.test(message)) return "concurrent";

    if (status === 401) return "auth";
    if (status === 402) return "no_quota";
    if (status === 403) return "model_unavailable";
    if (status === 429) return "rate_limit";
    if (status >= 500) return "provider_busy";
    if (/rate limit/i.test(message)) return "rate_limit";
    if (/quota/i.test(message)) return "no_quota";
    if (/not available for your plan/i.test(message)) return "model_unavailable";
    return "unknown";
}

interface ProviderPayload {
    error?: { message?: string; code?: string; type?: string };
    choices?: {
        message?: { content?: string | null; reasoning_content?: string | null };
        finish_reason?: string;
    }[];
    model?: string;
    usage?: Record<string, number>;
}

async function postOnce(model: string, opts: CallOptions): Promise<{
    content: string;
    finishReason: string;
    usage?: Record<string, number>;
}> {
    if (!PROVIDER_KEY) {
        throw new ProviderError(
            "auth",
            "Kunci API belum diatur (CHAT_LLM_API_KEY / LLM_API_KEY)."
        );
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), opts.timeoutMs ?? 25_000);
    if (opts.signal) {
        opts.signal.addEventListener("abort", () => controller.abort(), { once: true });
    }
    const startedAt = Date.now();

    let res: Response;
    try {
        res = await fetch(PROVIDER_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${PROVIDER_KEY}`,
                "User-Agent": "VisitBantaragungChat/1.0",
            },
            body: JSON.stringify({
                model,
                messages: opts.messages,
                max_tokens: opts.maxTokens ?? 800,
                temperature: opts.temperature ?? 0.4,
                // Wajib: tanpa ini model reasoning membalas kosong.
                enable_thinking: false,
            }),
            signal: controller.signal,
        });
    } catch (err) {
        const aborted = (err as Error)?.name === "AbortError";
        throw new ProviderError(
            "timeout",
            aborted ? `Model ${model} melewati batas waktu` : `Gagal menghubungi penyedia: ${(err as Error).message}`,
            0,
            undefined,
            Date.now() - startedAt
        );
    } finally {
        clearTimeout(timeout);
    }

    const raw = await res.text();
    const elapsed = Date.now() - startedAt;
    let payload: ProviderPayload;
    try {
        payload = extractJson(raw) as ProviderPayload;
    } catch {
        throw new ProviderError(
            res.ok ? "unknown" : classify(res.status, "", ""),
            `Respons tidak dapat dibaca (status ${res.status})`,
            res.status,
            undefined,
            elapsed
        );
    }

    if (!res.ok || payload.error) {
        const msg = payload.error?.message ?? `HTTP ${res.status}`;
        const code = payload.error?.code ?? payload.error?.type ?? "";
        const kind = classify(res.status, code, msg);
        const retry = Number(res.headers.get("retry-after")) || undefined;
        throw new ProviderError(kind, msg, res.status, retry, elapsed);
    }

    const choice = payload.choices?.[0];
    const content = (choice?.message?.content ?? "").trim();

    if (!content) {
        const reasoning = choice?.message?.reasoning_content ?? "";
        throw new ProviderError(
            "empty",
            reasoning
                ? `Model hanya mengirim reasoning (${reasoning.length} karakter), jawaban kosong`
                : "Model membalas kosong",
            0,
            undefined,
            elapsed
        );
    }

    return {
        content,
        finishReason: choice?.finish_reason ?? "stop",
        usage: payload.usage,
    };
}

/**
 * Panggil satu model. Galat dari penyedia diterjemahkan menjadi ProviderError
 * dengan `kind` yang bisa diputuskan oleh lapisan fallback.
 */
export async function callModel(model: string, opts: CallOptions) {
    return postOnce(model, opts);
}

/** Apakah chatbot punya kunci untuk memanggil penyedia. */
export function isProviderConfigured(): boolean {
    return Boolean(PROVIDER_KEY);
}
