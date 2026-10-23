import "server-only";

import {
    getAllArticles,
    getAllHerbal,
    getAllHomestay,
    getAllLocations,
    getAllUMKM,
    getAllWisata,
    getMapsConfig,
    getPublicContact,
    getSeoSettings,
    getSiteSettings,
    loadJSON,
} from "@/lib/content";
import { isVillageCenter } from "@/lib/geo";

/**
 * Indeks pengetahuan chatbot.
 *
 * Seluruh data diambil dari folder content/ (satu sumber kebenaran). Indeks
 * dibangun ulang otomatis setiap 5 menit agar artikel baru hasil sync ikut
 * terbaca tanpa harus menunggu proses server di-restart. Di Vercel, deploy
 * baru tetap menjadi jalur utama pembaruan karena berkas konten ikut dibundel.
 *
 * Bentuk datanya dua lapis:
 *
 * 1. `cards`  -  kartu entitas. Satu kartu memuat SELURUH fakta entitas (harga,
 *    fasilitas, kontak) dan selalu dikirim utuh ke model, tidak dipotong.
 *    Ini yang mencegah halusinasi harga: model tidak pernah melihat potongan
 *    harga tanpa konteksnya.
 * 2. `chunks`  -  potongan artikel/berita untuk pencarian kata kunci. Setiap
 *    artikel SELALU punya chunk "head" berisi judul + ringkasan singkat, jadi
 *    judul terbaru tetap dikenali tanpa harus memasukkan seluruh isi artikel
 *    ke konteks model. Isi lengkap hanya diindeks bila stylenya aman dan
 *    dipakai saat pertanyaan memang membutuhkan detail.
 */

export type EntityKind =
    | "wisata"
    | "herbal"
    | "homestay"
    | "umkm"
    | "lokasi"
    | "profil"
    | "kontak";

export interface EntityCard {
    /** Kunci unik, mis. "wisata:curug-cipeuteuy". */
    id: string;
    kind: EntityKind;
    /** Nama yang ditampilkan ke model. */
    title: string;
    /** Path halaman internal, untuk tautan sumber. */
    href: string;
    /** Ringkasan satu baris. */
    summary: string;
    /**
     * Path gambar sampul relatif terhadap basis aset (CDN), mis.
     * "wisata/curug-cipeuteuy/cover.webp". Dipakai widget untuk kartu
     * pratinjau di dalam gelembung percakapan.
     */
    cover?: string;
    /** Fakta terstruktur: label -> nilai. Dirender apa adanya ke konteks. */
    facts: Record<string, string>;
    /** Teks untuk dicocokkan saat pencarian (nama + alias + kategori). */
    keywords: string;
    /**
     * Isi field yang bermakna (khasiat, fasilitas, deskripsi) dengan bobot
     * lebih rendah daripada nama. Tanpa ini, pertanyaan seperti "herbal untuk
     * daya tahan tubuh" tidak bisa membedakan Jahe dari Bangle karena
     * keduanya sama-sama "tanaman herbal".
     */
    bodyTokens?: string;
}

export interface TextChunk {
    id: string;
    kind: "artikel" | "berita";
    title: string;
    href: string;
    date: string;
    category: string;
    tags: string[];
    text: string;
}

export interface ChatIndex {
    cards: EntityCard[];
    chunks: TextChunk[];
    /** Peta kata -> jumlah dokumen, untuk IDF. */
    docFreq: Map<string, number>;
    /** Rata-rata panjang chunk (kata), untuk normalisasi BM25. */
    avgChunkLen: number;
    builtAt: string;
}

const WISATA_KATEGORI_LABEL: Record<string, string> = {
    alam: "wisata alam",
    budaya: "wisata budaya",
    edukasi: "wisata edukasi",
    akomodasi: "akomodasi",
    kuliner: "kuliner",
    paket: "paket wisata",
};

function rupiah(value: string): string {
    return value.replace(/\s+/g, " ").trim();
}

