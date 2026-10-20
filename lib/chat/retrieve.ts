import "server-only";

import {
    buildIndex,
    tokenize,
    type EntityCard,
    type TextChunk,
} from "@/lib/chat/index";
import { ANAPHORA_PATTERN } from "@/lib/chat/scope";

/**
 * Pencarian konteks untuk chatbot.
 *
 * Dua jalur yang dijalankan bersamaan lalu digabung:
 *
 * 1. Pencocokan entitas. Pengunjung hampir selalu menyebut nama tempat
 *    ("curug", "homestay bu ani", "jahe"). Pencocokan nama yang toleran salah
 *    ketik jauh lebih tepat daripada kesamaan teks biasa.
 * 2. BM25 untuk artikel dan berita, karena isinya berupa prosa panjang.
 *
 * Hasilnya dibatasi jumlahnya supaya konteks yang dikirim ke model tetap
 * ~6.000 token. Batas ini penting: penyedia hanya memberi 50 request/hari,
 * jadi setiap token harus berguna.
 */

const MAX_CARDS = 6;
const MAX_CHUNKS = 4;
const K1 = 1.5;
const B = 0.75;

/**
 * Bonus kesegaran untuk potongan artikel. Relevansi tetap faktor utama,
 * tetapi di antara tulisan yang sama-sama relevan, yang lebih baru naik.
 * Tulisan lama tidak dibuang: ia tetap muncul sebagai konteks pendukung bila
 * skornya cukup, hanya tidak mengalahkan tulisan baru yang setara.
 */
const RECENCY_BOOST = 0.3;
const RECENCY_DECAY_DAYS = 120;

/** Kata yang menandai pertanyaan tentang tulisan, bukan topik isinya. */
export const NEWS_WORDS = new Set([
    "artikel",
    "berita",
    "kabar",
    "tulisan",
    "kegiatan",
    "cerita",
    "info",
    "informasi",
    "terbaru",
    "terkini",
    "terakhir",
    "baru",
    "update",
]);

function dateValue(value: string): number {
    const t = new Date(value).getTime();
    return Number.isFinite(t) ? t : 0;
}

function recencyFactor(value: string): number {
    const t = dateValue(value);
    if (!t) return 0;
    const ageDays = Math.max(0, (Date.now() - t) / 86_400_000);
    return Math.exp(-ageDays / RECENCY_DECAY_DAYS);
}

function topicTerms(terms: string[]): string[] {
    return terms.filter((t) => !NEWS_WORDS.has(t));
}

export interface RetrievedCard {
    card: EntityCard;
    score: number;
}

export interface RetrievedChunk {
    chunk: TextChunk;
    score: number;
}

export interface RetrievalResult {
    cards: RetrievedCard[];
    chunks: RetrievedChunk[];
    /** Kata kunci yang dipakai, untuk log dan evaluasi. */
    terms: string[];
}

/** Kemiripan sederhana berbasis trigram, toleran salah ketik. */
function trigramScore(needle: string, haystack: string): number {
    const a = needle.toLowerCase().replace(/[^a-z0-9]/g, "");
    const b = haystack.toLowerCase().replace(/[^a-z0-9]/g, "");
    if (a.length < 3 || b.length < 3) return 0;
    const grams = (s: string): Set<string> => {
        const set = new Set<string>();
        for (let i = 0; i <= s.length - 3; i++) set.add(s.slice(i, i + 3));
        return set;
    };
    const ga = grams(a);
    const gb = grams(b);
    let hit = 0;
    for (const g of ga) if (gb.has(g)) hit++;
    return hit / ga.size;
}

function scoreCard(card: EntityCard, terms: string[], rawQuery: string): number {
    let score = 0;
    const kw = card.keywords;
    const body = card.bodyTokens ?? "";

    // Nama yang disebut utuh memberi bobot paling besar.
    for (const term of terms) {
        if (term.length < 3) continue;
        if (new RegExp(`(^|\\s)${escapeRegex(term)}(\\s|$)`, "i").test(kw)) {
            score += 3.0;
        } else if (kw.includes(term)) {
            score += 1.2;
        } else if (body.includes(term)) {
            // Kata yang hanya muncul di isi (mis. "imun" pada khasiat Jahe)
            // bernilai lebih kecil daripada nama, tetapi cukup untuk
            // memisahkan tanaman yang benar-benar relevan dari yang sekadar
            // berlabel "tanaman herbal".
            score += 0.9;
        }
    }

    // Judul yang disebut hampir persis (dengan salah ketik) tetap dikenali.
    const sim = trigramScore(rawQuery, card.title);
    if (sim > 0.5) score += 2.5 * sim;

    // Kata kunci jenis entitas mempersempit ke modul yang benar.
    if (/\b(homestay|nginap|nginep|penginapan|inap)\b/i.test(rawQuery) && card.kind === "homestay") {
        score += 1.5;
    }
    if (/\b(umkm|warung|toko|usaha)\b/i.test(rawQuery) && card.kind === "umkm") {
        score += 1.5;
    }
    if (/\b(herbal|tanaman|obat|jamu|khasiat|manfaat)\b/i.test(rawQuery) && card.kind === "herbal") {
        score += 1.5;
    }
    if (/\b(kontak|hubungi|whatsapp|wa|email|jam|buka|pemesanan|booking)\b/i.test(rawQuery) && card.kind === "kontak") {
        score += 2.0;
    }
    if (/\b(peta|maps|lokasi|rute|arah)\b/i.test(rawQuery) && (card.kind === "lokasi" || card.kind === "wisata")) {
        score += 1.0;
    }
    if (/\b(tentang|profil|sejarah|prestasi|penghargaan|tradisi|budaya)\b/i.test(rawQuery) && card.kind === "profil") {
        score += 1.5;
    }

    return score;
}

