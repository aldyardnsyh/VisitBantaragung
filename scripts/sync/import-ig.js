// Impor manual postingan Instagram ke artikel berita.
//
// Latar: Instagram menutup akses anonim (login wall global 2026), sehingga bot
// tidak bisa crawl IG otomatis. Alur hibrida: admin yang sudah login di HP
// menyalin URL + caption + menyimpan foto postingan baru ke antrean, lalu script
// ini membersihkan, me-rewrite (model dari env, sama seperti crawl.js), dan
// menulis JSON artikel. Ikut filosofi stage-gate: gagal => exit 1, bukan hijau palsu.
//
// Antrean: content/bic/antrean-ig.json (array; lihat CONTOH di bawah).
//   [
//     {
//       "url": "https://www.instagram.com/p/XXXXXXX/",
//       "caption": "teks caption lengkap postingan...",
//       "image": "docs-ig/foto1.jpg",   // path lokal relatif repo ATAU URL https
//       "date": "2026-09-18",           // tanggal posting (YYYY-MM-DD)
//       "category": "berita desa",      // opsional
//       "tags": ["bantaragung"]         // opsional
//     }
//   ]
//
// Pakai: node scripts/sync/import-ig.js [--dry-run]

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const BERITA_DIR = path.join(ROOT, "content", "bic", "berita");
const PUBLIC_DIR = path.join(ROOT, "public", "berita");
const QUEUE_FILE = path.join(ROOT, "content", "bic", "antrean-ig.json");
const DRY = process.argv.includes("--dry-run");

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
  } catch {
    // abaikan
  }
}
loadDotEnvLocal();

const LLM_API_KEY = process.env.LLM_API_KEY || "";
const LLM_URL = process.env.LLM_URL || "";
const LLM_MODEL = process.env.LLM_MODEL || "glm-5.3-flash";
const LLM_NO_THINK = process.env.LLM_NO_THINKING === "1";
const UA = "VisitBantaragungBot/1.0 (+visitbantaragung.com)";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const EMOJI_RE = /[︎-️　-️⬀-⯿️‍]/gu;

