import "server-only";

/**
 * Penjaga masukan dan keluaran chatbot.
 *
 * Prompt saja tidak cukup: model gratis yang lebih kecil mudah dibelokkan.
 * Karena itu ada lapisan deterministik yang berjalan sebelum dan sesudah LLM,
 * sehingga hasilnya tidak bergantung pada kepatuhan model.
 */

export interface GuardResult {
    ok: boolean;
    /** Alasan penolakan, dipakai untuk membalas tanpa memanggil LLM. */
    reason?: "empty" | "too_long" | "jailbreak" | "off_topic" | "spam";
    /** Pesan balasan siap kirim bila ditolak. */
    reply?: string;
}

const MAX_INPUT_CHARS = 600;

const OFF_TOPIC_REPLY =
    "Maaf, saya hanya bisa membantu seputar Desa Wisata Bantaragung: destinasi, " +
    "kampung herbal, homestay dan UMKM, peta digital, berita desa, serta kontak pengelola. " +
    "Ada yang ingin Anda ketahui tentang Bantaragung?";

const JAILBREAK_REPLY =
    "Saya pemandu digital Desa Wisata Bantaragung dan tidak bisa keluar dari peran itu. " +
    "Kalau ada pertanyaan soal wisata, tanaman herbal, penginapan, atau kontak pengelola, " +
    "saya siap membantu.";

/**
 * Pola permintaan untuk mengubah peran atau membocorkan instruksi. Ditulis
 * sebagai daftar agar mudah ditinjau dan ditambah tanpa mengubah logika.
 */
const JAILBREAK_PATTERNS: { re: RegExp; label: string }[] = [
    { re: /ignore\s+(all\s+)?(previous|prior|above)\s+instructions?/i, label: "ignore-previous" },
    { re: /(abaikan|lupakan|hapus)\s+(semua\s+)?(instruksi|perintah|aturan|prompt)/i, label: "abaikan-instruksi" },
    { re: /(kamu|anda|you)\s+(sekarang|now)\s+(adalah|are|adl)/i, label: "ganti-peran" },
    { re: /\b(act|behave|pretend)\s+as\b/i, label: "act-as" },
    { re: /(system|developer)\s*prompt/i, label: "bocor-prompt" },
    { re: /(tampilkan|tunjukkan|print|kasih|beri|reveal|show)\s+.*(prompt|instruksi|system)/i, label: "minta-prompt" },
    { re: /<\/?\s*(konteks|context|system|instruksi)\s*>/i, label: "tag-injection" },
    { re: /\bDAN\s+mode\b|\bjailbreak\b|\bdo\s+anything\s+now\b/i, label: "jailbreak" },
    { re: /(kamu|anda)\s+(bukan|no\s+longer)\s+(pemandu|asisten|bot)/i, label: "ganti-identitas" },
    { re: /\b(hack|crack|exploit|malware|phishing|sql\s*injection)\b/i, label: "kode-berbahaya" },
    { re: /(buatkan|tuliskan|generate)\s+(kode|script|program|virus)/i, label: "minta-kode" },
];

/** Topik yang jelas di luar cakupan situs. */
const OFF_TOPIC_PATTERNS: RegExp[] = [
    /\b(resep|resep)\s+(nasi|ayam|kue|sambal|cake|bolu)\b/i,
    /\b(puisi|pantun|cerpen|novel|lirik|lagu)\b/i,
    /\b(buat|tulis|karang|bikin)\b[^.]{0,40}\b(puisi|pantun|cerpen|novel|lirik|lagu|esai|dongeng)\b/i,
    /\b(politik|presiden|pemilu|partai)\b/i,
    /\b(saham|crypto|bitcoin|forex|judi|slot|togel)\b/i,
    /\b(obat\s+keras|narkoba|narkotika|ganja)\b/i,
    /\b(debug|compile|refactor|javascript|python|typescript|react|node)\b/i,
    /\b(cuaca|weather|gempa|kurs|nilai\s+tukar)\b/i,
    /\b(terjemahkan|translate)\b/i,
];

/**
 * Bersihkan masukan: buang karakter tak terlihat yang sering dipakai untuk
 * menyusupkan instruksi ke dalam teks yang tampak wajar.
 */
