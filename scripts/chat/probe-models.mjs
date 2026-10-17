// Uji kesehatan model penyedia LLM SEBELUM dipakai chatbot.
//
// Jalankan secara sadar, karena setiap model memakai 1-2 request dari kuota
// harian penyedia (plan FREE: 50 request/hari).
//
//   node scripts/chat/probe-models.mjs              # model bawaan
//   node scripts/chat/probe-models.mjs --all        # termasuk model berbayar
//   node scripts/chat/probe-models.mjs --only deepseek-v4.1-flash-free
//
// Hasil ditulis ke content/settings/chat-models.json sehingga bisa ditinjau
// sebagai diff dan dipakai untuk menyusun env CHAT_MODELS_PRIMARY dkk.

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
    console.error(
        "Kunci API belum diisi. Set CHAT_LLM_API_KEY (atau LLM_API_KEY) di .env.local\n" +
        "Contoh: CHAT_LLM_API_KEY=sk-xxxxxxxx"
    );
    process.exit(1);
}

const args = process.argv.slice(2);
const onlyArg = args.includes("--only") ? args[args.indexOf("--only") + 1] : null;

const CANDIDATES = [
    "claude-haiku-5.5-free",
    "deepseek-v4.1-flash-free",
    "glm-5.3-flash-free",
    "minimax-m3.1-flash-preview",
    "gemini-4-argon",
    // Diuji hanya untuk konfirmasi; sudah masuk denylist karena outputnya rusak.
    "space-bunny-free",
    "minimax-m3",
    "mimo-v2.6-flash",
];

const models = onlyArg ? [onlyArg] : CANDIDATES;

/** Potong ekor `data: [DONE]` yang selalu dikirim penyedia. */
function extractJson(body) {
    let t = body;
    const done = t.indexOf("data: [DONE]");
    if (done >= 0) t = t.slice(0, done);
    t = t.replace(/^\s*data:\s*/gm, "").trim();
    try {
        return JSON.parse(t);
    } catch {
        const s = t.indexOf("{");
        if (s < 0) throw new Error("bukan JSON");
        let depth = 0, inStr = false, esc = false;
        for (let i = s; i < t.length; i++) {
            const ch = t[i];
            if (inStr) {
                if (esc) esc = false;
                else if (ch === "\\") esc = true;
                else if (ch === '"') inStr = false;
                continue;
            }
            if (ch === '"') inStr = true;
            else if (ch === "{") depth++;
            else if (ch === "}") { depth--; if (!depth) return JSON.parse(t.slice(s, i + 1)); }
        }
        throw new Error("JSON tidak lengkap");
    }
}

/**
 * Uji satu model.
 *
 * `max_tokens` sengaja 800 dan `enable_thinking: false`: dengan anggaran token
 * kecil, model reasoning membalas kosong walau sebenarnya sehat.
 */
async function probe(model) {
    const started = Date.now();
    let res, raw;
    try {
        res = await fetch(URL_, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${KEY}`,
                "User-Agent": "VisitBantaragungProbe/1.0",
            },
            body: JSON.stringify({
                model,
                messages: [
                    { role: "user", content: "Sebutkan satu kalimat: apa itu desa wisata?" },
                ],
                max_tokens: 800,
                temperature: 0.3,
                enable_thinking: false,
            }),
            signal: AbortSignal.timeout(60_000),
        });
        raw = await res.text();
    } catch (e) {
        return { model, alive: false, ms: Date.now() - started, error: `network: ${e.message}` };
    }

    const ms = Date.now() - started;
    let json;
    try {
        json = extractJson(raw);
    } catch {
        return { model, alive: false, ms, status: res.status, error: "respons tidak terbaca" };
    }

    if (!res.ok || json.error) {
        const msg = json.error?.message ?? `HTTP ${res.status}`;
        const code = json.error?.code ?? json.error?.type ?? "";
        return { model, alive: false, ms, status: res.status, code, error: msg.slice(0, 200) };
    }

    const content = (json.choices?.[0]?.message?.content ?? "").trim();
    const reasoning = (json.choices?.[0]?.message?.reasoning_content ?? "").length;
    const usage = json.usage ?? {};

    // Penanda output rusak yang sudah terbukti (mis. space-bunny-free).
    const corrupt = /=[a-z]{4,}|\|[A-Z]{4,}|[a-z]{3,}[A-Z]{3,}/.test(content);

    return {
        model,
        alive: content.length > 0,
        ms,
        status: res.status,
        contentChars: content.length,
        reasoningChars: reasoning,
        finish: json.choices?.[0]?.finish_reason,
        promptTokens: usage.prompt_tokens ?? null,
        completionTokens: usage.completion_tokens ?? null,
        corrupt: corrupt || undefined,
        sample: content.slice(0, 160),
    };
}

console.log(`\nMenyiapkan uji ${models.length} model.`);
console.log(`Kuota plan FREE = 50 request/hari. Uji ini memakai ~${models.length} request.\n`);

const results = [];
for (const m of models) {
    process.stdout.write(`  menguji ${m.padEnd(30)} `);
    const r = await probe(m);
    results.push(r);
    if (r.alive) {
        console.log(`HIDUP  ${String(r.ms).padStart(6)}ms  ${r.contentChars} chars${r.corrupt ? "  [OUTPUT RUSAK]" : ""}`);
    } else {
        console.log(`MATI   ${String(r.ms).padStart(6)}ms  ${r.status ?? "-"} ${r.error ?? ""}`);
    }
    await new Promise((r2) => setTimeout(r2, 3000)); // jaga batas 6 req/menit
}

const alive = results.filter((r) => r.alive && !r.corrupt).sort((a, b) => a.ms - b.ms);
const corrupt = results.filter((r) => r.corrupt);
const dead = results.filter((r) => !r.alive);

console.log("\n=== RINGKASAN ===");
console.log(`Hidup & bersih : ${alive.map((r) => r.model).join(", ") || "(tidak ada)"}`);
console.log(`Output rusak   : ${corrupt.map((r) => r.model).join(", ") || "(tidak ada)"}`);
console.log(`Tidak hidup    : ${dead.map((r) => r.model).join(", ") || "(tidak ada)"}`);

const out = {
    _keterangan:
        "Hasil uji otomatis scripts/chat/probe-models.mjs. Perbarui env CHAT_MODELS_PRIMARY / SECONDARY / PROBATION sesuai daftar ini. Berkas ini tidak dibaca runtime.",
    testedAt: new Date().toISOString(),
    provider: BASE,
    models: results,
    recommendation: {
        primary: alive.slice(0, 2).map((r) => r.model),
        secondary: alive.slice(2, 4).map((r) => r.model),
        probation: dead.map((r) => r.model),
        denylist: corrupt.map((r) => r.model),
    },
};

const outPath = path.join(ROOT, "content/settings/chat-models.json");
fs.writeFileSync(outPath, `${JSON.stringify(out, null, 4)}\n`, "utf-8");
console.log(`\nHasil ditulis: content/settings/chat-models.json`);
console.log(
    `\nSaran env:\n  CHAT_MODELS_PRIMARY=${out.recommendation.primary.join(",")}\n  CHAT_MODELS_SECONDARY=${out.recommendation.secondary.join(",")}\n  CHAT_MODELS_PROBATION=${out.recommendation.probation.join(",")}\n  CHAT_MODELS_DENYLIST=${out.recommendation.denylist.join(",")}\n`
);
