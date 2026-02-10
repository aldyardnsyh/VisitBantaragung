import Link from "next/link";
import { getAllHomestay, getAllUMKM } from "@/lib/content";
import { assetUrl } from "@/lib/asset";
import ImageWithSkeleton from "@/app/components/ui/ImageWithSkeleton";
import BackgroundPattern from "@/app/components/ui/BackgroundPattern";
import Breadcrumb from "@/app/components/ui/Breadcrumb";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Branding Desa (BDB)",
  description: "Bantaragung Digital Branding – Katalog digital UMKM lokal, homestay, dan potensi ekonomi kreatif Desa Bantaragung, Majalengka.",
};

export default function BDBLanding() {
  const homestays = getAllHomestay().slice(0, 3);
  const umkms = getAllUMKM().slice(0, 3);

  return (
    <main className="max-w-6xl mx-auto px-6 py-16 space-y-12">
      <Breadcrumb items={[{ label: "Branding Desa" }]} />
      <section className="relative rounded-3xl bg-gradient-to-br from-[#102440] to-[#1b3b6f] text-white p-10 md:p-12 space-y-4 shadow-lg">
        <BackgroundPattern variant="geometric" opacity={0.04} className="text-white" />
        <div className="inline-flex items-center gap-2 rounded-full badge-dark px-4 py-1 text-xs uppercase tracking-widest">
          Branding Desa
        </div>
        <h1 className="text-3xl md:text-4xl font-bold">
          Bantaragung Digital Branding (BDB)
        </h1>
        <p className="text-white/80 max-w-2xl">
          Katalog digital potensi Desa Bantaragung yang mencakup UMKM lokal,
          homestay, serta paket wisata edukasi.
        </p>
      </section>

      {/* UMKM Section */}
      <section className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-[#102440]">UMKM Lokal</h2>
            <p className="text-sm text-slate-600 mt-1">Produk unggulan masyarakat Desa Bantaragung</p>
          </div>
          <Link
            href="/bdb/umkm"
            className="inline-flex items-center gap-2 text-[#e7c277] hover:text-[#102440] font-medium transition"
          >
            Lihat Seluruhnya
            <span aria-hidden>→</span>
          </Link>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {umkms.map((item: any) => (
            <Link key={item.slug} href={`/bdb/umkm/${item.slug}`}>
              <article className="group bg-white rounded-3xl overflow-hidden shadow-sm hover:shadow-xl transition border border-[#e7c277]/40">
                <div className="relative">
                  <ImageWithSkeleton
                    src={assetUrl(item.cover)}
                    alt={item.name}
                    className="h-48 w-full object-cover group-hover:scale-105 transition duration-300"
                  />
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
        </div>
      </section>

      {/* Homestay Section */}
      <section className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-[#102440]">Homestay</h2>
            <p className="text-sm text-slate-600 mt-1">Penginapan warga untuk pengalaman live-in desa wisata</p>
          </div>
          <Link
            href="/bdb/homestay"
            className="inline-flex items-center gap-2 text-[#e7c277] hover:text-[#102440] font-medium transition"
          >
            Lihat Seluruhnya
            <span aria-hidden>→</span>
          </Link>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {homestays.map((item: any) => (
            <Link key={item.slug} href={`/bdb/homestay/${item.slug}`}>
              <article className="group bg-white rounded-3xl overflow-hidden shadow-sm hover:shadow-xl transition border border-[#e7c277]/40">
                <div className="relative">
                  <ImageWithSkeleton
                    src={assetUrl(item.cover)}
                    alt={item.name}
                    className="h-48 w-full object-cover group-hover:scale-105 transition duration-300"
                  />
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
        </div>
      </section>

    </main>
  );
}