export function sanitizeInput(raw: string): string {
    return String(raw ?? "")
        .replace(/[\u200B-\u200D\uFEFF\u2060]/g, "")
        .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "")
        .replace(/\s+/g, " ")
        .trim();
}

export function checkInput(raw: string): GuardResult {
    const text = sanitizeInput(raw);

    if (!text) return { ok: false, reason: "empty", reply: "Silakan tulis pertanyaan Anda." };

    if (text.length > MAX_INPUT_CHARS) {
        return {
            ok: false,
            reason: "too_long",
            reply: `Pertanyaan terlalu panjang (maksimal ${MAX_INPUT_CHARS} karakter). Mohon ringkas agar saya bisa menjawab dengan tepat.`,
        };
    }

    for (const { re } of JAILBREAK_PATTERNS) {
        if (re.test(text)) return { ok: false, reason: "jailbreak", reply: JAILBREAK_REPLY };
    }

    for (const re of OFF_TOPIC_PATTERNS) {
        if (re.test(text)) return { ok: false, reason: "off_topic", reply: OFF_TOPIC_REPLY };
    }

    // Baris baru berlebihan atau pengulangan karakter panjang = percobaan spam.
    if (/(.)\1{40,}/.test(text)) {
        return { ok: false, reason: "spam", reply: "Mohon kirim pertanyaan yang wajar, ya." };
    }

    return { ok: true };
}

/**
 * Filter keluaran  -  lapisan pertahanan terakhir.
 *
 * Prompt bagus tidak menjamin model patuh, terutama model gratis. Kegagalan
 * nyata yang pernah terjadi pada sistem ini:
 *
 *   1. Karakter asing/mojibake: "Tiket ??????? mulai dari..."  (dilihat pemilik)
 *   2. Nama model/penyedia terbocor di jawaban.
 *   3. Isi <konteks> atau instruksi sistem bocor.
 *   4. Angka karangan: harga/jumlah yang TIDAK ada di konteks.
 *   5. Bahasa asing liar di tengah kalimat Indonesia.
 *   6. Jawaban keluar topik padahal konteksnya tersedia.
 *
 * Setiap pelanggaran menghasilkan `reason` yang spesifik agar dapat dicatat
 * dan dievaluasi. Pemanggil TIDAK boleh membuang hasil retrieval ketika guard
 * menolak  -  lihat `app/api/chat/route.ts`: jawaban diturunkan ke penyusun
 * terstruktur yang dibangun dari data yang sama.
 */

export type OutputIssue =
    | "empty"
    | "model_identity_leak"
    | "context_leak"
    | "foreign_chars"
    | "mojibake"
    | "unverified_numbers"
    | "off_topic_drift"
    | "degenerate_repetition";

export interface OutputCheck {
    ok: boolean;
    cleaned: string;
    issues: OutputIssue[];
}

/** Karakter yang sah untuk jawaban bahasa Indonesia. */


/**
 * Buang penanda "slop" yang membuat jawaban terasa seperti template AI:
 *
 *  - **tebal** berlebihan. Nama tempat cukup ditulis biasa; menebalkan setiap
 *    entitas membuat jawaban terlihat seperti keluaran generator.
 *  - Penomoran kaku "1. **Nama** - ..." diganti butir "- Nama: ...", lebih
 *    ringan dibaca dan tidak menyisakan dua tingkat penanda sekaligus.
 *  - Frasa pembuka template yang tidak menambah informasi.
 *
 * Dipakai pada jalur TERSTRUKTUR (data dari indeks), karena jalur model
 * sudah dinormalisasi lewat prompt dan tetap diperiksa di checkOutput.
 */
