import "server-only";

/**
 * Penjaga cakupan: apakah pertanyaan ini benar-benar tentang Desa Bantaragung?
 *
 * Masalah yang diselesaikan. Sebelumnya chatbot menjawab pertanyaan apa pun
 * dengan data yang paling "mirip" secara kata kunci, walau sebenarnya tidak
 * nyambung sama sekali. Hasilnya seperti ini:
 *
 *   "1 tambah 3 dikurang 2 berapa?"  -> daftar 3 destinasi (tidak relevan)
 *   "elon musk itu siapa?"           -> daftar artikel berita (tidak relevan)
 *   "berapa harga bawang hari ini?"  -> profil Toko Dua Putri Kembar
 *   "siapa jokowi"                   -> "informasi itu belum ada di situs"
 *
 * Empat jawaban itu salah dengan cara berbeda:
 *
 *   1. Tiga yang pertama adalah HALUSINASI STRUKTURAL: data dikarang
 *      "mirip" padahal pertanyaannya di luar cakupan.
 *   2. Yang keempat sudah menolak, tetapi memakai kalimat yang menyiratkan
 *      situs yang kurang lengkap, padahal pertanyaannya memang bukan urusan
 *      situs. Itu membuat desa terkesan tidak informatif.
 *
 * Penjaga ini memeriksa DUA arah:
 *
 *   - Ada isyarat topik desa? (wisata, homestay, herbal, tiket, kontak, dst)
 *   - Ada isyarat JELAS di luar topik? (matematika, tokoh dunia/politik,
 *     harga pasar harian, cuaca, berita nasional)
 *
 * Bila di luar topik TANPA isyarat desa -> tolak dengan sopan dan arahkan
 * ke kanal yang benar, tanpa menyebut situs "belum punya data".
 */

export type ScopeVerdict =
    | { inScope: true }
    | {
          inScope: false;
          /** Jenis penolakan, untuk balasan yang tepat sasaran. */
          reason: "math" | "public_figure" | "market_price" | "general_knowledge" | "off_topic";
          reply: string;
      };

/**
 * Isyarat bahwa pertanyaan menyangkut desa/situs. Sengaja lebar: lebih baik
 * bot mencoba menjawab daripada salah menolak pertanyaan yang sah.
 */
const DOMAIN_HINTS: RegExp[] = [
    /bantaragung|sindangwangi|majalengka|ciremai|jawa barat/i,
    /wisata|destinasi|tempat|spot|atraksi|liburan|jalan-jalan|jalan jalan|healing|piknik/i,
    /curug|air terjun|terasering|ciboer|awilega|pakuwon|binuang|batu semar|batu asahan|telaga|kopi|kampung herbal|mertasela/i,
    /tiket|htr|harga masuk|retribusi|parkir|biaya masuk/i,
    /homestay|penginapan|nginap|nginep|inap|kamar|villa|glamping|cottage|losmen|menginap|kapasitas/i,
    /herbal|tanaman|obat|toga|jamu|khasiat|manfaat|daun|rimpang|kunyit|jahe|kencur|temulawak|sirsak|kelor|sambiloto|meniran/i,
    /umkm|warung|toko|usaha|kuliner|makanan|jajanan|oleh-oleh|oleh oleh|suvenir|souvenir/i,
    /peta|maps|lokasi|alamat|arah|rute|koordinat|titik/i,
    /paket|eduwisata|edu wisata|gathering|camping|kemah|outbound|live in|live-in|nyura|safar|seba|pencak silat|genjring|budaya|tradisi|kearifan/i,
    /kontak|hubungi|whatsapp|wa\b|email|telepon|telpon|jam buka|jam operasional|pemesanan|booking|reservasi|pesan/i,
    /berita|artikel|kabar|kegiatan|program|kkn|ugm|prestasi|penghargaan|adwi|profil|sejarah|tentang desa/i,
    /fasilitas|toilet|musholla|mushola|parkir|gazebo|saung|wifi/i,
    /pemandu|guide|tour|trip|rombongan|sekolah|study tour/i,
];

/** Penanda pertanyaan yang jelas BUKAN tentang desa. */
const MATH_RE = /(\d+\s*[-+*/x:]\s*\d+)|(\b(tambah|kurang|kali|bagi|dikurang|ditambah|dikali|dibagi)\b)/i;
const PUBLIC_FIGURE_RE =
    /\b(jokowi|joko widodo|prabowo|elon musk|trump|biden|soekarno|suharto|habibie|megawati|anies|ganjar|sandiaga|bill gates|mark zuckerberg|sam altman|messi|ronaldo|mbappe)\b/i;
const MARKET_PRICE_RE =
    /\b(harga|price)\b[^.?]{0,30}\b(bawang|cabai|beras|minyak|gula|telur|daging|sembako|emas|saham|bitcoin|crypto|dolar|bbm|pertalite|pertamax|gas melon|lpg)\b/i;
