import "server-only";

import { ProviderError, callModel, type CallOptions, type ProviderErrorKind } from "@/lib/chat/provider";

/**
 * Rantai fallback model.
 *
 * Urutan di bawah diambil dari pengujian langsung terhadap 8 model gratis
 * penyedia (lihat docs/CHATBOT-PLAN.md bagian 3.1), bukan dari dokumentasi, karena
 * dokumentasi dan halaman beranda penyedia menyebut daftar model yang berbeda.
 *
 * Aturan yang penting untuk dipahami:
 *
 * - `space-bunny-free` masuk daftar hitam. Saat diuji, teks keluarannya rusak
 *   ("untukploitation", "antiduzi"). Jawaban rusak lebih berbahaya daripada
 *   tidak menjawab. Model yang sama saat ini dipakai crawler berita sebagai
 *   cadangan, sehingga teks rusak berpotensi tersimpan ke content/  -  lihat
 *   catatan di docs/CHATBOT-PLAN.md.
 * - `minimax-m3` juga diblokir: sesekali butuh 65 detik dan membuat pengunjung
 *   menunggu tanpa batas.
 * - `gemini-4-argon` belum berfungsi (503 no_provider_under_bid) tetapi tetap
 *   dicoba berkala karena statusnya bisa berubah kapan saja.
 */

export type ModelTier = "primary" | "secondary" | "probation";

export interface ModelConfig {
    id: string;
    tier: ModelTier;
}

function listEnv(name: string, fallback: string[]): string[] {
    const raw = process.env[name];
    if (!raw) return fallback;
    return raw
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
}

/**
 * Urutan model.
 *
 * Prinsip yang dipakai: **pakai model yang benar-benar bisa diakses**, bukan
 * model bertingkat atas yang ketersediaannya berubah-ubah. Penyedia mengganti
 * daftar model gratis setiap hari dan mencabut status free tanpa pemberitahuan,
 * sehingga model "paling pintar" sering justru tidak bisa dipakai.
 *
 * Semua di bawah hasil pengukuran langsung, bukan dokumentasi:
 *
 *   deepseek-v4.1-flash-free    1,8 - 2,2 detik   STABIL, dipakai terus
 *   glm-5.3-flash-free          2,9 - 4,5 detik   STABIL, dipakai terus
 *   minimax-m3.1-flash-preview  2,1 - 8,7 detik   stabil, kadang token cacat
 *   claude-haiku-5.5-free      10,2 - 35,5 detik  sering lewat batas waktu
 *   gemini-4-argon            503 no_provider_under_bid
 *   space-bunny-free          keluar teks rusak
 *   muse-spark-1.3-free       model_not_available (dicabut dari plan free)
 *
 * Rantai sengaja dibatasi pada TIGA model yang terukur stabil. Model keempat
 * dan seterusnya hanya menambah percobaan yang gagal, dan pada plan FREE yang
 * hanya memberi 1 request bersamaan, setiap percobaan gagal ikut menahan slot.
 *
 * Model yang dicabut penyedia tidak dihapus dari kemungkinan: masukkan ke
 * PROBATION agar tetap dicoba berkala (1x/jam) dan otomatis naik bila pulih.
 */
export const MODEL_DENYLIST: string[] = listEnv("CHAT_MODELS_DENYLIST", [
    "space-bunny-free", // keluaran rusak: "untukploitation", "antiduzi"
    "minimax-m3", // pernah 65 detik
    "mimo-v2.6-flash", // 7-11 detik
    "claude-haiku-5.5-free", // 10-35 detik; terlalu lambat untuk 1 slot bersamaan
    "muse-spark-1.3-free", // model_not_available di plan free
]);

