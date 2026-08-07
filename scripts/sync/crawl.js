import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const BERITA_DIR = path.join(ROOT, "content", "bic", "berita");
const ARTIKEL_DIR = path.join(ROOT, "content", "bic", "artikel");
const PUBLIC_DIR = path.join(ROOT, "public", "berita");
const API = "https://bantaragung.com/wp-json/wp/v2";
const DRY = process.argv.includes("--dry-run");

// Baca .env.local (di-gitignore, aman untuk konfigurasi lokal) tanpa menimpa env existing
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
    // abaikan; env tetap dipakai apa adanya
  }
}
loadDotEnvLocal();

// --- LLM rewrite (opsional): aktif bila LLM_API_KEY terisi (mis. 9router lokal / OpenAI-compatible).
// AMANAN: key/URL cukup dari env, jangan pernah di-commit (gitignore sudah memblokir .env*).
// Tanpa key => fallback ke pembersihan konten (rewrite nonaktif), crawler tetap jalan.
const LLM_API_KEY = process.env.LLM_API_KEY || "";
const LLM_URL = process.env.LLM_URL || ""; // contoh: http://localhost:11434/v1/chat/completions (9router lokal)
const LLM_MODEL = process.env.LLM_MODEL || "oc/deepseek-v4-flash-free";
const LLM_NO_THINK = process.env.LLM_NO_THINKING === "1";
const LLM_REWRITE = Boolean(LLM_API_KEY && LLM_URL) && !process.argv.includes("--no-rewrite");

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// User-Agent eksplisit: WP/shared-hosting sering memblokir request tanpa UA
// atau dari IP datacenter GitHub Actions.
const UA = "VisitBantaragungBot/1.0 (+visitbantaragung.com)";
const BASE_HEADERS = { "User-Agent": UA };

// Fetch dengan retry/backoff untuk menahan 429/5xx/network glitch di CI
async function getWithRetry(url, options = {}, attempts = 3) {
  let lastErr;
  for (let i = 1; i <= attempts; i++) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 30000);
    try {
      const res = await fetch(url, {
        signal: ctrl.signal,
        ...options,
        headers: { ...BASE_HEADERS, ...(options.headers || {}) },
      });
      if ((res.status === 429 || res.status >= 500) && i < attempts) {
        await sleep(1500 * i);
        continue;
      }
      if (!res.ok) throw new Error(`HTTP ${res.status} on ${url}`);
      return res;
    } catch (e) {
      if (i < attempts && !/^HTTP 4/.test(e.message)) {
        lastErr = e;
        await sleep(1500 * i);
        continue;
      }
      throw e;
    } finally {
      clearTimeout(timer);
    }
  }
  throw lastErr || new Error("gagal fetch");
}

async function getJson(url) {
  const res = await getWithRetry(url);
  const data = await res.json();
  if (!Array.isArray(data) && data.code) throw new Error(`WP error ${data.code}: ${data.message} on ${url}`);
  return data;
}

