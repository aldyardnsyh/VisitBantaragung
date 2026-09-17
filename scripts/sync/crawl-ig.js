// Crawl otomatis postingan Instagram resmi (@visitbantaragung) via API resmi.
//
// Kenapa API resmi: Meta menutup akses anonim (login wall global 2026); uji
// langsung membuktikan oEmbed/embed tanpa token hanya mengembalikan halaman
// generik tanpa caption. Scraper logged-out dari IP datacenter (GitHub Actions)
// prioritas diblokir dan rapuh. Jalur ini sah, stabil, dan otomatis penuh.
//
// Syarat SATU KALI (oleh admin, ~15 menit):
//   1. Akun IG @visitbantaragung berjenis Bisnis/Kreator dan terhubung ke
//      Halaman Facebook desa.
//   2. Buat aplikasi di developers.facebook.com, tambahkan produk
//      "Instagram Graph API", berikan izin instagram_basic + pages_read_engagement.
//   3. Buat token akses (disarankan token jangka panjang) lalu simpan sebagai
//      GitHub Secrets: IG_USER_ID (id numerik akun IG) dan IG_ACCESS_TOKEN.
//   4. Dapatkan IG_USER_ID via: GET graph.facebook.com/me/accounts?access_token=...
//      lalu /{page-id}?fields=instagram_business_account.
//
// Catatan: token jangka panjang kedaluwarsa ±60 hari. Saat kedaluwarsa,
// workflow otomatis MERAH (jujur, bukan hijau palsu) sebagai pengingat refresh.
// Selama secrets belum diisi, workflow memakai fallback crawl WordPress.
//
// Pakai: node scripts/sync/crawl-ig.js [--dry-run]

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const BERITA_DIR = path.join(ROOT, "content", "bic", "berita");
const PUBLIC_DIR = path.join(ROOT, "public", "berita");
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

const IG_USER_ID = process.env.IG_USER_ID || "";
const IG_ACCESS_TOKEN = process.env.IG_ACCESS_TOKEN || "";
const IG_LIMIT = Math.min(parseInt(process.env.IG_LIMIT || "25", 10) || 25, 50);
const LLM_API_KEY = process.env.LLM_API_KEY || "";
const LLM_URL = process.env.LLM_URL || "";
const LLM_MODEL = process.env.LLM_MODEL || "glm-5.3-flash";
const LLM_NO_THINK = process.env.LLM_NO_THINKING === "1";
const NO_REWRITE_FLAG = process.argv.includes("--no-rewrite");
const LLM_REWRITE = Boolean(LLM_API_KEY && LLM_URL) && !NO_REWRITE_FLAG;
const UA = "VisitBantaragungBot/1.0 (+visitbantaragung.com)";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const EMOJI_RE = /[︎-️　-️⬀-⯿️‍]/gu;

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

// GATE 0 — model wajib merespons sebelum memproses (cerminan crawl.js).
async function assertLLMHealthy() {
  console.log(`[gate-model] cek respons model=${LLM_MODEL} ...`);
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
          temperature: 0,
          max_tokens: 16,
          ...(LLM_NO_THINK ? { enable_thinking: false } : {}),
          messages: [{ role: "user", content: "Balas hanya dengan: OK" }],
        }),
      });
      if (!res.ok) throw new Error(`LLM HTTP ${res.status}`);
      const text = parseLLMText(await res.text());
      if (!text || !text.trim()) throw new Error("LLM kosong");
      console.log("[gate-model] OK");
      return;
    } catch (e) {
      lastErr = e;
      console.warn(`[gate-model] percobaan ${attempt}/3 gagal: ${e.message}`);
      await sleep(2000 * attempt);
    }
  }
  console.error(`FATAL [gate-model]: model tidak merespons (${lastErr && lastErr.message}); sync dibatalkan.`);
  process.exit(1);
}

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

