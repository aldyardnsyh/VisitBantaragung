// Uji percakapan MULTI-TURN: rujukan ke giliran sebelumnya harus dijawab
// tentang entitas yang sedang dibicarakan, bukan entitas acak.
//
// Tidak memakai kuota LLM bila server dijalankan dengan model tidak valid
// (jalur structured_fallback tetap memakai retrieval yang sama).
//
// Jalankan: node scripts/chat/test-conversation.mjs   (butuh server)

const BASE = process.env.CHAT_TEST_BASE ?? "http://localhost:3120";
const GAP = Number(process.env.CHAT_TEST_GAP ?? 62000);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Satu percakapan berurutan dengan riwayat yang tumbuh. */
const conversations = [
    {
        name: "follow-up fasilitas (kasus laporan pemilik)",
        turns: [
            { q: "Apa itu Curug Cipeuteuy?", expect: /cipeuteuy/i, label: "giliran 1: perkenalan" },
            { q: "kalau yang itu fasilitasnya apa aja?", expect: /cipeuteuy/i, label: "giliran 2: rujukan 'yang itu'" },
            { q: "harganya berapa?", expect: /cipeuteuy|15\.000/i, label: "giliran 3: rujukan implisit" },
        ],
    },
    {
        name: "ganti topik",
        turns: [
            { q: "Apa itu Bumi Perkemahan Awilega?", expect: /awilega/i, label: "giliran 1: awilega" },
            { q: "kalau Homestay Bu Ani muat berapa orang?", expect: /bu ani/i, label: "giliran 2: ganti topik" },
        ],
    },
    {
        name: "rujukan ke herbal",
        turns: [
            { q: "Apa khasiat jahe?", expect: /jahe/i, label: "giliran 1: jahe" },
            { q: "kalau yang itu cara pakainya gimana?", expect: /jahe|diseduh|rebus|jamu/i, label: "giliran 2: lanjutan jahe" },
        ],
    },
];

let fail = 0;
console.log(`\n=== Uji percakapan multi-turn @ ${BASE} ===\n`);

async function ask(message, history) {
    for (let attempt = 1; attempt <= 4; attempt++) {
        const res = await fetch(`${BASE}/api/chat`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ message, history }),
        });
        const body = await res.json();
        if (body.reason !== "ip_limit") return body;
        await sleep(GAP);
    }
    return { answer: "", reason: "ip_limit", sources: [] };
}

for (const conv of conversations) {
    console.log(`\n--- ${conv.name} ---`);
    const history = [];
    for (const turn of conv.turns) {
        const b = await ask(turn.q, history);
        const text = String(b.answer ?? "");
        const titles = (b.sources ?? []).map((s) => s.title).join(" | ");
        const ok = turn.expect.test(`${text} ${titles}`);
        if (!ok) fail++;

        console.log(`${ok ? "  ok  " : "  FAIL"} ${turn.label}`);
        console.log(`        tanya: "${turn.q}"`);
        console.log(`        sumber: ${titles || "(kosong)"}`);
        if (!ok) console.log(`        jawab: ${text.slice(0, 160)}`);

        // Riwayat tumbuh seperti di widget: pertanyaan + jawaban singkat.
        history.push({ role: "user", content: turn.q });
        history.push({ role: "assistant", content: text.slice(0, 300) });
    }
}

console.log(`\n=== Ringkasan percakapan: ${fail === 0 ? "SEMUA LULUS" : fail + " GAGAL"} ===\n`);
process.exit(fail === 0 ? 0 : 1);
