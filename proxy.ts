import { NextRequest, NextResponse } from "next/server";
import { ADMIN } from "@/lib/admin/config";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/admin/session";

// proxy.ts (pengganti middleware.ts di Next 16) hanya menjaga NAVIGASI halaman
// admin supaya pengunjung tanpa sesi langsung diarahkan ke halaman masuk.
//
// Batas keamanan yang sebenarnya ada di setiap route handler /api/admin/*
// (lihat requireSession) karena proxy tidak melindungi Server Function.
//
// Matcher sengaja dipersempit ke /admin saja: permintaan halaman publik,
// _next/static, dan aset tidak pernah melewati berkas ini sehingga performa
// situs yang sudah berjalan tidak terpengaruh.
export const config = {
  matcher: ["/admin/:path*"],
};

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname === "/admin/login") return NextResponse.next();

  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const session = await verifySessionToken(token, ADMIN.sessionSecret);

  if (session) return NextResponse.next();

  const loginUrl = new URL("/admin/login", request.url);
  if (pathname !== "/admin") loginUrl.searchParams.set("next", pathname);
  return NextResponse.redirect(loginUrl);
}