function cleanCaption(s) {
  return String(s || "")
    .replace(/https?:\/\/\S+/gi, " ")
    .replace(/#\w+/g, " ")
    .replace(/@\w+/g, " ")
    .replace(EMOJI_RE, "")
    .replace(/[ \t]+/g, " ")
    .replace(/[ \t]*\n[ \t]*/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

// Cerminan parseLLMText di crawl.js (JSON maupun SSE); jaga tetap sinkron.
function parseLLMText(raw) {
  if (raw.trimStart().startsWith("data:")) {
    let out = "";
    for (const line of raw.split("\n")) {
      const t = line.trim();
      if (!t.startsWith("data:")) continue;
      const payload = t.slice(5).trim();
      if (payload === "[DONE]") break;
      try {
        const j = JSON.parse(payload);
        const ch = j.choices && j.choices[0];
        out += (ch && (ch.delta?.content || (ch.message && ch.message.content))) || "";
      } catch {
        // abaikan chunk non-JSON
      }
    }
    return out;
  }
  let body;
  try {
    body = JSON.parse(raw);
  } catch {
    const obj = raw.slice(raw.indexOf("{"), raw.lastIndexOf("}") + 1);
    body = JSON.parse(obj);
  }
  return body.choices && body.choices[0] && body.choices[0].message.content;
}

function extractJSON(text) {
  for (let s = 0; s < text.length; s++) {
    if (text[s] !== "{") continue;
    let depth = 0;
    let inStr = false;
    let esc = false;
    for (let i = s; i < text.length; i++) {
      const ch = text[i];
      if (inStr) {
        if (esc) esc = false;
        else if (ch === "\\") esc = true;
        else if (ch === '"') inStr = false;
        continue;
      }
      if (ch === '"') inStr = true;
      else if (ch === "{") depth++;
      else if (ch === "}") {
        depth--;
        if (depth === 0) {
          try {
            return JSON.parse(text.slice(s, i + 1));
          } catch {
            break;
          }
        }
      }
    }
  }
  throw new Error("LLM bukan JSON");
}

// Prompt sekeluarga dengan REWRITE_PROMPT di crawl.js (murni gaya copywriting,
// fakta 100% dari caption, tanpa hashtag/emoji/link).
const REWRITE_PROMPT = `Kamu adalah penulis konten SEO dan copywriter profesional untuk website resmi "Visit Bantaragung", portal Desa Wisata Bantaragung (Kec. Sindangwangi, Majalengka, Jawa Barat).

Tugas: kembangkan caption Instagram mentah berbahasa Indonesia menjadi artikel profesional, natural, dan tidak terkesan template. Tulis ulang MURNI dengan gaya SEO profesional (mulai dari judul yang menarik, hook pembuka yang menjaring, narasi yang runtut, sampai isi yang informatif).

Aturan WAJIB:
1. PERTAHANKAN 100% fakta, pesan utama, nama tempat/pejabat/acara, tanggal, dan angka yang ada di caption. Jangan menambah klaim atau data baru yang tidak dijelaskan caption.
2. Dilarang pakai hashtag (#), emoji, tautan/link luar, atau menyebut platform seperti Instagram/TikTok dan akun sumber. Konten murni menjadi bagian dari website ini.
3. Judul: 1 baris, informatif + menggoda, tanpa tanda kutip, huruf kapital wajar, tanpa tanda titik di akhir. Judul TIDAK BOLEH diawali sapaan/seruan seperti "Sampurasun", "Halo", "Ayo", atau kata seru lainnya.
4. Hook pembuka 1 kalimat yang langsung menarik pembaca; lalu narasi lanjutan; tutup dengan makna/manfaatan dan ajakan partisipasi yang wajar (tanpa tautan).
5. Bahasa Indonesia formal-casual yang mengalir alami. Variasi kalimat: gabungan kalimat panjang dan pendek.
6. Panjang isi: antara 2 sampai 4 paragraf. Setiap paragraf 40–90 kata.
7. Keluarkan HANYA JSON valid tanpa teks tambahan, format: {"title":"...","excerpt":"...","content":["paragraf1","paragraf2",...]}
   - "excerpt": kalimat ringkas (26–40 kata) yang merangkum esensi.
   - "content": array paragraf hasil tulis ulang.

Dibawah adalah caption mentah:`;

async function rewriteCaption(caption) {
  let lastErr;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await fetch(LLM_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "User-Agent": UA,
          Authorization: `Bearer ${LLM_API_KEY}`,
        },
        body: JSON.stringify({
          model: LLM_MODEL,
          temperature: 0.7,
          max_tokens: 4000,
          ...(LLM_NO_THINK ? { enable_thinking: false } : {}),
          messages: [
            { role: "system", content: REWRITE_PROMPT },
            { role: "user", content: caption },
          ],
        }),
      });
      if ((res.status === 503 || res.status === 429 || res.status >= 500) && attempt < 3) {
        await sleep(3000 * attempt);
        continue;
      }
      if (!res.ok) throw new Error(`LLM HTTP ${res.status}`);
      const text = parseLLMText(await res.text());
      if (!text || !text.trim()) throw new Error("LLM kosong");
      return extractJSON(text);
    } catch (e) {
      lastErr = e;
      await sleep(2000 * attempt);
    }
  }
  throw lastErr || new Error("LLM gagal");
}

function shortcodeOf(url) {
  const m = String(url || "").match(/instagram\.com\/(?:p|reel|tv)\/([A-Za-z0-9_-]+)/);
  return m ? m[1] : "";
}

function validDate(s) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(s || ""))) return false;
  const d = new Date(s + "T00:00:00");
  return !Number.isNaN(d.getTime());
}

