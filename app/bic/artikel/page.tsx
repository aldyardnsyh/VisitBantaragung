import Link from "next/link";
import { getAllArticles } from "@/lib/content";
import { assetUrl } from "@/lib/asset";

export default function ArtikelList() {
  const items = getAllArticles();

  return (
    <main className="max-w-6xl mx-auto px-6 py-16 space-y-10">

      {/* Header */}
      <section className="space-y-2">
        <h1 className="text-3xl md:text-4xl font-bold">
          Pusat Pengetahuan Bantaragung
        </h1>
        <p className="text-gray-600">
          Dokumentasi kegiatan, edukasi desa, dan publikasi program Desa Bantaragung.
        </p>
      </section>

      {/* Grid Artikel */}
      <section className="grid md:grid-cols-3 gap-8">
        {items.map((a: any) => (
          <Link key={a.slug} href={`/bic/artikel/${a.slug}`}>
            <article className="bg-white rounded-2xl overflow-hidden shadow hover:shadow-xl transition">
              <img
                src={assetUrl(a.cover)}
                alt={a.title}
                className="h-48 w-full object-cover"
              />

              <div className="p-5 space-y-2">
                <small className="text-gray-500">{a.date}</small>
                <h3 className="font-semibold leading-snug">{a.title}</h3>
                <p className="text-sm text-gray-600">{a.excerpt}</p>

                <span className="inline-block text-green-700 text-sm font-medium mt-2">
                  Baca artikel →
                </span>
              </div>
            </article>
          </Link>
        ))}
      </section>

    </main>
  );
}