function tagsFromCaption(s) {
  const tags = [...new Set((String(s || "").match(/#([\p{L}\p{N}_]+)/gu) || []).map((t) => t.slice(1).toLowerCase()))];
  return tags.filter((t) => t.length > 1).slice(0, 5);
}

async function fetchMedia() {
  const fields = "id,caption,media_type,media_url,thumbnail_url,permalink,timestamp";
  const url =
    `https://graph.instagram.com/${IG_USER_ID}/media` +
    `?fields=${encodeURIComponent(fields)}&limit=${IG_LIMIT}&access_token=${encodeURIComponent(IG_ACCESS_TOKEN)}`;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 30000);
  try {
    const res = await fetch(url, { signal: ctrl.signal, headers: { "User-Agent": UA } });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      const msg = (body.error && body.error.message) || `HTTP ${res.status}`;
      throw new Error(`IG API: ${msg}`);
    }
    if (!Array.isArray(body.data)) throw new Error("IG API: format respons tak dikenal");
    return body.data;
  } finally {
    clearTimeout(timer);
  }
}

async function fetchCover(media, slug) {
  const src = media.media_type === "VIDEO" ? media.thumbnail_url : media.media_url || media.thumbnail_url;
  if (!src) throw new Error("media tanpa URL gambar");
  if (DRY) return `/berita/${slug}/cover.jpg`;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 30000);
  try {
    const res = await fetch(src, { signal: ctrl.signal, headers: { "User-Agent": UA } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const type = (res.headers.get("content-type") || "").toLowerCase();
    if (!/(jpeg|jpg|png|webp)/.test(type)) throw new Error(`bukan gambar (${type})`);
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length < 100) throw new Error("gambar terlalu kecil/rusak");
    const dest = path.join(PUBLIC_DIR, slug, "cover.jpg");
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.writeFileSync(dest, buf);
    return `/berita/${slug}/cover.jpg`;
  } finally {
    clearTimeout(timer);
  }
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
  if (!IG_USER_ID || !IG_ACCESS_TOKEN) {
    console.error("FATAL [gate-ig]: IG_USER_ID/IG_ACCESS_TOKEN belum dikonfigurasi; lihat header script untuk setup satu kali.");
    process.exit(1);
  }
  if (!DRY && !NO_REWRITE_FLAG) {
    if (!LLM_API_KEY || !LLM_URL) {
      console.error("FATAL [gate-model]: LLM_API_KEY/LLM_URL belum dikonfigurasi; rewrite wajib aktif.");
      process.exit(1);
    }
    await assertLLMHealthy();
  }
  if (DRY) console.log("[dry-run] no files will be written, no covers downloaded");

  // GATE 1 — API IG wajib memberi data.
  let media;
  try {
    media = await fetchMedia();
  } catch (e) {
    console.error(`FATAL [gate-ig]: ${e.message}`);
    process.exit(1);
  }
  if (!media.length) {
    console.error("FATAL [gate-ig]: API tidak mengembalikan media apa pun.");
    process.exit(1);
  }
  console.log(`[ig] media=${media.length}`);

  const existing = loadExisting();
  fs.mkdirSync(BERITA_DIR, { recursive: true });
  let added = 0;
  let skipped = 0;
  let rewriteFails = 0;
  let coverFails = 0;

  for (const m of media) {
    const slug = `ig-${String(m.id).replace(/[^a-z0-9]+/gi, "").toLowerCase()}`;
    if (!m.permalink || existing.sources.has(m.permalink) || existing.slugs.has(slug)) {
      skipped++;
      continue;
    }
    const cleaned = cleanCaption(m.caption);
    if (cleaned.length < 20) {
      skipped++;
      continue;
    }
    const date = String(m.timestamp || "").slice(0, 10) || new Date().toISOString().slice(0, 10);

    const article = {
      slug,
      title: cleaned.split("\n")[0].slice(0, 120),
      excerpt: cleaned.slice(0, 200),
      date,
      category: "berita desa",
      author: "Admin",
      cover: "",
      gallery: [],
      content: [cleaned],
      origin: "kkn",
      tags: tagsFromCaption(m.caption),
      sourceUrl: m.permalink,
      sourcePublishedAt: m.timestamp,
      updatedAt: new Date().toISOString(),
    };

    if (LLM_REWRITE && !DRY) {
      try {
        await sleep(500);
        const out = await rewriteCaption(cleaned);
        if (!out.title || !Array.isArray(out.content) || !out.content.length) {
          throw new Error("hasil rewrite tidak lengkap");
        }
        article.title = String(out.title).trim();
        article.excerpt = String(out.excerpt || "").trim();
        article.content = out.content.map((p) => String(p).replace(/\n+/g, " ").trim()).filter((p) => p.length > 20);
        article.rewriteStatus = "success";
      } catch (e) {
        rewriteFails++;
        skipped++;
        console.warn(`rewrite gagal untuk ${slug}: ${e.message}; skip (GATE 2)`);
        continue;
      }
    } else {
      article.rewriteStatus = LLM_REWRITE ? "pending" : "disabled";
    }

    try {
      article.cover = await fetchCover(m, slug);
    } catch (e) {
      coverFails++;
      console.warn(`cover gagal untuk ${slug}: ${e.message}`);
    }

    const file = path.join(BERITA_DIR, `${slug}.json`);
    const json = JSON.stringify(article, null, 4) + "\n";
    if (DRY) {
      console.log(`[dry-run] would add ${slug}`);
      added++;
      continue;
    }
    if (fs.existsSync(file) && fs.readFileSync(file, "utf-8") === json) {
      skipped++;
      continue;
    }
    fs.writeFileSync(file, json);
    added++;
  }

  console.log(`done. media=${media.length} added=${added} skipped=${skipped} rewriteFails=${rewriteFails} coverFails=${coverFails}`);
  if (rewriteFails > 0) {
    console.error(`FATAL [gate-rewrite]: ${rewriteFails} artikel gagal rewrite dan tidak ikut di-push.`);
    process.exit(1);
  }
  if (added === 0) {
    console.error("FATAL [gate-sync]: tidak ada postingan IG baru; tidak ada yang di-push.");
    process.exit(1);
  }
}

main().catch((e) => {
  console.error("FATAL:", e.message);
  process.exit(1);
});