async function fetchCover(item, slug) {
  const dest = path.join(PUBLIC_DIR, slug, "cover.jpg");
  if (DRY) return `/berita/${slug}/cover.jpg`;
  let buf;
  if (/^https?:\/\//i.test(item.image)) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 30000);
    try {
      const res = await fetch(item.image, { signal: ctrl.signal, headers: { "User-Agent": UA } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const type = (res.headers.get("content-type") || "").toLowerCase();
      if (!/(jpeg|jpg|png|webp)/.test(type)) throw new Error(`bukan gambar (${type})`);
      buf = Buffer.from(await res.arrayBuffer());
    } finally {
      clearTimeout(timer);
    }
  } else {
    const src = path.resolve(ROOT, item.image);
    if (!fs.existsSync(src)) throw new Error(`file gambar tidak ada: ${item.image}`);
    if (!/\.(jpe?g|png|webp)$/i.test(src)) throw new Error("format gambar harus jpg/png/webp");
    buf = fs.readFileSync(src);
  }
  if (buf.length < 100) throw new Error("file gambar terlalu kecil/rusak");
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, buf);
  return `/berita/${slug}/cover.jpg`;
}

function loadQueue() {
  if (!fs.existsSync(QUEUE_FILE)) return [];
  // Regex di baris berikut men-strip BOM editor Windows (U+FEFF) di awal file.
  const raw = fs.readFileSync(QUEUE_FILE, "utf-8").replace(/^﻿/, "");
  const data = JSON.parse(raw);
  if (!Array.isArray(data)) throw new Error("antrean-ig.json harus berisi array");
  return data;
}

function loadExisting() {
  const slugs = new Set();
  const sources = new Set();
  if (fs.existsSync(BERITA_DIR)) {
    for (const f of fs.readdirSync(BERITA_DIR)) {
      if (!f.endsWith(".json")) continue;
      try {
        const d = JSON.parse(fs.readFileSync(path.join(BERITA_DIR, f), "utf-8"));
        if (d.slug) slugs.add(d.slug);
        if (d.sourceUrl) sources.add(d.sourceUrl);
      } catch {
        // abaikan file rusak
      }
    }
  }
  return { slugs, sources };
}

async function main() {
  const queue = loadQueue();
  if (!queue.length) {
    console.log("tidak ada antrean IG; selesai tanpa perubahan.");
    return;
  }
  if (!DRY && (!LLM_API_KEY || !LLM_URL)) {
    console.error("FATAL [gate-model]: LLM_API_KEY/LLM_URL belum dikonfigurasi.");
    process.exit(1);
  }
  if (DRY) console.log("[dry-run] validasi + simulasi saja, tanpa LLM dan tanpa tulis file");
  else console.log(`[llm] rewrite AI aktif (model=${LLM_MODEL})`);

  const existing = loadExisting();
  fs.mkdirSync(BERITA_DIR, { recursive: true });
  const remaining = [];
  let added = 0;
  let failed = 0;

  for (const [idx, item] of queue.entries()) {
    const tag = `antrean[${idx}]`;
    const code = shortcodeOf(item.url);
    if (!code) {
      console.warn(`${tag}: URL bukan postingan IG valid; lewati (tetap di antrean)`);
      remaining.push(item);
      failed++;
      continue;
    }
    const slug = `ig-${code.toLowerCase().replace(/[^a-z0-9]+/g, "")}`;
    if (existing.sources.has(item.url) || existing.slugs.has(slug)) {
      console.log(`${tag}: ${slug} sudah terimpor; keluarkan dari antrean`);
      continue;
    }
    if (!validDate(item.date)) {
      console.warn(`${tag}: date wajib format YYYY-MM-DD; lewati (tetap di antrean)`);
      remaining.push(item);
      failed++;
      continue;
    }
    const cleaned = cleanCaption(item.caption);
    if (cleaned.length < 20) {
      console.warn(`${tag}: caption terlalu pendek setelah dibersihkan; lewati (tetap di antrean)`);
      remaining.push(item);
      failed++;
      continue;
    }
    if (!item.image) {
      console.warn(`${tag}: image wajib diisi (path lokal/URL); lewati (tetap di antrean)`);
      remaining.push(item);
      failed++;
      continue;
    }

    if (DRY) {
      console.log(`[dry-run] would add ${slug} (${item.date})`);
      added++;
      continue;
    }

    try {
      await sleep(500);
      const out = await rewriteCaption(cleaned);
      if (!out.title || !Array.isArray(out.content) || !out.content.length) {
        throw new Error("hasil rewrite tidak lengkap");
      }
      const cover = await fetchCover(item, slug);
      const article = {
        slug,
        title: String(out.title).trim(),
        excerpt: String(out.excerpt || "").trim(),
        date: item.date,
        category: item.category || "berita desa",
        author: "Admin",
        cover,
        gallery: [],
        content: out.content.map((p) => String(p).replace(/\n+/g, " ").trim()).filter((p) => p.length > 20),
        origin: "kkn",
        tags: Array.isArray(item.tags) ? item.tags : [],
        sourceUrl: item.url,
        sourcePublishedAt: `${item.date}T00:00:00`,
        updatedAt: new Date().toISOString(),
        rewriteStatus: "success",
      };
      fs.writeFileSync(path.join(BERITA_DIR, `${slug}.json`), JSON.stringify(article, null, 4) + "\n");
      existing.slugs.add(slug);
      existing.sources.add(item.url);
      added++;
      console.log(`added ${slug}`);
    } catch (e) {
      console.warn(`gagal impor ${slug}: ${e.message}; tetap di antrean`);
      remaining.push(item);
      failed++;
    }
  }

  if (!DRY) {
    fs.writeFileSync(QUEUE_FILE, JSON.stringify(remaining, null, 4) + "\n");
  }
  console.log(`done. antrean=${queue.length} added=${added} failed=${failed} sisa=${DRY ? "-" : remaining.length}`);
  if (!DRY && (failed > 0 || added === 0)) {
    console.error("FATAL [gate-sync]: ada item gagal atau tidak ada yang terimpor.");
    process.exit(1);
  }
}

main().catch((e) => {
  console.error("FATAL:", e.message);
  process.exit(1);
});
