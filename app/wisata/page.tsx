import Link from "next/link";
import { getAllWisata } from "@/lib/content";
import { assetUrl } from "@/lib/asset";

export default async function WisataPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const { page } = await searchParams;
  const items = getAllWisata();
  const perPage = 9;
  const currentPage = Math.max(1, Number(page ?? "1") || 1);
  const totalPages = Math.max(1, Math.ceil(items.length / perPage));
  const safePage = Math.min(currentPage, totalPages);
  const pagedItems = items.slice((safePage - 1) * perPage, safePage * perPage);

  return (
    <main className="max-w-6xl mx-auto px-6 py-16 space-y-12">

      {/* Header */}
      <section className="rounded-3xl bg-gradient-to-br from-[#102440] to-[#1b3b6f] text-white p-10 md:p-12 space-y-4 shadow-lg">
        <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-1 text-xs uppercase tracking-widest">
          Wisata Desa
        </div>
        <h1 className="text-3xl md:text-4xl font-bold">Jelajah Wisata Bantaragung</h1>
        <p className="text-white/90 max-w-2xl">
          Temukan destinasi wisata alam dan edukasi terbaik di Desa Bantaragung,
          lengkap dengan informasi aktivitas, fasilitas, dan cerita lokal.
        </p>
        <div className="flex flex-wrap gap-3 text-sm text-white/90">
          <span className="rounded-full bg-white/10 px-3 py-1">Alam</span>
          <span className="rounded-full bg-white/10 px-3 py-1">Edukasi</span>
          <span className="rounded-full bg-white/10 px-3 py-1">Budaya</span>
        </div>
      </section>

      {/* Grid */}
      <section className="grid md:grid-cols-3 gap-8">
        {pagedItems.map((w: any) => (
          <Link key={w.slug} href={`/wisata/${w.slug}`}>
            <div className="group bg-white rounded-3xl overflow-hidden shadow-sm hover:shadow-xl transition border border-[#e7c277]/40">
              <div className="relative">
                <img
                  src={assetUrl(w.cover)}
                  alt={w.title}
                  className="h-56 w-full object-cover group-hover:scale-105 transition duration-300"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent opacity-0 group-hover:opacity-100 transition" />
              </div>

              <div className="p-5 space-y-3">
                <h3 className="font-semibold text-lg">{w.title}</h3>
                <p className="text-sm text-gray-600 line-clamp-2">{w.excerpt}</p>

                <span className="inline-flex items-center gap-1 text-[#e7c277] text-sm font-medium">
                  Lihat detail
                  <span aria-hidden>→</span>
                </span>
              </div>
            </div>
          </Link>
        ))}
      </section>

      {/* Pagination */}
      <nav className="flex flex-wrap items-center justify-center gap-2 text-sm">
        <Link
          href={`/wisata?page=${Math.max(1, safePage - 1)}`}
          className={`px-4 py-2 rounded-full border border-[#e7c277]/40 ${
            safePage === 1
              ? "pointer-events-none text-slate-400"
              : "text-[#102440] hover:bg-[#102440]/10"
          }`}
        >
          ← Sebelumnya
        </Link>

        {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
          <Link
            key={page}
            href={`/wisata?page=${page}`}
            className={`px-4 py-2 rounded-full border border-[#e7c277]/40 ${
              page === safePage
                ? "bg-[#102440] text-white"
                : "text-[#102440] hover:bg-[#102440]/10"
            }`}
          >
            {page}
          </Link>
        ))}

        <Link
          href={`/wisata?page=${Math.min(totalPages, safePage + 1)}`}
          className={`px-4 py-2 rounded-full border border-[#e7c277]/40 ${
            safePage === totalPages
              ? "pointer-events-none text-slate-400"
              : "text-[#102440] hover:bg-[#102440]/10"
          }`}
        >
          Berikutnya →
        </Link>
      </nav>

    </main>
  );
}
