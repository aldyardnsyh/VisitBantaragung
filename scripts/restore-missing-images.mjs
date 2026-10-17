#!/usr/bin/env node
/**
 * Pulihkan gambar yang hilang dari riwayat git, lalu konversi ke WebP.
 *
 * Latar belakang: commit 11c8d36 ("update foto katalog tanaman herbal")
 * menghapus cover untuk dua tanaman (daun-karuk dan daun-kecubung) tanpa
 * menggantinya, sehingga halaman katalog keduanya menampilkan gambar kosong.
 * Berkas aslinya masih tersimpan di riwayat git dan bisa dipulihkan.
 *
 * Skrip ini:
 *  1. Mengambil versi terakhir berkas dari riwayat git.
 *  2. Mengonversinya ke WebP dengan pengaturan yang sama seperti migrasi lain.
 *  3. Menulis hasilnya ke repositori aset.
 *
 * Pemakaian:
 *   node scripts/restore-missing-images.mjs --dry-run
 *   node scripts/restore-missing-images.mjs --write
 */

import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync, existsSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import sharp from "sharp";

const dryRun = !process.argv.includes("--write");
const ASSETS = process.env.ASSETS_ROOT || "../visitbantaragung-assets";
const WEBP_QUALITY = 82;
const MAX_WIDTH = 1920;

/** Berkas yang perlu dipulihkan: path di repo, dan commit sumber. */
const TARGETS = [
  { path: "b2h/katalog-tanaman/daun-karuk/cover.png", from: "11c8d36^" },
  { path: "b2h/katalog-tanaman/daun-kecubung/cover.png", from: "11c8d36^" },
  { path: "b2h/katalog-tanaman/daun-kecubung/01.png", from: "11c8d36^" },
  { path: "b2h/katalog-tanaman/daun-kecubung/02.png", from: "11c8d36^" },
];

let restored = 0;
let bytes = 0;

for (const target of TARGETS) {
  const assetPath = join(ASSETS, target.path);
  if (existsSync(assetPath)) {
    console.log(`  LEWATI (sudah ada): ${target.path}`);
    continue;
  }

  let blob;
  try {
    // Ambil isi berkas langsung dari objek git (biner aman lewat execFileSync).
    blob = execFileSync("git", ["-C", ASSETS, "show", `${target.from}:${target.path}`], {
      maxBuffer: 64 * 1024 * 1024,
    });
  } catch (error) {
    console.log(`  GAGAL mengambil ${target.path}: ${error.message}`);
    continue;
  }

  try {
    const image = sharp(blob, { failOn: "none" });
    const meta = await image.metadata();
    const out = await image
      .resize({ width: Math.min(meta.width ?? MAX_WIDTH, MAX_WIDTH), withoutEnlargement: true })
      .webp({ quality: WEBP_QUALITY, effort: 5 })
      .toBuffer();

    const outPath = assetPath.replace(/\.(png|jpe?g)$/i, ".webp");
    console.log(
      `  ${target.path} -> ${target.path.replace(/\.(png|jpe?g)$/i, ".webp")}  ` +
        `(${Math.round(blob.length / 1024)} KB -> ${Math.round(out.length / 1024)} KB)`
    );

    if (!dryRun) {
      mkdirSync(dirname(outPath), { recursive: true });
      writeFileSync(outPath, out);
    }
    restored += 1;
    bytes += out.length;
  } catch (error) {
    console.log(`  GAGAL konversi ${target.path}: ${error.message}`);
  }
}

console.log("");
console.log(`Mode: ${dryRun ? "PRATINJAU" : "PULIHKAN"}`);
console.log(`  Berkas dipulihkan : ${restored}`);
console.log(`  Total ukuran      : ${Math.round(bytes / 1024)} KB`);
if (dryRun) {
  console.log("");
  console.log("Jalankan dengan --write untuk benar-benar memulihkan.");
} else {
  console.log("");
  console.log("Langkah berikutnya: perbarui rujukan JSON ke .webp, lalu commit.");
}
