import type { Metadata } from "next";
import "./admin.css";

// Layout dasar dasbor. Pemeriksaan sesi dan kerangka aplikasi ada di
// app/admin/(dashboard)/layout.tsx, sedangkan halaman masuk berada di
// app/admin/login sehingga tetap dapat diakses tanpa sesi.
export const metadata: Metadata = {
  title: {
    default: "Dasbor Admin | Visit Bantaragung",
    template: "%s | Dasbor Visit Bantaragung",
  },
  robots: { index: false, follow: false, nocache: true },
};

export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen bg-adm-page text-adm-text">{children}</div>;
}
