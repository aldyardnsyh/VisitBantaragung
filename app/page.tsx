import Link from "next/link";
import { assetUrl } from "@/lib/asset";
import VisitorCounter from "@/app/components/ui/VisitorCounter";
import SectionHeading from "@/app/components/ui/SectionHeading";
import ImageWithSkeleton from "@/app/components/ui/ImageWithSkeleton";
import Reveal from "@/app/components/ui/Reveal";
import {
  getAllWisata,
  getAllHerbal,
  getRecentArticles,
  getSiteSettings,
  getSeoSettings,
  getMapsConfig,
} from "@/lib/content";
import type { Wisata, Herbal, Article } from "@/lib/content";

const prestasiCards = [
  { year: "2016", award: "Wana Lestari", desc: "Penghargaan pengelolaan hutan lestari" },
  { year: "2017", award: "Anugerah Pesona Indonesia", desc: "Surga Tersembunyi Terpopuler" },
  { year: "2018", award: "Desa Binaan Konservasi", desc: "Peringkat terbaik program konservasi" },
  { year: "2023", award: "ADWI 2023", desc: "Kategori Digital dan Kreatif" },
];

export default function Home() {
  const site = getSiteSettings();
  const seo = getSeoSettings();
  const wisata: Wisata[] = getAllWisata().slice(0, 3);
  const herbal: Herbal[] = getAllHerbal().slice(0, 3);
  const articles: Article[] = getRecentArticles(3);
  const petaImage = getMapsConfig().categories.flatMap((c) => c.maps).map((m) => m.image)[0] ?? "";

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://visitbantaragung.com";
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        "@id": `${baseUrl}/#website`,
        url: baseUrl,
        name: "Desa Wisata Bantaragung",
        description: seo.defaultDescription,
        inLanguage: "id-ID",
        publisher: { "@id": `${baseUrl}/#organization` },
      },
      {
        "@type": "Organization",
        "@id": `${baseUrl}/#organization`,
        name: "Pokdarwis Desa Wisata Bantaragung",
        alternateName: "Kelompok Sadar Wisata Bantaragung",
        url: baseUrl,
        logo: { "@type": "ImageObject", url: assetUrl("_brand/logo/LogoVisitBantaragung.png") },
        sameAs: [
          "https://instagram.com/visitbantaragung",
          "https://instagram.com/kampungherbalmertasela",
          "https://instagram.com/desawisata_bantaragung",
        ],
        contactPoint: {
          "@type": "ContactPoint",
          telephone: "+6281324427327",
          contactType: "customer service",
          areaServed: "ID",
          availableLanguage: "Indonesian",
        },
      },
      {
        "@type": "TouristDestination",
        name: "Desa Wisata Bantaragung",
        alternateName: ["Visit Bantaragung", "Bantaragung Village"],
        description: "Desa wisata di kaki Gunung Ciremai, Kecamatan Sindangwangi, Kabupaten Majalengka, Jawa Barat. Menawarkan wisata alam, edukasi, budaya, kampung herbal, dan kuliner tradisional. Peraih penghargaan Surga Tersembunyi Terpopuler API 2017 dan 75 Besar ADWI 2023.",
        url: baseUrl,
        address: {
          "@type": "PostalAddress",
          streetAddress: "Desa Bantaragung",
          addressLocality: "Sindangwangi",
          addressRegion: "Majalengka, Jawa Barat",
          postalCode: "45461",
          addressCountry: "ID",
        },
        touristType: ["Wisata Alam", "Wisata Edukasi", "Wisata Budaya", "Agrowisata"],
      },
    ],
  };

  return (
    <main>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      {/* HERO */}
      <section className="relative min-h-[75vh] flex items-center overflow-hidden">
        <div className="absolute inset-0">
          <img
            src={assetUrl(seo.ogImage)}
            alt="Panorama Desa Wisata Bantaragung"
            className="w-full h-full object-cover animate-slow-zoom"
            fetchPriority="high"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-forest-950/85 via-forest-900/60 to-transparent" />
        </div>

        <div className="relative max-w-7xl mx-auto px-6 py-24 text-white animate-fade-up">
          <div className="max-w-3xl space-y-8">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/15 text-white backdrop-blur px-4 py-1.5 text-xs uppercase tracking-widest">
              Desa Wisata • Kaki Gunung Ciremai
            </span>
            <h1
              className="font-display font-bold text-white leading-tight"
              style={{ fontSize: "clamp(2.5rem, 6vw, 4.5rem)" }}
            >
              Selamat Datang di Desa Wisata Bantaragung
            </h1>
            <p className="text-lg md:text-xl text-white/90 max-w-2xl">
              {site.description}
            </p>
            <div className="flex flex-wrap gap-4">
              <Link
                href="/wisata"
                className="inline-flex items-center gap-2 bg-clay-500 hover:bg-clay-600 text-white px-7 py-3.5 rounded-full font-semibold transition-all hover:scale-[1.02] active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clay-400 focus-visible:ring-offset-2"
              >
                Jelajahi Wisata <span aria-hidden>→</span>
              </Link>
              <Link
                href="/bic/artikel"
                className="inline-flex items-center gap-2 border-2 border-white/70 text-white px-7 py-3.5 rounded-full font-semibold hover:bg-white/10 backdrop-blur-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2"
              >
                Berita Terbaru
              </Link>
            </div>
            <VisitorCounter />
          </div>
        </div>
      </section>

      {/* TENTANG */}
      <section className="py-20 md:py-24">
        <div className="max-w-7xl mx-auto px-6">
          <SectionHeading
            eyebrow="Tentang Desa"
            title="Desa Wisata di Kaki Gunung Ciremai"
            subtitle="Desa Wisata Bantaragung dikembangkan untuk memajukan perekonomian dan meningkatkan kualitas SDM masyarakat yang sadar wisata, dengan seluruh warga terlibat dalam pengelolaan alam serta produksi ekonomi kreatif."
          />
          <div className="grid md:grid-cols-3 gap-6">
            <Reveal delay={0}>
            <div className="rounded-2xl bg-white/70 border border-forest-200/60 shadow-sm hover:shadow-lg hover:-translate-y-1 transition p-8 text-center h-full">
              <div className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-forest-100 text-forest-700 mb-4">
                <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a2 2 0 01-2.828 0l-4.243-4.243a8 8 0 1111.314 0zM15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <h3 className="font-bold text-lg text-forest-800 mb-2">Lokasi Strategis</h3>
              <p className="text-sm text-slate-600">
                Terletak di kaki Gunung Ciremai, {site.location.village}, {site.location.province}. Akses jalan baik, kontur tanah subur, dan alam yang asri.
              </p>
            </div>
            </Reveal>
            <Reveal delay={100}>
            <div className="rounded-2xl bg-white/70 border border-forest-200/60 shadow-sm hover:shadow-lg hover:-translate-y-1 transition p-8 text-center h-full">
              <div className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-forest-100 text-forest-700 mb-4">
                <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 21a9 9 0 100-18 9 9 0 000 18zM12 8v4m0 4h.01" />
                </svg>
              </div>
              <h3 className="font-bold text-lg text-forest-800 mb-2">Kampung Herbal</h3>
              <p className="text-sm text-slate-600">
                Ragam tanaman obat tradisional dibudidayakan warga sebagai edukasi kesehatan alami dan produk unggulan desa.
              </p>
            </div>
            </Reveal>
            <Reveal delay={200}>
            <div className="rounded-2xl bg-white/70 border border-forest-200/60 shadow-sm hover:shadow-lg hover:-translate-y-1 transition p-8 text-center h-full">
              <div className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-forest-100 text-forest-700 mb-4">
                <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                </svg>
              </div>
              <h3 className="font-bold text-lg text-forest-800 mb-2">Berprestasi</h3>
              <p className="text-sm text-slate-600">
                Peraih Anugerah Pesona Indonesia 2017, Desa Binaan Konservasi 2018, hingga 75 Besar ADWI 2023.
              </p>
            </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* BERITA TERBARU */}
      <section className="py-20 md:py-24">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-10">
            <SectionHeading
              align="left"
              eyebrow="Berita"
              title="Berita Terbaru"
              subtitle="Cerita dan dokumentasi kegiatan desa, wisata, dan pemberdayaan masyarakat."
              className="mb-0"
            />
            <Link
              href="/bic/artikel"
              className="inline-flex items-center gap-1.5 text-forest-600 hover:text-clay-500 hover:font-semibold font-medium whitespace-nowrap transition-colors"
            >
              Semua Berita <span aria-hidden>→</span>
            </Link>
          </div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 items-stretch">
            {articles.map((a, i) => (
              <Reveal key={a.slug} delay={(i % 3) * 100} className="h-full">
              <Link href={`/bic/artikel/${a.slug}`} className="group block h-full">
                <article className="h-full flex flex-col rounded-2xl overflow-hidden bg-white/80 border border-forest-200/60 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300">
                  <div className="relative">
                    <ImageWithSkeleton
                      src={assetUrl(a.cover)}
                      alt={a.title}
                      className="aspect-[16/10] overflow-hidden group-hover:scale-105 transition-transform duration-300"
                    />
                    <span
                      className={`absolute top-3 left-3 rounded-full px-3 py-1 text-xs font-semibold ${
                        a.origin === "berita"
                          ? "bg-forest-100 text-forest-700"
                          : "bg-clay-100 text-clay-500"
                      }`}
                    >
                      {a.origin === "berita" ? "Berita Desa" : "Kegiatan KKN"}
                    </span>
                  </div>
                  <div className="flex flex-1 flex-col p-5 gap-2">
                    <p className="text-sm text-slate-500">
                      {new Date(a.date).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}
                      <span aria-hidden> | </span>
                      {a.author || "Admin"}
                    </p>
                    <h3 className="font-semibold text-forest-800 line-clamp-2">{a.title}</h3>
                    <p className="text-sm text-slate-600 line-clamp-2 flex-1">{a.excerpt}</p>
                    <span className="mt-auto pt-2 inline-flex items-center gap-1 text-forest-600 text-sm font-medium transition-colors duration-200 group-hover:text-clay-600">
                      Selengkapnya <span aria-hidden className="transition-transform group-hover:translate-x-0.5">→</span>
                    </span>
                  </div>
                </article>
              </Link>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* DESTINASI UNGGULAN */}
      <section className="py-20 md:py-24 bg-white/50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-10">
            <SectionHeading
              align="left"
              eyebrow="Destinasi"
              title="Destinasi Unggulan"
              subtitle="Panorama alam dan pengalaman edukatif pilihan dari lima objek wisata utama Bantaragung."
              className="mb-0"
            />
            <Link
              href="/wisata"
              className="inline-flex items-center gap-1.5 text-forest-600 hover:text-clay-500 hover:font-semibold font-medium whitespace-nowrap transition-colors"
            >
              Selengkapnya <span aria-hidden>→</span>
            </Link>
          </div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 items-stretch">
            {wisata.map((w, i) => (
              <Reveal key={w.slug} delay={(i % 3) * 100} className="h-full">
              <Link href={`/wisata/${w.slug}`} className="group block h-full">
                <div className="flex flex-col h-full rounded-2xl overflow-hidden bg-white/80 border border-forest-200/60 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300">
                  <ImageWithSkeleton
                    src={assetUrl(w.cover)}
                    alt={w.title}
                    className="aspect-[16/10] overflow-hidden group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="flex flex-1 flex-col p-5 gap-2">
                    <h3 className="font-semibold text-forest-800 line-clamp-2">{w.title}</h3>
                    <p className="text-sm text-slate-600 line-clamp-2 flex-1">{w.excerpt}</p>
                    <span className="mt-auto pt-2 inline-flex items-center gap-1 text-forest-600 text-sm font-medium transition-colors duration-200 group-hover:text-clay-600">
                      Selengkapnya <span aria-hidden className="transition-transform group-hover:translate-x-0.5">→</span>
                    </span>
                  </div>
                </div>
              </Link>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* KAMPUNG HERBAL */}
      <section className="py-20 md:py-24 bg-forest-50/50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-10">
            <SectionHeading
              align="left"
              eyebrow="Kampung Herbal"
              title="Taman Tanaman Herbal"
              subtitle="Ribuan tanaman obat dibudidayakan warga di Kampung Herbal Mertasela sebagai edukasi dan ekonomi kreatif."
              className="mb-0"
            />
            <Link
              href="/b2h"
              className="inline-flex items-center gap-1.5 text-forest-600 hover:text-clay-500 hover:font-semibold font-medium whitespace-nowrap transition-colors"
            >
              Jelajahi B2H <span aria-hidden>→</span>
            </Link>
          </div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 items-stretch">
            {herbal.map((h, i) => (
              <Reveal key={h.slug} delay={(i % 3) * 100} className="h-full">
              <Link href={`/b2h/katalog/${h.slug}`} className="group block h-full">
                <div className="flex flex-col h-full rounded-2xl overflow-hidden bg-white/80 border border-forest-200/60 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300">
                  <ImageWithSkeleton
                    src={assetUrl(h.cover)}
                    alt={h.name}
                    className="aspect-[16/10] overflow-hidden group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="flex flex-1 flex-col p-5 gap-2">
                    <h3 className="font-semibold text-forest-800 line-clamp-2">{h.name}</h3>
                    <p className="text-xs italic text-forest-500">{h.latin}</p>
                    <p className="text-sm text-slate-600 line-clamp-2 flex-1">{h.excerpt}</p>
                    <span className="mt-auto pt-2 inline-flex items-center gap-1 text-forest-600 text-sm font-medium transition-colors duration-200 group-hover:text-clay-600">
                      Selengkapnya <span aria-hidden className="transition-transform group-hover:translate-x-0.5">→</span>
                    </span>
                  </div>
                </div>
              </Link>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* PRESTASI */}
      <section className="py-20 md:py-24 bg-forest-950">
        <div className="max-w-7xl mx-auto px-6">
          <SectionHeading
            tone="dark"
            eyebrow="Prestasi"
            title="Penghargaan Desa"
            subtitle="Pencapaian yang memperkuat identitas Bantaragung sebagai desa wisata inovatif dan berkelanjutan."
          />
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            {prestasiCards.map((p, i) => (
              <Reveal key={p.year} delay={(i % 4) * 100} className="h-full">
                <div className="rounded-2xl bg-white/5 border border-white/10 p-8 text-center h-full">
                  <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-gold-400 text-forest-950 font-bold text-xl mx-auto mb-4">
                    {p.year}
                  </div>
                  <h3 className="font-bold text-lg text-white mb-1">{p.award}</h3>
                  <p className="text-sm text-white/70">{p.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* PETA DIGITAL */}
      <section className="py-20 md:py-24">
        <div className="max-w-7xl mx-auto px-6">
          <div className="rounded-3xl bg-white/70 border border-forest-200/60 shadow-sm p-10 md:p-14 flex flex-col lg:flex-row items-center gap-10">
            <div className="flex-1 space-y-5">
              <SectionHeading
                align="left"
                eyebrow="Peta Digital"
                title="Jelajahi Bantaragung dari Peta"
                subtitle="Temukan setiap destinasi, titik kampung herbal, hingga fasilitas umum melalui Peta Digital Interaktif (BMC) yang dibuat warga untuk wisatawan."
                className="mb-0"
              />
              <Link
                href="/bmc"
                className="inline-flex items-center gap-2 bg-clay-500 hover:bg-clay-600 text-white px-7 py-3.5 rounded-full font-semibold transition-all hover:scale-[1.02] active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clay-400 focus-visible:ring-offset-2"
              >
                Buka Peta Digital <span aria-hidden>→</span>
              </Link>
            </div>
            <div className="flex-1 w-full">
              <ImageWithSkeleton
                src={assetUrl(petaImage)}
                alt="Peta Digital Bantaragung"
                aspectRatio="video"
                className="rounded-2xl border border-forest-200/60"
              />
            </div>
          </div>
        </div>
      </section>

      {/* CTA FINAL */}
      <section className="bg-forest-950 text-white">
        <div className="max-w-7xl mx-auto px-6 py-20 md:py-24 text-center space-y-8">
          <h2 className="font-display font-bold text-white text-3xl md:text-4xl">
            Mulai Jelajahi Desa Bantaragung
          </h2>
          <p className="text-lg text-white/80 max-w-2xl mx-auto">
            Temukan pengalaman wisata, peta digital, hingga UMKM dan homestay unggulan warga dalam satu platform untuk seluruh potensi desa.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link
              href="/bmc"
              className="inline-flex items-center bg-clay-500 hover:bg-clay-600 text-white px-7 py-3.5 rounded-full font-semibold transition-all hover:scale-[1.02] active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clay-400 focus-visible:ring-offset-2"
            >
              Peta Digital
            </Link>
            <Link
              href="/bdb"
              className="inline-flex items-center border-2 border-white/70 text-white px-7 py-3.5 rounded-full font-semibold hover:bg-white/10 transition-colors"
            >
              UMKM & Homestay
            </Link>
            <Link
              href="/kontak"
              className="inline-flex items-center border-2 border-white/70 text-white px-7 py-3.5 rounded-full font-semibold hover:bg-white/10 transition-colors"
            >
              Hubungi Kami
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
