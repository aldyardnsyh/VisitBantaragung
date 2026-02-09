import Link from "next/link";
import { getAllHerbal } from "@/lib/content";
import { assetUrl } from "@/lib/asset";
import ImageWithSkeleton from "@/app/components/ui/ImageWithSkeleton";
import BackgroundPattern from "@/app/components/ui/BackgroundPattern";

export default function B2HLanding() {
  const herbals = getAllHerbal().slice(0, 3);

  return (
    <main className="max-w-6xl mx-auto px-6 py-16 space-y-12">

      {/* Header */}
      <section className="relative rounded-3xl bg-gradient-to-br from-[#102440] to-[#1b3b6f] text-white p-10 md:p-12 space-y-4 shadow-lg">
        <BackgroundPattern variant="leaves" opacity={0.04} className="text-white" />
        <div className="inline-flex items-center gap-2 rounded-full badge-dark px-4 py-1 text-xs uppercase tracking-widest">
          Kampung Herbal
        </div>
        <h1 className="text-3xl md:text-4xl font-bold">
          Bantaragung Herbal Hub (B2H)
        </h1>
        <p className="text-white/80 max-w-2xl">
          Kampung Herbal Desa Bantaragung merupakan pusat edukasi tanaman obat
          keluarga yang mengintegrasikan wisata, kesehatan alami, dan pemberdayaan masyarakat.
        </p>
      </section>

      {/* Featured Herbal Plants */}
      <section className="grid md:grid-cols-3 gap-8">
        {herbals.map((item: any) => (
          <Link key={item.slug} href={`/b2h/katalog/${item.slug}`}>
            <article className="group bg-white rounded-3xl overflow-hidden shadow-sm hover:shadow-xl transition border border-[#e7c277]/40">
              <div className="relative">
                <ImageWithSkeleton
                  src={assetUrl(item.cover)}
                  alt={item.name}
                  className="h-48 w-full object-cover group-hover:scale-105 transition duration-300"
                />
                <div className="absolute top-3 left-3 rounded-full bg-white/90 px-3 py-1 text-xs text-slate-700 shadow">
                  {item.latin}
                </div>
              </div>

              <div className="p-5 space-y-3">
                <h3 className="font-semibold leading-snug">{item.name}</h3>
                <p className="text-sm text-gray-600 line-clamp-2">{item.excerpt}</p>
                <span className="inline-flex items-center gap-1 text-[#e7c277] text-sm font-medium">
                  Lihat detail
                  <span aria-hidden>→</span>
                </span>
              </div>
            </article>
          </Link>
        ))}
      </section>

      {/* CTA */}
      <section className="text-center">
        <Link
          href="/b2h/katalog"
          className="inline-flex items-center gap-2 bg-[#102440] text-white px-6 py-3 rounded-full shadow hover:bg-[#0b1a2f] transition"
        >
          Lihat Semua Katalog Herbal
          <span aria-hidden>→</span>
        </Link>
      </section>

    </main>
  );
}