function escapeRegex(s: string): string {
    return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function bm25(
    index: ReturnType<typeof buildIndex>,
    terms: string[]
): RetrievedChunk[] {
    const N = index.chunks.length || 1;
    const scored: RetrievedChunk[] = [];

    for (const chunk of index.chunks) {
        const tokens = tokenize(
            `${chunk.title} ${chunk.text} ${chunk.tags.join(" ")}`
        );
        if (!tokens.length) continue;

        const tf = new Map<string, number>();
        for (const t of tokens) tf.set(t, (tf.get(t) ?? 0) + 1);

        let score = 0;
        for (const term of terms) {
            const f = tf.get(term);
            if (!f) continue;
            const df = index.docFreq.get(term) ?? 0;
            const idf = Math.log(1 + (N - df + 0.5) / (df + 0.5));
            const denom = f + K1 * (1 - B + (B * tokens.length) / (index.avgChunkLen || 1));
            score += idf * ((f * (K1 + 1)) / denom);
        }
        if (score <= 0) continue;

        // Judul yang memuat kata kunci menandakan artikel yang benar-benar
        // relevan, bukan sekadar menyebut kata itu sekali.
        if (terms.some((t) => chunk.title.toLowerCase().includes(t))) score += 2.0;

        // Dorong tulisan yang lebih baru ke atas bila relevansinya berdekatan.
        score *= 1 + RECENCY_BOOST * recencyFactor(chunk.date);

        scored.push({ chunk, score });
    }

    scored.sort(
        (a, b) =>
            b.score - a.score ||
            dateValue(b.chunk.date) - dateValue(a.chunk.date)
    );
    return scored;
}

/**
 * Kata rujukan yang menandakan pengunjung sedang membicarakan hal sebelumnya.
 * Contoh nyata: "kalau yang itu fasilitasnya apa?" — tanpa riwayat, kata-kata
 * ini tidak punya makna dan retrieval mengambil entitas acak.
 */
// Daftar kata rujukan diambil dari lib/chat/scope.ts agar penjaga cakupan dan
// retrieval memakai daftar yang SAMA. Sebelumnya keduanya punya daftar
// sendiri; akibatnya "harganya berapa?" dikenali sebagai lanjutan oleh
// penjaga cakupan tetapi TIDAK oleh retrieval, sehingga retrieval berjalan
// tanpa jangkar dan hasilnya kosong.
const ANAPHORA_RE = ANAPHORA_PATTERN;

/**
 * Apakah pertanyaan ini merujuk pada hal yang sudah dibicarakan?
 *
 * Dua tanda: (a) memuat kata rujukan, atau (b) sangat pendek dan tidak
 * menyebut entitas apa pun (mis. "fasilitasnya?", "harganya berapa?").
 */
function isFollowUp(query: string, terms: string[]): boolean {
    if (ANAPHORA_RE.test(query)) return true;
    // Pertanyaan pendek tanpa kata kunci bermakna hampir pasti lanjutan.
    const words = query.trim().split(/\s+/).filter(Boolean);
    return words.length <= 4 && terms.length === 0;
}

/**
 * Cari entitas yang disebut pada riwayat percakapan.
 *
 * Ini yang membuat percakapan terasa nyambung. Tanpa langkah ini, pengunjung
 * harus menyebut nama destinasi di setiap pertanyaan:
 *
 *   "Apa itu Curug Cipeuteuy?"  -> dijawab
 *   "kalau yang itu fasilitasnya apa?" -> SALAH, menjawab Homestay Warga
 *
 * Dengan langkah ini, entitas yang muncul di giliran sebelumnya dipakai
 * sebagai jangkar, lalu pertanyaan lanjutan dinilai terhadap entitas itu.
 */
function entitiesFromHistory(
    history: { role: string; content: string }[],
    maxTurns = 4
): { card: EntityCard; score: number }[] {
    const index = buildIndex();
    const recent = history.slice(-maxTurns * 2);
    const scored = new Map<string, { card: EntityCard; score: number }>();

    // Giliran yang lebih baru memberi bobot lebih besar, karena itulah topik
    // yang sedang berlangsung.
    recent.forEach((msg, i) => {
        if (msg.role !== "user" && msg.role !== "assistant") return;
        const recency = (i + 1) / recent.length; // 0..1
        const text = String(msg.content ?? "").toLowerCase();
        if (!text) return;

        const hits: EntityCard[] = [];
        for (const card of index.cards) {
            // Nama entitas harus disebut utuh; mencocokkan kata umum akan
            // menarik terlalu banyak entitas.
            const name = card.title.toLowerCase();
            const mentioned =
                text.includes(name) ||
                (card.kind === "wisata" && text.includes(card.href.split("/").pop() ?? "\u0000"));
            if (mentioned) hits.push(card);
        }

        // Jawaban daftar BUKAN topik pembicaraan.
        //
        // Saat bot menjawab "destinasi apa saja?", teks jawabannya menyebut
        // puluhan nama destinasi sekaligus. Dulu semua kartu itu mendapat skor
        // sama, lalu urutan indeks yang menentukan jangkar  -  akibatnya
        // pertanyaan lanjutan "saya ingin ke curug cipeteuy..." dijawab
        // tentang Atraksi Genjring Kuda Jaya yang kebetulan kartu pertama.
        // Satu pesan yang menyebut lebih dari dua entitas diperlakukan
        // sebagai daftar, bukan topik.
        if (msg.role === "assistant" && hits.length > 2) return;

        for (const card of hits) {
            const prev = scored.get(card.id);
            const add = 6 * recency + (msg.role === "user" ? 2 : 0);
            if (prev) prev.score += add;
            else scored.set(card.id, { card, score: add });
        }
    });

    return [...scored.values()].sort((a, b) => b.score - a.score);
}

/** Pindahkan jangkar ke urutan pertama; sisipkan bila tidak ikut terjaring. */
function withAnchorFirst(result: RetrievalResult, anchor: EntityCard): RetrievalResult {
    const i = result.cards.findIndex((c) => c.card.id === anchor.id);
    if (i === 0) return result;
    if (i > 0) {
        const [found] = result.cards.splice(i, 1);
        result.cards.unshift(found);
        return result;
    }
    result.cards.unshift({ card: anchor, score: 20 });
    result.cards = result.cards.slice(0, MAX_CARDS);
    return result;
}

export function retrieve(
    query: string,
    history: { role: string; content: string }[] = [],
    /**
     * Entitas yang disebut pengunjung pada giliran INI. Diketeksi pemanggil
     * dengan toleransi salah ketik (lib/chat/mention.ts), mis. "curug cipeteuy"
     * tetap menunjuk Curug Cipeuteuy. Bila ada, riwayat tidak boleh menggeser
     * topiknya.
     */
    anchor: EntityCard | null = null
): RetrievalResult {
    const index = buildIndex();
    const terms = tokenize(query);
    // Kata rujukan dibuang dari kueri agar tidak mengganggu skoring.
    const cleaned = query.replace(ANAPHORA_RE, " ").replace(/\s{2,}/g, " ").trim();

    // Jangkar eksplisit paling kuat: pengunjung MENYEBUT tempatnya sendiri.
    // Contoh nyata yang diperbaiki: setelah bot menjawab daftar 24 destinasi,
    // "saya ingin ke curug cipeteuy ini..." harus fokus ke Curug, bukan ke
    // entitas yang kebetulan paling baru disebut bot.
    if (anchor) {
        const focused = retrieveInternal(`${anchor.title} ${cleaned}`, index);
        return withAnchorFirst(focused, anchor);
    }

    /**
     * Langkah 0: bila pertanyaan bersifat lanjutan, tanya ulang dengan
     * menyertakan entitas yang sedang dibicarakan. Jadi "kalau yang itu
     * fasilitasnya apa?" menjadi "curug cipeuteuy fasilitasnya apa" untuk
     * keperluan pencarian; pertanyaan asli tetap dikirim ke model apa adanya.
     */
    //
    // Sebelumnya hanya berjalan bila `terms.length < 4`. Akibatnya pertanyaan
    // seperti "kalau yang itu cara pakainya gimana?" (5 kata bermakna) tetap
    // dinilai tanpa jangkar, sehingga mengambil entitas acak. Sekarang cukup
    // syarat "merupakan lanjutan" dan ada entitas terbawa dari riwayat.
    const carried = isFollowUp(query, terms) ? entitiesFromHistory(history) : [];
    if (carried.length) {
        const topic = carried[0].card;
        const resolved = retrieveInternal(`${topic.title} ${cleaned}`, index);
        if (resolved.cards.length || resolved.chunks.length) {
            return withAnchorFirst(resolved, topic);
        }
    }

    return retrieveInternal(query, index);
}

function retrieveInternal(query: string, index: ReturnType<typeof buildIndex>): RetrievalResult {
    const terms = tokenize(query);

    // Pertanyaan tentang konten terbaru ("artikel terbaru", "kabar terkini")
    // tidak punya kata kunci yang khas, sehingga BM25 mengembalikan apa pun.
    // Di sini chunk kepala artikel dipakai eksplisit: judul + ringkasan saja,
    // tanpa isi penuh, supaya konteks tetap murah. Bila pertanyaan menyebut
    // topik tertentu, judul yang relevan dengan topik itu didahulukan; tulisan
    // lama yang relevan tetap bisa muncul sebagai pendukung.
    const asksLatest = /(terbaru|terkini|terakhir|baru|update|artikel|berita)/i.test(query);
    if (asksLatest && /(artikel|berita|kabar|tulisan|kegiatan|cerita)/i.test(query)) {
        const heads = index.chunks.filter((c) => c.id.endsWith(":head"));
        const topics = topicTerms(terms);

        let picked: RetrievedChunk[] = [];
        if (topics.length) {
            picked = bm25(index, topics)
                .filter((c) => c.chunk.id.endsWith(":head"))
                .slice(0, 5);
        }
        if (!picked.length) {
            picked = heads
                .sort((a, b) => dateValue(b.date) - dateValue(a.date))
                .slice(0, 5)
                .map((chunk, i) => ({ chunk, score: 20 - i }));
        }

        return {
            cards: [],
            // Skor dinormalkan agar urutan konteks stabil: judul teratas
            // tetap yang paling relevan dan paling baru.
            chunks: picked.map((c, i) => ({ chunk: c.chunk, score: 20 - i })),
            terms: [...terms, "terbaru"],
        };
    }

    // Tanpa kata kunci yang berguna, tetap kirim kartu inti agar model punya
    // pegangan (profil desa + kontak) instead of menjawab tanpa konteks.
    if (!terms.length) {
        return {
            cards: index.cards
                .filter((c) => c.kind === "kontak" || c.kind === "profil")
                .map((card) => ({ card, score: 1 })),
            chunks: [],
            terms,
        };
    }

    const cards: RetrievedCard[] = index.cards
        .map((card) => ({ card, score: scoreCard(card, terms, query) }))
        .filter((c) => c.score > 0.9)
        .sort((a, b) => b.score - a.score)
        .slice(0, MAX_CARDS);

    const chunks = bm25(index, terms)
        .filter((c) => c.score > 1.5)
        .slice(0, MAX_CHUNKS);

    // Pertanyaan tentang kontak/booking selalu menyertakan kartu kontak.
    const needsContact =
        /\b(kontak|hubungi|whatsapp|wa|email|pemesanan|booking|reservasi|pesan)\b/i.test(
            query
        ) && !cards.some((c) => c.card.kind === "kontak");
    if (needsContact) {
        const contact = index.cards.find((c) => c.kind === "kontak");
        if (contact) cards.unshift({ card: contact, score: 10 });
    }

    return { cards, chunks, terms };
}

/** Ringkasan konteks dalam format yang dibaca model, dengan nomor kutipan. */
export function renderContext(result: RetrievalResult): {
    text: string;
    sources: { n: number; title: string; href: string }[];
} {
    const sources: { n: number; title: string; href: string }[] = [];
    const blocks: string[] = [];
    let n = 0;

    // Satu artikel bisa menghasilkan beberapa chunk (judul + isi). Tanpa
    // penyaringan, daftar Sumber menampilkan judul yang sama dua kali, dan
    // model mengira itu dua dokumen berbeda lalu mengutipnya berulang.
    const seenHref = new Set<string>();

    for (const { card } of result.cards) {
        if (seenHref.has(card.href)) continue;
        seenHref.add(card.href);
        n++;
        sources.push({ n, title: card.title, href: card.href });
        const lines = Object.entries(card.facts)
            .filter(([, v]) => v && String(v).trim())
            .map(([k, v]) => `  - ${k}: ${v}`)
            .join("\n");
        blocks.push(`[${n}] ${card.title}\n${lines}`);
    }

    for (const { chunk } of result.chunks) {
        if (seenHref.has(chunk.href)) continue;
        seenHref.add(chunk.href);
        n++;
        sources.push({ n, title: chunk.title, href: chunk.href });
        const meta = `${chunk.category}${chunk.date ? `, ${chunk.date}` : ""}`;
        blocks.push(`[${n}] ${chunk.title} (${meta})\n  ${chunk.text}`);
    }

    return { text: blocks.join("\n\n"), sources };
}
