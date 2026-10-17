// Uji LLM SUNGGUHAN untuk pertanyaan naratif. MEMAKAI KUOTA (~1 request/menit).
// Jalankan setelah: npx next start -p 3111
//   node scripts/chat/test-llm.mjs
//
// Sengaja hanya sedikit pertanyaan agar tidak menghabiskan kuota harian.

const BASE = process.env.CHAT_TEST_BASE ?? "http://localhost:3111";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Pertanyaan naratif: TIDAK masuk jalur terstruktur, jadi benar-benar memanggil LLM.
const cases = [
    "Jahe buat apa aja sih?",
    "Kalau mau camping, di mana enaknya?",
    "Tiket Curug Cipeuteuy berapa?",
];

console.log(`\n=== Uji LLM sungguhan @ ${BASE} ===`);
console.log("Maksimal 3 permintaan; jeda 20 detik untuk menjaga batas 6/menit.\n");

let fail = 0;
for (const q of cases) {
    const started = Date.now();
    const res = await fetch(`${BASE}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: q, history: [] }),
    });
    const b = await res.json();
    const ms = Date.now() - started;

    const usedLLM = Boolean(b.model);
    const tooShort = String(b.answer ?? "").length < 40;
    const hasPath = /\/[a-z]+\/[a-z-]+/i.test(String(b.answer ?? ""));
    const ok = usedLLM && !tooShort && !hasPath;
    if (!ok) fail++;

    console.log(`${ok ? "  ok  " : "  FAIL"} "${q}"`);
    console.log(`        model=${b.model ?? "-"} reason=${b.reason ?? "-"} ${ms}ms`);
    if (!usedLLM) console.log(`        ! TIDAK memakai LLM (jatuh ke fallback)`);
    if (tooShort) console.log(`        ! jawaban terlalu pendek`);
    if (hasPath) console.log(`        ! jawaban memuat path mentah`);
    console.log(`        ---\n${String(b.answer).split("\n").map((l) => "        " + l).join("\n")}\n`);

    await sleep(20_000);
}

console.log(`=== Ringkasan: ${fail === 0 ? "SEMUA LULUS" : fail + " GAGAL"} ===\n`);
process.exit(fail === 0 ? 0 : 1);
