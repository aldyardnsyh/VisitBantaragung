import Link from "next/link";
import { getAllWisata } from "@/lib/content";
import { assetUrl } from "@/lib/asset";

export default function WisataPage() {
  const items = getAllWisata();

  return (
    <main className="max-w-6xl mx-auto px-6 py-16 space-y-12">

      {/* Header */}
      <section className="rounded-3xl bg-gradient-to-br from-emerald-600 to-teal-500 text-white p-10 md:p-12 space-y-4 shadow-lg">
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
        {items.map((w: any) => (
          <Link key={w.slug} href={`/wisata/${w.slug}`}>
            <div className="group bg-white rounded-3xl overflow-hidden shadow-sm hover:shadow-xl transition border border-emerald-100/70">
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

                <span className="inline-flex items-center gap-1 text-emerald-700 text-sm font-medium">
                  Lihat detail
                  <span aria-hidden>→</span>
                </span>
              </div>
            </div>
          </Link>
        ))}
      </section>

    </main>
  );
}