/** Normalisasi nomor Indonesia: 08xx -> 62xx, buang spasi/tanda hubung. */
function normalizePhone(raw: string | undefined): string {
    if (!raw) return "";
    const digits = String(raw).replace(/\D/g, "");
    if (!digits) return "";
    if (digits.startsWith("62")) return digits;
    if (digits.startsWith("0")) return `62${digits.slice(1)}`;
    return digits;
}

function waLink(number: string): string {
    return number ? `https://wa.me/${number}` : "";
}

interface PricingEntry {
    slug: string;
    name: string;
    priceFrom: string;
    contact?: {
        organization?: string;
        phone?: string;
        email?: string;
        address?: string;
    };
    facilities?: string[];
}

function loadPricing(): Map<string, PricingEntry> {
    try {
        const data = loadJSON<{ contacts: PricingEntry[] }>(
            "settings/wisata-pricing.json"
        );
        return new Map((data.contacts ?? []).map((c) => [c.slug, c]));
    } catch {
        return new Map();
    }
}

/**
 * Pecah teks jadi potongan ~900 karakter pada batas paragraf.
 *
 * `overlap`: potongan berurutan berbagi ekor/kepala ~200 karakter. Tujuannya:
 * kalimat yang kebetulan terbelah di batas potongan tetap utuh di salah satu
 * sisi. Tanpa overlap, pertanyaan tentang hal yang kebetulan berada tepat di
 * batas potongan tidak ditemukan karena kata kuncinya terpotong dua-duanya.
 */
function chunkText(paragraphs: string[], maxLen = 900, overlap = 200): string[] {
    const pieces: string[] = [];
    let buf = "";
    for (const raw of paragraphs) {
        const p = String(raw).replace(/\s+/g, " ").trim();
        if (!p) continue;
        if (!buf) {
            buf = p;
        } else if (buf.length + p.length + 1 <= maxLen) {
            buf = `${buf} ${p}`;
        } else {
            pieces.push(buf);
            buf = p;
        }
        while (buf.length > maxLen) {
            const cut = buf.lastIndexOf(". ", maxLen);
            const at = cut > maxLen * 0.5 ? cut + 1 : maxLen;
            pieces.push(buf.slice(0, at).trim());
            buf = buf.slice(at).trim();
        }
    }
    if (buf) pieces.push(buf);

    if (pieces.length <= 1 || overlap <= 0) return pieces;

    // Sambungkan potongan dengan overlap: potongan ke-n diawali ekor potongan
    // ke-(n-1). Overlap dihitung pada batas spasi agar tidak membelah kata.
    const out: string[] = [pieces[0]];
    for (let i = 1; i < pieces.length; i++) {
        const prev = pieces[i - 1];
        const cutAt = Math.max(0, prev.length - overlap);
        const spaceAt = prev.indexOf(" ", cutAt);
        const tail = (spaceAt > 0 ? prev.slice(spaceAt + 1) : prev.slice(cutAt)).trim();
        const head = pieces[i].trim();
        // Jangan berlebihan: bila gabungan melewati batas, potong ekornya.
        const joined = tail && tail.length + head.length + 1 <= maxLen
            ? `${tail} ${head}`
            : head;
        out.push(joined);
    }
    return out;
}

/**
 * Berita hasil crawl yang belum ditulis ulang AI masih bergaya caption
 * Instagram ("Weekend terakhir Oktober mau ngapain?", hashtag). Kalau isinya
 * masuk konteks, model akan meniru gaya itu. Karena itu isi berita seperti
 * ini hanya diindeks bila cukup panjang dan bebas hashtag.
 */
function isStyleSafe(text: string): boolean {
    if (text.length < 240) return false;
    if (/#\w+/.test(text)) return false;
    const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 0);
    if (sentences.length < 3) return false;
    return true;
}

const CACHE_TTL_MS = 5 * 60 * 1000;
let cache: ChatIndex | null = null;
let cacheExpiresAt = 0;

