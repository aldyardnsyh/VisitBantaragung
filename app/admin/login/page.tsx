import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/admin/guard";
import { configStatus } from "@/lib/admin/config";
import LoginForm from "./LoginForm";

export const metadata: Metadata = { title: "Masuk" };
export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const session = await getSession();
  const params = await searchParams;
  if (session) redirect(params.next || "/admin");

  const status = configStatus();
  const nextPath = params.next?.startsWith("/admin") ? params.next : "/admin";

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-[400px]">
        <div className="rounded-[12px] border border-adm-border bg-adm-surface p-8">
          <div className="mb-6 flex items-center gap-3">
            <img src="/logo.svg" alt="" className="h-10 w-10 rounded-full" />
            <span className="text-sm font-medium text-adm-ink">Visit Bantaragung</span>
          </div>

          <h1 className="font-display text-3xl font-semibold text-adm-ink">Masuk ke Dasbor</h1>
          <p className="mt-2 text-sm leading-relaxed text-adm-subtle">
            Kelola konten situs Desa Wisata Bantaragung.
          </p>

          <div className="mt-6">
            {!status.auth ? (
              <div className="mb-5 rounded-[10px] border border-[#fde68a] bg-adm-warning-soft px-3 py-2.5 text-[13px] leading-relaxed text-adm-warning">
                Dasbor belum dikonfigurasi. Isi <code>ADMIN_PASSWORD_HASH</code> dan{" "}
                <code>ADMIN_SESSION_SECRET</code> pada environment, lalu jalankan ulang
                aplikasi. Petunjuk ada di <code>docs/ADMIN.md</code>.
              </div>
            ) : null}
            <LoginForm nextPath={nextPath} />
          </div>

          <p className="mt-6 border-t border-adm-divider pt-4 text-center text-xs text-adm-subtle">
            <Link href="/" className="adm-ring adm-transition rounded hover:text-adm-ink">
              Kembali ke situs
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
