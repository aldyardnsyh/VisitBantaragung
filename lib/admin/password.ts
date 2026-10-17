import "server-only";
import { scryptSync, timingSafeEqual } from "node:crypto";
import { ADMIN } from "./config";

// Perbandingan waktu-konstan sederhana untuk string pendek.
function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a, "utf8");
  const right = Buffer.from(b, "utf8");
  if (left.length !== right.length) {
    // Tetap jalankan perbandingan agar durasi tidak membocorkan panjang.
    timingSafeEqual(left, left);
    return false;
  }
  return timingSafeEqual(left, right);
}

/**
 * Verifikasi kata sandi terhadap nilai tersimpan.
 *
 * Format: scrypt.<N>.<r>.<p>.<salt-base64>.<hash-base64>
 * Pemisahnya titik, bukan tanda dolar, karena Next.js meng-ekspansi tanda
 * dolar di berkas .env.local dan itu akan merusak hash. Format lama dengan
 * pemisah tanda dolar tetap diterima agar tidak mematahkan konfigurasi yang
 * sudah ada.
 */
export function verifyPasswordHash(password: string, stored: string): boolean {
  try {
    const parts = stored.split(stored.includes("$") ? "$" : ".");
    if (parts.length !== 6 || parts[0] !== "scrypt") return false;
    const N = Number(parts[1]);
    const r = Number(parts[2]);
    const p = Number(parts[3]);
    if (!Number.isFinite(N) || !Number.isFinite(r) || !Number.isFinite(p)) return false;
    const salt = Buffer.from(parts[4], "base64");
    const expected = Buffer.from(parts[5], "base64");
    if (!salt.length || !expected.length) return false;
    const actual = scryptSync(password, salt, expected.length, {
      N,
      r,
      p,
      maxmem: 128 * 1024 * 1024,
    });
    return actual.length === expected.length && timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}

export function verifyCredentials(username: string, password: string): boolean {
  if (!username || !password) return false;
  const userOk = safeEqual(username, ADMIN.username);
  const passOk = ADMIN.passwordHash
    ? verifyPasswordHash(password, ADMIN.passwordHash)
    : ADMIN.passwordPlain
      ? safeEqual(password, ADMIN.passwordPlain)
      : false;
  return userOk && passOk;
}
