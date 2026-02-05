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
    <main className="space-y-0">

      {/* HERO with Background Image */}
      <section className="relative overflow-hidden min-h-[600px] flex items-center">
        {/* Background Image */}
        <div className="absolute inset-0">
          <img
            src={assetUrl("_brand/covers/og-default.png")}
            alt="Desa Wisata Bantaragung"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/50 to-black/30" />
        </div>

        {/* Hero Content */}
        <div className="relative max-w-6xl mx-auto px-6 py-24 text-white space-y-8">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/20 backdrop-blur-sm px-4 py-1 text-xs uppercase tracking-widest">
            Desa Wisata Digital
          </div>
          <h1 className="text-5xl md:text-7xl font-bold leading-tight max-w-3xl">
            Selamat Datang di<br />
            <span className="text-[#e7c277]">Desa Wisata Bantaragung</span>
          </h1>
          <p className="text-lg md:text-xl opacity-90 max-w-2xl">
            Jelajahi keindahan alam, kearifan lokal, dan potensi ekonomi kreatif
            di kaki Gunung Ciremai, Majalengka, Jawa Barat.
          </p>

          <div className="flex flex-wrap gap-4">
            <Link
              href="/wisata"
              className="inline-flex items-center gap-2 bg-[#e7c277] text-[#102440] px-6 py-3 rounded-full font-semibold shadow-lg hover:scale-105 transition"
            >
              Jelajahi Wisata
              <span aria-hidden>→</span>
            </Link>
            <Link
              href="/bmc"
              className="inline-flex items-center gap-2 border-2 border-white/60 px-6 py-3 rounded-full font-semibold hover:bg-white/10 backdrop-blur-sm transition"
            >
              Lihat Peta Digital
            </Link>
          </div>
        </div>
      </section>

      {/* ABOUT DESA BANTARAGUNG */}
      <section className="max-w-6xl mx-auto px-6 py-20 space-y-12">
        <div className="text-center space-y-4 max-w-3xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold">Tentang Desa Wisata Bantaragung</h2>
          <p className="text-lg text-slate-600">
            Desa Wisata Bantaragung dibangun sebagai upaya memajukan perekonomian dan meningkatkan
            kualitas sumber daya manusia yang sadar wisata. Pembangunan desa wisata menjadi langkah
            strategis agar masyarakat terlibat secara komprehensif.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          <div className="text-center space-y-3 p-6 rounded-3xl bg-gradient-to-br from-[#102440]/5 to-[#e7c277]/5 border border-[#e7c277]/20">
            <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-[#102440] text-white text-2xl mx-auto">
              🏔️
            </div>
            <h3 className="font-bold text-xl">Lokasi Strategis</h3>
            <p className="text-sm text-slate-600">
              Terletak di kaki Gunung Ciremai dengan akses jalan yang baik dan kontur tanah subur
            </p>
          </div>

          <div className="text-center space-y-3 p-6 rounded-3xl bg-gradient-to-br from-[#102440]/5 to-[#e7c277]/5 border border-[#e7c277]/20">
            <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-[#102440] text-white text-2xl mx-auto">
              🌿
            </div>
            <h3 className="font-bold text-xl">Kampung Herbal</h3>
            <p className="text-sm text-slate-600">
              Ragam tanaman obat tradisional dan edukasi kesehatan alami untuk masyarakat
            </p>
          </div>

          <div className="text-center space-y-3 p-6 rounded-3xl bg-gradient-to-br from-[#102440]/5 to-[#e7c277]/5 border border-[#e7c277]/20">
            <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-[#102440] text-white text-2xl mx-auto">
              🏆
            </div>
            <h3 className="font-bold text-xl">Berprestasi</h3>
            <p className="text-sm text-slate-600">
              Penerima berbagai penghargaan termasuk Anugerah Pesona Indonesia dan ADWI 2023
            </p>
          </div>
        </div>
      </section>

      {/* KEARIFAN LOKAL */}
      <section className="bg-gradient-to-br from-[#102440]/5 to-white py-20">
        <div className="max-w-6xl mx-auto px-6 space-y-12">
          <div className="text-center space-y-4">
            <h2 className="text-3xl md:text-4xl font-bold">Kearifan Lokal & Budaya</h2>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              Kekayaan tradisi dan budaya yang siap dikemas menjadi pengalaman wisata berkesan
            </p>
          </div>

          <div className="grid md:grid-cols-4 gap-6">
            {[
              { icon: "🎭", title: "Ritual Nyura", desc: "Tradisi budaya leluhur" },
              { icon: "🎪", title: "Festival Safar", desc: "Perayaan tradisional" },
              { icon: "🥋", title: "Pencak Silat", desc: "Seni bela diri tradisional" },
              { icon: "🎵", title: "Musik Tradisional", desc: "Jaipong dan gamelan" },
            ].map((item, i) => (
              <div key={i} className="text-center space-y-3 p-6 rounded-2xl bg-white shadow-sm hover:shadow-md transition">
                <div className="text-4xl">{item.icon}</div>
                <h4 className="font-semibold">{item.title}</h4>
                <p className="text-sm text-slate-600">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* WISATA UNGGULAN */}
      <section className="max-w-6xl mx-auto px-6 py-20 space-y-8">
        <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
          <div>
            <h2 className="text-3xl font-bold">Destinasi Wisata Unggulan</h2>
            <p className="text-sm text-slate-600">
              Destinasi favorit dengan panorama alam dan pengalaman edukatif
            </p>
          </div>
          <Link href="/wisata" className="text-[#e7c277] font-medium hover:underline">
            Lihat semua destinasi →
          </Link>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {wisata.map((w: any) => (
            <Link key={w.slug} href={`/wisata/${w.slug}`}>
              <div className="group rounded-3xl overflow-hidden shadow-sm hover:shadow-xl transition bg-white border border-[#e7c277]/20">
                <div className="relative">
                  <img
                    src={assetUrl(w.cover)}
                    alt={w.title}
                    className="h-56 w-full object-cover group-hover:scale-105 transition duration-300"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition" />
                </div>
                <div className="p-5 space-y-2">
                  <h4 className="font-semibold text-lg">{w.title}</h4>
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

      {/* KAMPUNG HERBAL */}
      <section className="bg-gradient-to-br from-green-50 to-white py-20">
        <div className="max-w-6xl mx-auto px-6 space-y-8">
          <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
            <div>
              <h2 className="text-3xl font-bold">Kampung Herbal Bantaragung</h2>
              <p className="text-sm text-slate-600">
                Ragam tanaman obat tradisional dan edukasi kesehatan alami
              </p>
            </div>
            <Link href="/b2h" className="text-[#e7c277] font-medium hover:underline">
              Masuk B2H →
            </Link>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {herbal.map((h: any) => (
              <Link key={h.slug} href={`/b2h/katalog/${h.slug}`}>
                <div className="group rounded-3xl overflow-hidden shadow-sm hover:shadow-xl transition bg-white border border-green-200">
                  <img
                    src={assetUrl(h.cover)}
                    alt={h.name}
                    className="h-48 w-full object-cover group-hover:scale-105 transition duration-300"
                  />
                  <div className="p-5 space-y-2">
                    <h4 className="font-semibold">{h.name}</h4>
                    <p className="text-sm text-gray-600 line-clamp-2">{h.excerpt}</p>
                    <span className="inline-flex items-center gap-1 text-green-600 text-sm font-medium">
                      Lihat manfaat
                      <span aria-hidden>→</span>
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* PRESTASI & PENGHARGAAN */}
      <section className="max-w-6xl mx-auto px-6 py-20 space-y-12">
        <div className="text-center space-y-4">
          <h2 className="text-3xl md:text-4xl font-bold">Prestasi & Penghargaan</h2>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">
            Pencapaian yang memperkuat identitas Bantaragung sebagai desa wisata inovatif dan berkelanjutan
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { year: "2016", award: "Wana Lestari", desc: "Pengelolaan hutan lestari" },
            { year: "2017", award: "Anugerah Pesona Indonesia", desc: "Surga Tersembunyi Terpopuler" },
            { year: "2018", award: "Desa Binaan Terbaik", desc: "Peringkat 1 Konservasi" },
            { year: "2023", award: "ADWI 2023", desc: "Kategori Digital & Kreatif" },
          ].map((item, i) => (
            <div key={i} className="text-center space-y-3 p-6 rounded-3xl bg-gradient-to-br from-[#e7c277]/10 to-[#102440]/5 border border-[#e7c277]/30">
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-[#e7c277] text-[#102440] font-bold text-lg mx-auto">
                {item.year}
              </div>
              <h4 className="font-bold text-lg">{item.award}</h4>
              <p className="text-sm text-slate-600">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* PUBLIKASI TERBARU */}
      <section className="bg-slate-50 py-20">
        <div className="max-w-6xl mx-auto px-6 space-y-8">
          <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
            <div>
              <h2 className="text-3xl font-bold">Publikasi Terbaru</h2>
              <p className="text-sm text-slate-600">
                Cerita, berita, dan dokumentasi kegiatan desa terbaru
              </p>
            </div>
            <Link href="/bic/artikel" className="text-[#e7c277] font-medium hover:underline">
              Semua artikel →
            </Link>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {articles.map((a: any) => (
              <Link key={a.slug} href={`/bic/artikel/${a.slug}`}>
                <div className="group rounded-3xl overflow-hidden shadow-sm hover:shadow-xl transition bg-white">
                  <img
                    src={assetUrl(a.cover)}
                    alt={a.title}
                    className="h-48 w-full object-cover group-hover:scale-105 transition duration-300"
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
        </div>
      </section>

      {/* CTA FINAL */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[#102440] via-[#1b3b6f] to-[#102440] text-white">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 right-0 h-96 w-96 rounded-full bg-white/20 blur-3xl" />
          <div className="absolute bottom-0 left-0 h-96 w-96 rounded-full bg-[#e7c277]/20 blur-3xl" />
        </div>

        <div className="relative max-w-6xl mx-auto px-6 py-20 text-center space-y-8">
          <h2 className="text-3xl md:text-4xl font-bold">Mulai Jelajahi Desa Bantaragung</h2>
          <p className="text-lg opacity-90 max-w-2xl mx-auto">
            Temukan pengalaman lokal, peta digital, hingga potensi branding desa
            yang menampilkan UMKM serta homestay unggulan
          </p>

          <div className="flex flex-wrap justify-center gap-4">
            <Link href="/bmc" className="px-6 py-3 bg-white text-[#102440] rounded-full font-semibold shadow-lg hover:scale-105 transition">
              Peta Digital
            </Link>
            <Link href="/bdb" className="px-6 py-3 bg-white text-[#102440] rounded-full font-semibold shadow-lg hover:scale-105 transition">
              Branding Desa
            </Link>
            <Link href="/kontak" className="px-6 py-3 border-2 border-white/60 rounded-full font-semibold hover:bg-white/10 transition">
              Hubungi Kami
            </Link>
          </div>
        </div>
      </section>

    </main>
  );
}