export function stripSlop(input: string): string {
    let out = String(input ?? "");

    // 1. Penomoran + bold -> butir biasa.
    out = out.replace(/^\s*\d+\.\s*\*\*(.+?)\*\*\s*(?:-\s*)?(.*)$/gm, (_m, title, rest) =>
        rest && rest.trim() ? `- ${title}: ${rest.trim()}` : `- ${title}`
    );

    // 2. Bold yang tersisa (mis. **Harga mulai:**) -> teks biasa.
    out = out.replace(/\*\*(.+?)\*\*/g, "$1");

    // 3. Bold yang membungkus satu baris utuh (judul bagian) -> hilangkan.
    out = out.replace(/^\s*\*\*(.+?)\*\*\s*$/gm, "$1");

    // 4. Frasa pembuka template yang tidak informatif.
    out = out
        .replace(/^Berikut yang saya temukan di situs Bantaragung:\s*/gim, "")
        .replace(/^Yang paling berkaitan:\s*/gim, "")
        .replace(/^Ini tulisan yang paling relevan dengan pertanyaan Anda:\s*/gim, "")
        .replace(/^Ini yang saya temukan beserta harganya:\s*/gim, "");

    // 5. Kalimat penutup berulang yang berbunyi seperti asisten.
    out = out
        .replace(/Mau saya bantu susun rencana kunjungan atau cek satu per satu\?/gi, "Mau saya bantu pilih yang cocok?")
        .replace(/Mau saya bantu arahkan ke pengelola[^?]*\?/gi, "")
        .replace(/Mau saya bantu arahkan ke kontak pengelolanya\?/gi, "")
        .replace(/Kalau ingin detail salah satunya, sebutkan namanya - saya jelaskan lebih lengkap\./gi,
                 "Sebut saja namanya kalau ingin detail salah satunya.");

    // 6. Rapikan baris kosong berlebih dan spasi ganda hasil penggantian.
    out = out
        .replace(/[ \t]{2,}/g, " ")
        .replace(/\n{3,}/g, "\n\n")
        .replace(/[ \t]+\n/g, "\n")
        .trim();

    return out;
}

/**
 * Ubah semua karakter 'tidak aman tampil' menjadi ASCII biasa.
 *
 * Dua kategori diperlakukan sama karena keduanya sama-sama merusak tampilan:
 *
 *  1. Karakter tipografis (em dash, en dash, kutip lengkung, ellipsis).
 *     Selain terlihat seperti slop AI, em dash sering ikut rusak ketika
 *     ketika melewati encoding yang salah. Karena itu semuanya dinormalkan
 *     ke padanan ASCII sebelum keluar ke peramban.
 *  2. Sisa mojibake yang sudah terlanjur berbentuk rangkaian A-tilde+A-euro.
 *
 * Fungsi ini dipakai bersama oleh jawaban model DAN jawaban terstruktur,
 * sehingga apa pun jalurnya, pengunjung tidak pernah melihat karakter asing.
 */
export function normalizeTypography(input: string): string {
    let out = String(input ?? "");

    // Mojibake berurutan lebih dulu: urutan penting agar tidak tersisa potongan.
    out = out
        .replace(/\u00E2\u20AC\u2122/g, "'")
        .replace(/\u00E2\u20AC\u0153/g, '"')
        .replace(/\u00E2\u20AC\u009D/g, '"')
        .replace(/\u00E2\u20AC[\u0093\u0094\u201C\u201D]/g, '"')
        .replace(/\u00E2\u20AC[\u0098\u0099\u2018\u2019]/g, "'")
        .replace(/\u00E2\u20AC[\u0093\u0094\u2013\u2014]/g, "-")
        .replace(/\u00E2\u20AC\u00A6/g, "...")
        .replace(/\u00E2\u20AC/g, "")
        .replace(/\u00C2\u00A0/g, " ")
        .replace(/[\u00C2\u00C3]/g, "");

    // Karakter tipografis asli -> ASCII.
    out = out
        .replace(/[\u2013\u2014\u2015]/g, "-")
        .replace(/[\u2018\u2019\u201A\u201B]/g, "'")
        .replace(/[\u201C\u201D\u201E\u201F]/g, '"')
        .replace(/\u2026/g, "...")
        .replace(/[\u2022\u00B7]/g, "-")
        .replace(/\u00A0/g, " ");

    // Rapikan spasi akibat penggantian: "- item" tetap, "kata - kata" tetap,
    // tetapi spasi ganda dan spasi sebelum tanda baca dibuang.
    out = out.replace(/[ \t]{2,}/g, " ").replace(/\s+([,.;:!?])/g, "$1");

    return out;
}

/** Ciri teks yang salah decode (UTF-8 dibaca sebagai Latin-1/Windows-1252). */
/**
 * Ciri teks yang salah decode (UTF-8 dibaca sebagai Latin-1/Windows-1252).
 *
 * Ditulis memakai escape \u agar berkas sumber tetap 100% ASCII. Ini bukan
 * gaya penulisan semata: upaya pertama menuliskan huruf aslinya langsung
 * membuat berkas MENYIMPAN byte mojibake, sehingga yang terkirim ke pengunjung
 * justru "a-EUR-quote" dan em dash rusak. Persis kegagalan yang dilaporkan.
 *
 *   \u00C2 / \u00C3 = "A dengan circumflex"/"A dengan tilde", pembuka mojibake
 *   \u2013..\u2122   = sisa petakan Windows-1252 (em dash, kutip lengkung, dst)
 */
