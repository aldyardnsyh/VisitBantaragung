#!/usr/bin/env node
/**
 * Optimasi gambar untuk menghemat penyimpanan tanpa mengorbankan tampilan.
 *
 * Latar belakang: Vercel Hobby punya batas penyimpanan dan bandwidth, sedangkan
 * repositori aset sudah 431 MB dengan rata-rata 2,1 MB per gambar. Sebagian
 * besar berasal dari PNG besar yang sebenarnya bisa jauh lebih kecil.
 *
 * Strategi:
 *  1. PNG dan JPEG besar dikonversi ke WebP. Pada kualitas 82, WebP biasanya
 *     60-85% lebih kecil daripada PNG untuk foto, dengan perbedaan yang tidak
 *     terlihat pada ukuran tampil di situs.
 *  2. Lebar maksimum dibatasi 1920 px. Halaman galeri menampilkan gambar paling
 *     besar sekitar 800 px, jadi 1920 px sudah dua kali lipat kepadatan layar
 *     retina pada ukuran itu.
 *  3. Berkas yang sudah lebih kecil dari batas tetap dipertahankan.
 *
 * Pemakaian:
 *   node scripts/optimize-images.mjs --dry-run        # lihat rencana saja
 *   node scripts/optimize-images.mjs --dir galeri     # proses folder tertentu
 *   node scripts/optimize-images.mjs --all            # proses semua folder
 *
 * Hasil ditulis ke folder terpisah (default: optimize-out/) agar berkas asli
 * tidak tersentuh sampai Anda memverifikasi hasilnya.
 */

import { mkdirSync, statSync, writeFileSync } from "node:fs";
import { readdir } from "node:fs/promises";
import { extname, join, relative, basename } from "node:path";
import sharp from "sharp";

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const all = args.includes("--all");
const dirArgIndex = args.indexOf("--dir");
const onlyDir = dirArgIndex >= 0 ? args[dirArgIndex + 1] : null;

if (!all && !onlyDir) {
  console.log("Pemakaian:");
  console.log("  node scripts/optimize-images.mjs --dry-run            (lihat rencana)");
  console.log("  node scripts/optimize-images.mjs --dir galeri         (satu folder)");
  console.log("  node scripts/optimize-images.mjs --all                (semua folder)");
  process.exit(0);
}

/** Akar repositori aset. Bisa ditimpa lewat variabel lingkungan. */
const ASSETS_ROOT = process.env.ASSETS_ROOT || "../visitbantaragung-assets";
const OUT_DIR = process.env.OUT_DIR || "optimize-out";

/** Folder yang diproses bila memakai --all. */
const FOLDERS = ["galeri", "wisata", "b2h", "bdb", "bmc", "_brand"];

const MAX_WIDTH = 1920;
const WEBP_QUALITY = 82;
/** Berkas di bawah ukuran ini dibiarkan apa adanya. */
const SKIP_BELOW_BYTES = 120 * 1024;
const IMAGE_EXT = new Set([".png", ".jpg", ".jpeg"]);

/**
 * Folder yang tidak boleh disentuh otomatis.
 * bic/berita berisi cover yang dipakai crawler; mengubahnya tanpa memperbarui
 * JSON akan memutus tautan gambar.
 */
const SKIP_DIRS = new Set(["bic"]);

async function walk(dir, acc = []) {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return acc;
  }
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      await walk(full, acc);
    } else if (IMAGE_EXT.has(extname(entry.name).toLowerCase())) {
      acc.push(full);
    }
  }
  return acc;
}

async function optimize(file) {
  const before = statSync(file).size;
  if (before < SKIP_BELOW_BYTES) {
    return { file, before, after: before, skipped: "sudah kecil" };
  }

  const image = sharp(file, { failOn: "none" });
  const meta = await image.metadata();
  if (!meta.width || !meta.height) {
    return { file, before, after: before, skipped: "tidak terbaca" };
  }

  // Jangan pernah memperbesar gambar.
  const targetWidth = Math.min(meta.width, MAX_WIDTH);

  let pipeline = image.resize({ width: targetWidth, withoutEnlargement: true });
  // Pertahankan transparansi bila ada; WebP mendukung alpha.
  pipeline = pipeline.webp({ quality: WEBP_QUALITY, effort: 5 });

  const buffer = await pipeline.toBuffer();
  if (buffer.length >= before) {
    return { file, before, after: before, skipped: "tidak lebih kecil" };
  }

  if (!dryRun) {
    const rel = relative(ASSETS_ROOT, file);
    const outPath = join(OUT_DIR, rel.replace(/\.(png|jpe?g)$/i, ".webp"));
    mkdirSync(join(outPath, ".."), { recursive: true });
    writeFileSync(outPath, buffer);
  }

  return { file, before, after: buffer.length, outPath: join(OUT_DIR, relative(ASSETS_ROOT, file).replace(/\.(png|jpe?g)$/i, ".webp")) };
}

function kb(bytes) {
  return `${Math.round(bytes / 1024)} KB`;
}

const targets = [];
const root = join(process.cwd(), ASSETS_ROOT);

if (all) {
  for (const folder of FOLDERS) {
    if (SKIP_DIRS.has(folder)) continue;
    const files = await walk(join(root, folder));
    targets.push(...files);
  }
} else {
  if (!onlyDir) {
    console.error("Folder harus disebutkan lewat --dir.");
    process.exit(1);
  }
  const folderRoot = join(root, onlyDir);
  const files = await walk(folderRoot);
  targets.push(...files);
}

console.log(`Mode: ${dryRun ? "PRATINJAU (tidak menulis berkas)" : "PROSES"}`);
console.log(`Folder aset: ${root}`);
console.log(`Berkas kandidat: ${targets.length}`);
console.log("");

let totalBefore = 0;
let totalAfter = 0;
let changed = 0;
let skipped = 0;

for (const file of targets) {
  try {
    const result = await optimize(file);
    totalBefore += result.before;
    totalAfter += result.after;
    if (result.skipped) {
      skipped += 1;
      continue;
    }
    changed += 1;
    const pct = Math.round((1 - result.after / result.before) * 100);
    console.log(
      `  ${relative(root, file).padEnd(58)} ${kb(result.before).padStart(8)} -> ${kb(result.after).padStart(8)}  (-${pct}%)`
    );
  } catch (error) {
    console.log(`  GAGAL ${relative(root, file)}: ${error.message}`);
  }
}

console.log("");
console.log("Ringkasan");
console.log(`  Berkas dioptimalkan : ${changed}`);
console.log(`  Dilewati            : ${skipped}`);
console.log(`  Ukuran sebelum      : ${(totalBefore / 1024 / 1024).toFixed(1)} MB`);
console.log(`  Ukuran sesudah      : ${(totalAfter / 1024 / 1024).toFixed(1)} MB`);
if (totalBefore > 0) {
  console.log(`  Penghematan         : ${(1 - totalAfter / totalBefore) * 100 > 0 ? ((1 - totalAfter / totalBefore) * 100).toFixed(1) : 0}% (${((totalBefore - totalAfter) / 1024 / 1024).toFixed(1)} MB)`);
}
if (!dryRun && changed > 0) {
  console.log("");
  console.log(`Hasil ditulis ke ${OUT_DIR}/. Periksa dulu sebelum mengganti berkas asli.`);
}
