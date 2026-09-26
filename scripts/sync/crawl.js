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

// --- LLM rewrite (WAJIB): aktif bila LLM_API_KEY+LLM_URL terisi.
// Stage-gate pipeline (hijau = sistem sehat; merah = ada masalah nyata):
//   GATE 0 model  -> ping dulu; tanpa respons => FATAL (exit 1).
//   GATE 1 crawl  -> sumber wajib memberi data; kosong => FATAL.
//   GATE 2 rewrite-> artikel gagal rewrite TIDAK di-push mentah; run FATAL.
//   GATE 3 sync   -> tidak ada artikel baru itu NORMAL (exit 0), bukan kegagalan.
// Merge hanya bila ada artikel baru yang ter-rewrite;sisanya tidak di-push.
// Tanpa key/URL (dan tanpa --no-rewrite eksplisit) => FATAL, bukan fallback diam-diam.
// AMANAN: key/URL cukup dari env, jangan pernah di-commit (gitignore sudah memblokir .env*).
const LLM_API_KEY = process.env.LLM_API_KEY || "";
const LLM_URL = process.env.LLM_URL || ""; // contoh: http://localhost:11434/v1/chat/completions (9router lokal)
const LLM_MODEL = process.env.LLM_MODEL || "oc/deepseek-v4-flash-free";
const LLM_NO_THINK = process.env.LLM_NO_THINKING === "1";
const LLM_REWRITE = Boolean(LLM_API_KEY && LLM_URL) && !process.argv.includes("--no-rewrite");
if (LLM_REWRITE) {
  console.log(`[llm] rewrite AI aktif (model=${LLM_MODEL})`);
}

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

// Fallback RSS bila REST API diblokir dari domain/IP runner.
// Tidak pernah melempar: bila RSS juga gagal, kembalikan [] agar crawler tetap "sukses".
async function fetchRss() {
  try {
    const res = await getWithRetry("https://bantaragung.com/feed/", {}, 2);
    const xml = await res.text();
    const items = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].map((m) => m[1]);
    if (!items.length) {
      console.warn("[rss] feed kosong/tidak ter-parse");
      return [];
    }
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
  } catch (e) {
    console.warn(`[rss] gagal (${e.message}); lanjut tanpa data`);
    return [];
  }
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

const REWRITE_PROMPT = `Kamu adalah copywriter profesional untuk website resmi "Visit Bantaragung",
portal Desa Wisata Bantaragung (Kec. Sindangwangi, Majalengka, Jawa Barat).
Kamu menulis seperti copywriter manusia berpengalaman: tajam, hangat, dan
tahu cara mengajak pembaca datang tanpa-teriak-teriak.

Tugas: ubah berita mentah menjadi artikel siap terbit yang enak dibaca sampai habis.

CARA MENULIS (WAJIB DIPATUHI):

1. HOOK. Kalimat pertama harus langsung menarik. Bentuknya bebas (cerita,
   pertanyaan, gambaran suasana, atau fakta yang membuat penasaran), tapi harus
   membuat pembaca ingin lanjut. Jangan buka dengan basa-basi.

2. STRUKTUR. Alur: hook, isi utama (fakta, lokasi, agenda, atau kegiatan),
   lalu penutup yang bermakna. Setiap paragraf punya satu pikiran utama.

3. GAYA BAHASA. Campur kalimat panjang dan pendek. Gunakan kata yang tepat,
   bukan kata umum yang tidak berarti. Variasikan struktur antar artikel.

4. SENSA MANUSIA. Ini yang paling penting:
   - Jangan memakai kalimat template seperti "bukan hanya X, tetapi juga Y".
   - Jangan memakai kata buzzwords yang tidak berarti.
   - Jangan memakai tanda pisah panjang.
   - Jangan menutup dengan kalimat cliche.
   - Tulis seperti bercerita ke teman, tapi tetap rapi dan profesional.

5. SEO. Masukkan kata kunci utama secara natural di judul dan paragraf
   pertama. Judul maksimal 65 karakter agar tidak terpotong di hasil pencarian.

6. PROMOSI HALUS. Sisipkan satu atau dua alasan nyata agar pembaca tertarik
   datang, dengan menyebut suasana, fasilitas, atau kegiatan yang benar-benar
   ada dalam sumber. Jangan memakai kalimat ajakan dagang.

7. KEJUJURAN. PERTAHANKAN 100% fakta, nama tempat, nama orang, tanggal, dan
   angka yang ada di sumber. Jangan mengarang klaim, statistik, atau testimoni.
   Jangan menambah tempat yang tidak disebut sumber.

8. LARANGAN. Tanpa hashtag, emoji, tautan, dan tanpa menyebut Instagram atau
   media sosial.

FORMAT KELUARAN: HANYA JSON valid tanpa teks lain:
{"title":"...","excerpt":"...","content":["paragraf1","paragraf2","paragraf3","paragraf4"]}
- "title": judul berita, tanpa tanda kutip dan tanpa titik di akhir.
- "excerpt": 1 kalimat ringkas, 26 sampai 40 kata.
- "content": 3 sampai 4 paragraf, tiap paragraf 45 sampai 85 kata.

BERITA MENTAH (judul, kategori, isi):`;

