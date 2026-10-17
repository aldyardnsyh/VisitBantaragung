"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Analytics } from "@vercel/analytics/next";

/**
 * Pelacak kunjungan Vercel Analytics untuk halaman publik saja.
 *
 * Dasbor admin sengaja dikecualikan: kunjungan admin bukan data pengunjung
 * situs, dan memuat skrip pelacak di sana hanya menambah beban tanpa manfaat.
 *
 * Komponen ini baru dipasang setelah halaman selesai dimuat agar tidak
 * menunda render konten. Jika pengunjung memakai pemblokir iklan, kegagalan
 * memuat skrip diabaikan tanpa memunculkan galat di konsol pengguna.
 */
export default function PublicAnalytics() {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Tunda pemasangan sampai interaksi pertama atau setelah halaman tenang,
    // supaya metrik performa tidak terpengaruh.
    if (typeof window === "undefined") return;
    const idle =
      typeof window.requestIdleCallback === "function"
        ? window.requestIdleCallback(() => setMounted(true), { timeout: 2000 })
        : window.setTimeout(() => setMounted(true), 1200);
    return () => {
      if (typeof window.cancelIdleCallback === "function" && typeof idle === "number") {
        window.cancelIdleCallback(idle);
      } else if (typeof idle === "number") {
        window.clearTimeout(idle);
      }
    };
  }, []);

  const isAdmin = pathname === "/admin" || pathname?.startsWith("/admin/");
  if (isAdmin || !mounted) return null;

  return <Analytics />;
}
