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

/**
 * Kata tanya/basa-basi yang BUKAN penanda topik.
 *
 * Kasus nyata: "kalau anak kkn itu biasanya agendanya suka pada ngapain?"
 * — artikel promosi berjudul "Weekend terakhir Oktober mau ngapain?" ikut
 * di-boost karena judulnya kebetulan memuat kata "ngapain", lalu menang atas
 * artikel yang benar-benar tentang KKN hanya karena kebetulan kata itu
 * muncul dua kali. Kata tanya seperti ini tidak membawa topik, jadi tidak
 * boleh ikut menentukan skor.
 */
const QUESTION_FILLER_RE =
    /^(ngapain|ngapainnya|apa|apanya|apakah|gimana|bagaimana|kenapa|mengapa|kapan|dimana|di mana|mana|siapa|berapa|yang|yg|kalau|kalo|kira|kiranya|biasanya|suka|suka nya|paling|dong|sih|deh|ya|aja|saja|bisa|boleh|mau|pengen|ingin|coba|tolong|kasih|banget|gitu|gini|tuh|nih)$/;

/**
 * Perluasan kueri: padanan kata yang maknanya sama di data situs tetapi
 * ditulis berbeda oleh pengunjung.
 *
 * BM25 murni pencocokan kata. Pengunjung menulis "menginap", data menulis
 * "penginapan"; pengunjung menulis "kemah", data menulis "perkemahan".
 * Tanpa perluasan, pertanyaan yang sah tidak menemukan apa pun bukan karena
 * datanya tidak ada, melainkan karena katanya beda bentuk.
 *
 * Bentuk: kata pengunjung -> kata yang ADA DI DATA. Hanya dipakai untuk
 * pencarian; pertanyaan asli tetap dikirim ke model apa adanya.
 */
