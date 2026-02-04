import Link from "next/link";
import { getAllHerbal } from "@/lib/content";
import { assetUrl } from "@/lib/asset";

export default function HerbalList() {
  const items = getAllHerbal();

  return (
    <main className="max-w-6xl mx-auto px-6 py-16 space-y-12">

      {/* Header */}
      <section className="rounded-3xl bg-gradient-to-br from-emerald-600 to-teal-500 text-white p-10 md:p-12 space-y-4 shadow-lg">
        <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-1 text-xs uppercase tracking-widest">
          Katalog Herbal
        </div>
        <h1 className="text-3xl md:text-4xl font-bold">
          Katalog Tanaman Herbal
        </h1>
        <p className="text-white/90 max-w-2xl">
          Daftar tanaman obat keluarga yang dibudidayakan di Kampung Herbal Bantaragung.
        </p>
      </section>

      {/* Grid */}
      <section className="grid md:grid-cols-3 gap-8">
        {items.map((item: any) => (
          <Link key={item.slug} href={`/b2h/katalog/${item.slug}`}>
            <div className="group bg-white rounded-3xl overflow-hidden shadow-sm hover:shadow-xl transition border border-emerald-100/70">
              <div className="relative">
                <img
                  src={assetUrl(item.cover)}
                  alt={item.name}
                  className="h-48 w-full object-cover group-hover:scale-105 transition duration-300"
                />
                <div className="absolute top-3 left-3 rounded-full bg-white/90 px-3 py-1 text-xs text-slate-700 shadow">
                  {item.latin}
                </div>
              </div>

              <div className="p-5 space-y-2">
                <h3 className="font-semibold text-lg">{item.name}</h3>
                <p className="text-sm text-gray-600 line-clamp-2">{item.excerpt}</p>
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
