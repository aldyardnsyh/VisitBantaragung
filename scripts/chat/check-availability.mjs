// Cek model mana yang SEDANG tersedia untuk plan Anda. Hanya 1 request.
//
// Masalah yang diselesaikan: daftar model gratis penyedia berubah setiap hari.
// Model yang kemarin jalan bisa dicabut hari ini (contoh nyata: model
// `model_not_available` untuk `muse-spark-1.3-free`). Mengandalkan
// GET /v1/models TIDAK cukup: `space-bunny-free` terdaftar di sana padahal
// keluarannya rusak.
//
// Skrip ini memakai satu request ke model termurah (deepseek) sekaligus
// membaca header sisa kuota, sehingga aman dijalankan harian.
//
//   node scripts/chat/check-availability.mjs
//
// Keluaran: tabel status tiap model kandidat + sisa kuota + saran env.

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

function loadDotEnvLocal() {
    try {
        const file = path.join(ROOT, ".env.local");
        if (!fs.existsSync(file)) return;
        for (const line of fs.readFileSync(file, "utf-8").split(/\r?\n/)) {
            const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
            if (!m || m[1].startsWith("#")) continue;
            if (process.env[m[1]] === undefined) {
                let v = m[2].trim();
                if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
                    v = v.slice(1, -1);
                }
                process.env[m[1]] = v;
            }
        }
    } catch {
        /* abaikan */
    }
}
loadDotEnvLocal();

const KEY = (process.env.CHAT_LLM_API_KEY || process.env.LLM_API_KEY || "").trim();
const URL_ = process.env.LLM_URL?.trim() || "https://openagentic.id/api/v1/chat/completions";
const BASE = URL_.replace(/\/chat\/completions$/, "");

if (!KEY || /^ISI_/i.test(KEY)) {
    console.error("Kunci API belum diisi di .env.local (CHAT_LLM_API_KEY atau LLM_API_KEY).");
    process.exit(1);
}

const CANDIDATES = [
    "deepseek-v4.1-flash-free",
    "glm-5.3-flash-free",
    "minimax-m3.1-flash-preview",
    "claude-haiku-5.5-free",
    "gemini-4-argon",
    "space-bunny-free",
    "muse-spark-1.3-free",
];

function extractJson(body) {
    let t = body;
    const done = t.indexOf("data: [DONE]");
    if (done >= 0) t = t.slice(0, done);
    t = t.replace(/^\s*data:\s*/gm, "").trim();
    return JSON.parse(t);
}

/** GET /v1/models HARUS dihitung gratis; dipakai untuk daftar dasar. */
async function listModels() {
    try {
        const res = await fetch(`${BASE}/models`, {
            headers: { Authorization: `Bearer ${KEY}`, "User-Agent": "VBAvailability/1.0" },
            signal: AbortSignal.timeout(20_000),
        });
        if (!res.ok) return { ok: false, ids: [], error: `HTTP ${res.status}` };
        const j = await res.json();
        return { ok: true, ids: (j.data ?? []).map((m) => m.id), error: null };
    } catch (e) {
        return { ok: false, ids: [], error: e.message };
    }
}

/**
 * Satu request sungguhan ke model termurah, untuk membaca:
 * - sisa kuota dari header X-RateLimit-*
 * - apakah kunci + plan masih bisa memanggil
 */
