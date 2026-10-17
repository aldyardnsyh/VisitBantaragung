#!/usr/bin/env node
/**
 * Hapus berkas source map dari hasil build.
 *
 * Kenapa: setiap deployment Vercel menyimpan seluruh artefak build, dan
 * berkas .map menyumbang sekitar 9 MB di antaranya. Berkas itu hanya dipakai
 * untuk memetakan stack trace ke kode sumber; tanpa .map aplikasi tetap
 * berjalan persis sama, hanya jejak galatnya menjadi kurang detail.
 *
 * Karena Vercel menyimpan setiap deployment, penghematan 9 MB ini berlipat
 * pada kuota Deployment Storage.
 *
 * Skrip berjalan otomatis lewat `postbuild` di package.json. Bila suatu saat
 * perlu menelusuri galat produksi, jalankan `npm run build` tanpa postbuild:
 *   npx next build
 *
 * Pemakaian manual:
 *   node scripts/strip-sourcemaps.mjs [--dry-run]
 */

import { readdirSync, rmSync, statSync } from "node:fs";
import { join } from "node:path";

const dryRun = process.argv.includes("--dry-run");
const ROOT = ".next";

function walk(dir, acc = []) {
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return acc;
  }
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) walk(full, acc);
    else if (entry.name.endsWith(".map")) acc.push(full);
  }
  return acc;
}

let files = 0;
let bytes = 0;

try {
  statSync(ROOT);
} catch {
  console.error(`Folder ${ROOT} belum ada. Jalankan build lebih dulu.`);
  process.exit(0);
}

const maps = walk(ROOT);

for (const file of maps) {
  try {
    bytes += statSync(file).size;
    if (!dryRun) rmSync(file, { force: true });
    files += 1;
  } catch {
    // Berkas mungkin sudah hilang; abaikan.
  }
}

const mb = (bytes / 1024 / 1024).toFixed(1);
if (dryRun) {
  console.log(`[strip-sourcemaps] pratinjau: ${files} berkas .map (${mb} MB) akan dihapus`);
} else {
  console.log(`[strip-sourcemaps] ${files} berkas .map dihapus (${mb} MB dihemat)`);
}