// Ambil JSON pertama yang valid (brace-balancing, tahan terhadap teks ekstra
// sebelum/sesudah). Versi ini khusus untuk model yang sering
// membungkus JSON di dalam markdown fence (```json ... ```) atau menambah prosa.
function extractJSON(text) {
  const candidates = [];
  // 1. Semua objek {...} yang ter-balance (urutan kemunculan).
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
          candidates.push(text.slice(s, i + 1));
          break;
        }
      }
    }
  }
  // 2. Fallback: rentang pertama "{" sampai "}" terakhir.
  candidates.push(text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1));

  for (const c of candidates) {
    if (!c || c.length < 10) continue;
    try {
      const parsed = JSON.parse(c);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) return parsed;
    } catch {
      // coba kandidat berikutnya
    }
  }
  throw new Error("LLM bukan JSON");
}

// Susun artikel dari sumber TERBERSIHKAN saat model tidak bisa menulis ulang.
// Ini bukan "tempel mentah": emoji, tautan, hashtag, CTA, dan boilerplate sudah
// dibuang oleh cleanText/isBoilerplate. Dipakai hanya sebagai jaring pengaman
// agar berita baru tetap terbit bersih, dengan label status yang jujur.
function artikelBersih(base) {
  const paras = (base.content || []).map((p) => bersihkanOutput({ title: "", excerpt: "", content: [p] }).content[0]).filter((p) => p.length > 60);
  if (!paras.length) return null;
  const judul = looksTruncated(base.title) ? deriveTitle(paras[0]) : base.title;
  return {
    title: deDash(cleanTitle(judul)),
    excerpt: deDash(paras[0].slice(0, 197)) + "…",
    content: paras,
  };
}

// Ambil teks balasan model dari envelope JSON maupun streaming SSE
// (beberapa gateway memaksa SSE meski tidak diminta).
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
        // abaikan chunk non-JSON (metadata)
      }
    }
    return out;
  }
  let body;
  try {
    body = JSON.parse(raw);
  } catch {
    // Beberapa gateway menempel teks/objek ganda; coba ambil objek pertama yang valid
    const obj = raw.slice(raw.indexOf("{"), raw.lastIndexOf("}") + 1);
    body = JSON.parse(obj);
  }
  return body.choices && body.choices[0] && body.choices[0].message.content;
}

// GATE 0 — health-check model SEBELUM crawl: ping ringan, wajib ada respons konten.
// Gagal (setelah retry) => exit 1 agar status workflow jujur (merah, bukan hijau palsu).
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

// GATE 2.5 — Bersihkan output LLM dari anomali karakter (aksara asing, kata
// Inggris nyasar, kalimat terpotong). Model gratis kadang mengacak bahasa lain
// di tengah kalimat Indonesia. Tujuannya BUKAN membuang artikel, tapi memulai
// proses pembersihan berlapis:
//
//   1. Deteksi anomali.
//   2. Bersihkan otomatis (buang aksara asing, rapikan kata nyasar).
//   3. Validasi ulang; kalau masih kotor, minta model menulis ulang (retry).
//   4. Baru bila gagal terus, artikel di-skip supaya konten kotor tidak terbit.
const NON_LATIN_RE =
  /[\u0400-\u04FF\u0600-\u06FF\u0900-\u097F\u0E00-\u0E7F\u1100-\u11FF\u3040-\u30FF\u3130-\u318F\u3400-\u4DBF\u4E00-\u9FFF\uA960-\uA97F\uAC00-\uD7AF\uF900-\uFAFF\uFF00-\uFFEF]/g;