async function quotaProbe(model) {
    const res = await fetch(URL_, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${KEY}`,
            "User-Agent": "VBAvailability/1.0",
        },
        body: JSON.stringify({
            model,
            messages: [{ role: "user", content: "Balas: OK" }],
            max_tokens: 900,
            temperature: 0,
            enable_thinking: false,
        }),
        signal: AbortSignal.timeout(40_000),
    });
    const raw = await res.text();
    const quota = {
        limit: res.headers.get("x-ratelimit-limit"),
        remaining: res.headers.get("x-ratelimit-remaining"),
        reset: res.headers.get("x-ratelimit-reset"),
    };

    let ok = false;
    let detail = "";
    let code = "";
    try {
        const j = extractJson(raw);
        if (j.error) {
            code = j.error.code ?? j.error.type ?? "";
            detail = String(j.error.message ?? "").slice(0, 90);
        } else {
            ok = Boolean(j.choices?.[0]?.message?.content?.trim());
            if (!ok) detail = "konten kosong";
        }
    } catch {
        detail = `tidak terbaca (${res.status})`;
    }
    return { ok, code, detail, status: res.status, quota };
}

console.log(`\nProvider : ${BASE}`);
console.log("Mode     : 1 request sungguhan + 1 daftar model (hemat kuota)\n");

const list = await listModels();
console.log(
    list.ok
        ? `Daftar /models : ${list.ids.length} model terbaca`
        : `Daftar /models : gagal (${list.error})`
);

// Model yang tidak ada di daftar pasti tidak bisa dipanggil; jangan buang kuota.
const available = new Set(list.ids);

// Satu request untuk membaca kuota, memakai model yang paling mungkin hidup.
const probeModel =
    CANDIDATES.find((m) => available.has(m) && !/space-bunny|muse-spark/.test(m)) ??
    "deepseek-v4.1-flash-free";

console.log(`Probe kuota : ${probeModel}\n`);
const probe = await quotaProbe(probeModel);

const rows = [];
for (const m of CANDIDATES) {
    const inList = available.has(m);
    let status;
    if (!inList) status = "TIDAK TERDAFTAR";
    else if (m === probeModel) status = probe.ok ? "TERSEDIA" : `GAGAL (${probe.code || probe.detail})`;
    else status = "terdaftar (belum diuji)";
    rows.push({ model: m, status });
}

console.log("=== STATUS MODEL ===");
for (const r of rows) {
    console.log(`  ${r.model.padEnd(30)} ${r.status}`);
}

console.log("\n=== SISA KUOTA ===");
const q = probe.quota;
if (q.limit || q.remaining) {
    console.log(`  batas/menit : ${q.limit ?? "-"}`);
    console.log(`  sisa/menit  : ${q.remaining ?? "-"}`);
    if (q.reset) {
        const t = Number(q.reset);
        const when = Number.isFinite(t) && t > 1e9 ? new Date(t * 1000).toLocaleString("id-ID") : q.reset;
        console.log(`  reset       : ${when}`);
    }
} else {
    console.log("  (provider tidak mengirim header X-RateLimit-*)");
}

if (!probe.ok) {
    console.log(`\n  PERHATIAN: request uji gagal -> ${probe.code || probe.detail}`);
}

/**
 * Dua kategori berbeda, jangan dicampur:
 *
 * DENYLIST  -> jangan pernah dipanggil. Keluarannya merusak data atau membuat
 *              pengunjung menunggu terlalu lama. Cacatnya bukan soal
 *              ketersediaan, jadi tidak akan membaik besok.
 * PROBATION -> tidak layak SEKARANG tetapi mungkin membaik (dicabut, sedang
 *              503, terlalu lambat hari ini). Dicoba 1x/jam.
 */
const DENYLIST = {
    "space-bunny-free": "keluaran rusak",
    "minimax-m3": "pernah 65 detik",
    "mimo-v2.6-flash": "7-11 detik",
    "muse-spark-1.3-free": "dicabut dari plan free",
};

const PROBATION = {
    "claude-haiku-5.5-free": "10-35 detik; bisa membaik bila penyedia mempercepat",
    "gemini-4-argon": "503 no_provider_under_bid; bisa hidup kapan saja",
};

const allRows = rows.map((r) => r.model);
const usable = allRows
    .filter((m) => !DENYLIST[m])
    .filter((m) => !PROBATION[m]);

console.log("\n=== SARAN ===");
if (usable.length >= 2) {
    console.log(`  CHAT_MODELS_PRIMARY=${usable.slice(0, 2).join(",")}`);
    console.log(
        `  CHAT_MODELS_SECONDARY=${usable.slice(2).join(",") || "minimax-m3.1-flash-preview"}`
    );
} else if (usable.length === 1) {
    console.log(`  CHAT_MODELS_PRIMARY=${usable[0]}`);
    console.log("  CHAT_MODELS_SECONDARY=minimax-m3.1-flash-preview");
    console.log("  PERHATIAN: hanya 1 model sehat. Pertimbangkan upgrade plan.");
} else {
    console.log("  Tidak ada model layak. Cek status/kuota penyedia.");
}
console.log(`  CHAT_MODELS_PROBATION=${Object.keys(PROBATION).join(",")}`);
console.log(`  CHAT_MODELS_DENYLIST=${Object.keys(DENYLIST).join(",")}\n`);
console.log("DENYLIST   = tidak pernah dipanggil (cacat permanen, bukan soal ketersediaan)");
console.log("PROBATION  = dicoba 1x/jam; otomatis dipakai lagi bila penyedia membaik");
console.log("Status 'terdaftar' berarti ada di /models tetapi TIDAK diuji di sini");
console.log("demi menghemat kuota. Uji isi jawaban: node scripts/chat/probe-models.mjs\n");
