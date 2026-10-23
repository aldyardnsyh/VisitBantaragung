import "server-only";

import { getPublicContact } from "@/lib/content";
import { buildIndex, type EntityCard } from "@/lib/chat/index";

/**
 * Rekomendasi berbasis KEBUTUHAN.
 *
 * Pengunjung jarang bertanya dengan nama tempat. Mereka bertanya dengan
 * kebutuhan: "saya ingin mandi di mana?", "yang bisa berenang?", "mau makan
 * di sekitar sini". Menjawab dengan daftar entitas yang namanya kebetulan
 * cocok membuat jawaban terasa kaku dan sering salah sasaran.
 *
 * Modul ini menerjemahkan kebutuhan menjadi saran konkret dari data situs,
 * lalu menyusun kalimat seperti pemandu lokal: menyebut tempat, alasannya,
 * harga bila ada, dan tawaran langkah lanjut.
 *
 * Semua fakta tetap dari indeks. Tidak ada data yang dikarang; bila tidak ada
 * tempat yang cocok, fungsi mengembalikan null dan pemanggil memakai jalur LLM.
 */

export type NeedKind =
    | "mandi_berenang"
    | "makan_minum"
    | "menginap"
    | "kemah"
    | "spot_foto"
    | "ramah_keluarga"
    | "kopi_santai";

export interface NeedAnswer {
    kind: NeedKind;
    answer: string;
    sources: { n: number; title: string; href: string }[];
}

/** Kata kunci per kebutuhan, beserta cara memeriksa isi entitas. */
const NEEDS: {
    kind: NeedKind;
    match: RegExp;
    /** Kata yang dicari di nama, ringkasan, deskripsi, atau fasilitas. */
    signals: RegExp;
    /**
     * Kecocokan UTAMA: entitas memang bertema kebutuhan ini, bukan sekadar
     * menyebutnya sebagai fasilitas pendukung.
     *
     * Contoh nyata: Bumi Perkemahan Awilega menyebut "warung makan" di daftar
     * fasilitasnya, sehingga dulu muncul sebagai saran pertama untuk
     * pertanyaan "mau makan enak di mana?" — padahal Awilega tempat camping.
     * Sementara Pasar Bumi Pakuwon dan Kopi Pakuwon (kategori kuliner) justru
     * tidak muncul. Pemisahan ini memperbaikinya.
     */
    primary: RegExp;
    /** Judul/ringkasan yang menandakan tema ini. */
    titleHint: RegExp;
    intro: string;
}[] = [
    {
        kind: "mandi_berenang",
        match: /\b(mandi|berenang|renang|kolam|cemplung|main air|basah)\b/i,
        signals: /\b(berenang|kolam|renang|air terjun|telaga|main air)\b/i,
        primary: /\b(berenang|kolam alami|kolam berundak|telaga|air terjun|danau)\b/i,
        titleHint: /\b(curug|telaga|air terjun|danau|pemandian)\b/i,
        intro: "Kalau mau mandi dan main air, ini yang paling pas",
    },
    {
        kind: "makan_minum",
        match: /\b(makan|minum|lapar|haus|kuliner|ngopi|jajanan|cicip|sarapan)\b/i,
        signals: /\b(tempat makan|warung|kuliner|kopi|makan|jajanan|kulineran|kafe|pasar)\b/i,
        // Tema utama: pasar kuliner, kedai kopi, atau destinasi berkategori kuliner.
        primary: /\b(pasar|kuliner khas|kedai kopi|warung kopi|jajanan|kopi lokal|gerai biji kopi|cicip|tenan|tenant)\b/i,
        // "pakuwon" ditambahkan karena Pasar Bumi Pakuwon adalah pusat kuliner
        // desa, dan namanya tidak memuat kata "pasar" pada judul lengkapnya
        // yang dipakai pencocokan sebagian.
        titleHint: /\b(pasar|kopi|kuliner|warung|kafe|kedai|pakuwon)\b/i,
        intro: "Kalau cari makan enak dan suasana khas desa, ini yang paling saya sarankan",
    },
    {
        kind: "menginap",
        match: /\b(nginap|nginep|inap|menginap|tidur|homestay|penginapan|kamar)\b/i,
        signals: /\b(homestay|penginapan|kamar tidur|menginap|villa|cottage|glamping)\b/i,
        primary: /\b(kamar tidur|menginap|penginapan|homestay|villa|glamping)\b/i,
        titleHint: /\b(homestay|villa|cottage|glamping|lodging|penginapan)\b/i,
        intro: "Kalau mau menginap, ini pilihannya",
    },
    {
        kind: "kemah",
        match: /\b(camping|kemah|berkhemah|api unggun|tenda)\b/i,
        signals: /\b(camping|kemah|api unggun|outbound|tenda)\b/i,
        primary: /\b(perkemahan|camping|kemah|api unggun)\b/i,
        titleHint: /\b(perkemahan|camping|awilega)\b/i,
        intro: "Untuk camping, ini yang menyediakan areanya",
    },
    {
        kind: "spot_foto",
        match: /\b(foto|selfie|swafoto|pemandangan|view|sunrise|sunset|senja)\b/i,
        signals: /\b(spot foto|selfie|pemandangan|puncak|panorama|sunrise|sunset|instagramable)\b/i,
        primary: /\b(puncak|panorama|pemandangan|spot foto|instagramable|view)\b/i,
        titleHint: /\b(bukit|puncak|terasering|langit|batu)\b/i,
        intro: "Kalau cari spot foto yang bagus, coba ini",
    },
    {
        kind: "ramah_keluarga",
        match: /\b(anak|keluarga|balita|orang tua|lansia|ramah anak)\b/i,
        signals: /\b(keluarga|anak|piknik|edukasi|ramah)\b/i,
        primary: /\b(keluarga|anak|piknik|edukasi)\b/i,
        titleHint: /\b(eduwisata|kampung|pasar|telaga)\b/i,
        intro: "Untuk bawa keluarga, ini yang paling nyaman",
    },
    {
        kind: "kopi_santai",
        match: /\b(ngopi|kopi|santai|duduk|nongkrong|chill)\b/i,
        signals: /\b(kopi|kafe|warung kopi|tempat duduk|gazebo)\b/i,
        primary: /\b(kopi|kedai kopi|warung kopi|biji kopi)\b/i,
        titleHint: /\b(kopi)\b/i,
        intro: "Kalau mau ngopi dan santai, ini tempatnya",
    },
];

