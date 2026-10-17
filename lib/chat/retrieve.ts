import "server-only";

import {
    buildIndex,
    tokenize,
    type EntityCard,
    type TextChunk,
} from "@/lib/chat/index";

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

        scored.push({ chunk, score });
    }

    scored.sort((a, b) => b.score - a.score);
    return scored;
}

export function retrieve(query: string): RetrievalResult {
    const index = buildIndex();
    const terms = tokenize(query);

    // Pertanyaan tentang konten terbaru ("artikel terbaru", "kabar terkini")
    // tidak punya kata kunci yang khas, sehingga BM25 mengembalikan apa pun.
    // Di sini chunk artikel terbaru diambil eksplisit sebagai konteks.
    const asksLatest = /(terbaru|terkini|terakhir|baru|update|artikel|berita)/i.test(query);
    if (asksLatest && /(artikel|berita|kabar|tulisan|kegiatan)/i.test(query)) {
        const heads = index.chunks
            .filter((c) => c.id.endsWith(":head"))
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
            .slice(0, 5)
            .map((chunk, i) => ({ chunk, score: 20 - i }));
        return {
            cards: [],
            chunks: heads,
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

    for (const { card } of result.cards) {
        n++;
        sources.push({ n, title: card.title, href: card.href });
        const lines = Object.entries(card.facts)
            .filter(([, v]) => v && String(v).trim())
            .map(([k, v]) => `  - ${k}: ${v}`)
            .join("\n");
        blocks.push(`[${n}] ${card.title}\n${lines}`);
    }

    for (const { chunk } of result.chunks) {
        n++;
        sources.push({ n, title: chunk.title, href: chunk.href });
        const meta = `${chunk.category}${chunk.date ? `, ${chunk.date}` : ""}`;
        blocks.push(`[${n}] ${chunk.title} (${meta})\n  ${chunk.text}`);
    }

    return { text: blocks.join("\n\n"), sources };
}