const SYNONYMS: Record<string, string[]> = {
    // Penginapan
    menginap: ["penginapan", "homestay", "kamar"],
    nginep: ["penginapan", "homestay", "menginap"],
    nginepnya: ["penginapan", "homestay"],
    inap: ["penginapan", "homestay"],
    nginap: ["penginapan", "homestay"],
    hotel: ["penginapan", "homestay", "villa", "cottage"],
    villa: ["penginapan", "homestay"],
    penginapan: ["homestay", "menginap"],
    homestay: ["penginapan", "menginap"],
    // Kemah / camping
    kemah: ["perkemahan", "camping", "kemah"],
    camping: ["perkemahan", "buper", "kemah"],
    berkemah: ["perkemahan", "camping"],
    tenda: ["perkemahan", "camping", "buper"],
    buper: ["perkemahan", "awilega", "camping"],
    // Wisata air
    mandi: ["berenang", "kolam", "air"],
    berenang: ["kolam", "air", "curug"],
    renang: ["berenang", "kolam"],
    cemplung: ["berenang", "air"],
    airterjun: ["curug", "air terjun"],
    curug: ["air terjun"],
    // Kuliner
    makan: ["kuliner", "warung", "restoran"],
    makanan: ["kuliner", "makan"],
    kuliner: ["makanan", "makan", "warung"],
    sarapan: ["makan", "kuliner"],
    makanmalam: ["makan", "kuliner"],
    makansiangan: ["makan", "kuliner"],
    ngopi: ["kopi", "kedai", "warung kopi"],
    nongkrong: ["kopi", "warung", "santai"],
    kafe: ["kopi", "warung"],
    oleh2: ["oleh oleh", "suvenir", "souvenir"],
    oleholeh: ["oleh oleh", "suvenir"],
    suvenir: ["souvenir", "oleh oleh"],
    souvenir: ["suvenir", "oleh oleh"],
    // Kegiatan
    piknik: ["wisata", "liburan"],
    healing: ["wisata", "liburan", "santai"],
    liburan: ["wisata", "piknik"],
    jalanjalan: ["wisata", "liburan"],
    "jalan jalan": ["wisata", "liburan"],
    touring: ["wisata", "trip"],
    hiking: ["trekking", "jalan kaki", "bukit"],
    trekking: ["hiking", "jalan kaki", "bukit"],
    sunrise: ["matahari terbit", "bukit", "panorama"],
    sunset: ["senja", "matahari terbenam"],
    foto: ["spot foto", "selfie", "pemandangan"],
    foto2: ["spot foto", "selfie"],
    selfie: ["spot foto", "foto"],
    gathering: ["rombongan", "acara", "paket"],
    outing: ["paket", "rombongan", "outbound"],
    outbound: ["paket", "rombongan", "eduwisata"],
    studytour: ["study tour", "rombongan", "eduwisata"],
    // Lainnya
    tiket: ["harga", "retribusi", "tiket masuk"],
    hargatiket: ["harga", "tiket"],
    entrace: ["tiket", "harga"],
    wc: ["kamar mandi", "toilet"],
    toilet: ["kamar mandi", "wc"],
    musala: ["musholla"],
    musolla: ["musholla"],
    parkiran: ["parkir"],
    rute: ["arah", "lokasi", "jalan"],
    arah: ["lokasi", "rute", "maps"],
    lokasinya: ["lokasi", "alamat"],
    alamat: ["lokasi", "arah"],
    tanaman: ["herbal", "togа", "toga"],
    obat: ["herbal", "jamu", "khasiat"],
    khasiat: ["manfaat", "herbal"],
    manfaat: ["khasiat", "herbal"],
    umkm: ["usaha", "warung", "toko", "produk"],
    oleh: ["oleh oleh"],

    /**
     * Kamus EN -> ID untuk pengunjung berbahasa Inggris.
     *
     * Cara kerjanya murni kamus statis di lapisan pencarian: pertanyaan
     * diterjemahkan kata demi kata SEBELUM BM25, jadi pencarian tetap
     * memakai kata Indonesia yang ada di data. Model tidak perlu tuning
     * apa pun - yang berubah hanya kosakata yang dikenali pencari.
     *
     * Dipakai juga sebaliknya saat konteks perlu dicocokkan ke istilah
     * umum turis (waterfall, homestay).
     */
    waterfall: ["curug", "air terjun"],
    waterfalls: ["curug", "air terjun"],
    "hot spring": ["pemandian"],
    beach: ["pantai", "telaga"],
    lake: ["telaga", "danau"],
    river: ["sungai", "kali"],
    mountain: ["gunung", "bukit"],
    hill: ["bukit"],
    camp: ["perkemahan", "kemah"],
    campsite: ["perkemahan", "buper"],
    tent: ["tenda", "perkemahan"],
    stay: ["menginap", "penginapan"],
    lodging: ["penginapan", "homestay"],
    guesthouse: ["penginapan", "homestay"],
    room: ["kamar"],
    booking: ["pemesanan", "reservasi"],
    reserve: ["pemesanan", "reservasi"],
    reservation: ["pemesanan", "reservasi"],
    price: ["harga"],
    prices: ["harga"],
    ticket: ["tiket"],
    tickets: ["tiket"],
    fee: ["tiket", "harga", "retribusi"],
    entrance: ["tiket masuk", "harga"],
    "entrance fee": ["tiket masuk", "harga"],
    facilities: ["fasilitas"],
    facility: ["fasilitas"],
    amenities: ["fasilitas"],
    activity: ["aktivitas"],
    activities: ["aktivitas"],
    guide: ["pemandu"],
    "tour guide": ["pemandu"],
    tour: ["wisata", "trip"],
    trip: ["wisata", "paket"],
    package: ["paket"],
    packages: ["paket"],
    village: ["desa"],
    traditional: ["tradisi", "budaya"],
    culture: ["budaya", "tradisi"],
    cultural: ["budaya"],
    herbal: ["herbal", "tanaman"],
    medicine: ["obat", "jamu"],
    remedy: ["jamu", "obat"],
    "herbal medicine": ["jamu", "herbal"],
    garden: ["kebun"],
    farm: ["pertanian", "kebun"],
    farming: ["pertanian"],
    market: ["pasar"],
    food: ["makanan", "kuliner"],
    culinary: ["kuliner", "makanan"],
    restaurant: ["warung makan", "restoran"],
    coffee: ["kopi"],
    cafe: ["kedai kopi", "kopi"],
    "souvenir shop": ["toko suvenir", "umkm"],
    handicraft: ["kerajinan"],
    community: ["warga", "masyarakat"],
    local: ["warga", "lokal"],
    location: ["lokasi"],
    address: ["alamat"],
    "how to get": ["arah", "rute"],
    route: ["rute", "arah"],
    map: ["peta"],
    contact: ["kontak"],
    phone: ["telepon", "whatsapp"],
    whatsapp: ["whatsapp"],
    open: ["jam buka", "buka"],
    hours: ["jam buka", "jam operasional"],
    schedule: ["jadwal"],
    event: ["acara", "kegiatan"],
    festival: ["festival", "acara"],
    performance: ["pentas", "pertunjukan"],
    dance: ["tari"],
    music: ["musik"],
    kid: ["anak"],
    kids: ["anak"],
    children: ["anak"],
    family: ["keluarga"],
    group: ["rombongan", "grup"],
    swim: ["berenang", "kolam"],
    swimming: ["berenang", "kolam"],
    bath: ["mandi"],
    bathroom: ["kamar mandi", "toilet"],
    parking: ["parkir"],
    photo: ["foto", "spot foto"],
    photos: ["foto"],
    spot: ["spot"],
    view: ["pemandangan"],
    scenery: ["pemandangan"],
    nature: ["alam"],
    plantation: ["kebun", "pertanian"],
    ugm: ["kkn", "ugm"],
    "field trip": ["study tour", "eduwisata"],
    "study tour": ["study tour", "eduwisata"],
    itinerary: ["paket", "rencana"],
};

