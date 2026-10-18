import "server-only";

import { getPublicContact } from "@/lib/content";

/**
 * Percakapan sosial: sapaan, ucapan terima kasih, pujian, dan penutup.
 *
 * Mengapa modul ini ada: pengunjung sering menutup percakapan dengan
 * "oke terima kasih sangat membantu informasinya". Kalimat seperti itu BUKAN
 * pertanyaan, tetapi tetap lolos penjaga cakupan karena merupakan lanjutan
 * percakapan. Dulu kalimat itu diteruskan ke retrieval, yang lalu menjaring
 * entitas dari riwayat dan membalas profil lengkapnya lagi  -  mengulang
 * informasi yang baru saja dibaca dan terasa tidak manusiawi.
 *
 * Di sini kalimat semacam itu dikenali lebih dulu dan dijawab sebagai manusia:
 * singkat, hangat, tanpa mengulang data, dan tanpa memanggil model bahasa.
 *
 * Aturan penting yang dijaga:
 * - Hanya menangkap kalimat PENDEK yang isinya murni sosial. Kalimat yang
 *   masih memuat permintaan ("terima kasih, sekalian minta rute ke curug")
 *   tidak diambil alih modul ini.
 * - Tidak mengarang fakta. Bila menawarkan bantuan lanjutan, hanya menyebut
 *   topik yang memang ada di situs.
 */

export type SocialKind = "sapaan" | "terima_kasih" | "pujian" | "penutup";

export interface SocialAnswer {
    kind: SocialKind;
    answer: string;
}

/**
 * Kata yang menandakan masih ada permintaan nyata di dalam kalimat.
 *
 * Kalimat yang mengandung salah satunya TIDAK ditangani sebagai percakapan
 * sosial, supaya "makasih, tapi tiketnya berapa?" tetap dijawab sebagai
 * pertanyaan.
 */
const REQUEST_HINT =
    /\b(berapa|harga|tiket|jam|buka|lokasi|alamat|rute|arah|dimana|di mana|kemana|ke mana|apa saja|apa aja|siapa|kapan|bagaimana|gimana|apakah|cara|rekomendasi|saran|pesan|booking|daftar|hubungi|kontak|nomor|telpon|telepon|wa|whatsapp|mau|ingin|pengen|butuh|perlu|tolong|minta|carikan|carikanlah|tunjukkan|info|informasi soal|jelaskan|sebutkan)\b/i;