// Kata fungsi bahasa Inggris. Teks Indonesia yang sehat hampir tidak memakainya,
// jadi dipakai sebagai detektor "ini bukan bahasa Indonesia".
const KATA_FUNGSI_EN =
  /\b(?:the|and|with|from|that|this|these|those|your|you|they|them|their|there|here|have|has|had|will|would|shall|should|can|could|about|into|over|under|after|before|between|during|through|while|when|what|which|who|whom|whose|how|why|where|all|any|each|few|many|most|some|other|such|only|own|same|than|then|also|been|being|does|did|done|were|was|are|not|but|for|its|our|out|very|too|just|now|let|please|sorry|okay|ok|here|produce|final|json|output|note|notes|submit|submit|thereof|need|want|make|made|use|used|using|get|got|give|gave|show|shown|see|seen|say|says|said|tell|told|know|known|think|thought)\b/gi;

// Frasa meta-komunikasi model yang bocor ke dalam konten ("Sorry, let me produce
// the clean final JSON"). Ini tanda jelas output tidak akan dipakai.
const META_MODEL_RE =
  /\b(?:sorry|let me|as an ai|i will|i'?ll|i need to|here'?s|here is|producing|the clean final|final json|json output|as requested|note that|output:)\b/i;

// Simbol acak dari model yang gagal stabil (contoh nyata: "{m}", "/{m}", "{-", "/#").
const SIMBOL_ACAK_RE = /(?:\{\/?[a-z]{1,3}\}|\{-|-\}|\/#|#\{|\{[mno]|\}\/|\[\/)/gi;

// Caps lock panjang tanpa makna, mis. "ENGUNJUNGAN" nyasar di tengah kalimat.
// Allowlist: nama acara/merek yang memang ditulis kapital (TRIKARSA, SERTIDEWI).
const CAPS_PANJANG_RE = /\b[A-Z]{7,}\b/g;
const CAPS_WHITELIST = new Set([
  "TRIKARSA", "SERTIDEWI", "WONOSOBO", "PRASETIYO", "INDONESIA", "MAJALENGKA",
  "BANTARAGUNG", "PADANGDARAUH", "SUMATERA", "KONVENSI", "KEMENTERIAN",
]);

// Huruf dari Latin Extended Additional/Suplemental yang tidak pernah dipakai
// bahasa Indonesia; model kadang menyisipkan huruf dari alfabet lain.
const HURUF_ASING_RE = /[ßẞɓƀḍȷǀǁɠ]/g;

function hitungAnomali(out) {
  const text = [out.title, out.excerpt, ...(out.content || [])].join(" ");
  const kapital = text.match(CAPS_PANJANG_RE) || [];
  return {
    nonLatin: (text.match(NON_LATIN_RE) || []).length,
    hurufAsing: (text.match(HURUF_ASING_RE) || []).length,
    meta: META_MODEL_RE.test(text),
    simbol: (text.match(SIMBOL_ACAK_RE) || []).length,
    caps: kapital.filter((w) => !CAPS_WHITELIST.has(w)).length,
    enRatio: (text.match(KATA_FUNGSI_EN) || []).length,
    totalKata: text.split(/\s+/).filter(Boolean).length,
  };
}

// Bersihkan deterministik: buang aksara asing, meta-komunikasi model, simbol
// acak, huruf kapital geser, lalu rapatkan spasi.
function bersihkanOutput(out) {
  const clean = (s) =>
    String(s)
      .replace(/```[a-zA-Z]*/g, " ")
      .replace(NON_LATIN_RE, "")
      .replace(HURUF_ASING_RE, "")
      .replace(META_MODEL_RE, " ")
      .replace(SIMBOL_ACAK_RE, " ")
      .replace(CAPS_PANJANG_RE, (w) => (CAPS_WHITELIST.has(w) ? w : " "))
      .replace(/\s{2,}/g, " ")
      .replace(/\s+,/g, ",")
      .replace(/,\s*,/g, ",")
      .replace(/\btidak,\s*tapi\b/gi, "tetapi")
      .replace(/\bdan\s+berisi\b/gi, "dan berisi")
      .trim();
  out.title = clean(out.title);
  out.excerpt = clean(out.excerpt);
  out.content = (Array.isArray(out.content) ? out.content : []).map(clean);
  return out;
}

function assertValidIndonesian(out) {
  const a = hitungAnomali(out);
  if (a.nonLatin > 0) throw new Error(`aksara asing (${a.nonLatin})`);
  if (a.meta) throw new Error("meta-komunikasi model bocor");
  if (a.simbol > 0) throw new Error(`simbol acak (${a.simbol})`);
  if (a.caps > 0) throw new Error(`huruf kapal acak (${a.caps})`);
  if (a.hurufAsing > 0) throw new Error(`huruf asing (${a.hurufAsing})`);
  // Rasio kata fungsi Inggris: teks Indonesia yang sehat hampir nol.
  const ratio = a.totalKata ? a.enRatio / a.totalKata : 1;
  if (a.enRatio > 2 && ratio > 0.05) {
    throw new Error(
      `bahasa Inggris nyasar (${a.enRatio} kata, ${(ratio * 100).toFixed(0)}%)`
    );
  }
  if (!out.content || out.content.length < 2) {
    throw new Error("hasil rewrite terlalu pendek (<2 paragraf)");
  }
  if (!out.title || out.title.length < 15) {
    throw new Error("judul hasil rewrite tidak valid");
  }
  if (out.content.some((p) => p.length < 40)) {
    throw new Error("ada paragraf terlalu pendek");
  }
  if (out.content.some((p) => !/[a-z]{3,}/i.test(p))) {
    throw new Error("ada paragraf tanpa teks yang masuk akal");
  }
}

async function rewriteArticle(post) {
  const userMsg =
    `KATEGORI: ${post.category}\n` +
    `BERITA MENTAH:\n` +
    `Judul: ${post.title}\n\n` +
    post.content.join("\n\n");

  let res;
  for (let attempt = 1; attempt <= 4; attempt++) {
    try {
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

      if ((res.status === 503 || res.status === 429 || res.status >= 500) && attempt < 4) {
        await sleep(3000 * attempt);
        continue;
      }
      if (!res.ok) throw new Error(`LLM HTTP ${res.status}: ${await res.text()}`);

      const raw = await res.text();
      if (process.env.LLM_DEBUG) console.error("=== RAW LLM RESPONSE (tail) ===\n" + raw.slice(-500));

      const text = parseLLMText(raw);
      if (!text && attempt < 4) {
        await sleep(2000 * attempt);
        continue;
      }
      if (!text) throw new Error("LLM kosong");

      const out = extractJSON(text);
      out.title = deDash(cleanTitle(out.title));
      out.excerpt = deDash(String(out.excerpt || "")).trim();
      out.content = (Array.isArray(out.content) ? out.content : [])
        .map((p) => deDash(String(p).replace(EMOJI_RE, "")).replace(/\n+/g, " ").trim())
        .filter((p) => p.length > 20);
      // GATE 2.5 — Bersihkan dulu; kalau masih kotor, minta model menulis ulang.
      bersihkanOutput(out);
      try {
        assertValidIndonesian(out);
      } catch (e) {
        e.retryable = true;
        throw e;
      }
      return out;
    } catch (e) {
      // Retry bila: error jaringan/5xx, ATAU output still contaminated (retryable).
      const transient =
        e.message.includes("503") ||
        e.message.includes("fetch") ||
        e.retryable;
      if (attempt < 4 && transient) {
        if (e.retryable) {
          console.warn(`[gate-2.5] output belum bersih (${e.message}); retry ke-${attempt + 1}`);
        }
        await sleep(3000 * attempt);
        continue;
      }
      throw e;
    }
  }
  throw new Error("LLM gagal setelah 4x retry");
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

  // GATE 0 — pastikan model merespons SEBELUM crawl. Tanpa rewrite yang bekerja,
  // sync tidak boleh diklaim berhasil.
  const NO_REWRITE_FLAG = process.argv.includes("--no-rewrite");
  if (!DRY && !NO_REWRITE_FLAG) {
    if (!LLM_API_KEY || !LLM_URL) {
      console.error("FATAL [gate-model]: LLM_API_KEY/LLM_URL belum dikonfigurasi; rewrite wajib aktif.");
      process.exit(1);
    }
    await assertLLMHealthy();
  }
  const catsById = new Map();
  try {
    for (const c of await fetchPages("categories", 3)) {
      catsById.set(c.id, { name: c.name, slug: c.slug });
    }
  } catch (e) {
    console.warn(`kategori tidak termuat (${e.message}); lanjut tanpa kategori`);
  }

  let posts;
  let source = "rest";
  try {
    posts = await fetchPages("posts?_embed=true", 5);
  } catch (e) {
    console.warn(`REST posts gagal (${e.message}); fallback ke RSS feed`);
    source = "rss";
    posts = await fetchRss();
  }
  // GATE 1 — sumber wajib memberi data.
  if (!posts.length) {
    console.error(`FATAL [gate-crawl]: tidak ada post dimuat dari ${source}; sumber mungkin offline/diblokir.`);
    process.exit(1);
  }
  console.log(`[crawl] sumber=${source} posts=${posts.length}`);

  const existing = loadExisting();
  fs.mkdirSync(BERITA_DIR, { recursive: true });

  let added = 0;
  let updated = 0;
  let skipped = 0;
  let rewriteFails = 0;
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

    const article = {
      slug,
      title: finalTitle,
      excerpt,
      date,
      category: mapCategory(postCats),
      author: "Admin",
      cover: "",
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
        article.rewriteStatus = "success";
      } catch (e) {
        // Jaring pengaman: berita baru TETAP terbit, tapi dari sumber yang sudah
        // dibersihkan (emoji/tautan/hashtag/CTA sudah dibuang), dengan label
        // status jujur "cleaned" supaya bisa diaudit kemudian. Konten mentah
        // yang tidak dibersihkan tidak pernah ikut ter-push.
        const cadangan = artikelBersih({ title: finalTitle, content: finalContent });
        if (!cadangan) {
          rewriteFails++;
          skipped++;
          console.warn(`rewrite gagal untuk ${slug}: ${e.message}; sumber terlalu pendek, skip (GATE 2)`);
          continue;
        }
        rewriteFails++;
        console.warn(`rewrite gagal untuk ${slug}: ${e.message}; terbit dengan konten bersih (fallback)`);
        finalizeArticle(article, cadangan);
        article.rewriteStatus = "cleaned";
      }
    } else {
      article.rewriteStatus = LLM_REWRITE ? "pending" : "disabled";
    }

    // Cover diunduh SETELAH rewrite sukses agar tidak ada cover yatim
    // (cover tanpa JSON) bila rewrite gagal.
    article.cover = await fetchCover(post, slug);
    if (!article.cover && post.featured_media) coverFails++;

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
    `done. posts=${posts.length} added=${added} updated=${updated} skipped=${skipped} rewriteFails=${rewriteFails} coverFails=${coverFails}`
  );

  // GATE 2 — semua rewrite wajib sukses; yang gagal tidak di-push mentah dan run merah.
  if (rewriteFails > 0) {
    console.error(`FATAL [gate-rewrite]: ${rewriteFails} artikel gagal rewrite dan tidak ikut di-push.`);
    process.exit(1);
  }
  // Tidak ada artikel baru = kondisi normal (cron harian, sumber sering sepi),
  // BUKAN kegagalan. Exit 0 supaya tidak mengirim email notifikasi kegagalan tiap hari.
  if (added + updated === 0) {
    console.log("[gate-sync] tidak ada artikel baru hari ini; sync normal, tidak ada yang di-push.");
  } else {
    console.log(`[gate-sync] ${added} artikel baru, ${updated} diperbarui, siap di-push.`);
  }
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

// Mode self-test guard: memastikan aturan cleanliness benar-benar menolak sampah
// model (aksara asing, meta-komunikasi, simbol acak, huruf kapal) tanpa
// menolak artikel Indonesia yang sehat.
// Pakai: node scripts/sync/crawl.js --selftest-guard
if (process.argv.includes("--selftest-guard")) {
  const SAMPLAH_KOTOR = [
    "operandi-On-benam{- Sorry, let me produce the clean final JSON,",
    "Adolescents Headstones thereof, submission Suites Notes, submission Notes,",
    ",/#{m}ENGUNJUNGAN ,",
    "Desa个省 menerima kunjungan waiver dariutting kelompokasiswa pada插槽_attrs",
    "berjalan bersama teman dekat. niat tulus untuk menikmati, menjaga, danß berbagi cerita.",
  ];
  const cek = (t) => {
    const a = hitungAnomali({ title: "", excerpt: "", content: [t] });
    const alasan = [];
    if (a.nonLatin > 0) alasan.push("aksara");
    if (a.hurufAsing > 0) alasan.push("huruf-asing");
    if (a.meta) alasan.push("meta-model");
    if (a.simbol > 0) alasan.push("simbol");
    if (a.caps > 0) alasan.push("caps");
    if (a.enRatio > 2 && a.totalKata && a.enRatio / a.totalKata > 0.05) alasan.push("inggris");
    return alasan;
  };
  let gagal = 0;
  console.log("A. Sampah model (harus ditolak):");
  for (const s of SAMPLAH_KOTOR) {
    const a = cek(s);
    if (!a.length) gagal++;
    console.log(`   ${a.length ? "TOLAK" : "BOCOR"} [${a.join(",")}] ${s.slice(0, 46)}`);
  }
  console.log("B. Artikel live (harus lolos):");
  let total = 0;
  let salah = 0;
  if (fs.existsSync(BERITA_DIR)) {
    for (const f of fs.readdirSync(BERITA_DIR).filter((x) => x.endsWith(".json"))) {
      total++;
      const d = JSON.parse(fs.readFileSync(path.join(BERITA_DIR, f), "utf8"));
      const t = [d.title, d.excerpt, ...(d.content || [])].join(" ");
      const a = cek(t);
      if (a.length) {
        salah++;
        console.log(`   TOLAK ${d.slug} [${a.join(",")}]`);
      }
    }
  }
  console.log(`   total=${total} lolos=${total - salah} salahTolak=${ salah}`);
  if (gagal || salah) process.exit(1);
  console.log("guard OK");
  process.exit(0);
}

// Mode perbaikan: bersihkan ulang artikel yang sudah terbit (mis. dari era
// sebelum guard ketat) tanpa menunggu sync harian.
// Pakai: node scripts/sync/crawl.js --repair-clean
if (process.argv.includes("--repair-clean")) {
  let diubah = 0;
  if (fs.existsSync(BERITA_DIR)) {
    for (const f of fs.readdirSync(BERITA_DIR).filter((x) => x.endsWith(".json"))) {
      const file = path.join(BERITA_DIR, f);
      const d = JSON.parse(fs.readFileSync(file, "utf-8"));
      const sebelum = [d.title, d.excerpt, ...(d.content || [])].join(" ");
      const setelah = [bersihkanOutput(JSON.parse(JSON.stringify(d)))];
      const txt = [setelah[0].title, setelah[0].excerpt, ...(setelah[0].content || [])].join(" ");
      if (sebelum === txt) continue;
      const out = setelah[0];
      out.updatedAt = new Date().toISOString();
      fs.writeFileSync(file, JSON.stringify(out, null, 4) + "\n");
      diubah++;
      console.log(`dibersihkan: ${out.slug}`);
    }
  }
  console.log(`selesai. ${diubah} artikel dibersihkan.`);
  process.exit(0);
}

main().catch((e) => {
  console.error("FATAL:", e.message);
  // Exit 1: status workflow harus jujur. Hijau = artikel baru ter-rewrite dan siap di-push.
  process.exit(1);
});
