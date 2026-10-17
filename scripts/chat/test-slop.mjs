// Uji bahwa respons TIDAK mengandung "slop" maupun karakter rusak.
// Tidak memakai kuota LLM (jalur terstruktur/fallback).
//
// Slop yang dimaksud (semua DILARANG):
//   - em dash / en dash / kutip lengkung / ellipsis / bullet unicode
//   - mojibake (A-tilde, A-circumflex, euro dari salah decode)
//   - penanda bold ** di jawaban akhir
//   - penomoran kaku "1. **..." (dua penanda sekaligus)
//   - frasa pembuka template ("Berikut yang saya temukan di situs")
//   - path mentah (/kontak, /wisata/slug)
//
// Jalankan: node scripts/chat/test-slop.mjs   (butuh server)

const BASE = process.env.CHAT_TEST_BASE ?? "http://localhost:3115";
const GAP = Number(process.env.CHAT_TEST_GAP ?? 62000);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const CHECKS = [
    { name: "em dash", re: /\u2014/ },
    { name: "en dash", re: /\u2013/ },
    { name: "kutip lengkung", re: /[\u2018\u2019\u201C\u201D]/ },
    { name: "ellipsis unicode", re: /\u2026/ },
    { name: "bullet unicode", re: /\u2022/ },
    { name: "nbsp", re: /\u00A0/ },
    { name: "mojibake", re: /[\u00C2\u00C3\u20AC\uFFFD]/ },
    { name: "bold markdown", re: /\*\*/ },
    { name: "penomoran + bold", re: /^\s*\d+\.\s*\*\*/m },
    { name: "frasa template", re: /Berikut yang saya temukan di situs/i },
    { name: "path mentah", re: /(^|\s)\/(kontak|wisata|b2h|bdb|bmc)\b/i },
];

const questions = [
    "Ada homestay untuk keluarga?",
    "berapa harga penginapan",
    "Destinasi wisata apa saja yang ada?",
    "tanaman herbal apa saja",
    "Tiket Curug Cipeuteuy berapa?",
    "Apa khasiat daun sirsak?",
];

let fail = 0;
console.log(`\n=== Uji anti-slop @ ${BASE} ===\n`);

for (const q of questions) {
    let b;
    for (let attempt = 1; attempt <= 4; attempt++) {
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
    const hits = CHECKS.filter((c) => c.re.test(text));
    const ok = hits.length === 0;
    if (!ok) fail++;

    console.log(`${ok ? "  ok  " : "  FAIL"} "${q}" (reason=${b.reason ?? "-"})`);
    if (!ok) {
        hits.forEach((c) => {
            const m = text.match(new RegExp(`.{0,30}${c.re.source}.{0,30}`));
            console.log(`        ${c.name}: ...${(m?.[0] ?? "").replace(/\n/g, " ")}...`);
        });
    }
}

console.log(`\n=== Ringkasan anti-slop: ${fail === 0 ? "SEMUA LULUS" : fail + " GAGAL"} ===\n`);
process.exit(fail === 0 ? 0 : 1);