export function getModelChain(): ModelConfig[] {
    const primary = listEnv("CHAT_MODELS_PRIMARY", [
        "deepseek-v4.1-flash-free",
        "glm-5.3-flash-free",
    ]);
    const secondary = listEnv("CHAT_MODELS_SECONDARY", ["minimax-m3.1-flash-preview"]);
    // Dicoba paling sering sekali sejam: bila penyedia mengaktifkannya lagi,
    // model ini otomatis ikut dipakai tanpa deploy ulang.
    const probation = listEnv("CHAT_MODELS_PROBATION", [
        "claude-haiku-5.5-free",
        "gemini-4-argon",
    ]);

    return [
        ...primary.map((id) => ({ id, tier: "primary" as const })),
        ...secondary.map((id) => ({ id, tier: "secondary" as const })),
        ...probation.map((id) => ({ id, tier: "probation" as const })),
    ].filter((m) => !MODEL_DENYLIST.includes(m.id));
}

interface Health {
    fails: number;
    cooldownUntil: number;
    lastLatencyMs: number;
    lastError?: string;
    lastOkAt?: number;
}

/**
 * Status kesehatan model disimpan di memori proses.
 *
 * Di serverless ada beberapa instance function, jadi status ini tidak
 * terbagi antar-instance. Itu dapat diterima: tujuannya menekan panggilan
 * berulang ke model yang sedang bermasalah, bukan penghitungan yang presisi.
 */
const health = new Map<string, Health>();

function getHealth(id: string): Health {
    let h = health.get(id);
    if (!h) {
        h = { fails: 0, cooldownUntil: 0, lastLatencyMs: 0 };
        health.set(id, h);
    }
    return h;
}

/** Lama cooldown berdasarkan jenis galat. */
/**
 * Galat yang BUKAN kesalahan model, sehingga tidak boleh membuat model
 * dihukum cooldown.
 *
 * `concurrent` berarti slot bersamaan penyedia sedang dipakai  -  model yang
 * dituju bisa saja sehat. Sebelum perbaikan ini, satu galat `concurrent`
 * membuat model dikeluarkan selama 30 detik, sehingga model terbaik hilang
 * dari rantai hanya karena pengunjung lain lebih dulu memakai slot. Inilah
 * sebab model utama "menghilang" dan bot terus jatuh ke model yang lebih lemah.
 */
function isNotModelFault(kind: ProviderErrorKind): boolean {
    return kind === "concurrent";
}

function cooldownFor(err: ProviderError): number {
    switch (err.kind) {
        case "auth":
            return 60 * 60 * 1000; // Salah kunci: hampir semua model akan gagal juga.
        case "no_quota":
            return 24 * 60 * 60 * 1000; // Kuota harian habis.
        case "model_unavailable":
            return 30 * 24 * 60 * 60 * 1000; // Tidak tersedia untuk plan.
        case "rate_limit":
            return err.retryAfterSeconds ? err.retryAfterSeconds * 1000 : 60_000;
        case "concurrent":
            // Tidak pernah dipakai: lihat isNotModelFault. Nilai kecil hanya
            // jaring pengaman bila jalur ini tidak sengaja terpakai.
            return 1_000;
        case "provider_busy":
            // Penyedia menyisipkan "reset after 2m" di pesannya.
            return 2 * 60 * 1000;
        case "empty":
            return 10 * 60 * 1000;
        case "timeout": {
            // Penalti sebanding dengan berapa lama request menggantung.
            const elapsed = err.elapsedMs ?? 0;
            return elapsed > 10_000 ? 5 * 60 * 1000 : 45_000;
        }
        default:
            return 60_000;
    }
}

function recordFailure(id: string, err: ProviderError): void {
    if (isNotModelFault(err.kind)) return;
    const h = getHealth(id);
    h.fails += 1;
    h.lastError = `${err.kind}: ${err.message}`;
    h.cooldownUntil = Date.now() + cooldownFor(err);
}

function recordSuccess(id: string, latencyMs: number): void {
    const h = getHealth(id);
    h.fails = 0;
    h.cooldownUntil = 0;
    h.lastLatencyMs = latencyMs;
    h.lastOkAt = Date.now();
}

