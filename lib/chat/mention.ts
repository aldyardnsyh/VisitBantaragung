import "server-only";

import { buildIndex, tokenize, type EntityCard } from "@/lib/chat/index";

/**
 * Deteksi nama tempat yang disebut pengunjung, TOLERAN salah ketik.
 *
 * Mengapa modul ini ada: pengunjung jarang menulis nama tempat dengan ejaan
 * yang tepat. "Saya ingin ke curug cipeteuy" (kurang satu huruf) sebelumnya
 * tidak dikenali sebagai penyebutan entitas, sehingga pertanyaan itu jatuh ke
 * jalur umum dan bisa dijawab tentang tempat yang salah.
 *
 * Dua tingkat keyakinan:
 *
 * - `strong`: SELURUH kata bermakna pada nama entitas cocok (ejaan persis
 *   atau mirip). Contoh: "curug cipeteuy" => Curug Cipeuteuy. Yang disebut
 *   begitu jelas harus dijawab tentang tempat itu, bukan yang lain.
 * - `weak`: satu kata khas (muncul di satu judul saja) cocok. Contoh:
 *   "genjring". Cukup untuk mengarahkan pencarian, tetapi TIDAK boleh
 *   mematikan jalur daftar/rekomendasi, karena kata seperti "perkemahan"
 *   juga muncul di pertanyaan umum.
 */

export interface EntityMention {
    card: EntityCard;
    /** true = seluruh kata nama cocok; false = hanya satu kata khas. */
    strong: boolean;
}

/**
 * Kata yang tidak membedakan entitas (kategori/sapaan). Dibuang dari nama
 * sebelum dicocokkan, sama seperti di jalur lain, supaya "Homestay Bu Ani"
 * diwakili kata "ani".
 */
const GENERIC_WORDS = new Set([
    "homestay",
    "penginapan",
    "kampung",
    "paket",
    "wisata",
    "desa",
    "pak",
    "ibu",
    "bu",
]);

/**
 * Nama desa sendiri. Tetap ikut dicocokkan (pertanyaan "profil desa
 * bantaragung" secara harfiah memuatnya), tetapi TIDAK dihitung sebagai bukti
 * pengunjung menyebut entitas tertentu: hampir semua pertanyaan wajar memuat
 * "bantaragung".
 *
 * Tanpa pemisahan ini, "prestasi desa bantaragung" dianggap menyebut
 * "Paket Desa Wisata Bantaragung" (kata lain pada judul itu semua generik)
 * sehingga jawabannya melenceng ke paket wisata.
 */
const PLACE_WORDS = new Set(["bantaragung"]);

function titleWords(title: string): string[] {
    return String(title ?? "")
        .toLowerCase()
        .split(/[^a-z0-9]+/)
        .filter((w) => w.length >= 3 && !GENERIC_WORDS.has(w));
}

/** Kata nama yang benar-benar membedakan entitas (bukan kategori/nama desa). */
function identifyingWords(title: string): string[] {
    return titleWords(title).filter((w) => !PLACE_WORDS.has(w));
}

/** Jarak edit dengan pemotongan: berhenti begitu melebihi `max`. */
function editDistance(a: string, b: string, max: number): number {
    if (Math.abs(a.length - b.length) > max) return max + 1;
    let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
    for (let i = 1; i <= a.length; i++) {
        const cur = [i];
        let rowMin = i;
        for (let j = 1; j <= b.length; j++) {
            const cost = a[i - 1] === b[j - 1] ? 0 : 1;
            const v = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost);
            cur.push(v);
            if (v < rowMin) rowMin = v;
        }
        if (rowMin > max) return max + 1;
        prev = cur;
    }
    return prev[b.length];
}

/**
 * Cocokkan satu kata nama dengan satu kata pertanyaan.
 *
 * Fuzzy hanya untuk kata >= 5 huruf dengan huruf awal sama, toleransi 1 huruf
 * (2 huruf untuk kata panjang). Batas ketat ini sengaja: "cipeteuy" vs
 * "cipeuteuy" cocok, tetapi kata pendek seperti "kuda" tidak ditaksir-taksir.
 */
function wordMatch(titleWord: string, queryWord: string): "exact" | "fuzzy" | null {
    if (titleWord === queryWord) return "exact";
    if (titleWord.length < 5 || queryWord.length < 4) return null;
    if (titleWord[0] !== queryWord[0]) return null;
    const limit = titleWord.length >= 9 ? 2 : 1;
    return editDistance(titleWord, queryWord, limit) <= limit ? "fuzzy" : null;
}

const KIND_RANK: EntityCard["kind"][] = [
    "wisata",
    "homestay",
    "umkm",
    "herbal",
    "lokasi",
    "profil",
    "kontak",
];

/** Bandingkan dua kandidat secara leksikografis; angka kecil menang. */
function better(a: number[], b: number[]): boolean {
    for (let i = 0; i < a.length; i++) {
        if (a[i] !== b[i]) return a[i] < b[i];
    }
    return false;
}

export function findMentionedEntity(question: string): EntityMention | null {
    const index = buildIndex();
    const qTokens = tokenize(question);
    if (!qTokens.length) return null;

    // Seberapa umum sebuah kata di seluruh judul. Kata yang hanya muncul di
    // satu judul adalah penanda khas ("genjring"); kata seperti "curug" tidak.
    const freq = new Map<string, number>();
    for (const c of index.cards) {
        for (const w of new Set(titleWords(c.title))) {
            freq.set(w, (freq.get(w) ?? 0) + 1);
        }
    }

    let strong: { card: EntityCard; rank: number[] } | null = null;
    let weak: { card: EntityCard; rank: number[] } | null = null;

    for (const card of index.cards) {
        const tw = titleWords(card.title);
        if (!tw.length) continue;

        // Judul yang hanya berisi kategori + nama desa ("Paket Desa Wisata
        // Bantaragung") tidak bisa dikenali dari kata yang menyebutnya; biarkan
        // jalur kebutuhan/daftar yang menanganinya.
        if (identifyingWords(card.title).length === 0) continue;

        let exact = 0;
        let fuzzy = 0;
        let matched = 0;
        let distinctiveLen = 0;

        for (const w of tw) {
            let hit: "exact" | "fuzzy" | null = null;
            for (const t of qTokens) {
                const m = wordMatch(w, t);
                if (m === "exact") {
                    hit = "exact";
                    break;
                }
                if (m === "fuzzy") hit = "fuzzy";
            }
            if (!hit) continue;
            matched++;
            if (hit === "exact") exact++;
            else fuzzy++;
            if ((freq.get(w) ?? 1) === 1 && w.length >= 6) {
                distinctiveLen = Math.max(distinctiveLen, w.length);
            }
        }

        const kind = KIND_RANK.indexOf(card.kind);

        if (matched > 0 && matched === tw.length) {
            // Kandidat kuat: skor cocok tertinggi, lalu jenis paling relevan
            // (halaman wisata lebih baik daripada titik peta kembar dengan
            // nama sama), lalu judul paling ringkas.
            const rank = [-(exact * 2 + fuzzy), kind, tw.length];
            if (!strong || better(rank, strong.rank)) strong = { card, rank };
            continue;
        }

        if (distinctiveLen > 0) {
            const rank = [-distinctiveLen, kind, tw.length];
            if (!weak || better(rank, weak.rank)) weak = { card, rank };
        }
    }

    if (strong) return { card: strong.card, strong: true };
    if (weak) return { card: weak.card, strong: false };
    return null;
}
