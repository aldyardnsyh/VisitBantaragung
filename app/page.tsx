import Link from "next/link";
import { assetUrl } from "@/lib/asset";
import {
  getAllWisata,
  getAllHerbal,
  getAllArticles,
} from "@/lib/content";

export default function Home() {
  const wisata = getAllWisata().slice(0, 3);
  const herbal = getAllHerbal().slice(0, 3);
  const articles = getAllArticles().slice(0, 3);

  return (
    <main className="space-y-20">

      {/* HERO */}
      <section className="bg-gradient-to-br from-green-700 to-emerald-600 text-white">
        <div className="max-w-6xl mx-auto px-6 py-24 text-center space-y-6">
          <h1 className="text-4xl md:text-6xl font-bold">
            Visit Bantaragung
          </h1>
          <p className="text-lg md:text-xl opacity-90">
            Smart Tourism Digital Platform Desa Bantaragung
          </p>

          <Link
            href="/wisata"
            className="inline-block bg-white text-green-700 px-6 py-3 rounded-xl font-semibold shadow hover:scale-105 transition"
          >
            Jelajahi Wisata
          </Link>
        </div>
      </section>

      {/* WISATA */}
      <section className="max-w-6xl mx-auto px-6 space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold">Wisata Unggulan</h2>
          <Link href="/wisata" className="text-green-700 font-medium">
            Lihat semua →
          </Link>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {wisata.map((w: any) => (
            <Link key={w.slug} href={`/wisata/${w.slug}`}>
              <div className="rounded-2xl overflow-hidden shadow hover:shadow-lg transition bg-white">
                <img
                  src={assetUrl(w.cover)}
                  alt={w.title}
                  className="h-48 w-full object-cover"
                />
                <div className="p-4 space-y-2">
                  <h4 className="font-semibold">{w.title}</h4>
                  <p className="text-sm text-gray-600">{w.excerpt}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* HERBAL */}
      <section className="max-w-6xl mx-auto px-6 space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold">Kampung Herbal</h2>
          <Link href="/b2h" className="text-green-700 font-medium">
            Masuk B2H →
          </Link>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {herbal.map((h: any) => (
            <Link key={h.slug} href={`/b2h/katalog/${h.slug}`}>
              <div className="rounded-2xl overflow-hidden shadow hover:shadow-lg transition bg-white">
                <img
                  src={assetUrl(h.cover)}
                  alt={h.name}
                  className="h-40 w-full object-cover"
                />
                <div className="p-4">
                  <h4 className="font-semibold">{h.name}</h4>
                  <p className="text-sm text-gray-600">{h.excerpt}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* ARTIKEL */}
      <section className="max-w-6xl mx-auto px-6 space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold">Publikasi Terbaru</h2>
          <Link href="/bic/artikel" className="text-green-700 font-medium">
            Semua artikel →
          </Link>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {articles.map((a: any) => (
            <Link key={a.slug} href={`/bic/artikel/${a.slug}`}>
              <div className="rounded-2xl overflow-hidden shadow hover:shadow-lg transition bg-white">
                <img
                  src={assetUrl(a.cover)}
                  alt={a.title}
                  className="h-40 w-full object-cover"
                />
                <div className="p-4 space-y-1">
                  <h4 className="font-semibold line-clamp-2">{a.title}</h4>
                  <p className="text-sm text-gray-600">{a.excerpt}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="bg-gray-100">
        <div className="max-w-6xl mx-auto px-6 py-16 text-center space-y-6">
          <h2 className="text-3xl font-bold">Jelajahi Desa Bantaragung</h2>

          <div className="flex flex-wrap justify-center gap-4">
            <Link href="/bmc" className="px-5 py-3 bg-white rounded-xl shadow">
              Peta Digital
            </Link>
            <Link href="/bdb" className="px-5 py-3 bg-white rounded-xl shadow">
              Branding Desa
            </Link>
            <Link href="/kontak" className="px-5 py-3 bg-white rounded-xl shadow">
              Kontak
            </Link>
          </div>
        </div>
      </section>

    </main>
  );
}