/** Model probation dicoba paling sering sekali sejam. */
const PROBATION_RETRY_MS = 60 * 60 * 1000;

function isAvailable(model: ModelConfig, now: number): boolean {
    const h = getHealth(model.id);
    if (h.cooldownUntil <= now) return true;
    if (model.tier === "probation" && now - (h.lastOkAt ?? 0) > PROBATION_RETRY_MS) {
        return true;
    }
    return false;
}

export interface ModelAttempt {
    model: string;
    ok: boolean;
    error?: string;
    latencyMs?: number;
}

export interface ChainResult {
    content: string;
    model: string;
    attempts: ModelAttempt[];
    /** true bila seluruh rantai gagal dan pemanggil harus memakai fallback. */
    exhausted: boolean;
}

/**
 * Coba model satu per satu sampai ada yang berhasil.
 *
 * Model diurutkan: utama dulu, lalu sekunder, lalu probation. Model yang
 * sedang cooldown dilewati, kecuali bila semuanya cooldown.
 *
 * PERILAKU PENYEDIA YANG MENENTUKAN DESAIN INI
 * --------------------------------------------
 * Plan FREE hanya memberi SATU request bersamaan untuk SEMUA model. Hasil
 * pengukuran langsung (lihat docs/CHATBOT-PLAN.md):
 *
 *   - Selama satu request masih berjalan, request lain ke MODEL APA PUN
 *     langsung dijawab "Batas request bersamaan tercapai (1/1)" dalam ~120 ms.
 *   - Slot baru terbuka ~15 detik setelah request sebelumnya berakhir.
 *
 * Konsekuensi: ketika slot terdeteksi sibuk, TIDAK ada gunanya mencoba model
 * berikutnya  -  jawabannya pasti galat yang sama. Percobaan seperti itu justru
 * menghabiskan waktu dan membuat pengunjung menunggu sia-sia. Karena itu:
 *
 *   1. Bila `concurrent`, hentikan rantai dan laporkan `busyUntil` supaya
 *      lapisan API bisa MENUNGGU slot lalu mencoba ulang, bukan berpindah model.
 *   2. Timeout dihitung lebih pendek dari jendela slot (12 detik, di bawah
 *      ~15 detik), agar request yang menggantung tidak menahan pengunjung
 *      terlalu lama dan masih ada sisa waktu untuk mencoba lagi.
 */
export const SLOT_RELEASE_MS = 16_000;

export interface ChainResult {
    content: string;
    model: string;
    attempts: ModelAttempt[];
    /** true bila seluruh rantai gagal dan pemanggil harus memakai fallback. */
    exhausted: boolean;
    /** true bila kegagalan terakhir karena slot bersamaan masih dipakai. */
    slotBusy?: boolean;
}

export async function generateWithFallback(
    opts: CallOptions & { deadlineMs?: number }
): Promise<ChainResult> {
    const now = Date.now();
    const chain = getModelChain();
    const attempts: ModelAttempt[] = [];

    let candidates = chain.filter((m) => isAvailable(m, now));
    if (!candidates.length) candidates = chain;

    const deadline = Date.now() + (opts.deadlineMs ?? 40_000);

    for (let i = 0; i < candidates.length; i++) {
        const model = candidates[i];
        if (Date.now() >= deadline) {
            attempts.push({ model: model.id, ok: false, error: "deadline tercapai" });
            continue;
        }
        const started = Date.now();
        try {
            const res = await callModel(model.id, {
                ...opts,
                timeoutMs: Math.min(
                    opts.timeoutMs ?? 20_000,
                    Math.max(5_000, deadline - Date.now())
                ),
            });
            recordSuccess(model.id, Date.now() - started);
            attempts.push({ model: model.id, ok: true, latencyMs: Date.now() - started });
            return { content: res.content, model: model.id, attempts, exhausted: false };
        } catch (err) {
            const e = err instanceof ProviderError ? err : new ProviderError("unknown", String(err));
            recordFailure(model.id, e);
            attempts.push({
                model: model.id,
                ok: false,
                error: `${e.kind}: ${e.message}`,
                latencyMs: Date.now() - started,
            });

            // Kunci salah: tidak ada gunanya mencoba model lain.
            if (e.kind === "auth") break;

            // Slot bersamaan masih dipakai: berhenti. Mencoba model lain pasti
            // mendapat galat yang sama (terbukti lewat pengukuran).
            if (e.kind === "concurrent") {
                return { content: "", model: "", attempts, exhausted: true, slotBusy: true };
            }
        }
    }

    return { content: "", model: "", attempts, exhausted: true };
}