function stripTags(s) {
  return String(s || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

// Fallback RSS bila REST API diblokir dari domain/IP runner
async function fetchRss() {
  const res = await getWithRetry("https://bantaragung.com/feed/");
  const xml = await res.text();
  const items = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].map((m) => m[1]);
  return items.map((it) => {
    const title = stripTags((it.match(/<title[^>]*>([\s\S]*?)<\/title>/) || [])[1] || "");
    const link = ((it.match(/<link>([^<]+)<\/link>|href="([^"]+)"\/>/i) || [])[1] || (it.match(/<guid[^>]*>([^<]+)/) || [])[1] || "").trim();
    const date = (it.match(/<pubDate[^>]*>([^<]+)/) || [])[1] || "";
    const desc = stripTags((it.match(/<description[^>]*>([\s\S]*?)<\/description>/) || [])[1] || "");
    const slug = (link.split("/").filter(Boolean).pop() || "").replace(/[^a-z0-9-]/gi, "");
    return {
      slug,
      link,
      title,
      date: new Date(date).toISOString(),
      content: { rendered: desc },
      excerpt: { rendered: desc },
      categories: [],
    };
  });
}

async function fetchPages(route, cap) {
  const out = [];
  for (let page = 1; page <= cap; page++) {
    await sleep(300);
    let batch;
    try {
      batch = await getJson(`${API}/${route}?per_page=100&page=${page}`);
    } catch (e) {
      if (page === 1) throw e;
      break;
    }
    if (!Array.isArray(batch) || batch.length === 0) break;
    out.push(...batch);
  }
  return out;
}

// \u{1F000}-\u{1FAFF} emoji, \u{2600}-\u{27BF} dingbats/misc, \u{2B00}-\u{2BFF} arrows,
// \u{FE0F} variation selector, \u{200D} ZWJ (joins multi-codepoint emoji)
const EMOJI_RE = /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{FE0F}\u{200D}]/gu;

const ENTITIES = {
  "&nbsp;": " ",
  "&amp;": "&",
  "&quot;": '"',
  "&apos;": "'",
  "&lt;": "<",
  "&gt;": ">",
  "&hellip;": "…",
  "&ndash;": "-",
  "&mdash;": "—",
  "&#8211;": "-",
  "&#8212;": "—",
  "&#8216;": "'",
  "&#8217;": "'",
  "&#8220;": '"',
  "&#8221;": '"',
  "&#8230;": "…",
};

function safeCodePoint(cp) {
  try {
    return String.fromCodePoint(cp);
  } catch {
    return "";
  }
}

function decodeEntities(s) {
  s = s.replace(/&#x([0-9a-f]+);/gi, (_, h) => safeCodePoint(parseInt(h, 16)));
  s = s.replace(/&#(\d+);/g, (_, d) => safeCodePoint(parseInt(d, 10)));
  for (const [k, v] of Object.entries(ENTITIES)) s = s.split(k).join(v);
  return s;
}

function cleanText(html) {
  let s = String(html || "")
    .replace(/<figure[\s\S]*?<\/figure>/gi, " ")
    .replace(/<(script|style|iframe)[\s\S]*?<\/\1>/gi, " ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|li|h[1-6]|blockquote|tr)>/gi, "\n\n")
    .replace(/<[^>]+>/g, " ");
  s = decodeEntities(s);
  s = s.replace(EMOJI_RE, "");
  s = s.replace(/[\uFFFD]+/g, "");
  s = s.replace(/https?:\/\/\S+/gi, "");
  s = s.replace(/^#\S+\s*$/gm, "");
  s = s.replace(/#\w+/g, "");
  s = s.replace(/@\w+/g, "");
  s = s.replace(/[ \t]+/g, " ");
  s = s.replace(/[ \t]*\n[ \t]*/g, "\n");
  s = s.replace(/\n{3,}/g, "\n\n");
  return s.trim();
}

function cleanTitle(t) {
  let s = decodeEntities(String(t || "")).replace(EMOJI_RE, "");
  s = s.replace(/[\uFFFD]+/g, "");
  s = s.replace(/[…\u2026][. ]*$/u, "").replace(/^[…\u2026][. ]*/u, "");
  s = s.replace(/\s+/g, " ").trim();
  return s;
}

// Em-dash (—) dan en-dash (–) khas tulisan template/AI → ganti jadi koma+spasi agar natural
function deDash(s) {
  return s.replace(/\s*[—–]\s*/g, ", ").replace(/\s{2,}/g, " ").trim();
}

// Judul sumber sering terpotong di tengah kata oleh WordPress (mis. "...kepada selu").
// Jika terindikasi terpotong, bangun ulang judul dari kalimat pembuka paragraf pertama.
function looksTruncated(title) {
  if (/…|\.{3}$/u.test(title)) return true;
  const words = title.trim().split(/\s+/);
  if (words.length < 5) return false;
  const last = words[words.length - 1];
  // fragmen akhir yang sangat pendek = kemungkinan kata terpotong
  return last.length <= 4;
}

function deriveTitle(paragraph) {
  const words = paragraph.trim().split(/\s+/);
  const out = [];
  for (const w of words) {
    const candidate = [...out, w].join(" ");
    if (candidate.length > 70) break;
    out.push(w);
  }
  let t = out.join(" ").replace(/[.,;:!?…\u2026]+$/u, "").trim();
  return t || paragraph.trim();
}

// Template/CTA boilerplate dari template website sumber (tidak informatif bagi pembaca)
const BOILERPLATE = [
  "lihat postingan asli di instagram",
  "tertarik dengan konten ini? tanya kami langsung",
  "tertarik dengan konten ini? tanya kami langsung:",
  "tanya kami langsung",
  "tanya kami langsung:",
  "hubungi kami",
  "hubungi admin",
  "hubungi kami langsung",
  "booking via whatsapp",
  "pesan sekarang via whatsapp",
  "reservasi via whatsapp",
  "follow kami di instagram",
  "ikuti kami di instagram",
  "info lebih lanjut hubungi",
];

function isBoilerplate(line) {
  const key = line.toLowerCase().replace(/[.!?:\-–—\s]+$/g, "").trim();
  return BOILERPLATE.includes(key) || BOILERPLATE.includes(line.toLowerCase().trim());
}

// Potong aman: jangan sampai memotong di tengah pasangan surrogate (menghasilkan mojibake �)
function truncateSafe(s, n) {
  let out = s.slice(0, n);
  out = out.replace(/[\uD800-\uDBFF][\uDC00-\uDFFF]?$/, "");
  return out.trimEnd();
}

const REWRITE_PROMPT = `Kamu adalah penulis konten SEO dan copywriter profesional untuk website resmi "Visit Bantaragung", portal Desa Wisata Bantaragung (Kec. Sindangwangi, Majalengka, Jawa Barat).

Tugas: tulislah ulang berita mentah berbahasa Indonesia menjadi artikel profesional, natural, dan tidak terkesan template. Tulis ulang MURNI dengan gaya SEO profesional (mulai dari judul yang menarik, hook pembuka yang menjaring, narasi yang runtut, sampai isi yang informatif). Variasikan struktur dan pilihan kata antar artikel agar tidak terdengar seragam.

Aturan WAJIB:
1. PERTAHANKAN 100% fakta, pesan utama, nama tempat/pejabat/acara, tanggal, dan angka yang ada di sumber. Jangan menambah klaim atau data baru yang tidak dijelaskan sumber.
2. Dilarang pakai hashtag (#), emoji, tautan/link luar, atau menyebut platform seperti Instagram/TikTok/Media sosial dan akun sumber. Konten murni menjadi bagian dari website ini.
3. Judul: 1 baris, informatif + menggoda, tanpa tanda kutip, huruf kapital wajar, tanpa mengambang/tanda titik di akhir. Judul TIDAK BOLEH diawali sapaan/seruan seperti "Sampurasun", "Halo", "Ayo", "Alhamdulillah", "Ternyata", atau kata seru lainnya; gunakan judul berita yang langsung menyampaikan topik/intinya.
4. Hook pembuka 1 kalimat yang langsung menarik pembaca; lalu narasi lanjutan; tutup dengan makna/manfaatan dan ajakan partisipasi yang wajar (tanpa tautan).
5. Bahasa Indonesia formal-casual yang mengalir alami. Variasi kalimat: gabungan kalimat panjang dan pendek.
6. Panjang isi: antara 2 sampai 4 paragraf. Setiap paragraf 40–90 kata.
7. Keluarkan HANYA JSON valid tanpa teks tambahan, format: {"title":"...","excerpt":"...","content":["paragraf1","paragraf2",...]}
   - "excerpt": kalimat ringkas (26–40 kata) yang merangkum esensi.
   - "content": array paragraf hasil tulis ulang.

Dibawah adalah berita mentah (judul, kategori, dan isi):`;

// Ambil JSON pertama yang valid (brace-balancing, tahan terhadap teks ekstra sebelum/sesudah)
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

async function rewriteArticle(post) {
  const userMsg =
    `KATEGORI: ${post.category}\n` +
    `BERITA MENTAH:\n` +
    `Judul: ${post.title}\n\n` +
    post.content.join("\n\n");

  let res;
  for (let attempt = 1; attempt <= 2; attempt++) {
    res = await fetch(LLM_URL, {
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
          { role: "user", content: userMsg },
        ],
      }),
    });

    if (!res.ok) throw new Error(`LLM HTTP ${res.status}: ${await res.text()}`);
    const raw = await res.text();
    if (process.env.LLM_DEBUG) console.error("=== RAW LLM RESPONSE (tail) ===\n" + raw.slice(-500));

    let body;
    try {
      body = JSON.parse(raw);
    } catch {
      // Beberapa gateway menempel teks/objek ganda; coba ambil objek pertama yang valid
      const obj = raw.slice(raw.indexOf("{"), raw.lastIndexOf("}") + 1);
      body = JSON.parse(obj);
    }
    const text = body.choices && body.choices[0] && body.choices[0].message.content;
    if (!text && attempt === 1) {
      await sleep(2000);
      continue;
    }
    if (!text) throw new Error("LLM kosong");

    const out = extractJSON(text);
    out.title = deDash(cleanTitle(out.title));
    out.excerpt = deDash(String(out.excerpt || "")).trim();
    out.content = (Array.isArray(out.content) ? out.content : [])
      .map((p) => deDash(String(p).replace(EMOJI_RE, "")).replace(/\n+/g, " ").trim())
      .filter((p) => p.length > 20);
    return out;
  }
  throw new Error("LLM kosong (setelah retry)");
}

// Terapkan hasil rewrite LLM ke artikel (judul, ekscerpt, isi)
function finalizeArticle(base, rewritten) {
  if (!rewritten) return base;
  const { title, excerpt, content } = rewritten;
  base.title = title;
  base.excerpt = excerpt || base.excerpt;
  base.content = content;
  return base;
}

function mapCategory(cats) {
  const names = cats.map((c) => String(c.name || "").toLowerCase());
  const hits = (re) => names.some((n) => re.test(n));
  if (hits(/prestasi|penghargaan|sertifikasi|berhasil|juara|terbaik/)) return "prestasi";
  if (hits(/kuliner|makanan|kopi|pasar/)) return "kuliner";
  if (hits(/event|kesempatan|pendaftaran|bootcamp|fest|info/)) return "event";
  if (hits(/wisata|destinasi|alam|liburan|camping|curug/)) return "wisata";
  return "berita desa";
}

function tagSlug(c) {
  const s = String(c.slug || c.name || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  return s.slice(0, 40);
}

function loadExisting() {
  const existing = { slugs: new Set(), sources: new Set(), artikel: new Set() };
  if (fs.existsSync(BERITA_DIR)) {
    for (const f of fs.readdirSync(BERITA_DIR)) {
      if (!f.endsWith(".json")) continue;
      try {
        const d = JSON.parse(fs.readFileSync(path.join(BERITA_DIR, f), "utf-8"));
        if (d.slug) existing.slugs.add(d.slug);
        if (d.sourceUrl) existing.sources.add(d.sourceUrl);
      } catch {
        // unreadable/partial file: ignore, will be overwritten
      }
    }
  }
  if (fs.existsSync(ARTIKEL_DIR)) {
    for (const f of fs.readdirSync(ARTIKEL_DIR)) {
      if (f.endsWith(".json")) existing.artikel.add(f.slice(0, -5));
    }
  }
  return existing;
}

async function fetchCover(post, slug) {
  if (!post.featured_media) return "";
  await sleep(300);
  let media;
  try {
    media = await getJson(`${API}/media/${post.featured_media}`);
  } catch {
    return "";
  }
  const src = media && media.source_url;
  if (!src) return "";
  const ext = path.extname(new URL(src).pathname).toLowerCase();
  if (![".jpg", ".jpeg", ".png", ".webp"].includes(ext)) return "";
  if (DRY) return `/berita/${slug}/cover.jpg`;
  let res;
  try {
    res = await getWithRetry(src, {}, 2);
  } catch {
    return "";
  }
  const type = (res.headers.get("content-type") || "").toLowerCase();
  if (!/(jpeg|jpg|png|webp)/.test(type)) return "";
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length < 100) return "";
  const dir = path.join(PUBLIC_DIR, slug);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, "cover.jpg"), buf);
  return `/berita/${slug}/cover.jpg`;
}

async function main() {
  if (DRY) console.log("[dry-run] no files will be written, no covers downloaded");
  const catsById = new Map();
  try {
    for (const c of await fetchPages("categories", 3)) {
      catsById.set(c.id, { name: c.name, slug: c.slug });
    }
  } catch (e) {
    console.warn(`kategori tidak termuat (${e.message}); lanjut tanpa kategori`);
  }

  let posts;
  try {
    posts = await fetchPages("posts?_embed=true", 5);
  } catch (e) {
    console.warn(`REST posts gagal (${e.message}); fallback ke RSS feed`);
    posts = await fetchRss();
  }

  const existing = loadExisting();
  fs.mkdirSync(BERITA_DIR, { recursive: true });

  let added = 0;
  let updated = 0;
  let skipped = 0;
  let coverFails = 0;

  for (const post of posts) {
    if (post.content && post.content.protected) continue;
    const rawHtml = post.content && post.content.rendered;
    if (!rawHtml || !rawHtml.trim()) continue;

    let slug = String(post.slug || "").toLowerCase();
    if (!slug) continue;
    if (existing.sources.has(post.link)) {
      skipped++;
      continue;
    }
    if (existing.slugs.has(slug)) {
      skipped++;
      continue;
    }
    if (existing.artikel.has(slug)) slug += "-berita";

    const title = cleanTitle(post.title && post.title.rendered);
    if (!title) continue;

    const content = cleanText(rawHtml)
      .split(/\n+/)
      .map((p) => p.trim())
      .filter((p) => p && !isBoilerplate(p) && p.length > 1 && !/^[•·\-–—]+$/.test(p));
    if (content.length < 1) {
      skipped++;
      continue;
    }

    // Judul terpotong (kasus WP) → bangun ulang dari kalimat pembuka konten
    const fixedTitle = looksTruncated(title) ? deriveTitle(content[0]) : title;
    const finalTitle = deDash(fixedTitle);
    // Bersihkan konten dari dash khas template juga
    const finalContent = content.map(deDash).filter(Boolean);

    let excerpt = cleanText(post.excerpt && post.excerpt.rendered);
    if (!excerpt) excerpt = finalContent[0];
    if (excerpt.length > 200) excerpt = truncateSafe(excerpt, 197) + "…";

    const postCats = (post.categories || []).map((id) => catsById.get(id)).filter(Boolean);
    const tags = [...new Set(postCats.map(tagSlug).filter(Boolean))].slice(0, 5);
    const date = String(post.date || "").slice(0, 10);

    const cover = await fetchCover(post, slug);
    if (!cover && post.featured_media) coverFails++;

    const article = {
      slug,
      title: finalTitle,
      excerpt,
      date,
      category: mapCategory(postCats),
      author: "Admin",
      cover,
      gallery: [],
      content: finalContent,
      origin: "berita",
      tags,
      sourceUrl: post.link,
      sourcePublishedAt: post.date,
      updatedAt: new Date().toISOString(),
    };

    if (LLM_REWRITE && !DRY) {
      try {
        await sleep(500);
        finalizeArticle(article, await rewriteArticle(article));
      } catch (e) {
        console.warn(`rewrite gagal untuk ${slug}: ${e.message}; pakai hasil cleaning`);
      }
    }

    const file = path.join(BERITA_DIR, `${slug}.json`);
    const json = JSON.stringify(article, null, 4) + "\n";
    let existed = false;
    if (fs.existsSync(file)) {
      existed = true;
      if (fs.readFileSync(file, "utf-8") === json) {
        skipped++;
        continue;
      }
    }
    if (DRY) {
      console.log(`[dry-run] would ${existed ? "update" : "add"} ${slug}`);
      if (existed) updated++;
      else added++;
      continue;
    }
    fs.writeFileSync(file, json);
    if (existed) updated++;
    else added++;
  }

  console.log(
    `done. posts=${posts.length} added=${added} updated=${updated} skipped=${skipped} coverFails=${coverFails}`
  );
}

// Mode debug: rewrite satu artikel terbaru lalu keluar (untuk uji kualitas tanpa crawl penuh)
if (process.argv.includes("--test-rewrite")) {
  const [p] = await fetchPages("posts?_embed=true", 1);
  const rawHtml = p && p.content && p.content.rendered;
  if (!p || !rawHtml) {
    console.error("Tidak ada post untuk diuji");
    process.exit(1);
  }
  const cleaned = cleanText(rawHtml)
    .split(/\n+/)
    .map((x) => x.trim())
    .filter((x) => x && !isBoilerplate(x) && x.length > 1);
  const sample = {
    title: deDash(deriveTitle(cleaned[0] || p.title.rendered)),
    category: "berita desa",
    content: cleaned.map(deDash).filter(Boolean),
  };
  console.log("Post yang diuji:", sample.title);
  try {
    console.log(JSON.stringify(await rewriteArticle(sample), null, 2));
    console.log("[test-rewrite] OK");
  } catch (e) {
    console.error("[test-rewrite] GAGAL:", e.message);
    process.exit(1);
  }
  process.exit(0);
}

main().catch((e) => {
  console.error("FATAL:", e.message);
  process.exit(1);
});