const KIND_ORDER: Record<string, number> = {
    wisata: 0,
    lokasi: 1,
    homestay: 2,
    umkm: 3,
};

function priceOf(card: EntityCard): string {
    const raw = card.facts["Harga mulai"] || card.facts["Harga"] || "";
    return raw ? raw.replace(/\s*per\s+orang\s*$/i, "").trim() : "";
}

/**
 * Nilai kecocokan sebuah entitas terhadap kebutuhan.
 *
 * Skor menentukan urutan saran. Yang penting bukan sekadar "menyebut" kata
 * kunci, tetapi seberapa besar tempat itu MEMANG tentang kebutuhan tersebut:
 *
 *   3 = judul/ringkasan bertema kebutuhan ini (mis. "Pasar Bumi Pakuwon")
 *   2 = deskripsi menyebutnya sebagai hal utama (mis. kolam alami untuk mandi)
 *   1 = hanya fasilitas pendukung (mis. "warung makan" di area camping)
 *   0 = tidak cocok
 *
 * Tanpa pembedaan ini, tempat camping bisa muncul di atas pasar kuliner hanya
 * karena daftar fasilitasnya memuat kata "warung makan".
 */
function matchScore(card: EntityCard, need: (typeof NEEDS)[number]): number {
    const titleSummary = `${card.title} ${card.summary}`.toLowerCase();
    const desc = `${card.facts["Deskripsi"] ?? ""} ${card.facts["Aktivitas"] ?? ""}`.toLowerCase();
    const facilities = `${card.facts["Fasilitas"] ?? ""}`.toLowerCase();
    const kategori = (card.facts["Kategori"] ?? "").toLowerCase();

    // Kategori destinasi adalah sinyal paling jujur: destinasi berkategori
    // "kuliner" memang tempat makan, apa pun kata yang muncul di teksnya.
    const kategoriCocok =
        (need.kind === "makan_minum" || need.kind === "kopi_santai") && /kuliner/.test(kategori);
    if (kategoriCocok) return 3;

    // Untuk camping, kategori saja TIDAK cukup. Banyak destinasi berkategori
    // "alam" (mis. Batu Asahan) yang bukan tempat kemah, sehingga dulu muncul
    // sebagai saran pertama. Yang menentukan adalah area kemahnya benar-benar
    // tersedia.
    if (need.kind === "kemah" && need.primary.test(`${titleSummary} ${desc}`)) return 3;

    if (need.titleHint.test(titleSummary) || (card.kind === "wisata" && need.primary.test(titleSummary))) {
        return 3;
    }
    if (need.primary.test(desc)) return 2;
    if (need.signals.test(`${desc} ${facilities}`) || need.signals.test(card.keywords)) return 1;
    return 0;
}

