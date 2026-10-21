import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ShieldCheck, Sparkles, Images } from "lucide-react";
import { getSession } from "@/lib/admin/guard";
import { configStatus } from "@/lib/admin/config";
import LoginForm from "./LoginForm";

export const metadata: Metadata = { title: "Masuk" };
export const dynamic = "force-dynamic";

/** Tiga hal yang bisa dilakukan dari dasbor. Fakta, bukan klaim pemasaran. */
const FITUR = [
  {
    icon: <Sparkles aria-hidden className="h-3.5 w-3.5" />,
    title: "Kelola tanpa sentuh kode",
    body: "Ubah berita, destinasi, homestay, UMKM, dan pengaturan langsung dari sini.",
  },
  {
    icon: <Images aria-hidden className="h-3.5 w-3.5" />,
    title: "Unggah gambar praktis",
    body: "Gambar dikompresi otomatis sebelum tersimpan ke repositori aset.",
  },
  {
    icon: <ShieldCheck aria-hidden className="h-3.5 w-3.5" />,
    title: "Tercatat dan aman",
    body: "Setiap perubahan tersimpan sebagai satu commit yang bisa ditelusuri.",
  },
];

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
    <main className="flex min-h-screen items-center justify-center bg-adm-page px-4 py-10">
      <div className="grid w-full max-w-[880px] overflow-hidden rounded-[var(--radius-adm-xl)] border border-adm-border bg-adm-surface shadow-adm-md md:grid-cols-[1.05fr_1fr]">
        {/* Panel merek: terlihat di layar sedang ke atas */}
        <div className="relative hidden flex-col justify-between bg-adm-primary p-8 text-white md:flex">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-[0.14]"
            style={{
              backgroundImage:
                "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.85) 1px, transparent 0)",
              backgroundSize: "18px 18px",
            }}
          />
          <div className="relative">
            <div className="flex items-center gap-2.5">
              <img src="/logo.svg" alt="" className="h-9 w-9 rounded-full ring-1 ring-white/25" />
              <div className="leading-tight">
                <p className="text-[13.5px] font-semibold">Visit Bantaragung</p>
                <p className="text-[11px] text-white/85">Dasbor Konten</p>
              </div>
            </div>

            <h2 className="mt-9 font-display text-[27px] font-semibold leading-tight tracking-[-0.02em]">
              Kelola konten desa
              <br />
              wisata dengan rapi.
            </h2>
            <p className="mt-2.5 max-w-[19rem] text-[12.5px] leading-relaxed text-white/90">
              Satu tempat untuk memperbarui isi situs, tanpa menyunting berkas secara manual.
            </p>
          </div>

          <ul className="relative mt-8 space-y-3.5">
            {FITUR.map((item) => (
              <li key={item.title} className="flex gap-2.5">
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/15 text-white">
                  {item.icon}
                </span>
                <div>
                  <p className="text-[12.5px] font-medium">{item.title}</p>
                  <p className="mt-0.5 text-[11.5px] leading-relaxed text-white/85">{item.body}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        {/* Panel formulir */}
        <div className="p-7 sm:p-9">
          <div className="mb-6 flex items-center gap-2.5 md:hidden">
            <img src="/logo.svg" alt="" className="h-9 w-9 rounded-full ring-1 ring-adm-border" />
            <div className="leading-tight">
              <p className="text-[13px] font-semibold text-adm-ink">Visit Bantaragung</p>
              <p className="text-[10.5px] text-adm-subtle">Dasbor Konten</p>
            </div>
          </div>

          <h1 className="font-display text-[25px] font-semibold tracking-[-0.02em] text-adm-ink">
            Masuk ke Dasbor
          </h1>
          <p className="mt-1.5 text-[12.5px] leading-relaxed text-adm-subtle">
            Gunakan akun admin untuk melanjutkan.
          </p>

          <div className="mt-6">
            {!status.auth ? (
              <div className="mb-5 rounded-[var(--radius-adm-md)] border border-[#f2e0bb] bg-adm-warning-soft px-3.5 py-2.5 text-[12px] leading-relaxed text-adm-warning">
                Dasbor belum dikonfigurasi. Isi <code className="font-mono">ADMIN_PASSWORD_HASH</code>{" "}
                dan <code className="font-mono">ADMIN_SESSION_SECRET</code> pada environment, lalu
                deploy ulang.
              </div>
            ) : null}
            <LoginForm nextPath={nextPath} />
          </div>

          <p className="mt-7 border-t border-adm-divider pt-4 text-center text-[11.5px] text-adm-subtle">
            <Link href="/" className="adm-ring adm-transition rounded hover:text-adm-ink">
              Kembali ke situs
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