/**
 * Bangun bentuk mentah dari kata berimbuhan umum (me-, ber-, di-, -nya, -an)
 * agar "menginapnya" juga cocok dengan "menginap". Ini memperluas cakupan
 * kamus di atas tanpa harus mendaftar tiap variasi.
 */
function stemRaw(word: string): string {
    return word
        .replace(/^(meng|meny|mem|men|ber|bel|ter|di|ke|pe|se)/, (m) =>
            word.length - m.length >= 4 ? "" : m
        )
        .replace(/(nya|kah|lah|an)$/i, (m) => (word.length - m.length >= 4 ? "" : m));
}

/** Perluas istilah topik dengan padanannya. Maksimal 2 padanan per kata. */
function expandTerms(terms: string[]): string[] {
    const out = new Set<string>();
    for (const t of terms) {
        out.add(t);
        const extra = SYNONYMS[t] ?? SYNONYMS[stemRaw(t)];
        if (extra) {
            for (const s of extra) {
                // Padanan bisa berupa frasa ("kamar mandi"): istilah BM25 hanya
                // kata tunggal, jadi frasa dipecah dan tiap katanya diambil.
                if (s.includes(" ")) {
                    for (const w of s.split(" ")) {
                        if (w.length >= 3 && !QUESTION_FILLER_RE.test(w)) out.add(w);
                    }
                } else {
                    out.add(s);
                }
            }
        }
        if (out.size > terms.length * 3 + 6) break;
    }
    return [...out];
}

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
    return terms.filter((t) => !NEWS_WORDS.has(t) && !QUESTION_FILLER_RE.test(t));
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
    // Padanan kata ikut dinilai dengan bobot lebih kecil: kata asli pengunjung
    // tetap yang paling menentukan.
    const expanded = expandTerms(terms.filter((t) => t !== rawQuery.toLowerCase()));

    // Nama yang disebut utuh memberi bobot paling besar.
    for (const term of terms) {
        if (term.length < 3) continue;
        if (new RegExp(`(^|\\s)${escapeRegex(term)}(\\s|$)`, "i").test(kw)) {
            score += 3.0;
        } else if (term.length >= 5 && kw.includes(term)) {
            // Pencocokan substring HANYA untuk kata >=5 huruf. Tanpa batas ini,
            // kata pendek kebetulan menjadi bagian dari nama lain:
            // "suka" ⊂ "Sukarsih" membuat homestay Bu Sukarsih menjawab
            // pertanyaan tentang KKN (kasus nyata yang pernah terjadi).
            score += 1.2;
        } else if (term.length >= 5 && body.includes(term)) {
            // Kata yang hanya muncul di isi (mis. "manfaat" pada khasiat Jahe)
            // bernilai lebih kecil daripada nama, tetapi cukup untuk
            // memisahkan tanaman yang benar-benar relevan dari yang sekadar
            // berlabel "tanaman herbal".
            score += 0.9;
        }
    }

    // Padanan kata (query expansion): bobot lebih kecil dari kata asli.
    for (const term of expanded) {
        if (terms.includes(term)) continue;
        if (term.length < 5) continue;
        if (kw.includes(term)) score += 0.8;
        else if (body.includes(term)) score += 0.5;
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
    /**
     * Kata tanya/basa-basi dibuang sebelum skoring: ia tidak membawa topik.
     * Tanpa ini, judul yang kebetulan memuat "ngapain" bisa mengalahkan
     * artikel yang benar-benar membahas topik yang ditanyakan.
     *
     * Jika SEMUA istilah ternyata filler (pertanyaan tanpa kata bermakna),
     * pakai istilah asli agar BM25 tetap punya sesuatu untuk dicari.
     */
    const topical = terms.filter((t) => !QUESTION_FILLER_RE.test(t));
    const effective = expandTerms(topical.length ? topical : terms);
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
        for (const term of effective) {
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
        const titleLower = chunk.title.toLowerCase();
        if (effective.some((t) => titleLower.includes(t))) score += 2.0;

        /*
         * Cakupan judul: berapa banyak kata kunci inti yang muncul di judul.
         *
         * Kasus nyata: pertanyaan "agenda kkn" harus mengalahkan artikel
         * promosi yang judulnya kebetulan memuat SATU kata basa-basi.
         * Bonus ini memberi bobot besar pada artikel yang judulnya mencakup
         * SEMUA istilah inti — kecocokan penuh di judul hampir selalu berarti
         * artikel itu memang tentang topik yang ditanyakan.
         */
        const covered = effective.filter((t) => titleLower.includes(t)).length;
        if (effective.length >= 2 && covered === effective.length) {
            score += 3.0;
        } else if (covered >= 2) {
            score += 1.5;
        }

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
 *
 * Selain entitas, fungsi ini JUGA mengembalikan judul artikel/berita yang
 * dikutip riwayat (via `titles`). Kasus nyata: bot mengutip artikel "Kenangan
 * Perjalanan KKN...", lalu pengunjung bertanya "bukannya ada ya di artikel?"
 * — tanpa memori judul, retrieval kehilangan artikel itu dan menjawab
 * dengan artikel lain yang tidak relevan, sehingga bot tampak membantah
 * dirinya sendiri.
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

/**
 * Judul tulisan (artikel/berita) yang dikutip riwayat percakapan.
 *
 * Pencocokan memakai judul lengkap yang tersimpan di indeks, sehingga
 * "bukannya ada ya di artikel?" setelah bot mengutip artikel KKN tetap
 * berjangkar pada artikel yang sama, bukan pada artikel lain yang kebetulan
 * muncul di jawaban daftar.
 */
function articleTitlesFromHistory(
    history: { role: string; content: string }[],
    maxTurns = 4
): string[] {
    const index = buildIndex();
    const recent = history.slice(-maxTurns * 2);
    const titles = new Map<string, number>();

    recent.forEach((msg, i) => {
        const text = String(msg.content ?? "").toLowerCase();
        if (!text) return;
        const recency = (i + 1) / recent.length;
        for (const c of index.chunks) {
            if (!c.id.endsWith(":head")) continue;
            const title = c.title.toLowerCase();
            // Judul cukup panjang untuk tidak salah cocok dengan kalimat umum.
            if (title.length < 12) continue;
            if (text.includes(title)) {
                titles.set(title, (titles.get(title) ?? 0) + recency);
            }
        }
    });

    return [...titles.keys()].sort(
        (a, b) => (titles.get(b) ?? 0) - (titles.get(a) ?? 0)
    );
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
    /**
     * Pergantian topik: pertanyaan yang memuat topik/kata kunci BARU yang
     * TIDAK berasal dari percakapan sebelumnya tidak boleh dijangkari riwayat.
     *
     * Contoh nyata: setelah membahas KKN, pengunjung tiba-tiba bertanya
     * "resep rendang gimana?" atau "tiket pantai kuta berapa?". Kata-kata
     * barunya sama sekali tidak muncul di giliran-giliran sebelumnya. Tanpa
     * pemeriksaan ini, jangkar riwayat tetap dilekatkan dan jawaban jadi
     * kacau: setengah konteks lama, setengah topik baru.
     *
     * Aturan: bila pertanyaan punya istilah topik yang cukup dan TIDAK SATU PUN
     * yang muncul di riwayat, perlakukan sebagai topik baru (lewati jangkar).
     * Pertanyaan nyambung hampir selalu berbagi minimal satu istilah dengan
     * riwayat (nama tempat, kata topik, atau kata rujukan "itu/tersebut").
     */
    if (history.length && isFollowUp(query, terms)) {
        const topical = terms.filter((t) => !QUESTION_FILLER_RE.test(t));
        const historyText = history
            .slice(-8)
            .map((m) => String(m.content ?? "").toLowerCase())
            .join(" ");
        const fresh = topical.filter(
            (t) => !historyText.includes(t) && !(expandTerms([t]).some((e) => e !== t && historyText.includes(e)))
        );
        // Mayoritas istilah benar-benar baru -> topik berganti; perlakukan
        // sebagai pertanyaan mandiri tanpa jangkar riwayat.
        if (topical.length >= 2 && fresh.length >= Math.ceil(topical.length * 0.75)) {
            return retrieveInternal(query, index);
        }
    }

    /**
     * Jangkar artikel: pertanyaan lanjutan tentang tulisan yang BARU DIKUTIP.
     *
     * Kasus nyata: bot mengutip "Kenangan Perjalanan KKN di Bantaragung...",
     * pengunjung balas "bukannya ada ya di artikel?" — tanpa jangkar ini,
     * retrieval mencocokkan kata "artikel" ke artikel lain yang kebetulan
     * lebih baru, dan bot tampak membantah kutipannya sendiri.
     *
     * Dijalankan SEBELUM jangkar entitas karena kata seperti "artikel" dan
     * "berita" bukan nama tempat: yang sedang dibicarakan adalah tulisannya.
     * Bila riwayat tidak mengutip tulisan apa pun, blok jangkar entitas di
     * bawah yang bekerja seperti biasa.
     */
    if (isFollowUp(query, terms)) {
        const quoted = articleTitlesFromHistory(history);
        if (quoted.length) {
            const resolved = retrieveInternal(`${quoted[0]} ${cleaned}`, index);
            if (resolved.chunks.length) return resolved;
        }
    }

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

    const rawChunks = bm25(index, terms).filter((c) => c.score > 1.5);
    const chunks = rerankChunks(rawChunks, cards);

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

/**
 * Reranker potongan: gabungkan sinyal yang BM25 lihat terpisah.
 *
 * BM25 menilai tiap potongan secara independen. Tiga kelemahannya yang nyata:
 *
 * 1. Banyak potongan dari artikel yang sama memenuhi slot, sehingga konteks
 *    "kaku" pada satu tulisan dan kehabisan ruang untuk tulisan pendukung.
 * 2. Potongan dari artikel yang juga cocok dengan kartu entitas (judul
 *    destinasi yang disebut pengunjung) sebenarnya lebih kuat, tapi BM25
 *    tidak tahu itu.
 * 3. Potongan kepala (judul+ringkasan) dan potongan isi dari artikel yang
 *    sama bersaing satu sama lain; kepala seharusnya menang karena lebih
 *    ringkas dan sudah memuat konteksnya.
 *
 * Urutan akhir: keanekaragaman sumber dulu (maks 2 potongan per artikel),
 * lalu skor gabungan, lalu tanggal terbaru.
 */
function rerankChunks(
    chunks: RetrievedChunk[],
    cards: RetrievedCard[]
): RetrievedChunk[] {
    // Skor kartu diubah jadi bonus per href: kartu yang cocok menandakan
    // artikel terkait itu memang topik yang ditanyakan.
    const cardBoost = new Map<string, number>();
    for (const { card, score } of cards) {
        // Normalisasi: skor kartu bisa >10; bonus dibatasi agar tidak menenggelamkan skor BM25 murni.
        cardBoost.set(card.href, Math.min(6, score * 0.6));
    }

    const boosted = chunks.map(({ chunk, score }) => ({
        chunk,
        score: score + (cardBoost.get(chunk.href) ?? 0),
    }));

    // Dedup per artikel: potongan terbaik per href dipertahankan di depan,
    // potongan kedua dari artikel yang sama diberi penalti supaya artikel
    // lain masih mendapat slot.
    const perArticle = new Map<string, number>();
    const ordered: RetrievedChunk[] = [];
    const secondPass: RetrievedChunk[] = [];
    for (const item of boosted.sort((a, b) => b.score - a.score)) {
        const count = perArticle.get(item.chunk.href) ?? 0;
        if (count === 0) {
            perArticle.set(item.chunk.href, 1);
            ordered.push(item);
        } else if (count === 1) {
            perArticle.set(item.chunk.href, 2);
            secondPass.push({ chunk: item.chunk, score: item.score * 0.55 });
        }
        // Potongan ketiga dst dari artikel yang sama dibuang: tidak menambah
        // informasi berarti, hanya menyita slot konteks.
    }

    // Gabungkan: pemenang per artikel dulu, lalu potongan kedua yang masih
    // kuat, dibatasi MAX_CHUNKS.
    const merged = [...ordered, ...secondPass.sort((a, b) => b.score - a.score)];
    return merged.slice(0, MAX_CHUNKS);
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
