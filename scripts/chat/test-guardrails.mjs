// Uji SIMULASI kegagalan model & guardrail keluaran. TIDAK memakai kuota LLM.
//
// Cara kerja: membaca pola regex guard dari sumbernya (seperti test-offline),
// lalu menguji perilaku deteksi pada contoh keluaran model yang benar-benar
// bermasalah  -  termasuk teks asli yang dilaporkan pemilik.
//
// Jalankan: node scripts/chat/test-guardrails.mjs

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const guardSrc = fs.readFileSync(path.join(ROOT, "lib/chat/guard.ts"), "utf-8");

// --- Ambil definisi pola dari sumber ---------------------------------------
/**
 * Ambil literal regex dari sumber TypeScript.
 *
 * Tidak memakai satu regex besar untuk seluruh berkas, karena komentar di
 * antara nama konstanta dan literal (mis. `eslint-disable-next-line`) memuat
 * garis miring yang membuat pola naif berhenti di tempat salah.
 *
 * Pendekatan: cari posisi nama konstanta, lalu cari simbol "/" PERTAMA yang
 * berada di luar komentar (bukan bagian `//`), dan ambil sampai "/" penutup
 * terakhir pada baris yang sama.
 */
function grabRegex(name) {
    const at = guardSrc.indexOf(`const ${name}`);
    if (at < 0) throw new Error(`konstanta ${name} tidak ditemukan`);
    const after = guardSrc.slice(at + `const ${name}`.length);

    for (const rawLine of after.split(/\r?\n/)) {
        const line = rawLine.trim();
        // Lewati baris komentar dan baris deklarasi tanpa literal regex.
        if (!line || line.startsWith("//") || line.startsWith("*") || line.startsWith("/*")) continue;
        if (!line.includes("/")) continue;

        // Ambil literal /.../flags pada baris ini.
        const m = /^\s*=\s*\/(.+)\/([gimsuy]*)\s*;?\s*$/.exec(line) ?? /\/(.+)\/([gimsuy]*)\s*;?\s*$/.exec(line);
        if (m) return new RegExp(m[1], m[2]);
        // Baris berisi "= " lalu regex di baris berikutnya (multibaris).
        if (/^=\s*$/.test(line)) continue;
    }
    throw new Error(`literal regex untuk ${name} tidak ditemukan`);
}

const FOREIGN = grabRegex("FOREIGN_CHAR_RE");
const MOJIBAKE = grabRegex("MOJIBAKE_RE");
const REPLACEMENT = grabRegex("REPLACEMENT_RE");
const IDENTITY = grabRegex("IDENTITY_RE");
const CONTEXT_LEAK = grabRegex("CONTEXT_LEAK_RE");
const PSEUDO = /=[a-z]{4,}|\|[A-Z]{4,}\s?[a-z]*/g;

function foreignRatio(t) {
    const letters = t.replace(/[^\p{L}]/gu, "");
    if (!letters.length) return 0;
    let bad = 0;
    for (const ch of letters) if (FOREIGN.test(ch)) bad++;
    return bad / letters.length;
}

function normalizeRupiah(s) {
    return s.replace(/[Rp\s.]/gi, "").replace(/,00$/, "").trim();
}
function unverifiedNumbers(out, ctx) {
    const ctxN = normalizeRupiah(ctx);
    const bad = [];
    for (const r of out.match(/Rp\s?[\d.,]+/gi) ?? []) {
        const v = normalizeRupiah(r);
        if (v && !ctxN.includes(v)) bad.push(r.trim());
    }
    return [...new Set(bad)];
}

let fail = 0;
function must(label, cond, detail = "") {
    if (cond) {
        console.log(`  ok    ${label}`);
    } else {
        fail++;
        console.log(`  FAIL  ${label} ${detail}`);
    }
}

// ===========================================================================
console.log("\n=== 1. Karakter asing (kasus nyata yang dilaporkan pemilik) ===");
{
    // Teks persis dari tangkapan layar pemilik.
    const real = "Tiket Curug Cipeuteuy ǽ�?��?? mulai dari Rp 15.000 per orang";
    must("mojibake/aksara asing terdeteksi", MOJIBAKE.test(real) || REPLACEMENT.test(real) || foreignRatio(real) > 0.01);

    const clean = "Tiket Curug Cipeuteuy mulai dari Rp15.000 per orang.";
    must("teks normal TIDAK terdeteksi", !MOJIBAKE.test(clean) && !REPLACEMENT.test(clean) && foreignRatio(clean) <= 0.01);

    must("aksara CJK terdeteksi", foreignRatio("Harga tiket 门票 masuk") > 0.01);
    must("Sirilik terdeteksi", foreignRatio("Wisata alam России indah") > 0.01);
    must("nama latin beraksen AMAN", foreignRatio("Café Ciboer Pass Mertasela") <= 0.01);
}