/** Sapaan pembuka. */
const GREETING = /^(halo|hallo|helo|hai|hi|hei|hey|pagi|selamat pagi|siang|selamat siang|sore|selamat sore|malam|selamat malam|sampurasun|sampurasu|punten|assalamualaikum|assalamu'alaikum|permisi)\b/i;

/** Ucapan terima kasih dan variasinya. */
const THANKS =
    /(terima ?kasih|terimakasih|makasih|mksh|thanks|thank you|tks|thx|nuhun|hatur nuhun|syukur|alhamdulillah)/i;

/**
 * Pujian atas jawaban.
 *
 * Sengaja TIDAK memuat pujian berdiri sendiri seperti "sip", "mantap", atau
 * "oke" saja: itu basa-basi yang tidak perlu dibalas dengan kalimat panjang.
 * Yang ditangkap hanya pujian yang jelas menyebut kualitas jawaban.
 */
const PRAISE =
    /\b(sangat membantu|membantu sekali|membantu banget|cukup membantu|informasinya (bagus|lengkap|jelas)|jawabannya (bagus|lengkap|jelas|membantu)|sangat (jelas|lengkap|bermanfaat)|bermanfaat sekali|puas|senang sekali|suka jawabannya|recommended|recommend banget)\b/i;

/** Penutup percakapan. */
const CLOSING =
    /\b(selesai|cukup|sudah cukup|oke cukup|itu saja|gitu saja|segitu saja|sudah dulu|dulu ya|bye|by|dadah|sampai jumpa|sampai ketemu|selamat tinggal|pamit|wassalamualaikum|wassalamu'alaikum)\b/i;

/** Frasa pembuka yang biasanya hanya basa-basi sebelum inti kalimat. */
const LEAD_FILLER = /^(oke|ok|okey|okay|baik|baiklah|siap|sip|nah|jadi|ya|yah|iya|oh|ohh|wah|wow|hmm|nah gitu|gitu|mantap|keren|alhamdulillah)[\s,.!]+/i;

function normalize(text: string): string {
    return String(text ?? "")
        .toLowerCase()
        .replace(/[^\p{L}\p{N}\s'.,!?-]/gu, " ")
        .replace(/\s+/g, " ")
        .trim();
}

/** Buang basa-basi pembuka berulang ("oke", "baik", "sip"). */
function stripLeadFillers(text: string): string {
    let out = text;
    for (let i = 0; i < 3; i++) {
        const next = out.replace(LEAD_FILLER, "").trim();
        if (next === out) break;
        out = next;
    }
    return out;
}

/**
 * Kalimat ini murni sosial (tanpa permintaan nyata)?
 *
 * Dipakai pemanggil sebelum retrieval dijalankan.
 */
export function detectSocial(question: string): SocialKind | null {
    const raw = String(question ?? "").trim();
    if (!raw) return null;

    // Pertanyaan nyata tidak pernah diambil alih jalur sosial.
    if (raw.includes("?")) return null;
    if (REQUEST_HINT.test(raw)) return null;
    // Nama tempat yang disebut berarti pengunjung masih membahas data.
    // (Diperiksa pemanggil lewat findMentionedEntity agar modul ini tetap
    // sederhana dan tidak bergantung pada indeks.)

    const q = stripLeadFillers(normalize(raw));
    if (!q) return null;

    const words = q.split(/\s+/).filter(Boolean);
    // Kalimat sosial itu pendek. Yang panjang hampir pasti berisi permintaan
    // tersembunyi yang tidak tertangkap daftar kata di atas.
    if (words.length > 9) return null;

    if (THANKS.test(q)) return "terima_kasih";
    if (CLOSING.test(q)) return "penutup";
    if (GREETING.test(q)) return "sapaan";
    if (PRAISE.test(q)) return "pujian";

    return null;
}

/** Sebut jam operasional hanya bila datanya ada. */
function operationalLine(): string {
    const jam = String(getPublicContact().businessHours ?? "").trim();
    return jam ? `Pengelola bisa dihubungi pada jam ${jam} WIB.` : "";
}

/** Sapaan nama desa, dipakai di beberapa balasan. */
const DESA = "Desa Wisata Bantaragung";

/**
 * Susun balasan sosial yang natural.
 *
 * `lastTopic` adalah judul entitas yang terakhir dibahas (bila ada), dipakai
 * untuk menutup percakapan dengan menyebut objeknya  -  sekali saja, bukan
 * mengulang profilnya.
 */
export function buildSocialAnswer(kind: SocialKind, lastTopic?: string | null): SocialAnswer {
    const topic = String(lastTopic ?? "").trim();
    // Sebut objek yang barusan dibahas SEKALI, tanpa mengulang isinya.
    const topicLine = topic ? ` Semoga penjelasan soal ${topic} membantu.` : "";
    const offer =
        "Kalau nanti butuh tiket, rute, penginapan, atau rekomendasi tempat lain, tinggal tanya saja.";

    switch (kind) {
        case "terima_kasih":
            return {
                kind,
                answer: `Sama-sama, senang bisa membantu.${topicLine} ${offer}`.replace(/\s+/g, " ").trim(),
            };

        case "pujian":
            return {
                kind,
                answer: `Terima kasih, saya ikut senang kalau informasinya berguna.${topicLine} ${offer}`
                    .replace(/\s+/g, " ")
                    .trim(),
            };

        case "penutup":
            return {
                kind,
                answer: `Baik, terima kasih sudah mampir ke ${DESA}.${topicLine} Selamat menikmati perjalanan, dan hati-hati di jalan.`
                    .replace(/\s+/g, " ")
                    .trim(),
            };

        case "sapaan": {
            const jam = operationalLine();
            return {
                kind,
                answer: `Sampurasun! Saya pemandu digital ${DESA}. Saya bisa bantu soal destinasi, tiket, penginapan, kuliner, kampung herbal, dan UMKM desa. Mau mulai dari mana?${jam ? ` ${jam}` : ""}`,
            };
        }

        default:
            return {
                kind,
                answer: `Kalau masih ada yang ingin ditanyakan soal ${DESA}, saya siap membantu.`,
            };
    }
}