/**
 * Deteksi kebutuhan, dengan urutan prioritas.
 *
 * Urutan array NEEDS tidak cukup: "pengen ngopi yang enak" memuat kata
 * "enak" yang juga cocok untuk makan, sehingga bisa salah masuk ke
 * rekomendasi makan. Di sini kebutuhan yang lebih spesifik diperiksa lebih
 * dulu: ngopi sebelum makan, camping sebelum menginap.
 */
const PRIORITY: NeedKind[] = [
    "kopi_santai",
    "mandi_berenang",
    "kemah",
    "menginap",
    "spot_foto",
    "makan_minum",
    "ramah_keluarga",
];

export function detectNeed(question: string): NeedKind | null {
    /**
     * Pertanyaan tentang KONTEN SITUS harus lewat retrieval, bukan jalur
     * rekomendasi.
     *
     * Kasus nyata yang diperbaiki: "kalau anak kkn itu biasanya agendanya suka
     * pada ngapain?" — kata "anak" cocok dengan kebutuhan `ramah_keluarga`,
     * sehingga bot menjawab "untuk bawa keluarga, ini yang paling nyaman..."
     * padahal pengunjung bertanya tentang kegiatan KKN (konten artikel).
     * Kata "anak" bermakna ganda: anak kecil vs anak KKN.
     *
     * Sinyal pengetahuan-konten: kkn, ugm, artikel, berita, program, kegiatan
     * organisasi. Kalimat semacam ini menanyakan ISI situs, dan retrieval
     * (BM25 atas judul + isi artikel) jauh lebih tepat untuk itu.
     */
    const CONTENT_QUESTION_RE =
        /\b(kkn|ugm|simfoni|artikel|berita|cerita|kisah|pengalaman|program kerja|agenda)\b/i;
    if (CONTENT_QUESTION_RE.test(question)) return null;

    for (const kind of PRIORITY) {
        const need = NEEDS.find((n) => n.kind === kind);
        if (need && need.match.test(question)) return need.kind;
    }
    return null;
}

/**
 * Susun jawaban rekomendasi.
 *
 * `topic` adalah entitas yang sedang dibicarakan (bila ada). Tempat itu
 * disebut lebih dulu agar jawaban terasa menyambung, bukan mengulang dari nol.
 */
/**
 * Artikel/berita yang relevan dengan kebutuhan ini.
 *
 * Situs ini punya banyak tulisan (cerita kunjungan, liputan festival, tips
 * kulineran) yang sering lebih menjelaskan pengalaman dibanding data
 * destinasi. Tanpa ini, kekayaan itu tidak pernah tersentuh chatbot.
 *
 * Pencocokan memakai nama entitas yang disarankan plus kata kunci kebutuhan,
 * lalu diurutkan berdasarkan tanggal terbaru karena tulisan lama biasanya
 * sudah tidak relevan (mis. "festival tahun lalu").
 */
function relatedArticles(
    need: (typeof NEEDS)[number],
    picked: EntityCard[],
    max = 2
): { title: string; href: string }[] {
    const index = buildIndex();

    const entityWords = new Set<string>();
    for (const c of picked) {
        for (const w of c.title.toLowerCase().split(/\s+/)) {
            if (w.length > 3) entityWords.add(w);
        }
    }

    const scored = index.chunks
        // Cukup satu wakil per artikel (chunk kepala).
        .filter((c) => c.id.endsWith(":head"))
        .map((c) => {
            const hay = `${c.title} ${c.category} ${c.tags.join(" ")}`.toLowerCase();
            let score = 0;

            // Artikel yang menyebut nama tempat yang disarankan.
            for (const w of entityWords) if (hay.includes(w)) score += 2;

            // Artikel yang temanya sama dengan kebutuhan.
            if (need.primary.test(hay)) score += 2;
            if (need.signals.test(hay)) score += 1;

            return { chunk: c, score };
        })
        .filter((x) => x.score >= 3)
        .sort((a, b) => {
            if (b.score !== a.score) return b.score - a.score;
            return new Date(b.chunk.date).getTime() - new Date(a.chunk.date).getTime();
        });

    const out: { title: string; href: string }[] = [];
    const seen = new Set<string>();
    for (const { chunk } of scored) {
        if (seen.has(chunk.href)) continue;
        seen.add(chunk.href);
        out.push({ title: chunk.title, href: chunk.href });
        if (out.length >= max) break;
    }
    return out;
}

