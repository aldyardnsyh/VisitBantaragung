// Uji jalur cadangan saat LLM TIDAK BISA DIPAKAI (rate limit / kuota / semua
// model tidak valid). Dipastikan jawaban tetap INFORMATIF, bukan teks generik.
//
// Jalankan server dengan model tidak valid:
//   set CHAT_MODELS_PRIMARY=salah-model & npx next start -p 3112
// lalu:
//   node scripts/chat/test-degraded.mjs

const BASE = process.env.CHAT_TEST_BASE ?? "http://localhost:3112";
const GAP = Number(process.env.CHAT_TEST_GAP ?? 61000);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Pertanyaan NARATIF: tidak masuk jalur terstruktur, jadi benar-benar menguji
// buildFromRetrieval ketika model gagal.
const cases = [
    { q: "Tiket Curug Cipeuteuy berapa?", expect: /15\.000|cipeuteuy/i, label: "harga curug" },
    { q: "Jahe buat apa aja sih?", expect: /jahe|menghangatkan|imun/i, label: "khasiat jahe" },
    { q: "Kalau mau camping di mana enaknya?", expect: /awilega|perkemahan|camping/i, label: "camping" },
    { q: "Homestay Pak Jamal fasilitasnya apa?", expect: /jamal/i, label: "homestay jamal" },
    { q: "Cerita tentang nyurug di curug", expect: /curug|nyurug/i, label: "artikel (chunk saja)" },
    { q: "Apa khasiat daun sirsak?", expect: /sirsak/i, label: "daun sirsak" },
];

let fail = 0;
console.log(`\n=== Uji jalur cadangan (LLM tidak bisa dipakai) @ ${BASE} ===\n`);

for (const c of cases) {
    let b;
    for (let attempt = 1; attempt <= 3; attempt++) {
        const res = await fetch(`${BASE}/api/chat`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ message: c.q, history: [] }),
        });
        b = await res.json();
        if (b.reason !== "ip_limit") break;
        await sleep(GAP);
    }

    const text = String(b.answer ?? "");
    const usedFallback = b.reason === "all_models_failed" || b.reason === "output_rejected";
    const informative = c.expect.test(text);
    const generic = /^Berikut yang saya temukan di situs Bantaragung/.test(text);
    const hasPath = /\/[a-z]+\/[a-z-]+/i.test(text);
    const ok = usedFallback && informative && !generic && !hasPath;
    if (!ok) fail++;

    console.log(`${ok ? "  ok  " : "  FAIL"} ${c.label.padEnd(24)} reason=${b.reason ?? "-"} mode=${b.mode ?? "-"}`);
    console.log(`${text.split("\n").map((l) => "        " + l).join("\n")}\n`);
    if (generic) console.log("        ! masih memakai frasa generik");
    if (hasPath) console.log("        ! memuat path mentah");
    if (!informative) console.log(`        ! tidak memuat ${c.expect}`);
}

console.log(`=== Ringkasan degraded: ${fail === 0 ? "SEMUA LULUS" : fail + " GAGAL"} ===\n`);
process.exit(fail === 0 ? 0 : 1);