const MOJIBAKE_RE =
    /[\u00C2\u00C3][\u0080-\u00BF\u0152\u0153\u0160\u0161\u0178\u017D\u017E\u0192\u02C6\u02DC\u2013\u2014\u2018\u2019\u201A\u201C\u201D\u201E\u2020\u2021\u2022\u2026\u2030\u2039\u203A\u20AC\u2122]/;

/** Karakter pengganti yang muncul saat decode gagal. */
const REPLACEMENT_RE = /[\uFFFD\u0000-\u0008\u000B\u000C\u000E-\u001F]/;

/** Token pseudo hasil model rusak: "=blackKonsumsi", "|ALCLAUDE dieli". */
const PSEUDO_TOKEN_RE = /=[a-z]{4,}|\|[A-Z]{4,}\s?[a-z]*/g;

/** Kata yang menandakan model membocorkan identitasnya. */
const IDENTITY_RE =
    /\b(openagentic|deepseek|claude|haiku|gemini|minimax|glm|space[- ]bunny|anthropic|openai|zhipu|sebagai (ai|model|llm|asisten ai)|i am an ai|language model)\b/i;

/** Penanda bahwa isi <konteks> / instruksi bocor ke jawaban. */
const CONTEXT_LEAK_RE =
    /<\s*\/?\s*(konteks|context|system|instruksi)\s*>|(Fakta terstruktur|ATURAN FAKTA|system prompt)/i;

/**
 * Aksara non-Latin.
 *
 * Ditulis memakai escape \u agar berkas tetap ASCII. Rentang mencakup CJK,
 * Sirilik, Arab, Devanagari, Hangul, Thai, dan blok simbol aneh. Huruf Latin
 * beraksen sengaja TIDAK termasuk karena nama seperti "Ciboer" boleh memuatnya.
 */
const FOREIGN_CHAR_RE =
    /[\u0400-\u04FF\u0590-\u05FF\u0600-\u06FF\u0900-\u097F\u0E00-\u0E7F\u1100-\u11FF\u3040-\u30FF\u3130-\u318F\u3400-\u4DBF\u4E00-\u9FFF\uAC00-\uD7AF\uF900-\uFAFF\uFFFD]/;

/** Rasio aksara non-Latin; di atas ambang berarti jawaban tidak layak tampil. */
function foreignRatio(out: string): number {
    const letters = out.replace(/[^\p{L}]/gu, "");
    if (!letters.length) return 0;
    let bad = 0;
    for (const ch of letters) {
        if (FOREIGN_CHAR_RE.test(ch)) bad++;
    }
    return bad / letters.length;
}

/** Bahasa asing liar: deretan kata Inggris yang panjang di jawaban Indonesia. */
const ENGLISH_RUN_RE =
    /\b(the|and|with|from|this|that|which|there|your|have|been|will|would|should|could|about|because)\b(\s+\S+){2,}/gi;

/**
 * Angka yang diklaim model wajib ada di konteks.
 *
 * Ini penangkal halusinasi harga. Contoh nyata: model menulis "Rp 25.000"
 * padahal konteks hanya memuat Rp 15.000 dan Rp 20.000. Semua nilai rupiah
 * dan persentase diperiksa; angka urutan (1., 2.) dan tahun diabaikan.
 */
function unverifiedNumbers(out: string, context: string): string[] {
    const normalize = (s: string) =>
        s
            .replace(/[Rp\s.]/gi, "")
            .replace(/,00$/, "")
            .trim();

    const contextNorm = normalize(context);
    const bad: string[] = [];

    // Rupiah, mis. "Rp 15.000", "Rp15.000", "Rp1.500.000"
    const rupiah = out.match(/Rp\s?[\d.,]+/gi) ?? [];
    for (const r of rupiah) {
        const v = normalize(r);
        if (v && !contextNorm.includes(v)) bad.push(r.trim());
    }

    // Persentase, mis. "20%"
    const pct = out.match(/\b\d{1,3}\s?%/g) ?? [];
    for (const p of pct) {
        if (!out.includes(p)) continue;
        if (!contextNorm.includes(normalize(p))) bad.push(p.trim());
    }

    return [...new Set(bad)];
}

