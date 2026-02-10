import { getAllArticles } from "@/lib/content";
import ArtikelListClient from "./ArtikelListClient";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Semua Artikel",
  description: "Kumpulan artikel kegiatan, edukasi, dan publikasi program pengembangan masyarakat Desa Bantaragung.",
};

export default function ArtikelList() {
  // Fetch data on the server
  const allArticles = getAllArticles();

  return (
    <main className="max-w-6xl mx-auto px-6 py-16 space-y-12">
      {/* Header */}
      <section className="rounded-3xl bg-gradient-to-br from-[#102440] to-[#1b3b6f] text-white p-10 md:p-12 space-y-4 shadow-lg">
        <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1 text-xs uppercase tracking-widest">
          Publikasi Desa
        </div>
        <h1 className="text-3xl md:text-4xl font-bold">
          Pusat Pengetahuan Bantaragung
        </h1>
        <p className="text-white/80 max-w-2xl">
          Dokumentasi kegiatan, edukasi desa, dan publikasi program Desa Bantaragung.
        </p>
      </section>

      {/* Client Component with Filters and Articles */}
      <ArtikelListClient articles={allArticles} />
    </main>
  );
}
