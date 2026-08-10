// Rewrite copywriting berita hasil crawl (content/bic/berita) via 9router lokal.
// Mempertahankan 100% fakta/isi utama; memperhalus kalimat & paragraf jadi profesional.
// Penggunaan: node scripts/rewrite-berita.mjs [slug1 slug2 ...]  (tanpa arg = semua)
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DIR = path.join(ROOT, "content", "bic", "berita");
const ONLY = process.argv.slice(2);

function loadDotEnvLocal() {
  try {
    const file = path.join(ROOT, ".env.local");
    if (!fs.existsSync(file)) return;
    for (const line of fs.readFileSync(file, "utf-8").split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
      if (!m || m[1].startsWith("#")) continue;
      if (process.env[m[1]] === undefined) {
        let v = m[2].trim();
        if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
        process.env[m[1]] = v;
      }
    }
  } catch {}
}
loadDotEnvLocal();

const LLM_API_KEY = process.env.LLM_API_KEY || "";
const LLM_URL = process.env.LLM_URL || "";
const LLM_MODEL = process.env.LLM_MODEL || "ds/deepseek-v4-flash";
const LLM_NO_THINK = process.env.LLM_NO_THINKING === "1";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const EMOJI_RE = /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{FE0F}\u{200D}]/gu;
function deDash(s) {
  return String(s).replace(/\s*[—–]\s*/g, ", ").replace(/\s{2,}/g, " ").trim();
}

const PROMPT = `Kamu adalah penulis konten SEO dan copywriter profesional portal resmi "Visit Bantaragung" — Desa Wisata Bantaragung, Kec. Sindangwangi, Majalengka, Jawa Barat.

Tulis ulang berita ini menjadi artikel yang mengalir profesional. Kalimat dan paragraf diperhalus, tidak terkesan template, dan informasi tetap utuh.

Aturan:
1. PERTAHANKAN 100% fakta: nama tempat, acara, tanggal, angka, dan esensi pesan. Jangan menambah klaim baru.
2. Bahasa Indonesia netral, natural. Tanpa emoji/hashtag/tautan/sapaan berlebihan.
3. Judul: informatif + menggoda, tanpa sapaan ("Sampurasun", "Halo", dll) dan tanpa tanda titik di akhir. Jika judul sumber terpotong di tengah kata, bangun ulang judul yang utuh dari isi.
4. Ekscerpt: 1-2 kalimat (26-40 kata) merangkum esensi.
5. Isi: 3-4 paragraf (40-90 kata per paragraf). Variasi panjang kalimat. Jangan gunakan em-dash (—).
6. Output HANYA JSON: {"title":"...","excerpt":"...","content":["...","..."]}`;

async function rewrite({ category, title, content }) {
  const body = {
    model: LLM_MODEL,
    temperature: 0.7,
    max_tokens: 3000,
    ...(LLM_NO_THINK ? { enable_thinking: false } : {}),
    messages: [
      { role: "system", content: PROMPT },
      { role: "user", content: `KATEGORI: ${category}\nJUDUL: ${title}\n\nISI:\n${content.join("\n\n")}` },
    ],
  };
  for (let attempt = 1; attempt <= 2; attempt++) {
    const res = await fetch(LLM_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", "User-Agent": "VisitBantaragungBot/1.0", Authorization: `Bearer ${LLM_API_KEY}` },
      body: JSON.stringify(body),
    });
    const raw = await res.text();
    let json;
    try { json = JSON.parse(raw); } catch { json = JSON.parse(raw.slice(raw.indexOf("{"), raw.lastIndexOf("}") + 1)); }
    const text = json.choices?.[0]?.message?.content;
    if (!text && attempt === 1) { await sleep(2000); continue; }
    if (!text) throw new Error("LLM kosong");
    for (let s = 0; s < text.length; s++) {
      if (text[s] !== "{") continue;
      let depth = 0, inStr = false, esc = false;
      for (let i = s; i < text.length; i++) {
        const ch = text[i];
        if (inStr) { if (esc) esc = false; else if (ch === "\\") esc = true; else if (ch === '"') inStr = false; continue; }
        if (ch === '"') inStr = true;
        else if (ch === "{") depth++;
        else if (ch === "}") { depth--; if (depth === 0) { try { return JSON.parse(text.slice(s, i + 1)); } catch { break; } } }
      }
    }
    throw new Error("LLM bukan JSON");
  }
  throw new Error("LLM kosong (retry habis)");
}

function sanitize(out) {
  out.title = deDash(out.title).replace(EMOJI_RE, "").trim();
  out.excerpt = deDash(out.excerpt).replace(EMOJI_RE, "").trim();
  out.content = (Array.isArray(out.content) ? out.content : [])
    .map((p) => deDash(String(p).replace(EMOJI_RE, "")).replace(/\n+/g, " ").trim())
    .filter((p) => p.length > 20);
  if (!out.title || !out.content.length) throw new Error("hasil tidak layak");
  return out;
}

if (!LLM_API_KEY || !LLM_URL) {
  console.error("Set LLM_URL & LLM_API_KEY (9router lokal) di .env.local dahulu.");
  process.exit(1);
}

let files = fs.readdirSync(DIR).filter((f) => f.endsWith(".json"));
if (ONLY.length) {
  files = files.filter((f) => ONLY.some((slug) => f.startsWith(slug)));
}

let ok = 0, fail = 0;
for (const file of files) {
  const full = path.join(DIR, file);
  const article = JSON.parse(fs.readFileSync(full, "utf-8"));
  try {
    const out = sanitize(await rewrite(article));
    article.title = out.title;
    article.excerpt = out.excerpt;
    article.content = out.content;
    article.updatedAt = new Date().toISOString();
    fs.writeFileSync(full, JSON.stringify(article, null, 4) + "\n");
    ok++;
    console.log(`ok ${article.slug}: ${out.title}`);
  } catch (e) {
    fail++;
    console.error(`FAIL ${file}: ${e.message}`);
  }
}
console.log(`selesai. rewrite=${ok} fail=${fail}`);