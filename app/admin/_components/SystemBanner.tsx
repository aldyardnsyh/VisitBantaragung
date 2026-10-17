import { AlertTriangle, KeyRound } from "lucide-react";
import Link from "next/link";
import { configStatus } from "@/lib/admin/config";

/**
 * Pita peringatan di atas konten dasbor.
 *
 * Hanya muncul bila memang ada masalah nyata yang perlu tindakan pengguna:
 * - Konfigurasi admin belum lengkap (tidak bisa login sama sekali)
 * - Token GitHub belum diatur (konten tidak bisa dibaca atau disimpan)
 *
 * Tidak ada pita dekoratif: kalau semuanya sehat, komponen ini tidak merender
 * apa pun.
 */
export default function SystemBanner() {
  const status = configStatus();
  const masalah: Array<{ icon: React.ReactNode; text: React.ReactNode }> = [];

  if (!status.token) {
    masalah.push({
      icon: <KeyRound aria-hidden className="h-3.5 w-3.5" />,
      text: (
        <>
          Token GitHub belum diatur, sehingga konten tidak dapat dibaca atau disimpan. Tambahkan{" "}
          <code className="rounded bg-black/5 px-1 py-0.5 font-mono text-[11px]">ADMIN_GITHUB_TOKEN</code>{" "}
          pada environment Vercel, lalu deploy ulang.
        </>
      ),
    });
  }

  if (!status.auth) {
    masalah.push({
      icon: <KeyRound aria-hidden className="h-3.5 w-3.5" />,
      text: (
        <>
          Akun admin belum lengkap. Isi{" "}
          <code className="rounded bg-black/5 px-1 py-0.5 font-mono text-[11px]">ADMIN_PASSWORD_HASH</code> dan{" "}
          <code className="rounded bg-black/5 px-1 py-0.5 font-mono text-[11px]">ADMIN_SESSION_SECRET</code>.
        </>
      ),
    });
  }

  if (masalah.length === 0) return null;

  return (
    <div
      role="alert"
      className="mb-5 rounded-[var(--radius-adm-md)] border border-[#f2e0bb] bg-adm-warning-soft px-3.5 py-2.5"
    >
      <div className="flex items-start gap-2">
        <AlertTriangle aria-hidden className="mt-0.5 h-3.5 w-3.5 shrink-0 text-adm-warning" />
        <div className="min-w-0 flex-1 space-y-1">
          {masalah.map((item, index) => (
            <p key={index} className="text-[12px] leading-relaxed text-adm-warning">
              {item.text}
            </p>
          ))}
          <p className="pt-0.5 text-[11.5px] text-adm-warning/90">
            Panduan lengkap:{" "}
            <Link
              href="/admin/pengaturan"
              className="adm-ring adm-transition rounded font-medium underline underline-offset-2"
            >
              Pengaturan → Sistem
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
