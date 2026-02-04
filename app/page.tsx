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
    <main className="space-y-24">

      {/* HERO */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[#102440] via-[#1b3b6f] to-[#1b3b6f] text-white">
        <div className="absolute inset-0 opacity-20">
          <div className="absolute -top-16 -right-16 h-64 w-64 rounded-full bg-white/30 blur-3xl" />
          <div className="absolute -bottom-20 -left-16 h-72 w-72 rounded-full bg-black/20 blur-3xl" />
        </div>
        <div className="relative max-w-6xl mx-auto px-6 py-24 text-center space-y-8">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-1 text-xs uppercase tracking-widest">
            Desa Wisata Digital
          </div>
          <h1 className="text-4xl md:text-6xl font-bold leading-tight">
            Visit Bantaragung
          </h1>
          <p className="text-lg md:text-xl opacity-90 max-w-2xl mx-auto">
            Smart Tourism Digital Platform untuk mengeksplorasi wisata, budaya, dan
            potensi ekonomi kreatif Desa Bantaragung.
          </p>

          <div className="flex flex-wrap justify-center gap-4">
            <Link
              href="/wisata"
              className="inline-flex items-center gap-2 bg-white text-[#e7c277] px-6 py-3 rounded-full font-semibold shadow-lg hover:scale-105 transition"
            >
              Jelajahi Wisata
              <span aria-hidden>→</span>
            </Link>
            <Link
              href="/bmc"
              className="inline-flex items-center gap-2 border border-white/40 px-6 py-3 rounded-full font-semibold hover:bg-white/10 transition"
            >
              Lihat Peta Digital
            </Link>
          </div>
        </div>
      </section>

      {/* WISATA */}
      <section className="max-w-6xl mx-auto px-6 space-y-6">
        <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
          <div>
            <h2 className="text-2xl font-bold">Wisata Unggulan</h2>
            <p className="text-sm text-slate-600">
              Destinasi favorit dengan panorama alam dan pengalaman edukatif.
            </p>
          </div>
          <Link href="/wisata" className="text-[#e7c277] font-medium">
            Lihat semua →
          </Link>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {wisata.map((w: any) => (
            <Link key={w.slug} href={`/wisata/${w.slug}`}>
              <div className="group rounded-3xl overflow-hidden shadow-sm hover:shadow-xl transition bg-white border border-[#e7c277]/40/60">
                <div className="relative">
                  <img
                    src={assetUrl(w.cover)}
                    alt={w.title}
                    className="h-48 w-full object-cover group-hover:scale-105 transition duration-300"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent opacity-0 group-hover:opacity-100 transition" />
                </div>
                <div className="p-5 space-y-2">
                  <h4 className="font-semibold">{w.title}</h4>
                  <p className="text-sm text-gray-600 line-clamp-2">{w.excerpt}</p>
                  <span className="inline-flex items-center gap-1 text-[#e7c277] text-sm font-medium">
                    Jelajahi
                    <span aria-hidden>→</span>
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* HERBAL */}
      <section className="max-w-6xl mx-auto px-6 space-y-6">
        <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
          <div>
            <h2 className="text-2xl font-bold">Kampung Herbal</h2>
            <p className="text-sm text-slate-600">
              Ragam tanaman obat dan edukasi kesehatan alami.
            </p>
          </div>
          <Link href="/b2h" className="text-[#e7c277] font-medium">
            Masuk B2H →
          </Link>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {herbal.map((h: any) => (
            <Link key={h.slug} href={`/b2h/katalog/${h.slug}`}>
              <div className="group rounded-3xl overflow-hidden shadow-sm hover:shadow-xl transition bg-white border border-[#e7c277]/40/60">
                <img
                  src={assetUrl(h.cover)}
                  alt={h.name}
                  className="h-40 w-full object-cover group-hover:scale-105 transition duration-300"
                />
                <div className="p-5 space-y-2">
                  <h4 className="font-semibold">{h.name}</h4>
                  <p className="text-sm text-gray-600 line-clamp-2">{h.excerpt}</p>
                  <span className="inline-flex items-center gap-1 text-[#e7c277] text-sm font-medium">
                    Lihat manfaat
                    <span aria-hidden>→</span>
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* ARTIKEL */}
      <section className="max-w-6xl mx-auto px-6 space-y-6">
        <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
          <div>
            <h2 className="text-2xl font-bold">Publikasi Terbaru</h2>
            <p className="text-sm text-slate-600">
              Cerita, berita, dan dokumentasi kegiatan desa terbaru.
            </p>
          </div>
          <Link href="/bic/artikel" className="text-[#e7c277] font-medium">
            Semua artikel →
          </Link>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {articles.map((a: any) => (
            <Link key={a.slug} href={`/bic/artikel/${a.slug}`}>
              <div className="group rounded-3xl overflow-hidden shadow-sm hover:shadow-xl transition bg-white border border-[#e7c277]/40/60">
                <img
                  src={assetUrl(a.cover)}
                  alt={a.title}
                  className="h-40 w-full object-cover group-hover:scale-105 transition duration-300"
                />
                <div className="p-5 space-y-2">
                  <h4 className="font-semibold line-clamp-2">{a.title}</h4>
                  <p className="text-sm text-gray-600 line-clamp-2">{a.excerpt}</p>
                  <span className="inline-flex items-center gap-1 text-[#e7c277] text-sm font-medium">
                    Baca artikel
                    <span aria-hidden>→</span>
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="bg-[#102440]/15">
        <div className="max-w-6xl mx-auto px-6 py-16 text-center space-y-6">
          <h2 className="text-3xl font-bold">Jelajahi Desa Bantaragung</h2>
          <p className="text-slate-600 max-w-2xl mx-auto">
            Temukan pengalaman lokal, peta digital, hingga potensi branding desa
            yang menampilkan UMKM serta homestay unggulan.
          </p>

          <div className="flex flex-wrap justify-center gap-4">
            <Link href="/bmc" className="px-5 py-3 bg-white rounded-full shadow hover:shadow-md transition">
              Peta Digital
            </Link>
            <Link href="/bdb" className="px-5 py-3 bg-white rounded-full shadow hover:shadow-md transition">
              Branding Desa
            </Link>
            <Link href="/kontak" className="px-5 py-3 bg-white rounded-full shadow hover:shadow-md transition">
              Kontak
            </Link>
          </div>
        </div>
      </section>

    </main>
  );
}