export function buildIndex(): ChatIndex {
    if (cache && Date.now() < cacheExpiresAt) return cache;

    const site = getSiteSettings();
    const seo = getSeoSettings();
    const contact = getPublicContact();
    const pricing = loadPricing();
    const cards: EntityCard[] = [];

    // --- Wisata (destinasi, paket, akomodasi) -----------------------------
    for (const w of getAllWisata()) {
        const p = pricing.get(w.slug);
        const facts: Record<string, string> = {
            Kategori: WISATA_KATEGORI_LABEL[w.kategori] ?? w.kategori,
            Ringkasan: w.excerpt,
            Deskripsi: w.description,
        };
        if (p?.priceFrom) facts["Harga mulai"] = `${rupiah(p.priceFrom)} per orang`;
        if (w.facilities?.length) facts["Fasilitas"] = w.facilities.join(", ");
        if (w.activities?.length) facts["Aktivitas"] = w.activities.join(", ");
        if (p?.contact?.phone) {
            const n = normalizePhone(p.contact.phone);
            facts["WhatsApp pengelola"] = `${n} (${waLink(n)})`;
        }
        if (p?.contact?.address) facts["Lokasi"] = p.contact.address;
        // Koordinat + tautan arah, dipakai chatbot untuk mengarahkan
        // pengunjung ke titik yang benar di peta.
        //
        // Catatan jujur: sebagian besar destinasi masih memakai koordinat
        // titik desa karena objeknya belum terpetakan di OpenStreetMap
        // (diverifikasi lewat pencarian 14.351 objek di radius 25 km).
        // Untuk titik yang masih sama dengan pusat desa, tautan diarahkan
        // memakai NAMA tempat agar Google Maps mencarinya sendiri, bukan
        // memakai koordinat yang sama untuk semua destinasi. Titik desa
        // didefinisikan sekali di lib/geo.ts, dipakai juga oleh peta halaman.
        const koord = w.location;
        if (koord?.lat && koord?.lng) {
            const isVillagePoint = isVillageCenter(koord.lat, koord.lng);
            const query = isVillagePoint
                ? encodeURIComponent(`${w.title} Bantaragung Sindangwangi Majalengka`)
                : `${koord.lat},${koord.lng}`;
            facts["Arah Google Maps"] = `https://www.google.com/maps/search/?api=1&query=${query}`;
            if (!isVillagePoint) facts["Koordinat"] = `${koord.lat}, ${koord.lng}`;
        }

        facts["Halaman"] = `/wisata/${w.slug}`;

        cards.push({
            id: `wisata:${w.slug}`,
            kind: "wisata",
            title: w.title,
            href: `/wisata/${w.slug}`,
            summary: w.excerpt,
            cover: w.cover,
            facts,
            keywords: [
                w.title,
                w.slug.replace(/-/g, " "),
                WISATA_KATEGORI_LABEL[w.kategori] ?? "",
                ...(w.activities ?? []),
            ]
                .join(" ")
                .toLowerCase(),
            bodyTokens: [w.excerpt, w.description, ...(w.facilities ?? [])]
                .join(" ")
                .toLowerCase(),
        });
    }

    // Harga yang belum punya halaman destinasi tetap diindeks supaya tidak
    // hilang (mis. atraksi, paket, kuliner).
    for (const [slug, p] of pricing) {
        if (cards.some((c) => c.facts["Halaman"] === `/wisata/${slug}`)) continue;
        const facts: Record<string, string> = {
            Kategori: "layanan desa wisata",
            Harga: `${rupiah(p.priceFrom)}`,
        };
        if (p.contact?.phone) {
            const n = normalizePhone(p.contact.phone);
            facts["WhatsApp pengelola"] = `${n} (${waLink(n)})`;
        }
        if (p.contact?.address) facts["Lokasi"] = p.contact.address;
        if (p.facilities?.length) facts["Fasilitas"] = p.facilities.join(", ");
        facts["Halaman"] = "/wisata";

        cards.push({
            id: `wisata:${slug}`,
            kind: "wisata",
            title: p.name,
            href: "/wisata",
            summary: `Layanan desa wisata. Harga mulai ${rupiah(p.priceFrom)}.`,
            facts,
            keywords: `${p.name} ${slug.replace(/-/g, " ")} harga paket tiket`.toLowerCase(),
        });
    }

    // --- Herbal ------------------------------------------------------------
    for (const h of getAllHerbal()) {
        const facts: Record<string, string> = {
            "Nama latin": h.latin,
            Ringkasan: h.excerpt,
            Deskripsi: h.description,
        };
        if (h.benefits?.length) facts["Khasiat"] = h.benefits.join(", ");
        if (h.usage?.length) facts["Cara pemanfaatan"] = h.usage.join(", ");
        facts["Halaman"] = `/b2h/katalog/${h.slug}`;

        cards.push({
            id: `herbal:${h.slug}`,
            kind: "herbal",
            title: h.name,
            href: `/b2h/katalog/${h.slug}`,
            summary: h.excerpt,
            cover: h.cover,
            facts,
            keywords: `${h.name} ${h.latin} ${h.slug.replace(/-/g, " ")} tanaman herbal obat`.toLowerCase(),
            bodyTokens: [h.excerpt, h.description, ...(h.benefits ?? []), ...(h.usage ?? [])]
                .join(" ")
                .toLowerCase(),
        });
    }

    // --- Homestay ----------------------------------------------------------
    for (const h of getAllHomestay()) {
        const facts: Record<string, string> = {
            Ringkasan: h.excerpt,
            Deskripsi: h.description,
        };
        if (h.capacity) facts["Kapasitas"] = String(h.capacity);
        if (h.facilities?.length) facts["Fasilitas"] = h.facilities.join(", ");
        if (h.price) facts["Harga"] = h.price;
        if (h.address) facts["Alamat"] = h.address;
        const n = normalizePhone(h.contact?.whatsapp);
        if (n) facts["WhatsApp"] = `${n} (${waLink(n)})`;
        facts["Halaman"] = `/bdb/homestay/${h.slug}`;

        cards.push({
            id: `homestay:${h.slug}`,
            kind: "homestay",
            title: h.name,
            href: `/bdb/homestay/${h.slug}`,
            summary: h.excerpt,
            cover: h.cover,
            facts,
            keywords: `${h.name} ${h.slug.replace(/-/g, " ")} homestay penginapan inap nginep kapasitas`.toLowerCase(),
            bodyTokens: [h.excerpt, h.description, ...(h.facilities ?? []), h.address ?? ""]
                .join(" ")
                .toLowerCase(),
        });
    }

    // --- UMKM --------------------------------------------------------------
    for (const u of getAllUMKM()) {
        const facts: Record<string, string> = {
            Ringkasan: u.excerpt,
            Deskripsi: u.description,
        };
        const n = normalizePhone(u.contact?.whatsapp);
        if (n) facts["WhatsApp"] = `${n} (${waLink(n)})`;
        facts["Halaman"] = `/bdb/umkm/${u.slug}`;

        cards.push({
            id: `umkm:${u.slug}`,
            kind: "umkm",
            title: u.name,
            href: `/bdb/umkm/${u.slug}`,
            summary: u.excerpt,
            cover: u.cover,
            facts,
            keywords: `${u.name} ${u.slug.replace(/-/g, " ")} umkm usaha warung toko`.toLowerCase(),
            bodyTokens: [u.excerpt, u.description].join(" ").toLowerCase(),
        });
    }

    // --- Lokasi peta -------------------------------------------------------
    for (const l of getAllLocations()) {
        // Tautan arah dibangun dari koordinat yang memang sudah ada di data.
        // Tanpa ini, pertanyaan "letak lokasinya di mana?" dijawab koordinat
        // mentah saja  -  angka yang tidak bisa diklik dan tidak berguna di
        // ponsel. Koordinat tetap disimpan untuk ditampilkan sebagai rujukan.
        const facts: Record<string, string> = {
            Kategori: l.category,
            Ringkasan: l.excerpt,
            Koordinat: `${l.lat}, ${l.lng}`,
        };
        if (l.lat && l.lng) {
            facts["Arah Google Maps"] =
                `https://www.google.com/maps/search/?api=1&query=${l.lat},${l.lng}`;
        }
        facts["Halaman"] = `/bmc/lokasi/${l.slug}`;

        cards.push({
            id: `lokasi:${l.slug}`,
            kind: "lokasi",
            title: l.name,
            href: `/bmc/lokasi/${l.slug}`,
            summary: l.excerpt,
            cover: l.cover,
            facts,
            keywords: `${l.name} ${l.slug.replace(/-/g, " ")} peta lokasi ${l.category}`.toLowerCase(),
        });
    }

    // --- Profil desa -------------------------------------------------------
    try {
        const profile = loadJSON<Record<string, unknown>>("settings/profile.json");
        const asList = (v: unknown): string =>
            Array.isArray(v) ? v.map(String).join("; ") : typeof v === "string" ? v : "";
        const facts: Record<string, string> = {};
        if (profile.overview) facts["Ringkasan desa"] = String(profile.overview);
        if (profile.priorityPrograms) facts["Program prioritas"] = asList(profile.priorityPrograms);
        if (profile.potensiFisik) facts["Potensi fisik"] = asList(profile.potensiFisik);
        if (profile.potensiNonFisik) facts["Potensi non-fisik"] = asList(profile.potensiNonFisik);
        if (profile.kearifanLokal) facts["Kearifan lokal & tradisi"] = asList(profile.kearifanLokal);
        if (profile.prestasi) facts["Prestasi & penghargaan"] = asList(profile.prestasi);
        if (profile.fasilitasUmum) facts["Fasilitas umum"] = asList(profile.fasilitasUmum);
        facts["Lokasi"] = `${site.location.village}, Kec. ${site.location.district}, Kab. ${site.location.regency}, ${site.location.province}`;
        facts["Halaman"] = "/tentang";

        cards.push({
            id: "profil:desa",
            kind: "profil",
            title: "Profil Desa Wisata Bantaragung",
            href: "/tentang",
            summary: String(profile.overview ?? "") || seo.defaultDescription,
            facts,
            keywords:
                "profil tentang desa sejarah kearifan lokal tradisi prestasi penghargaan adwi api wisata potensi program",
        });
    } catch {
        // profil.json tidak ada: lewati, bot tetap bisa menjawab modul lain.
    }

    // --- Kontak & jam operasional -----------------------------------------
    const maps = (() => {
        try {
            const cfg = getMapsConfig();
            return cfg.categories
                .map((c) => `${c.name} (${c.maps.length} peta)`)
                .join("; ");
        } catch {
            return "";
        }
    })();

    const contactFacts: Record<string, string> = {
        "Nama situs": site.siteName,
        Tagline: site.tagline,
        Alamat: contact.address,
        WhatsApp: `${contact.whatsappDisplay} (${contact.whatsappUrl})`,
        Email: contact.email,
        "Jam operasional": contact.businessHours,
        "Google Maps": contact.googleMapsUrl,
        Instagram: contact.instagram,
    };
    if (maps) contactFacts["Peta digital tersedia"] = maps;
    contactFacts["Halaman"] = "/kontak";

    cards.push({
        id: "kontak:utama",
        kind: "kontak",
        title: "Kontak & jam operasional Desa Wisata Bantaragung",
        href: "/kontak",
        summary: `WhatsApp ${contact.whatsappDisplay}, email ${contact.email}. ${contact.businessHours}.`,
        facts: contactFacts,
        keywords:
            "kontak hubungi whatsapp wa email alamat lokasi jam buka operasional pemesanan booking reservasi admin pengelola nomor telepon instagram",
    });

    // --- Chunk artikel & berita -------------------------------------------
    const chunks: TextChunk[] = [];
    for (const a of getAllArticles()) {
        const paragraphs = a.content ?? [];
        const full = paragraphs.join(" ");
        const href =
            a.origin === "berita" ? `/bic/artikel/${a.slug}` : `/bic/artikel/${a.slug}`;

        // Header selalu diindeks (judul + ringkasan pendek) agar tetap bisa
        // ditemukan tanpa memuat seluruh isi artikel ke konteks model. Batas
        // 280 karakter menjaga biaya token tetap kecil meski sumber menulis
        // ringkasan panjang.
        const headText = `${a.title}. ${a.excerpt}`.replace(/\s+/g, " ").trim();
        chunks.push({
            id: `${a.origin}:${a.slug}:head`,
            kind: a.origin === "berita" ? "berita" : "artikel",
            title: a.title,
            href,
            date: a.date,
            category: a.category,
            tags: a.tags ?? [],
            text: headText.length > 280 ? `${headText.slice(0, 277).trimEnd()}...` : headText,
        });

        // Isi hanya diindeks bila stylenya aman.
        const safe = a.origin === "berita" ? isStyleSafe(full) : full.length >= 200;
        if (!safe) continue;

        chunkText(paragraphs).forEach((part, i) => {
            // Prefiks judul di setiap potongan isi: BM25 memberi skor tinggi
            // bila kata kunci muncul di teks yang dinilai, dan judul memuat
            // kata kunci topik terkuat (mis. "KKN"). Tanpa prefiks, potongan
            // kedua/ketiga kalah hanya karena judulnya tidak ikut dinilai.
            const text = i === 0 ? part : `${a.title}. ${part}`;
            chunks.push({
                id: `${a.origin}:${a.slug}:${i}`,
                kind: a.origin === "berita" ? "berita" : "artikel",
                title: a.title,
                href,
                date: a.date,
                category: a.category,
                tags: a.tags ?? [],
                text,
            });
        });
    }

    // --- Statistik untuk BM25 ---------------------------------------------
    const docFreq = new Map<string, number>();
    let totalLen = 0;
    for (const c of chunks) {
        const terms = new Set(tokenize(`${c.title} ${c.text} ${c.tags.join(" ")}`));
        for (const t of terms) docFreq.set(t, (docFreq.get(t) ?? 0) + 1);
        totalLen += tokenize(c.text).length;
    }

    cache = {
        cards,
        chunks,
        docFreq,
        avgChunkLen: chunks.length ? totalLen / chunks.length : 0,
        builtAt: new Date().toISOString(),
    };
    cacheExpiresAt = Date.now() + CACHE_TTL_MS;
    return cache;
}

