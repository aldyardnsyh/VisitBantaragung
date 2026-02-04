import Link from "next/link";
import { getAllArticles } from "@/lib/content";
import { assetUrl } from "@/lib/asset";

export default function BICLanding() {
  const articles = getAllArticles().slice(0, 3);

  return (
    <main className="max-w-6xl mx-auto px-6 py-16 space-y-12">

      {/* Header */}
      <section className="space-y-3">
        <h1 className="text-3xl md:text-4xl font-bold">
          Bantaragung Information Center
        </h1>
        <p className="text-gray-600 max-w-2xl">
          Pusat dokumentasi digital Desa Bantaragung yang memuat artikel kegiatan,
          edukasi desa, dan publikasi program pengembangan masyarakat.
        </p>
      </section>

      {/* Highlight Artikel */}
      <section className="grid md:grid-cols-3 gap-8">
        {articles.map((a: any) => (
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
              </div>
            </article>
          </Link>
        ))}
      </section>

      {/* CTA */}
      <section className="text-center">
        <Link
          href="/bic/artikel"
          className="inline-block bg-green-700 text-white px-6 py-3 rounded-xl"
        >
          Lihat Semua Artikel
        </Link>
      </section>

    </main>
  );
}
