import { NextRequest } from "next/server";

import { buildFallbackAnswer, buildDisabledAnswer } from "@/lib/chat/fallback";
import { checkInput, checkOutput, normalizeTypography, stripSlop, UNKNOWN_REPLY } from "@/lib/chat/guard";
import { generateWithFallback, retryUntilSlotFree, SLOT_RELEASE_MS } from "@/lib/chat/models";
import { buildMessages } from "@/lib/chat/prompt";
import { isProviderConfigured } from "@/lib/chat/provider";
import { clientKey, releaseSlot, takeSlot } from "@/lib/chat/ratelimit";
import { renderContext, retrieve } from "@/lib/chat/retrieve";
import { checkScope } from "@/lib/chat/scope";
import { buildSocialAnswer, detectSocial } from "@/lib/chat/social";
import { findMentionedEntity, type EntityMention } from "@/lib/chat/mention";
import type { EntityCard } from "@/lib/chat/index";
import * as indexModule from "@/lib/chat/index";
import { buildNeedAnswer, detectNeed } from "@/lib/chat/needs";
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

/**
 * Bentuk ringkas entitas untuk kartu pratinjau di widget.
 *
 * Dikirim bersama jawaban agar gelembung chat bisa menampilkan gambar kecil,
 * judul, dan satu fakta utama. Sengaja dibatasi 3 kartu dan tanpa `facts` utuh:
 * cukup untuk tampilan, tanpa membocorkan seluruh isi indeks ke peramban.
 */
interface SourceCard {
    title: string;
    href: string;
    /** Path sampul relatif CDN; kosong bila entitas tidak punya gambar. */
    cover?: string;
    /** Satu kalimat ringkas. */
    summary: string;
    /** Satu fakta paling relevan, mis. "Harga mulai: Rp 15.000 per orang". */
    highlight?: string;
    kind?: string;
}

const HIGHLIGHT_KEYS = [
    "Harga mulai",
    "Harga",
    "Kapasitas",
    "Khasiat",
    "Jam operasional",
    "Fasilitas",
];

/**
 * Kartu untuk jalur terstruktur.
 *
 * Jalur itu tidak memakai `retrieve()`, sehingga tidak punya `result`. Kartu
 * dibangun dengan mencocokkan `href` sumber ke indeks. Hanya diambil 3 pertama
 * agar widget tidak penuh ketika jawabannya berupa daftar panjang.
 */
function toSourceCardsFromSources(
    sources: { n: number; title: string; href: string }[],
    max = 3
): SourceCard[] {
    const { buildIndex } = getIndexModule();
    const cards = buildIndex().cards;
    const out: SourceCard[] = [];
    const seenTitle = new Set<string>();

    for (const src of sources) {
        const card = cards.find((c) => c.href === src.href);
        if (!card) continue;

        const titleKey = card.title.toLowerCase().trim();
        if (seenTitle.has(titleKey)) continue;
        seenTitle.add(titleKey);

        let highlight: string | undefined;
        for (const key of HIGHLIGHT_KEYS) {
            const v = card.facts[key];
            if (v && v.trim()) {
                highlight = `${key}: ${v.length > 90 ? `${v.slice(0, 87)}...` : v}`;
                break;
            }
        }

        out.push({
            title: card.title,
            href: card.href,
            cover: card.cover,
            summary: card.summary.length > 140 ? `${card.summary.slice(0, 137)}...` : card.summary,
            highlight,
            kind: card.kind,
        });
        if (out.length >= max) break;
    }

    return out;
}

/**
 * Akses malas ke modul indeks.
 *
 * `buildIndex` berat (membaca ratusan berkas JSON) dan sudah di-cache di
 * modulnya sendiri, jadi impor statis tidak menambah biaya. Dibungkus fungsi
 * agar berkas route tidak memuat indeks saat modul dievaluasi di tepi
 * (mis. untuk rute yang tidak menyentuh chatbot).
 */
function getIndexModule() {
    return indexModule;
}

/**
 * Entitas yang sedang dibicarakan pada percakapan.
 *
 * Dipakai agar jawaban menyambung: "saya ingin mandi di mana?" setelah
 * membahas Curug Cipeuteuy sebaiknya menyebut Curug lebih dulu, bukan
 * memulai dari nol seolah belum pernah ngobrol.
 *
 * Sumber topik hanya giliran USER. Jawaban bot yang berupa daftar (mis.
 * "destinasi apa saja?") menyebut puluhan nama sekaligus; memeriksanya
 * membuat bot mengira semua tempat itu sedang dibahas, dan giliran lanjutan
 * bisa dijawab tentang tempat yang salah. Deteksi memakai findMentionedEntity
 * supaya salah ketik seperti "curug cipeteuy" tetap dikenali.
 */
