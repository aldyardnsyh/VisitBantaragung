import "server-only";

import { getPublicContact } from "@/lib/content";
import type { RetrievalResult } from "@/lib/chat/retrieve";

/**
 * Jawaban tanpa LLM.
 *
 * Dipakai ketika seluruh rantai model gagal (kuota harian habis, kunci salah,
 * atau penyedia sedang sibuk). Prinsipnya: pengunjung tidak boleh menemui
 * jalan buntu. Karena hasil retrieval sudah memuat fakta yang benar, jawaban
 * bisa disusun langsung dari kartu entitas tanpa risiko halusinasi.
 */

export interface FallbackAnswer {
    answer: string;
    sources: { n: number; title: string; href: string }[];
    /** true bila dijawab dari data, false bila hanya arahan kontak. */
    grounded: boolean;
}

function factPreview(facts: Record<string, string>, keys: string[]): string[] {
    const out: string[] = [];
    for (const key of keys) {
        const v = facts[key];
        if (v && v.trim()) out.push(`${key}: ${v}`);
    }
    return out;
}

/**
 * Pilih field yang paling mungkin dicari, berdasarkan kata di pertanyaan.
 *
 * Sebelumnya daftar field selalu berurutan sama, sehingga pertanyaan
 * "prestasi desa" hanya menampilkan ringkasan dan deskripsi  -  fakta prestasi
 * yang justru dicari justru terpotong. Pemetaan kata kunci -> field membuat
 * fallback tetap menjawab inti pertanyaan walau tanpa LLM.
 */
const FIELD_HINTS: { re: RegExp; keys: string[] }[] = [
    { re: /prestasi|penghargaan|juara|adwi|api\b|award/i, keys: ["Prestasi & penghargaan"] },
    { re: /tradisi|kearifan|budaya|adat|nyura|safar|seba/i, keys: ["Kearifan lokal & tradisi"] },
    { re: /fasilitas|sarana|toilet|musholla|parkir/i, keys: ["Fasilitas", "Fasilitas umum"] },
    { re: /khasiat|manfaat|obat|imun|sehat|kesehatan/i, keys: ["Khasiat", "Cara pemanfaatan"] },
    { re: /harga|tiket|biaya|tarif|berapa/i, keys: ["Harga mulai", "Harga"] },
    { re: /kapasitas|muat|orang|tamu/i, keys: ["Kapasitas"] },
    { re: /jam|buka|operasional|libur/i, keys: ["Jam operasional"] },
    { re: /kontak|whatsapp|wa\b|email|hubungi|telepon/i, keys: ["WhatsApp", "WhatsApp pengelola", "Email"] },
    { re: /lokasi|alamat|di mana|dimana|arah|rute|maps/i, keys: ["Lokasi", "Alamat", "Google Maps"] },
    { re: /aktivitas|kegiatan|bisa apa|atraksi/i, keys: ["Aktivitas"] },
    { re: /program|prioritas|unggulan/i, keys: ["Program prioritas"] },
    { re: /potensi/i, keys: ["Potensi fisik", "Potensi non-fisik"] },
];

const DEFAULT_KEYS = [
    "Ringkasan desa",
    "Harga mulai",
    "Harga",
    "Kapasitas",
    "Khasiat",
    "Fasilitas",
    "Jam operasional",
    "WhatsApp",
    "WhatsApp pengelola",
];

/**
 * Pilih field yang paling mungkin dicari, berdasarkan kata di pertanyaan.
 *
 * Diekspor karena dipakai juga oleh penyusun jawaban terstruktur
 * (lib/chat/structured.ts) untuk memilih fakta yang relevan saat model tidak
 * bisa dipakai.
 */
export function pickKeys(question: string): string[] {
    const matched = FIELD_HINTS.filter((h) => h.re.test(question)).flatMap((h) => h.keys);
    // Field yang relevan didahulukan, sisanya jadi pelengkap.
    return [...new Set([...matched, ...DEFAULT_KEYS])];
}

export function buildFallbackAnswer(result: RetrievalResult, question = ""): FallbackAnswer {
    const contact = getPublicContact();
    const sources: { n: number; title: string; href: string }[] = [];
    const keys = pickKeys(question);

    const top = result.cards.slice(0, 3);

    if (top.length) {
        const parts: string[] = [];
        top.forEach(({ card }, i) => {
            const n = i + 1;
            sources.push({ n, title: card.title, href: card.href });
            const lines = factPreview(card.facts, keys).slice(0, 3);
            const body = lines.length ? lines.join(" | ") : card.summary;
            parts.push(`${n}. ${card.title}  -  ${body}`);
        });

        const answer =
            `Berikut yang saya temukan di situs Bantaragung:\n\n${parts.join("\n")}\n\n` +
            `Kalau butuh kepastian atau ingin memesan, pengelola bisa dihubungi di ` +
            `WhatsApp ${contact.whatsappDisplay}.`;

        return { answer, sources, grounded: true };
    }

    return {
        answer:
            `Maaf, saya belum menemukan informasi itu di situs Bantaragung. ` +
            `Silakan hubungi pengelola desa wisata di WhatsApp ${contact.whatsappDisplay} ` +
            `atau email ${contact.email}  -  tim desa wisata akan menjawab langsung.`,
        sources: [],
        grounded: false,
    };
}

/** Pesan saat layanan sengaja dimatikan lewat env. */
export function buildDisabledAnswer(): FallbackAnswer {
    const contact = getPublicContact();
    return {
        answer:
            `Pemandu digital sedang tidak aktif. Anda tetap bisa menjelajahi halaman ` +
            `Wisata, Kampung Herbal, Peta Digital, dan Bisnis Desa di situs ini, atau ` +
            `menghubungi pengelola lewat WhatsApp ${contact.whatsappDisplay}.`,
        sources: [],
        grounded: false,
    };
}