function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Satu kali upaya ke satu model, tanpa menyentuh status kesehatan. */
async function tryOne(modelId: string, opts: CallOptions) {
    return callModel(modelId, opts);
}

/**
 * Tunggu hingga slot bersamaan benar-benar bebas, lalu coba lagi.
 *
 * Hasil pengukuran menunjukkan slot tidak terbuka pada waktu yang pasti:
 * setelah request macet ditutup, slot masih terkunci dan baru lepas sekitar
 * 15 detik kemudian. Karena itu menunggu sekali dengan durasi tetap tidak
 * cukup  -  diuji, retry 16 detik tetap mendapat `concurrent`.
 *
 * Strategi di sini: coba, bila masih `concurrent` tunggu lebih lama, ulangi,
 * sampai batas waktu `budgetMs`. Model yang dicoba saat retry adalah model
 * sehat pertama yang tersedia, bukan selalu model yang sama.
 */
export async function retryUntilSlotFree(
    opts: CallOptions & { deadlineMs?: number },
    budgetMs = 18_000
): Promise<ChainResult> {
    const attempts: ModelAttempt[] = [];
    const stopAt = Date.now() + budgetMs;
    const waits = [3_000, 5_000, 8_000];
    let round = 0;

    while (Date.now() < stopAt) {
        const chain = getModelChain();
        const now = Date.now();
        const available = chain.filter((m) => isAvailable(m, now));
        const target = available[0] ?? chain[0];
        if (!target) break;

        const started = Date.now();
        try {
            const res = await tryOne(target.id, {
                ...opts,
                timeoutMs: Math.min(opts.timeoutMs ?? 9_000, Math.max(4_000, stopAt - Date.now())),
            });
            recordSuccess(target.id, Date.now() - started);
            attempts.push({ model: target.id, ok: true, latencyMs: Date.now() - started });
            return { content: res.content, model: target.id, attempts, exhausted: false };
        } catch (err) {
            const e = err instanceof ProviderError ? err : new ProviderError("unknown", String(err));
            attempts.push({
                model: target.id,
                ok: false,
                error: `${e.kind}: ${e.message}`,
                latencyMs: Date.now() - started,
            });

            if (e.kind !== "concurrent") {
                // Bukan soal slot: catat status dan biarkan pemanggil memutuskan.
                recordFailure(target.id, e);
                return { content: "", model: "", attempts, exhausted: true };
            }
            // `concurrent` bukan kesalahan model, jadi statusnya tidak dihukum.
        }

        const wait = waits[Math.min(round, waits.length - 1)];
        round++;
        if (Date.now() + wait >= stopAt) break;
        await sleep(wait);
    }

    return { content: "", model: "", attempts, exhausted: true, slotBusy: true };
}

/** Ringkasan status untuk dasbor admin dan pengujian. */
export function getModelStatus() {
    const now = Date.now();
    return getModelChain().map((m) => {
        const h = getHealth(m.id);
        return {
            id: m.id,
            tier: m.tier,
            available: isAvailable(m, now),
            cooldownSeconds: Math.max(0, Math.round((h.cooldownUntil - now) / 1000)),
            fails: h.fails,
            lastLatencyMs: h.lastLatencyMs,
            lastError: h.lastError,
        };
    });
}

/** Hanya untuk pengujian. */
export function resetModelHealthForTests(): void {
    health.clear();
}
