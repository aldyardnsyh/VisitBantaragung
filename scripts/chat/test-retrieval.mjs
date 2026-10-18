// Uji retrieval lewat endpoint debug (TANPA memanggil LLM, hemat kuota).
// Jalankan: npm run dev   (terminal lain, CHAT_ENABLED boleh false)
// lalu    : node scripts/chat/test-retrieval.mjs
//
// `top`  : bila diisi, kartu TERATAS harus cocok (bukan sekadar ada di daftar).
// `history`: riwayat percakapan yang dikirim, untuk menguji jangkar lanjutan.

const BASE = process.env.CHAT_TEST_BASE ?? "http://localhost:3111";

const cases = [
    { q: "berapa tiket masuk curug cipeuteuy?", expect: /curug/i, want: "Curug Cipeuteuy", label: "harga curug" },
    { q: "tiket curug berapa hari weekend?", expect: /curug/i, want: "Curug Cipeuteuy", label: "harga weekend" },
    { q: "homestay bu ani muat berapa orang?", expect: /bu ani/i, want: "Homestay Bu Ani", label: "homestay bu ani" },
    { q: "jahe buat apa aja?", expect: /jahe/i, want: "Jahe", label: "khasiat jahe" },
    { q: "tanaman herbal untuk daya tahan tubuh", expect: /jahe|temulawak|meniran|sambiloto|kunyit/i, want: "herbal", label: "herbal imun" },
    { q: "berapa harga paket campervan", expect: /campervan/i, want: "Campervan", label: "harga campervan" },
    { q: "nomor whatsapp pengelola desa wisata", expect: /kontak|whatsapp/i, want: "kontak", label: "kontak WA" },
    { q: "jam buka pelayanan", expect: /kontak/i, want: "kontak", label: "jam operasional" },
    { q: "di mana lokasi pasar bumi pakuwon", expect: /pakuwon/i, want: "Pakuwon", label: "lokasi pakuwon" },
    { q: "prestasi desa bantaragung apa saja", expect: /prestasi|adwi|api 2017|profil/i, want: "profil", label: "prestasi" },
    { q: "kearifan lokal tradisi desa", expect: /tradisi|kearifan|nyura|safar|seba/i, want: "profil", label: "kearifan lokal" },
    { q: "apa itu terasering ciboer", expect: /ciboer|terasering/i, want: "Ciboer", label: "terasering" },
    { q: "ada umkm warung apa saja", expect: /umkm|warung|toko/i, want: "umkm", label: "umkm" },
    { q: "harga paket edu wisata family gathering", expect: /eduwisata|family|gathering|paket/i, want: "Eduwisata", label: "paket eduwisata" },
    { q: "bumi perkemahan awilega bisa camping?", expect: /awilega|perkemahan/i, want: "Awilega", label: "awilega" },
    { q: "curug cipetoy tiket berapa", expect: /curug/i, want: "Cipeuteuy", label: "salah ketik (cipetoy)" },
    {
        q: "saya ingin ke curug cipeteuy ini gimana caranya dan dimana letak lokasinya tolong detailkan",
        expect: /curug/i,
        top: /curug/i,
        want: "Curug Cipeuteuy",
        label: "typo cipeteuy + minta detail",
    },
    {
        q: "saya ingin ke curug cipeteuy ini gimana caranya dan dimana letak lokasinya tolong detailkan",
        history: [
            { role: "user", content: "Destinasi wisata apa saja yang ada?" },
            {
                role: "assistant",
                content:
                    "Bantaragung punya banyak destinasi: Atraksi Genjring Kuda Jaya, Domba Ketangkasan, Curug Cipeuteuy, Terasering Ciboer, Telaga Nila, dan lainnya.",
            },
        ],
        expect: /curug/i,
        top: /curug/i,
        want: "Curug Cipeuteuy",
        label: "typo + riwayat daftar",
    },
    { q: "homestay pak jamal", expect: /jamal/i, want: "Jamal", label: "homestay pak jamal" },
    { q: "tanaman lidah buaya manfaat", expect: /lidah buaya/i, want: "Lidah Buaya", label: "lidah buaya" },
    { q: "villa gardenstone harga", expect: /gardenstone/i, want: "Gardenstone", label: "villa gardenstone" },
    { q: "langit binuang tiket", expect: /binuang/i, want: "Binuang", label: "langit binuang" },
];

let fail = 0;
console.log(`\nMenguji ${cases.length} pertanyaan retrieval ke ${BASE}`);
console.log("(tidak memakai kuota LLM: hanya endpoint /api/chat/debug)\n");

for (const c of cases) {
    let j;
    try {
        const res = await fetch(`${BASE}/api/chat/debug`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ message: c.q, history: c.history ?? [] }),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        j = await res.json();
    } catch (e) {
        console.log(`  ERROR ${c.label}: ${e.message} (pastikan 'npm run dev' berjalan)`);
        fail++;
        continue;
    }

    const titles = j.cards.map((x) => x.title).join(" | ");
    const hay = `${titles} ${j.fallbackAnswer} ${j.chunks.map((x) => x.title).join(" ")}`;
    const top = j.cards[0]?.title ?? "(tidak ada kartu)";
    const topHit = c.top ? c.top.test(top) : true;
    const hit =
        c.expect.test(hay) &&
        topHit &&
        !/tidak menemukan informasi/i.test(j.fallbackAnswer);
    if (!hit) fail++;

    const mentionLabel = j.mention
        ? `${j.mention.title}${j.mention.strong ? "" : " (lemah)"}`
        : "-";
    console.log(
        `${hit ? "  ok  " : "  FAIL"} ${c.label.padEnd(24)} ${String(j.cards.length).padStart(2)} kartu, ${String(j.chunks.length).padStart(1)} chunk | teratas: ${top} | jangkar: ${mentionLabel}`
    );
    if (!hit) {
        console.log(`         harap: ${c.expect}${c.top ? ` (teratas: ${c.top})` : ""}`);
        console.log(`         dapat: ${titles || "(kosong)"}`);
    }
}

console.log(`\n=== Ringkasan: ${fail === 0 ? "SEMUA LULUS" : fail + " GAGAL"} ===\n`);
process.exit(fail === 0 ? 0 : 1);
