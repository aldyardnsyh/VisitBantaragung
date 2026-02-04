import Link from "next/link";
import { getAllArticles } from "@/lib/content";
import { assetUrl } from "@/lib/asset";

export default function ArtikelList() {
  const items = getAllArticles();

  return (
    <main className="max-w-6xl mx-auto px-6 py-16 space-y-12">

      {/* Header */}
      <section className="rounded-3xl bg-gradient-to-br from-slate-900 to-emerald-900 text-white p-10 md:p-12 space-y-4 shadow-lg">
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

      {/* Grid Artikel */}
      <section className="grid md:grid-cols-3 gap-8">
        {items.map((a: any) => (
          <Link key={a.slug} href={`/bic/artikel/${a.slug}`}>
            <article className="group bg-white rounded-3xl overflow-hidden shadow-sm hover:shadow-xl transition border border-emerald-100/70">
              <div className="relative">
                <img
                  src={assetUrl(a.cover)}
                  alt={a.title}
                  className="h-48 w-full object-cover group-hover:scale-105 transition duration-300"
                />
                <div className="absolute top-3 left-3 rounded-full bg-white/90 px-3 py-1 text-xs text-slate-700 shadow">
                  {a.date}
                </div>
              </div>

              <div className="p-5 space-y-3">
                <h3 className="font-semibold leading-snug">{a.title}</h3>
                <p className="text-sm text-gray-600 line-clamp-2">{a.excerpt}</p>

                <span className="inline-flex items-center gap-1 text-emerald-700 text-sm font-medium">
                  Baca artikel
                  <span aria-hidden>→</span>
                </span>
              </div>
            </article>
          </Link>
        ))}
      </section>

    </main>
  );
}
