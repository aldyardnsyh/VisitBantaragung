#!/usr/bin/env node
/**
 * Penentu apakah Vercel perlu membangun ulang situs.
 *
 * Vercel memanggil skrip ini lewat `ignoreCommand` di vercel.json. Aturannya:
 * keluar dengan kode 0 berarti LEWATI build, kode selain 0 berarti JALANKAN.
 * Perhatikan bahwa konvensinya terbalik dari kebiasaan skrip pada umumnya.
 *
 * Alasan: setiap build menyimpan satu deployment penuh (sekitar 80 MB pada
 * proyek ini). Perubahan yang tidak memengaruhi hasil build, seperti
 * dokumentasi atau skrip bantu, tidak perlu menghasilkan deployment baru.
 *
 * Cara kerja: bandingkan daftar berkas yang berubah antara commit sebelumnya
 * dan commit yang sedang dibangun. Bila seluruh perubahan berada di dalam
 * folder yang tidak memengaruhi keluaran situs, build dilewati.
 *
 * Bila git tidak tersedia atau riwayat tidak bisa dibaca, skrip memilih
 * MENJALANKAN build demi keamanan: lebih baik membangun ulang daripada
 * melewatkan perubahan penting.
 */

import { execFileSync } from "node:child_process";

/**
 * Folder dan berkas yang perubahannya tidak memengaruhi keluaran situs.
 *
 * TIDAK termasuk content/, app/, lib/, public/, package.json, next.config.ts,
 * atau apa pun yang dibaca saat build.
 */
const ABAIKAN = [
  /^docs\//,
  /^scripts\//,
  /^\.github\//,
  /^README\.md$/i,
  /^\.env\.example$/,
  /^\.gitignore$/,
  /^\.vscode\//,
  /^AGENTS\.md$/i,
  /^CLAUDE\.md$/i,
];

function sh(args) {
  return execFileSync("git", args, { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
}

try {
  // Ambil hash commit yang sedang dibangun.
  const head = process.env.VERCEL_GIT_COMMIT_SHA || sh(["rev-parse", "HEAD"]);

  let changed = [];

  // Utamakan perbandingan dengan commit sebelumnya.
  try {
    changed = sh(["diff", "--name-only", `${head}^`, head]).split("\n").filter(Boolean);
  } catch {
    // Commit pertama atau riwayat dangkal: pakai daftar berkas yang berubah
    // relatif terhadap origin/main bila tersedia.
    changed = sh(["diff", "--name-only", "HEAD~1", "HEAD"]).split("\n").filter(Boolean);
  }

  if (changed.length === 0) {
    // Tidak ada perubahan yang terdeteksi: bangun saja agar aman.
    process.stderr.write("[vercel-ignore] tidak ada perubahan terdeteksi, build dijalankan\n");
    process.exit(1);
  }

  const relevan = changed.filter((file) => !ABAIKAN.some((pola) => pola.test(file)));

  if (relevan.length === 0) {
    process.stderr.write(
      `[vercel-ignore] ${changed.length} berkas berubah, semuanya tidak memengaruhi situs. Build DILEWATI.\n` +
        changed.map((f) => `  - ${f}`).join("\n") +
        "\n"
    );
    // 0 = lewati build di Vercel.
    process.exit(0);
  }

  process.stderr.write(
    `[vercel-ignore] ${relevan.length} berkas memengaruhi situs, build DIPERLUKAN:\n` +
      relevan.slice(0, 10).map((f) => `  - ${f}`).join("\n") +
      (relevan.length > 10 ? `\n  ...dan ${relevan.length - 10} lainnya` : "") +
      "\n"
  );
  // Selain 0 = jalankan build.
  process.exit(1);
} catch (error) {
  // Ragu-ragu: bangun saja.
  process.stderr.write(`[vercel-ignore] gagal memeriksa perubahan (${error.message}), build dijalankan\n`);
  process.exit(1);
}