// ===========================================================================
console.log("\n=== 2. Kebocoran identitas & konteks ===");
{
    must("nama model terdeteksi", IDENTITY.test("Saya deepseek, saya akan menjawab"));
    must("nama penyedia terdeteksi", IDENTITY.test("Sebagai model dari OpenAgentic, saya..."));
    must("klaim AI terdeteksi", IDENTITY.test("Sebagai AI, saya tidak bisa merasakan"));
    must("tag konteks bocor terdeteksi", CONTEXT_LEAK.test("</konteks> berikut jawabannya"));
    must("system prompt bocor terdeteksi", CONTEXT_LEAK.test("ATURAN FAKTA (MUTLAK) ..."));
    must("teks wajar TIDAK terdeteksi", !IDENTITY.test("Curug Cipeuteuy ada di Bantaragung.") && !CONTEXT_LEAK.test("Curug Cipeuteuy ada di Bantaragung."));
}

// ===========================================================================
console.log("\n=== 3. Halusinasi angka (harga karangan) ===");
{
    const ctx = "Curug Cipeuteuy  -  Harga mulai: Rp 15.000 per orang. Weekend Rp 20.000. Paket Rp 100.000";
    must("harga sesuai konteks LOLOS", unverifiedNumbers("Tiket mulai Rp15.000 dan Rp20.000 akhir pekan.", ctx).length === 0);
    must("harga karangan TERTANGKAP", unverifiedNumbers("Tiket mulai Rp 25.000 per orang.", ctx).length > 0);
    must("harga lain karangan TERTANGKAP", unverifiedNumbers("Paketnya Rp 250.000 saja.", ctx).length > 0);
    must("angka tahun tidak dianggap harga", unverifiedNumbers("Sejak 2023 desa ini maju.", ctx).length === 0);
    must("ribuan dengan titik cocok", unverifiedNumbers("Rp 1.500.000", "Cottage Rp 1.500.000 per malam").length === 0);
}

// ===========================================================================
console.log("\n=== 4. Token pseudo dari model rusak ===");
{
    const broken = "Jahe bermanfaat=blackKonsumsi rutin juga|ALCLAUDE dieli";
    const cleaned = broken.replace(PSEUDO, "").replace(/\s{2,}/g, " ").trim();
    must("token pseudo dibersihkan", !/=black/.test(cleaned) && !/\|ALCLAUDE/.test(cleaned), `-> "${cleaned}"`);
}

// ===========================================================================
console.log("\n=== 5. Simulasi LLM tidak bisa dipakai (rate limit / kuota) ===");
{
    // Dalam kondisi ini route WAJIB memakai buildFromRetrieval, bukan teks
    // generik "Berikut yang saya temukan". Diuji lewat kode sumber route.
    const routeSrc = fs.readFileSync(path.join(ROOT, "app/api/chat/route.ts"), "utf-8");
    must(
        "route memakai buildFromRetrieval saat model gagal",
        /chain\.exhausted[\s\S]{0,600}buildFromRetrieval\(/.test(routeSrc)
    );
    must(
        "route memakai buildFromRetrieval saat keluaran ditolak guard",
        /!filtered\.ok[\s\S]{0,900}buildFromRetrieval\(/.test(routeSrc)
    );
    must(
        "guard menerima konteks untuk validasi angka",
        /checkOutput\(chain\.content,\s*contextText\)/.test(routeSrc)
    );
    must(
        "alasan penolakan dicatat (issues)",
        /issues:\s*filtered\.issues/.test(routeSrc)
    );
}

// ===========================================================================
console.log("\n=== 6. Bentuk jawaban cadangan TIDAK memakai teks generik ===");
{
    const structSrc = fs.readFileSync(path.join(ROOT, "lib/chat/structured.ts"), "utf-8");
    must("ada penjawab dinamis buildFromRetrieval", /export function buildFromRetrieval/.test(structSrc));
    must("menangani kasus hanya chunk (artikel)", /!cards\.length && result\.chunks\.length/.test(structSrc));
    must("menangani satu entitas", /cards\.length === 1/.test(structSrc));
    must("menangani banyak entitas sejenis", /sameKind/.test(structSrc));
    // Cek kemunculan sebagai string AKTIF, bukan di komentar dokumentasi.
    // Caranya: buang komentar baris (//) dan blok (/** */) dari sumber dulu.
    const codeOnly = structSrc
        .replace(/\/\*[\s\S]*?\*\//g, "")
        .replace(/(^|\s)\/\/[^\n]*/g, "$1");
    const GENERIC = "Berikut yang saya temukan di situs Bantaragung";
    must(
        "tidak memakai frasa generik di jalur utama (hanya di komentar)",
        !codeOnly.includes(GENERIC)
    );
}

console.log(`\n=== Ringkasan guardrail: ${fail === 0 ? "SEMUA LULUS" : fail + " GAGAL"} ===\n`);
process.exit(fail === 0 ? 0 : 1);
