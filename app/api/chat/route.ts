import { NextRequest } from "next/server";

import { buildFallbackAnswer, buildDisabledAnswer } from "@/lib/chat/fallback";
import { checkInput, checkOutput, normalizeTypography, stripSlop, UNKNOWN_REPLY } from "@/lib/chat/guard";
import { generateWithFallback, retryUntilSlotFree, SLOT_RELEASE_MS } from "@/lib/chat/models";
import { buildMessages } from "@/lib/chat/prompt";
import { isProviderConfigured } from "@/lib/chat/provider";
import { clientKey, releaseSlot, takeSlot } from "@/lib/chat/ratelimit";
import { renderContext, retrieve } from "@/lib/chat/retrieve";
import { buildStructuredAnswer, buildFromRetrieval, detectStructuredIntent } from "@/lib/chat/structured";

/**
 * Endpoint chat.
 *
 * Selalu mengembalikan jawaban yang bisa ditampilkan, dalam tiga bentuk:
 *
 * 1. LLM berhasil  -> teks jawaban + daftar sumber.
 * 2. LLM gagal     -> jawaban deterministik dari hasil retrieval.
 * 3. Ditolak guard -> pesan penolakan (tanpa memanggil LLM, hemat kuota).
 *
 * Respons memakai NDJSON (satu objek JSON per baris) dan bukan SSE
 * `text/event-stream`, supaya pembacaan di peramban cukup dengan
 * readline pada body tanpa pustaka tambahan.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

interface Body {
    message?: string;
    history?: { role: "user" | "assistant"; content: string }[];
}

function json(payload: unknown, status: number, headers: Record<string, string> = {}) {
    return new Response(JSON.stringify(payload), {
        status,
        headers: { "Content-Type": "application/json", "Cache-Control": "no-store", ...headers },
    });
}

export async function POST(req: NextRequest) {
    let body: Body;
    try {
        body = (await req.json()) as Body;
    } catch {
        return json({ error: "Format permintaan tidak valid." }, 400);
    }

    // --- 1. Penjaga masukan ------------------------------------------------
    const guard = checkInput(body.message ?? "");
    if (!guard.ok) {
        // Penolakan tidak memakai kuota LLM sama sekali.
        return json({ answer: guard.reply, sources: [], reason: guard.reason, model: null }, 200);
    }

    if (process.env.CHAT_ENABLED === "false") {
        const off = buildDisabledAnswer();
        return json({ answer: normalizeTypography(off.answer), sources: [], reason: "disabled", model: null }, 200);
    }

    // --- 2. Batas pemakaian ----------------------------------------------
    const decision = takeSlot(clientKey(req));
    if (!decision.allowed) {
        const message =
            decision.reason === "daily_limit"
                ? "Pemandu digital sudah mencapai batas harian. Anda tetap bisa menjelajahi halaman situs, atau menghubungi pengelola lewat halaman Kontak."
                : decision.reason === "busy"
                    ? "Pemandu digital sedang melayani pengunjung lain. Coba lagi sebentar lagi."
                    : "Terlalu banyak pertanyaan dalam waktu singkat. Mohon tunggu sebentar, ya.";
        return json(
            { answer: message, sources: [], reason: decision.reason, model: null },
            200,
            { "Retry-After": String(decision.retryAfterSeconds) }
        );
    }

    try {
        const question = body.message ?? "";

        // --- 3a. Pertanyaan berpola (daftar, harga, terbaru) -----------------
        //
        // Dijawab langsung dari indeks, TANPA LLM. Alasannya bukan sekadar
        // hemat kuota: pertanyaan seperti "destinasi apa saja?" harus lengkap
        // dan urut, sedangkan model free sering memotong daftar jadi 3 item
        // dan menyertakan data yang tidak ditanyakan. Lihat lib/chat/structured.ts.
        const structuredKind = detectStructuredIntent(question);
        if (structuredKind) {
            const structured = buildStructuredAnswer(question, structuredKind);
            if (structured) {
                return json(
                    {
                        answer: normalizeTypography(stripSlop(structured.answer)),
                        sources: structured.sources,
                        reason: "structured",
                        model: null,
                        structured: structured.kind,
                    },
                    200
                );
            }
        }

        // --- 3b. Ambil konteks ---------------------------------------------
        const result = retrieve(question);
        const { text: contextText, sources } = renderContext(result);

        // Tidak ada satu pun kartu atau potongan yang cocok: jangan buang
        // kuota untuk pertanyaan yang jelas belum ada datanya.
        if (!result.cards.length && !result.chunks.length) {
            return json({ answer: UNKNOWN_REPLY, sources: [], reason: "no_context", model: null }, 200);
        }

        const messages = buildMessages({
            question,
            context: contextText,
            history: body.history ?? [],
        });

        // --- 4. Panggil LLM dengan fallback ------------------------------
        if (!isProviderConfigured()) {
            const fb = buildFallbackAnswer(result, question);
            return json(
                { answer: normalizeTypography(stripSlop(fb.answer)), sources: fb.sources, reason: "no_api_key", model: null },
                200
            );
        }

        // Budget waktu, bukan sekadar timeout per model.
        //
        // Diukur: deepseek 1,8 s, glm 2,9 s, minimax 8,7 s, sedangkan
        // claude-haiku 10-35 s. Timeout per model 12 detik cukup untuk tiga
        // model tercepat, dan total 30 detik masih di bawah maxDuration 60 s.
        // Rantai bisa berhenti lebih awal saat slot bersamaan sedang dipakai
        // pengunjung lain (lihat retryUntilSlotFree).
        const callOpts = {
            messages,
            maxTokens: 800,
            timeoutMs: 12_000,
            deadlineMs: 22_000,
        };

        let chain = await generateWithFallback(callOpts);

        // Slot bersamaan dipakai pengunjung lain. Menunggu lalu mencoba lagi
        // jauh lebih berguna daripada langsung jatuh ke jawaban tanpa LLM.
        if (chain.slotBusy) {
            console.warn("[chat] slot bersamaan dipakai, menunggu giliran");
            chain = await retryUntilSlotFree(callOpts, SLOT_RELEASE_MS);
        }

        if (chain.exhausted) {
            console.warn(
                "[chat] seluruh model gagal:",
                JSON.stringify(chain.attempts.map((a) => `${a.model}=${a.error}`))
            );
            // Model tidak bisa dipakai (rate limit / kuota / slot bersamaan).
            // Hasil retrieval sudah ada di tangan dan faktanya benar, jadi
            // susun jawaban layak darinya alih-alih menyerahkan format kartu
            // generik kepada pengunjung.
            const dyn = buildFromRetrieval(result, question);
            if (dyn) {
                return json(
                    {
                        answer: normalizeTypography(stripSlop(dyn.answer)),
                        sources: dyn.sources,
                        reason: "all_models_failed",
                        model: null,
                        mode: "structured_fallback",
                    },
                    200
                );
            }
            const fb = buildFallbackAnswer(result, question);
            return json(
                {
                    answer: normalizeTypography(stripSlop(fb.answer)),
                    sources: fb.sources,
                    reason: "all_models_failed",
                    model: null,
                },
                200
            );
        }

        // --- 5. Filter keluaran ------------------------------------------
        //
        // Konteks dikirim ikut diperiksa: setiap angka rupiah/persentase yang
        // diklaim model harus ada di konteks, sehingga harga karangan tertangkap
        // sebelum sampai ke pengunjung.
        const filtered = checkOutput(chain.content, contextText);

        if (!filtered.ok) {
            console.warn(
                `[chat] keluaran ${chain.model} ditolak guard: ${filtered.issues.join(", ")}`
            );
            // JANGAN buang hasil retrieval. Turunkan ke jawaban terstruktur
            // yang dibangun dari data yang sama  -  pengunjung tetap mendapat
            // informasi benar, hanya tanpa gaya bahasa model.
            const dyn = buildFromRetrieval(result, question);
            if (dyn) {
                return json(
                    {
                        answer: normalizeTypography(stripSlop(dyn.answer)),
                        sources: dyn.sources,
                        reason: "output_rejected",
                        model: chain.model,
                        mode: "structured_fallback",
                        issues: filtered.issues,
                    },
                    200
                );
            }
            return json(
                { answer: UNKNOWN_REPLY, sources, reason: "output_rejected", model: chain.model, issues: filtered.issues },
                200
            );
        }

        return json(
            {
                answer: filtered.cleaned,
                sources,
                reason: null,
                model: chain.model,
                // Latensi & percobaan berguna untuk memantau kesehatan model
                // tanpa menyimpan isi percakapan.
                attempts: chain.attempts.length,
            },
            200
        );
    } finally {
        releaseSlot();
    }
}

/** Status ringkas untuk pemeriksaan manual; tidak membuka data pribadi. */
export async function GET() {
    const [{ getModelStatus }, { getLimitStatus }, { buildIndex }] = await Promise.all([
        import("@/lib/chat/models"),
        import("@/lib/chat/ratelimit"),
        import("@/lib/chat/index"),
    ]);

    const index = buildIndex();
    return json(
        {
            enabled: process.env.CHAT_ENABLED !== "false",
            providerConfigured: isProviderConfigured(),
            index: {
                cards: index.cards.length,
                chunks: index.chunks.length,
                builtAt: index.builtAt,
            },
            models: getModelStatus(),
            limits: getLimitStatus(),
        },
        200
    );
}