export function buildNeedAnswer(
    question: string,
    kind: NeedKind,
    topic?: EntityCard | null
): NeedAnswer | null {
    const need = NEEDS.find((n) => n.kind === kind);
    if (!need) return null;

    const index = buildIndex();
    const contact = getPublicContact();

    // Kandidat: semua entitas yang punya kaitan dengan kebutuhan ini.
    const scored = index.cards
        .filter((c) => c.kind === "wisata" || c.kind === "lokasi" || c.kind === "homestay")
        .map((card) => ({ card, score: matchScore(card, need) }))
        .filter((x) => x.score > 0);

    if (!scored.length) return null;

    // Urutkan: skor tertinggi dulu, lalu destinasi sebelum titik peta.
    scored.sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        return (KIND_ORDER[a.card.kind] ?? 9) - (KIND_ORDER[b.card.kind] ?? 9);
    });

    // Buang duplikat nama (destinasi dan titik peta bisa bernama sama).
    const seen = new Set<string>();
    const picked: EntityCard[] = [];
    for (const { card } of scored) {
        const key = card.title.toLowerCase();
        if (seen.has(key)) continue;
        // Tempat yang sedang dibicarakan boleh masuk tanpa memenuhi skor
        // tertinggi, karena pengunjung jelas menanyakannya.
        if (topic && card.id === topic.id) {
            seen.add(key);
            picked.push(card);
            continue;
        }
        seen.add(key);
        picked.push(card);
        if (picked.length >= 3) break;
    }

    // Naikkan entitas yang sedang dibicarakan ke urutan pertama.
    const ordered = topic
        ? [...picked].sort((a, b) => (a.id === topic.id ? -1 : b.id === topic.id ? 1 : 0))
        : picked;

    const sources = ordered.map((c, i) => ({ n: i + 1, title: c.title, href: c.href }));
    const isTopic = (c: EntityCard) => topic && c.id === topic.id;

    const lines = ordered.map((c) => {
        const bits: string[] = [];

        // Alasan: kutip bagian yang membuat tempat ini cocok.
        const desc = c.facts["Deskripsi"] ?? c.summary;
        const reason = desc
            .split(/(?<=\.)\s+/)
            .find((s) => need.signals.test(s.toLowerCase()));
        // Rapikan ujung kalimat: jangan biarkan titik ganda muncul karena
        // kalimat yang dipilih sudah berakhir dengan titik.
        const clean = (reason ?? c.summary).replace(/\s+/g, " ").trim().replace(/[.\s]+$/, "");
        bits.push(clean);

        const price = priceOf(c);
        if (price) bits.push(`tiket mulai dari ${price} per orang`);

        return `- ${c.title}${isTopic(c) ? " (yang tadi kita bahas)" : ""}: ${bits.join(", ")}.`;
    });

    // Kalimat pembuka: menyambung bila ada topik, ramah bila belum.
    const opener = topic
        ? `Masih soal ${topic.title}, untuk ${needLabel(kind)} di Bantaragung ada beberapa pilihan:`
        : `${capitalize(need.intro)}:`;

    // Artikel yang menyambung dengan saran di atas.
    const articles = relatedArticles(need, ordered);
    const articleBlock = articles.length
        ? `\n\nBacaan yang mungkin menarik: ${articles.map((a) => a.title).join("; ")}.`
        : "";

    // Nomor sumber artikel melanjutkan nomor sumber entitas.
    const allSources = [
        ...sources,
        ...articles.map((a, i) => ({ n: sources.length + i + 1, title: a.title, href: a.href })),
    ];

    const answer =
        `${opener}\n\n${lines.join("\n")}${articleBlock}\n\n` +
        `Kalau mau, saya bisa jelaskan fasilitas salah satunya lebih detail, atau ` +
        `meneruskan Anda ke pengelola di WhatsApp ${contact.whatsappDisplay} untuk memastikan kondisi terbaru.`;

    return { kind, answer, sources: allSources };
}

function needLabel(kind: NeedKind): string {
    switch (kind) {
        case "mandi_berenang":
            return "mandi dan main air";
        case "makan_minum":
            return "makan dan minum";
        case "menginap":
            return "menginap";
        case "kemah":
            return "camping";
        case "spot_foto":
            return "spot foto";
        case "ramah_keluarga":
            return "bawa keluarga";
        case "kopi_santai":
            return "ngopi santai";
        default:
            return "kebutuhan itu";
    }
}

function capitalize(s: string): string {
    return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}
