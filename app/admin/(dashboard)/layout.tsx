import { redirect } from "next/navigation";
import { getSession } from "@/lib/admin/guard";
import AppShell from "../_components/AppShell";
import { ToastProvider } from "../_components/Toast";

// Seluruh isi dasbor bersifat dinamis: datanya dibaca saat permintaan, bukan
// saat build. Halaman publik tetap statis seperti sebelumnya karena tidak
// memakai API waktu-permintaan.
export const dynamic = "force-dynamic";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/admin/login");

  return (
    <ToastProvider>
      <AppShell username={session.sub}>{children}</AppShell>
    </ToastProvider>
  );
}