const GENERAL_KNOWLEDGE_RE =
    /\b(cara membuat|resep|puisi|pantun|cerpen|lirik|lagu|terjemahkan|translate|bahasa inggris|kode|script|program|javascript|python|rumus|persamaan)\b/i;
const WEATHER_RE = /\b(cuaca|prakiraan cuaca|gempa|banjir jakarta|hujan di)\b/i;

function hasDomainHint(q: string): boolean {
    return DOMAIN_HINTS.some((re) => re.test(q));
}

function replyOutOfScope(topic: string): string {
    return (
        `Saya pemandu digital khusus Desa Wisata Bantaragung, jadi belum bisa membantu soal ${topic}. ` +
        `Yang bisa saya bantu: destinasi dan tiket, penginapan warga, tanaman herbal, UMKM, ` +
        `peta digital, berita desa, serta kontak pengelola.`
    );
}

function replyNoMarketData(): string {
    return (
        "Saya tidak punya data harga pasar harian, jadi tidak bisa menyebut angka yang bisa berubah setiap hari. " +
        "Untuk kebutuhan sehari-hari, warga biasa membeli di UMKM desa seperti warung dan toko kelontong " +
        "yang terdaftar di halaman Bisnis Desa. Kalau yang Anda maksud harga bahan untuk paket wisata atau " +
        "konsumsi rombongan, saya bisa bantu arahkan ke pengelola."
    );
}

/**
 * Kata rujukan: menandakan pertanyaan lanjutan, bukan topik baru.
 * Ditaruh di sini agar penjaga cakupan dan retrieval memakai daftar yang sama.
 */
export const ANAPHORA_PATTERN =
    /(yang itu|itu|tersebut|tadi|tadi itu|yang tadi|sama|dia|nya|selain itu|kalau yang|yg itu|tsb|di sana|disana|tempat itu|barusan|harganya|fasilitasnya|kapasitasnya|khasiatnya|lokasinya|cara pakainya|jam bukanya|alamatnya|tiketnya|manfaatnya)/i;

/**
 * Periksa cakupan pertanyaan.
 *
 * Urutan penting: isyarat topik desa diperiksa LEBIH DULU. Pertanyaan seperti
 * "berapa harga tiket curug" mengandung kata "berapa" dan "harga", tetapi
 * jelas tentang desa, sehingga tidak boleh tertangkap aturan harga pasar.
 *
 * `isFollowUp` disediakan pemanggil: pertanyaan lanjutan MEWARISI topik dari
 * giliran sebelumnya, jadi tidak perlu (dan tidak boleh) diwajibkan memuat
 * kata kunci desa. Tanpa aturan ini, "harganya berapa?" setelah membahas
 * Curug akan ditolak sebagai di luar cakupan.
 */
export function checkScope(question: string, isFollowUp = false): ScopeVerdict {
    const q = String(question ?? "");

    // Lanjutan dari percakapan yang sudah jelas tentang desa.
    if (isFollowUp && ANAPHORA_PATTERN.test(q) && !MATH_RE.test(q) && !PUBLIC_FIGURE_RE.test(q)) {
        return { inScope: true };
    }

    // Pertanyaan tentang desa selalu dilayani.
    if (hasDomainHint(q)) return { inScope: true };

    if (MATH_RE.test(q)) {
        return {
            inScope: false,
            reason: "math",
            reply:
                "Saya tidak dirancang untuk berhitung, jadi tidak akan menebak jawabannya. " +
                "Saya bisa membantu soal Desa Wisata Bantaragung: destinasi, tiket, penginapan, " +
                "tanaman herbal, UMKM, peta digital, dan kontak pengelola.",
        };
    }

    if (PUBLIC_FIGURE_RE.test(q)) {
        return {
            inScope: false,
            reason: "public_figure",
            reply: replyOutOfScope("tokoh atau figur publik"),
        };
    }

    if (MARKET_PRICE_RE.test(q)) {
        return { inScope: false, reason: "market_price", reply: replyNoMarketData() };
    }

    if (WEATHER_RE.test(q)) {
        return {
            inScope: false,
            reason: "off_topic",
            reply: replyOutOfScope("prakiraan cuaca atau kondisi terkini di luar desa"),
        };
    }

    if (GENERAL_KNOWLEDGE_RE.test(q)) {
        return {
            inScope: false,
            reason: "general_knowledge",
            reply: replyOutOfScope("tugas menulis, menerjemahkan, atau membuat kode"),
        };
    }

    // Tanpa isyarat desa DAN tanpa penanda khusus: bergantung pada panjang.
    // Pertanyaan satu kata seperti "halo" tetap dilayani (sapaan), sedangkan
    // kalimat panjang tanpa kaitan desa kemungkinan besar di luar cakupan.
    const words = q.trim().split(/\s+/).filter(Boolean);
    if (words.length >= 4) {
        return {
            inScope: false,
            reason: "off_topic",
            reply: replyOutOfScope("hal di luar Desa Bantaragung"),
        };
    }

    return { inScope: true };
}
