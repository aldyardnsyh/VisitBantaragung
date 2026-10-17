#!/usr/bin/env node
/**
 * Pembuat hash kata sandi admin.
 *
 * Pemakaian:
 *   node scripts/admin-password.mjs "kata-sandi-rahasia"
 *
 * Keluarannya adalah satu baris nilai untuk ADMIN_PASSWORD_HASH di environment
 * Vercel (Production, Preview, Development). Kata sandi asli TIDAK disimpan
 * di mana pun oleh skrip ini.
 *
 * Format memakai titik sebagai pemisah (bukan tanda dolar) karena Next.js
 * meng-ekspansi tanda dolar di berkas .env.local, yang akan merusak hash.
 */

import { randomBytes, scryptSync } from "node:crypto";

const N = 16384; // biaya CPU/memori; 2^14 adalah nilai yang aman dan cepat
const r = 8;
const p = 1;
const keyLength = 64;

function usage() {
  console.log('Pemakaian: node scripts/admin-password.mjs "kata-sandi-rahasia"');
  console.log("");
  console.log("Contoh:");
  console.log('  node scripts/admin-password.mjs "SandiDesaBantaragung2026!"');
  process.exit(1);
}

const password = process.argv[2];
if (!password || password.trim().length === 0) usage();

if (password.length < 12) {
  console.error("Kata sandi minimal 12 karakter agar tahan tebakan.");
  process.exit(1);
}

const salt = randomBytes(16);
const hash = scryptSync(password, salt, keyLength, { N, r, p });

const encoded = [
  "scrypt",
  String(N),
  String(r),
  String(p),
  salt.toString("base64"),
  hash.toString("base64"),
].join(".");

console.log("");
console.log("Salin baris berikut ke environment variabel ADMIN_PASSWORD_HASH:");
console.log("");
console.log(encoded);
console.log("");
console.log("Sekaligus siapkan ADMIN_SESSION_SECRET. Salah satu cara membuatnya:");
console.log("  node -e \"console.log(require('crypto').randomBytes(32).toString('base64url'))\"");
console.log("");