function currentTopic(
    history: { role: string; content: string }[],
    mention: EntityMention | null
): EntityCard | null {
    if (mention) return mention.card;
    if (!history.length) return null;

    // Telusuri dari giliran pengguna terbaru ke belakang.
    for (let i = history.length - 1; i >= 0; i--) {
        if (history[i]?.role !== "user") continue;
        const found = findMentionedEntity(String(history[i]?.content ?? ""));
        if (found) return found.card;
    }
    return null;
}

function toSourceCards(result: ReturnType<typeof retrieve>, max = 3): SourceCard[] {
    const out: SourceCard[] = [];
    const seenHref = new Set<string>();
    const seenTitle = new Set<string>();

    for (const { card } of result.cards) {
        if (seenHref.has(card.href)) continue;

        // Entitas yang sama bisa punya dua kartu (mis. destinasi dan titik
        // peta dengan nama identik). Menampilkan keduanya membuat kartu
        // terasa berulang, jadi cukup satu wakil per judul.
        const titleKey = card.title.toLowerCase().trim();
        if (seenTitle.has(titleKey)) continue;

        seenHref.add(card.href);
        seenTitle.add(titleKey);

        let highlight: string | undefined;
        for (const key of HIGHLIGHT_KEYS) {
            const v = card.facts[key];
            if (v && v.trim()) {
                highlight = `${key}: ${v.length > 90 ? `${v.slice(0, 87)}...` : v}`;
                break;
            }
        }

        out.push({
            title: card.title,
            href: card.href,
            cover: card.cover,
            summary: card.summary.length > 140 ? `${card.summary.slice(0, 137)}...` : card.summary,
            highlight,
            kind: card.kind,
        });
        if (out.length >= max) break;
    }

    return out;
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

        // --- 2b. Penjaga cakupan --------------------------------------------
        //
        // Dijalankan SEBELUM retrieval. Tanpa ini, pertanyaan di luar cakupan
        // tetap "dicocokkan" dengan data terdekat dan menghasilkan jawaban
        // yang tampak meyakinkan tetapi tidak relevan, misalnya:
        //   "1 tambah 3 dikurang 2 berapa?" -> daftar 3 destinasi
        //   "elon musk itu siapa?"          -> daftar artikel berita
        //   "harga bawang hari ini"         -> profil toko kelontong
        // Penolakan tidak memakai kuota LLM.
        // Pertanyaan lanjutan mewarisi topik dari giliran sebelumnya, jadi
        // cakupannya dinilai dengan mempertimbangkan riwayat.
        const hasHistory = (body.history ?? []).length > 0;
        const scope = checkScope(question, hasHistory);
        if (!scope.inScope) {
            return json(
                {
                    answer: normalizeTypography(scope.reply),
                    sources: [],
                    reason: `out_of_scope:${scope.reason}`,
                    model: null,
                },
                200
            );
        }

        // --- 2c. Percakapan sosial ------------------------------------------
        //
        // Ucapan terima kasih, pujian, sapaan, dan penutup BUKAN pertanyaan.
        // Kalimat seperti "oke terima kasih sangat membantu informasinya" dulu
        // lolos penjaga cakupan (dianggap lanjutan percakapan), lalu diteruskan
        // ke retrieval yang menjaring entitas dari riwayat dan membalas profil
        // lengkapnya lagi  -  mengulang info yang baru dibaca pengunjung.
        //
        // Di sini kalimat semacam itu dijawab sebagai manusia: singkat, hangat,
        // tanpa mengulang data dan tanpa memakai kuota LLM. Penyebutan nama
        // tempat membatalkan jalur ini, supaya "makasih, curug cipeteuy keren"
        // tetap bisa dijawab dengan konteks tempat.
        const socialKind = findMentionedEntity(question) ? null : detectSocial(question);
        if (socialKind) {
            const topicTitle = currentTopic(body.history ?? [], null)?.title ?? null;
            const social = buildSocialAnswer(socialKind, topicTitle);
            return json(
                {
                    answer: normalizeTypography(stripSlop(social.answer)),
                    sources: [],
                    reason: `social:${social.kind}`,
                    model: null,
                },
                200
            );
        }

        // --- 3. Entitas yang disebut pengunjung -------------------------------
        //
        // findMentionedEntity mengenali nama tempat yang disebut pengunjung
        // DENGAN toleransi salah ketik: "curug cipeteuy" tetap menunjuk Curug
        // Cipeuteuy. Hasilnya dipakai sebagai jangkar (anchor) untuk seluruh
        // jalur jawaban di bawah, sehingga giliran ini tidak bisa melenceng ke
        // tempat lain  -  termasuk saat riwayat berisi jawaban daftar yang
        // menyebut banyak nama.
        const mention = findMentionedEntity(question);

        // --- 3b. Rekomendasi berbasis kebutuhan -------------------------------
        //
        // Pengunjung sering bertanya dengan kalimat kebutuhan, bukan nama
        // tempat: "saya ingin mandi di mana?", "yang bisa berenang?", "mau
        // makan di sekitar sini". Jalur ini menerjemahkannya menjadi saran
        // konkret lengkap dengan alasan dan harga, sehingga jawaban terasa
        // seperti pemandu, bukan daftar hasil pencarian.
        //
        // Dijalankan SEBELUM retrieval karena retrieval akan memilih entitas
        // berdasarkan kata kunci, bukan berdasarkan kecocokan kebutuhan.
        // Bila pertanyaan menyebut entitas tertentu (mis. "homestay pak
        // jamal"), itu bukan permintaan rekomendasi umum. Tangani lewat
        // retrieval agar entitas yang disebut benar-benar dijawab.
        const needKind = mention ? null : detectNeed(question);
        if (needKind) {
            // Entitas yang sedang dibicarakan, untuk menyambung percakapan.
            const topic = currentTopic(body.history ?? [], mention);
            const need = buildNeedAnswer(question, needKind, topic);
            if (need) {
                return json(
                    {
                        answer: normalizeTypography(stripSlop(need.answer)),
                        sources: need.sources,
                        cards: toSourceCardsFromSources(need.sources),
                        reason: "recommendation",
                        model: null,
                        structured: need.kind,
                    },
                    200
                );
            }
        }

        // --- 4. Pertanyaan berpola (daftar, harga, terbaru) -----------------
        //
        // Dijawab langsung dari indeks, TANPA LLM. Alasannya bukan sekadar
        // hemat kuota: pertanyaan seperti "destinasi apa saja?" harus lengkap
        // dan urut, sedangkan model free sering memotong daftar jadi 3 item
        // dan menyertakan data yang tidak ditanyakan. Lihat lib/chat/structured.ts.
        //
        // Bila pengunjung MENYEBUT satu tempat, jawaban daftar/harga umum
        // mundur: "homestay bu ani apa saja fasilitasnya?" harus dijawab
        // tentang Bu Ani, bukan seluruh daftar homestay. Pengecualian bila
        // jelas minta tambahan ("selain X, apa saja lagi?").
        const asksOthers = /\b(selain|lainnya|lain|dll)\b/i.test(question);
        const structuredIntent = detectStructuredIntent(question);
        // Pertanyaan "artikel/berita terbaru" tetap dijawab jalur terstruktur
        // walau ada penyebutan entitas lemah (mis. kata "tradisi" yang juga
        // muncul di judul entitas lain). Fungsi artikelTerbaru sudah
        // memprioritaskan judul yang relevan dengan topik yang disebut.
        const structuredKind =
            structuredIntent === "artikel_terbaru"
                ? structuredIntent
                : mention && !asksOthers
                  ? null
                  : structuredIntent;
        if (structuredKind) {
            // Bila percakapan sedang membahas satu entitas, jawaban terstruktur
            // yang bersifat umum (mis. daftar semua harga) harus mundur agar
            // giliran itu dijawab tentang entitas tersebut.
            const anchored = Boolean(mention) || (body.history ?? []).some((m) => m.role === "user");
            const structured = buildStructuredAnswer(question, structuredKind, anchored);
            if (structured) {
                return json(
                    {
                        answer: normalizeTypography(stripSlop(structured.answer)),
                        sources: structured.sources,
                        // Jalur ini menjawab langsung dari indeks tanpa retrieval,
                        // jadi kartu diambil dari indeks memakai judul sumbernya.
                        cards: toSourceCardsFromSources(structured.sources),
                        reason: "structured",
                        model: null,
                        structured: structured.kind,
                    },
                    200
                );
            }
        }

        // --- 4b. Ambil konteks ----------------------------------------------
        //
        // Entitas yang disebut pengunjung dikirim sebagai jangkar: retrieval
        // menyusun hasil di sekitar entitas itu, dan riwayat (mis. jawaban
        // daftar panjang) tidak boleh menggeser topiknya.
        const result = retrieve(question, body.history ?? [], mention?.card ?? null);
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
                {
                    answer: normalizeTypography(stripSlop(fb.answer)),
                    sources: fb.sources,
                    // Kartu pratinjau dibangun dari sumber jawaban, bukan dari
                    // seluruh hasil retrieval, supaya yang tampil di gelembung
                    // benar-benar yang dibahas.
                    cards: toSourceCardsFromSources(fb.sources),
                    reason: "no_api_key",
                    model: null,
                },
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
            // generik kepada pengunjung. `mention` memastikan jawabannya
            // fokus ke tempat yang disebut pengunjung.
            const dyn = buildFromRetrieval(result, question, mention?.card ?? null);
            if (dyn) {
                return json(
                    {
                        answer: normalizeTypography(stripSlop(dyn.answer)),
                        sources: dyn.sources,
                        cards: toSourceCardsFromSources(dyn.sources),
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
                    cards: toSourceCardsFromSources(fb.sources),
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
            const dyn = buildFromRetrieval(result, question, mention?.card ?? null);
            if (dyn) {
                return json(
                    {
                        answer: normalizeTypography(stripSlop(dyn.answer)),
                        sources: dyn.sources,
                        cards: toSourceCardsFromSources(dyn.sources),
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
                cards: toSourceCards(result),
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