/** Deteksi jawaban yang mengulang frasa sama terus-menerus. */
function isDegenerate(out: string): boolean {
    const words = out.toLowerCase().split(/\s+/).filter(Boolean);
    if (words.length < 24) return false;
    for (let n = 2; n <= 4; n++) {
        const counts = new Map<string, number>();
        for (let i = 0; i + n <= words.length; i++) {
            const gram = words.slice(i, i + n).join(" ");
            counts.set(gram, (counts.get(gram) ?? 0) + 1);
        }
        for (const c of counts.values()) {
            if (c >= 4) return true;
        }
    }
    return false;
}

export function checkOutput(text: string, context = ""): OutputCheck {
    let out = String(text ?? "").trim();
    const issues: OutputIssue[] = [];

    // --- Pembersihan aman (tidak mengubah makna) -------------------------
    // Normalisasi tipografi PALING AWAL: em dash, kutip lengkung, dan sisa
    // mojibake diubah ke ASCII sebelum pemeriksaan lain. Tanpa ini, em dash
    // lolos ke pengunjung dan tampil sebagai karakter rusak.
    out = normalizeTypography(out);
    out = out.replace(/^```[a-z]*\s*/i, "").replace(/```$/i, "").trim();
    out = out.replace(PSEUDO_TOKEN_RE, "");
    out = out.replace(/<\/?(konteks|context|system)\s*>/gi, "");
    out = out.replace(REPLACEMENT_RE, "");
    out = out.replace(/\s{2,}/g, " ");

    if (!out) return { ok: false, cleaned: "", issues: ["empty"] };

    // --- Pemeriksaan identitas & kebocoran -------------------------------
    if (IDENTITY_RE.test(out)) issues.push("model_identity_leak");
    if (CONTEXT_LEAK_RE.test(out)) issues.push("context_leak");

    // --- Pemeriksaan karakter --------------------------------------------
    if (MOJIBAKE_RE.test(out)) issues.push("mojibake");
    if (foreignRatio(out) > 0.01) issues.push("foreign_chars");

    // Bahasa Inggris liar: hapus deretannya, catat sebagai isu.
    const before = out;
    out = out.replace(ENGLISH_RUN_RE, (m) => (m.split(/\s+/).length >= 4 ? "" : m));
    if (before !== out) out = out.replace(/\s{2,}/g, " ").trim();

    // --- Pemeriksaan angka terhadap konteks ------------------------------
    if (context) {
        const bad = unverifiedNumbers(out, context);
        if (bad.length) issues.push("unverified_numbers");
    }

    // --- Pemeriksaan degenerasi ------------------------------------------
    if (isDegenerate(out)) issues.push("degenerate_repetition");

    // --- Batas panjang (memotong pada batas kalimat) ----------------------
    if (out.length > 1200) {
        const cut = out.lastIndexOf(". ", 1200);
        out = cut > 400 ? out.slice(0, cut + 1) : out.slice(0, 1200);
    }

    // Isu yang tidak bisa "diperbaiki" dengan pembersihan: tolak.
    const fatal: OutputIssue[] = [
        "empty",
        "model_identity_leak",
        "context_leak",
        "foreign_chars",
        "mojibake",
        "unverified_numbers",
        "degenerate_repetition",
    ];
    const hasFatal = issues.some((i) => fatal.includes(i));

    if (!out.trim()) {
        const finalIssues: OutputIssue[] = [...new Set<OutputIssue>([...issues, "empty"])];
        return { ok: false, cleaned: "", issues: finalIssues };
    }

    return { ok: !hasFatal, cleaned: out, issues: [...new Set<OutputIssue>(issues)] };
}

/** Pesan balasan siap pakai untuk kasus "tidak tahu". */
export const UNKNOWN_REPLY =
    "Saya belum menemukan jawaban pastinya di situs ini, dan saya tidak mau menebak. " +
    "Coba sebutkan nama destinasi atau topiknya, atau tanyakan langsung ke pengelola " +
    "lewat halaman Kontak - biasanya dijawab pada jam kerja.";
