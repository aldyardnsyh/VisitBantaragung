#!/usr/bin/env node
/**
 * Migrasi gambar ke WebP sekaligus memperbarui rujukan di JSON konten.
 *
 * Kenapa perlu skrip terpisah dari optimize-images.mjs:
 * optimize-images.mjs hanya menghasilkan berkas baru. Bila nama berkas berubah
 * dari .png menjadi .webp, semua rujukan di content/** harus ikut diperbarui,
 * kalau tidak gambar akan hilang dari situs.
 *
 * Skrip ini melakukan tiga hal dalam satu jalur:
 *  1. Mengoptimalkan gambar ke WebP (lewat logika optimize-images.mjs).
 *  2. Menulis hasil ke repositori aset, MENGGANTIKAN berkas lama.
 *  3. Memperbarui content/**\/*.json agar menunjuk nama berkas baru.
 *
 * Pemakaian:
 *   node scripts/migrate-images-webp.mjs --dry-run     # lihat rencana lengkap
 *   node scripts/migrate-images-webp.mjs --write       # benar-benar ubah
 *
 * Tanpa --write, skrip tidak menyentuh berkas apa pun.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync, statSync, unlinkSync, readdirSync } from "node:fs";
import { readdir } from "node:fs/promises";
import { dirname, extname, join, relative } from "node:path";
import sharp from "sharp";

const args = process.argv.slice(2);
const dryRun = !args.includes("--write");

const ASSETS_ROOT = process.env.ASSETS_ROOT || "../visitbantaragung-assets";
const CONTENT_ROOT = "content";
const MAX_WIDTH = 1920;
const WEBP_QUALITY = 82;
const SKIP_BELOW_BYTES = 120 * 1024;
const IMAGE_EXT = new Set([".png", ".jpg", ".jpeg"]);

/** Folder yang ikut dimigrasikan. `berita` sengaja dilewati (lihat catatan). */
const FOLDERS = ["galeri", "wisata", "b2h", "bdb", "bmc", "bic/artikel", "_brand"];

/** Peta nama lama -> nama baru, dipakai untuk memperbarui JSON. */
const renameMap = new Map();
let totalBefore = 0;
let totalAfter = 0;
let converted = 0;
let skipped = 0;

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

function kb(bytes) {
  return `${Math.round(bytes / 1024)} KB`;
}

const root = join(process.cwd(), ASSETS_ROOT);

if (!existsSync(root)) {
  console.error(`Folder aset tidak ditemukan: ${root}`);
  process.exit(1);
}

console.log(`Mode: ${dryRun ? "PRATINJAU (tidak mengubah apa pun)" : "MIGRASI"}`);
console.log(`Folder aset: ${root}`);
console.log("");

// ---- Tahap 1: konversi gambar ----
for (const folder of FOLDERS) {
  const files = await walk(join(root, folder));
  for (const file of files) {
    const before = statSync(file).size;
    if (before < SKIP_BELOW_BYTES) {
      skipped += 1;
      continue;
    }

    let buffer;
    try {
      const image = sharp(file, { failOn: "none" });
      const meta = await image.metadata();
      if (!meta.width) {
        skipped += 1;
        continue;
      }
      buffer = await image
        .resize({ width: Math.min(meta.width, MAX_WIDTH), withoutEnlargement: true })
        .webp({ quality: WEBP_QUALITY, effort: 5 })
        .toBuffer();
    } catch {
      skipped += 1;
      continue;
    }

    if (buffer.length >= before) {
      skipped += 1;
      continue;
    }

    const newFile = file.replace(/\.(png|jpe?g)$/i, ".webp");
    totalBefore += before;
    totalAfter += buffer.length;
    converted += 1;

    // Kunci peta memakai path relatif terhadap akar aset, dengan garis miring
    // depan, persis seperti yang tersimpan di JSON konten.
    const oldRel = relative(root, file).split("\\").join("/");
    const newRel = relative(root, newFile).split("\\").join("/");
    renameMap.set(oldRel.toLowerCase(), newRel);
    renameMap.set(oldRel, newRel);

    if (!dryRun) {
      mkdirSync(dirname(newFile), { recursive: true });
      writeFileSync(newFile, buffer);
      // Hapus berkas lama hanya bila nama benar-benar berubah.
      if (newFile !== file) unlinkSync(file);
    }
  }
}

console.log("Tahap 1 — Konversi gambar");
console.log(`  Dikonversi    : ${converted}`);
console.log(`  Dilewati      : ${skipped}`);
console.log(`  Sebelum       : ${(totalBefore / 1024 / 1024).toFixed(1)} MB`);
console.log(`  Sesudah       : ${(totalAfter / 1024 / 1024).toFixed(1)} MB`);
if (totalBefore > 0) {
  const saved = (1 - totalAfter / totalBefore) * 100;
  console.log(`  Penghematan   : ${saved.toFixed(1)}% (${((totalBefore - totalAfter) / 1024 / 1024).toFixed(1)} MB)`);
}

// ---- Tahap 2: perbarui rujukan di JSON ----
function listJsonFiles(dir, acc = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) listJsonFiles(full, acc);
    else if (entry.name.endsWith(".json")) acc.push(full);
  }
  return acc;
}

const jsonFiles = listJsonFiles(CONTENT_ROOT);
let filesTouched = 0;
let refsUpdated = 0;

for (const jsonFile of jsonFiles) {
  const original = readFileSync(jsonFile, "utf8");
  let updated = original;

  for (const [oldRel, newRel] of renameMap) {
    if (!original.includes(oldRel)) continue;
    // Ganti sebagai string utuh di dalam tanda kutip agar tidak salah potong.
    const before = updated;
    updated = updated.split(`"${oldRel}"`).join(`"${newRel}"`);
    if (updated !== before) refsUpdated += before.split(`"${oldRel}"`).length - 1;
  }

  if (updated !== original) {
    filesTouched += 1;
    if (!dryRun) writeFileSync(jsonFile, updated);
  }
}

console.log("");
console.log("Tahap 2 — Perbarui rujukan JSON");
console.log(`  Berkas JSON diperiksa : ${jsonFiles.length}`);
console.log(`  Berkas diubah         : ${filesTouched}`);
console.log(`  Rujukan diperbarui    : ${refsUpdated}`);

if (dryRun) {
  console.log("");
  console.log("Ini baru pratinjau. Jalankan dengan --write untuk benar-benar mengubah.");
} else {
  console.log("");
  console.log("Migrasi selesai. Langkah berikutnya:");
  console.log("  1. Periksa git status di repo aset dan repo konten.");
  console.log("  2. Commit dan push kedua repo.");
  console.log("  3. Buka beberapa halaman yang memakai gambar untuk memastikan tampil.");
}
