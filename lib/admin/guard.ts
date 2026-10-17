import "server-only";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { ADMIN } from "./config";
import { SESSION_COOKIE, verifySessionToken, SessionPayload } from "./session";

export class ApiError extends Error {
  status: number;
  fields?: Record<string, string>;
  constructor(message: string, status: number, fields?: Record<string, string>) {
    super(message);
    this.status = status;
    this.name = "ApiError";
    this.fields = fields;
  }
}

/** Baca sesi dari cookie. Mengembalikan null bila belum/tidak login. */
export async function getSession(): Promise<SessionPayload | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  return verifySessionToken(token, ADMIN.sessionSecret);
}

/**
 * Wajib dipanggil di SETIAP route handler admin. Proxy hanya menyaring
 * navigasi halaman, bukan batas keamanan API.
 */
export async function requireSession(): Promise<SessionPayload> {
  const session = await getSession();
  if (!session) throw new ApiError("Sesi berakhir. Silakan masuk kembali.", 401);
  return session;
}

export function jsonError(error: unknown): NextResponse {
  if (error instanceof ApiError) {
    return NextResponse.json(
      { error: error.message, ...(error.fields ? { fields: error.fields } : {}) },
      { status: error.status }
    );
  }
  const status =
    typeof error === "object" && error !== null && "status" in error
      ? Number((error as { status: unknown }).status) || 500
      : 500;
  const message =
    error instanceof Error ? error.message : "Terjadi kesalahan yang tidak diketahui.";
  return NextResponse.json({ error: message }, { status });
}

export function jsonOk<T>(data: T, init?: ResponseInit): NextResponse {
  return NextResponse.json(data, init);
}
