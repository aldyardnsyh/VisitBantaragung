"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

/**
 * Pembungkus chrome situs (Navbar + Footer).
 *
 * Dasbor admin punya tata letaknya sendiri, jadi Navbar dan Footer publik
 * tidak dirender di rute /admin. Halaman publik lain tetap menerima markup
 * yang sama persis seperti sebelumnya, sehingga tidak ada perubahan visual
 * pada situs yang sudah berjalan.
 *
 * Navbar dan Footer dikirim sebagai prop dari layout server, jadi keduanya
 * tetap dirender di server (tidak ada biaya tambahan di klien).
 */
export default function SiteChrome({
  navbar,
  footer,
  children,
}: {
  navbar: ReactNode;
  footer: ReactNode;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const isAdmin = pathname === "/admin" || pathname?.startsWith("/admin/");

  if (isAdmin) return <>{children}</>;

  return (
    <>
      {navbar}
      {children}
      {footer}
    </>
  );
}
