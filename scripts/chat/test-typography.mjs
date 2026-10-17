// Uji filter karakter: em dash, en dash, kutip lengkung, dan mojibake HARUS
// hilang dari respons akhir. Tidak memakai kuota LLM (jalur terstruktur).
//
// Jalankan: node scripts/chat/test-typography.mjs   (butuh server di 3115)

const BASE = process.env.CHAT_TEST_BASE ?? "http://localhost:3115";
const GAP = Number(process.env.CHAT_TEST_GAP ?? 62000);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Karakter yang DILARANG muncul di respons apa pun.
const FORBIDDEN = [
    { name: "em dash (U+2014)", re: /\u2014/ },
    { name: "en dash (U+2013)", re: /\u2013/ },
    { name: "kutip lengkung", re: /[\u2018\u2019\u201C\u201D]/ },
    { name: "ellipsis (U+2026)", re: /\u2026/ },
    { name: "bullet (U+2022)", re: /\u2022/ },
    { name: "nbsp (U+00A0)", re: /\u00A0/ },
    { name: "mojibake A-tilde", re: /\u00C3/ },
    { name: "mojibake A-circ", re: /\u00C2/ },
    { name: "euro dari mojibake", re: /\u20AC/ },
    { name: "replacement char", re: /\uFFFD/ },
];

const questions = [
    "Ada homestay untuk keluarga?",           // kasus persis yang dilaporkan
    "berapa harga penginapan",
    "Destinasi wisata apa saja yang ada?",
    "tanaman herbal apa saja",
];

let fail = 0;
console.log(`\n=== Uji filter karakter @ ${BASE} ===\n`);

for (const q of questions) {
    let b;
    for (let attempt = 1; attempt <= 3; attempt++) {
        const res = await fetch(`${BASE}/api/chat`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ message: q, history: [] }),
        });
        b = await res.json();
        if (b.reason !== "ip_limit") break;
        await sleep(GAP);
    }

    const text = String(b.answer ?? "");
    const found = FORBIDDEN.filter((f) => f.re.test(text));
    // Bekas karakter boleh tersisa di sumber data; yang diperiksa adalah
    // apakah masih ADA karakter terlarang di teks akhir.
    const ok = found.length === 0;
    if (!ok) fail++;

    console.log(`${ok ? "  ok  " : "  FAIL"} "${q}" reason=${b.reason ?? "-"}`);
    if (!ok) {
        console.log(`        karakter terlarang: ${found.map((f) => f.name).join(", ")}`);
        found.forEach((f) => {
            const m = text.match(new RegExp(`.{0,40}${f.re.source}.{0,40}`));
            if (m) console.log(`        konteks: ...${m[0]}...`);
        });
    }
}

console.log(`\n=== Ringkasan typography: ${fail === 0 ? "SEMUA LULUS" : fail + " GAGAL"} ===\n`);
process.exit(fail === 0 ? 0 : 1);
