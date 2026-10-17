#!/usr/bin/env node
/**
 * Pindahkan cover berita dari public/berita (repo konten) ke repositori aset,
 * sekaligus mengoptimalkannya ke WebP.
 *
 * Alasan: cover berita menempati 21,3 MB di repositori konten, dan seluruh isi
 * public/ ikut terkirim ke Vercel pada setiap deployment. Repositori aset tidak
 * dihitung oleh Vercel karena disajikan lewat CDN jsDelivr.
 *
 * Rujukan di content/bic/berita/*.json diubah dari
 *   "/berita/<slug>/cover.jpg"      (lokal)
 * menjadi
 *   "berita/<slug>/cover.webp"      (CDN)
 *
 * Awalan garis miring sengaja dihapus karena assetUrl() hanya memakai CDN untuk
 * path relatif.
 *
 * Pemakaian:
 *   node scripts/migrate-berita-covers.mjs --dry-run
 *   node scripts/migrate-berita-covers.mjs --write
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync, statSync, readdirSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import sharp from "sharp";

const dryRun = !process.argv.includes("--write");
const CONTENT = "content/bic/berita";
const PUBLIC_BERITA = "public/berita";
const ASSETS_ROOT = process.env.ASSETS_ROOT || "../visitbantaragung-assets";
const ASSETS_BERITA = join(ASSETS_ROOT, "berita");
const MAX_WIDTH = 1600;
const WEBP_QUALITY = 80;

let converted = 0;
let skipped = 0;
let refsUpdated = 0;
let filesUpdated = 0;
let before = 0;
let after = 0;

const jsonFiles = readdirSync(CONTENT).filter((f) => f.endsWith(".json"));

for (const name of jsonFiles) {
  const jsonPath = join(CONTENT, name);
  const original = readFileSync(jsonPath, "utf8");
  let data;
  try {
    data = JSON.parse(original);
  } catch {
    skipped += 1;
    continue;
  }

  const cover = data.cover;
  if (typeof cover !== "string" || !cover.startsWith("/berita/")) {
    skipped += 1;
    continue;
  }

  // /berita/<slug>/cover.jpg -> <slug>
  const match = cover.match(/^\/berita\/([^/]+)\/([^/]+)$/);
  if (!match) {
    skipped += 1;
    continue;
  }
  const [, slug, fileName] = match;
  const sourceFile = join(PUBLIC_BERITA, slug, fileName);

  if (!existsSync(sourceFile)) {
    skipped += 1;
    continue;
  }

  // Konversi ke WebP.
  let buffer;
  try {
    const meta = await sharp(sourceFile, { failOn: "none" }).metadata();
    buffer = await sharp(sourceFile, { failOn: "none" })
      .resize({ width: Math.min(meta.width ?? MAX_WIDTH, MAX_WIDTH), withoutEnlargement: true })
      .webp({ quality: WEBP_QUALITY, effort: 5 })
      .toBuffer();
  } catch {
    skipped += 1;
    continue;
  }

  const size = statSync(sourceFile).size;
  const outName = fileName.replace(/\.(png|jpe?g)$/i, ".webp");
  const outRelPath = `berita/${slug}/${outName}`;
  const outAbsPath = join(ASSETS_BERITA, slug, outName);

  // Rujukan baru: tanpa garis miring depan supaya memakai CDN.
  const newCover = outRelPath;
  const nextJson = original.split(`"${cover}"`).join(`"${newCover}"`);

  if (nextJson !== original) {
    refsUpdated += 1;
    filesUpdated += 1;
    converted += 1;
    before += size;
    after += buffer.length;

    if (!dryRun) {
      mkdirSync(dirname(outAbsPath), { recursive: true });
      writeFileSync(outAbsPath, buffer);
      writeFileSync(jsonPath, nextJson);
    }
  } else {
    skipped += 1;
  }
}

console.log(`Mode: ${dryRun ? "PRATINJAU" : "MIGRASI"}`);
console.log("");
console.log(`  Cover dipindah ke CDN : ${converted}`);
console.log(`  Dilewati              : ${skipped}`);
console.log(`  Sebelum               : ${(before / 1024 / 1024).toFixed(1)} MB`);
console.log(`  Sesudah               : ${(after / 1024 / 1024).toFixed(1)} MB`);
if (before > 0) {
  console.log(`  Penghematan           : ${(1 - after / before) * 100 > 0 ? ((1 - after / before) * 100).toFixed(1) : 0}% (${((before - after) / 1024 / 1024).toFixed(1)} MB)`);
}

if (!dryRun && converted > 0) {
  console.log("");
  console.log("Menghapus public/berita karena semua cover sudah dipindahkan...");
  rmSync(PUBLIC_BERITA, { recursive: true, force: true });
  console.log("  public/berita dihapus.");
  console.log("");
  console.log("Langkah berikutnya: commit repo aset dan repo konten, lalu push.");
} else if (dryRun) {
  console.log("");
  console.log("Ini baru pratinjau. Jalankan dengan --write untuk benar-benar memindahkan.");
}