/** Tokenisasi sederhana: huruf/angka, buang kata umum bahasa Indonesia. */
const STOPWORDS = new Set([
    "yang", "dan", "di", "ke", "dari", "untuk", "pada", "dengan", "adalah",
    "ini", "itu", "ada", "apa", "apa", "saya", "aku", "kamu", "anda", "bisa",
    "kah", "nya", "sih", "dong", "ya", "tidak", "tak", "juga", "akan", "atau",
    "dalam", "oleh", "sebagai", "bagaimana", "berapa", "dimana", "mana",
    "kapan", "siapa", "mau", "ingin", "pengen", "minta", "tolong", "kak",
    "min", "bang", "halo", "hai", "hi", "terima", "kasih", "makasih",
    "tentang", "mengenai", "soal", "terkait", "saja", "aja", "pun", "lah",
    "the", "a", "an", "is", "are", "to", "of", "and", "in", "for",
]);

export function tokenize(text: string): string[] {
    return String(text ?? "")
        .toLowerCase()
        .normalize("NFKD")
        .replace(/[^a-z0-9\s]/g, " ")
        .split(/\s+/)
        .filter((w) => w.length > 2 && !STOPWORDS.has(w));
}

/** Hanya untuk pengujian: paksa indeks dibangun ulang. */
export function resetIndexForTests(): void {
    cache = null;
    cacheExpiresAt = 0;
}
