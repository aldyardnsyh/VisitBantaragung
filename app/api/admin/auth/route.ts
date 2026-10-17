import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { ADMIN } from "@/lib/admin/config";
import { verifyCredentials } from "@/lib/admin/password";
import { SESSION_COOKIE, sessionCookieOptions, signSession } from "@/lib/admin/session";
import { jsonError } from "@/lib/admin/guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Jeda tetap saat login gagal memperlambat percobaan beruntun. Tanpa basis
// data, ini pengaman praktis yang tersedia di lingkungan serverless.
const FAILURE_DELAY_MS = 500;

export async function POST(request: NextRequest) {
  try {
    // Pesan galat sengaja generik dan tidak menyebut nama variabel environment
    // apa pun. Rincian konfigurasi hanya muncul di halaman /admin/login yang
    // memang sudah diketahui pemilik, bukan di respons API yang bisa dipanggil
    // siapa saja.
    if (!ADMIN.sessionSecret || !ADMIN.passwordHash && !ADMIN.passwordPlain) {
      return NextResponse.json(
        { error: "Dasbor belum dikonfigurasi. Hubungi pengelola situs." },
        { status: 503 }
      );
    }

    const body = (await request.json()) as { username?: string; password?: string };
    const username = typeof body.username === "string" ? body.username.trim() : "";
    const password = typeof body.password === "string" ? body.password : "";

    if (!username || !password) {
      await new Promise((r) => setTimeout(r, FAILURE_DELAY_MS));
      return NextResponse.json(
        { error: "Nama pengguna atau kata sandi salah." },
        { status: 401 }
      );
    }

    if (!verifyCredentials(username, password)) {
      await new Promise((r) => setTimeout(r, FAILURE_DELAY_MS));
      return NextResponse.json(
        { error: "Nama pengguna atau kata sandi salah." },
        { status: 401 }
      );
    }

    const now = Math.floor(Date.now() / 1000);
    const token = await signSession(
      { sub: username, iat: now, exp: now + ADMIN.sessionTtlSeconds },
      ADMIN.sessionSecret
    );

    const store = await cookies();
    store.set({ ...sessionCookieOptions(ADMIN.sessionTtlSeconds), value: token });

    return NextResponse.json({ ok: true, username });
  } catch (error) {
    return jsonError(error);
  }
}

export async function DELETE() {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
  return NextResponse.json({ ok: true });
}
