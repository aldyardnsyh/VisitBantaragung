// Uji kasus yang dilaporkan pemilik (format, bahasa, knowledge base).
// Tidak memakai kuota LLM: semua kasus ini dijawab jalur terstruktur/retrieval.
// Jalankan: npm run dev (terminal lain) lalu node scripts/chat/test-cases.mjs

const BASE = process.env.CHAT_TEST_BASE ?? "http://localhost:3111";
const GAP = Number(process.env.CHAT_TEST_GAP ?? 0);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const cases = [
    { q: "Destinasi wisata apa saja yang ada?", expect: /wisata alam/i, mustNot: /\/kontak|\/wisata\/|Fasilitas:/i, check: "lengkap & tanpa path mentah" },
    { q: "apa artikel terbaru", expect: /terbaru/i, mustNot: /belum menemukan/i, check: "artikel terbaru terjawab" },
    { q: "berapa harga penginapan", expect: /Rp |tarif|harga|belum dicantumkan/i, mustNot: /^[^]*Glamping Curug Cipeuteuy[^]*Fasilitas/i, check: "harga penginapan jujur" },
    { q: "homestay apa saja", expect: /homestay/i, mustNot: null, check: "daftar homestay" },
    { q: "paket wisata apa saja", expect: /paket/i, mustNot: null, check: "daftar paket" },
    { q: "tanaman herbal apa saja", expect: /tanaman|herbal/i, mustNot: null, check: "daftar herbal" },
    { q: "umkm apa saja", expect: /umkm/i, mustNot: null, check: "daftar umkm" },
    {
        q: "Saya ingin ke curug cipeteuy ini gimana caranya dan dimana letak lokasinya tolong detailkan",
        expect: /cipeuteuy/i,
        mustNot: /genjring|https?:\/\//i,
        check: "fokus curug walau typo, tanpa URL mentah",
    },
];

let fail = 0;
console.log(`\n=== Uji kasus laporan pemilik @ ${BASE} ===\n`);

for (const c of cases) {
    const res = await fetch(`${BASE}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: c.q, history: [] }),
    });
    const b = await res.json();

    // Rate limit 4/menit per IP juga berlaku untuk pengujian. Bila kena,
    // tunggu lalu ulangi; jangan dihitung sebagai kegagalan kualitas.
    for (let attempt = 1; attempt <= 3 && b.reason === "ip_limit"; attempt++) {
        if (GAP) await sleep(GAP);
        else break;
        const retry = await fetch(`${BASE}/api/chat`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ message: c.q, history: [] }),
        });
        b = await retry.json();
    }
    if (b.reason === "ip_limit") {
        console.log(`  skip "${c.q}" (kena batas 4/menit; set CHAT_TEST_GAP=62000)`);
        continue;
    }

    const text = String(b.answer ?? "");
    const okExpect = c.expect.test(text);
    const okNot = c.mustNot ? !c.mustNot.test(text) : true;
    const pass = okExpect && okNot;
    if (!pass) fail++;

    console.log(`${pass ? "  ok  " : "  FAIL"} ${c.q}`);
    console.log(`        reason=${b.reason ?? "-"} src=${(b.sources ?? []).length} cek: ${c.check}`);
    if (!pass) {
        if (!okExpect) console.log(`        ! tidak memenuhi ${c.expect}`);
        if (!okNot) console.log(`        ! memuat pola terlarang ${c.mustNot}`);
    }
    console.log(`        ---\n${text.split("\n").map((l) => "        " + l).join("\n")}\n`);
}

console.log(`\n=== Ringkasan: ${fail === 0 ? "SEMUA LULUS" : fail + " GAGAL"} ===\n`);
process.exit(fail === 0 ? 0 : 1);
