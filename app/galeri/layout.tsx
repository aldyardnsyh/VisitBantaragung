import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Galeri KKN",
    description: "Dokumentasi kegiatan KKN-PPM UGM Simfoni Sindangwangi Periode IV 2025 di Desa Bantaragung dan Desa Sindangwangi, Majalengka.",
};

export default function GaleriLayout({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
}
