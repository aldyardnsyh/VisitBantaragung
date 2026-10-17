// Pastikan SEMUA cover entitas benar-benar ada di CDN.
// Kalau tidak, kartu pratinjau menampilkan kotak kosong.
//
// Jalankan: npm run dev (atau next start) lalu
//           node scripts/chat/test-covers.mjs

const BASE = process.env.CHAT_TEST_BASE ?? "http://localhost:3121";
const CDN = (process.env.NEXT_PUBLIC_ASSET_BASE_URL ??
  "https://cdn.jsdelivr.net/gh/aldyardnsyh/VisitBantaragung-Assets@main").replace(/\/+$/, "");

// Ambil cover lewat pertanyaan yang menyebut banyak entitas sekaligus.
const QUESTIONS = [
  "tanaman herbal apa saja",
  "umkm apa saja",
  "Destinasi wisata apa saja yang ada?",
  "homestay apa saja",
  "paket wisata apa saja",
];

const GAP = Number(process.env.CHAT_TEST_GAP ?? 62000);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const covers = new Set();
console.log(`\n=== Kumpulkan cover dari ${QUESTIONS.length} pertanyaan ===\n`);

for (const q of QUESTIONS) {
  for (let attempt = 1; attempt <= 4; attempt++) {
    const res = await fetch(`${BASE}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: q, history: [] }),
    });
    const b = await res.json();
    if (b.reason === "ip_limit") {
      await sleep(GAP);
      continue;
    }
    for (const c of b.cards ?? []) if (c.cover) covers.add(c.cover);
    console.log(`  ${q} -> ${(b.cards ?? []).length} kartu`);
    break;
  }
}

console.log(`\n=== Cek ${covers.size} cover di CDN ===\n`);
let fail = 0;
for (const c of [...covers].sort()) {
  const url = `${CDN}/${c}`;
  let ok = false;
  let status = "";
  try {
    const r = await fetch(url, { method: "HEAD" });
    ok = r.ok;
    status = String(r.status);
  } catch (e) {
    status = e.message.slice(0, 40);
  }
  if (!ok) fail++;
  console.log(`${ok ? "  ok  " : "  FAIL"} ${status.padEnd(4)} ${c}`);
}

console.log(`\n=== Ringkasan cover: ${fail === 0 ? "SEMUA ADA" : fail + " HILANG"} ===\n`);
process.exit(fail === 0 ? 0 : 1);
