import Link from "next/link";
import { getMapsConfig } from "@/lib/content";
import MapGalleryClient from "./MapGalleryClient";
import BackgroundPattern from "@/app/components/ui/BackgroundPattern";

export default function BMCPage() {
  const mapsConfig = getMapsConfig();

  return (
    <main className="max-w-7xl mx-auto px-6 py-16 space-y-12">
      {/* Header */}
      <section className="relative rounded-3xl bg-gradient-to-br from-[#102440] to-[#1b3b6f] text-white p-10 md:p-12 space-y-4 shadow-lg">
        <BackgroundPattern variant="geometric" opacity={0.04} className="text-white" />
        <div className="inline-flex items-center gap-2 rounded-full badge-dark px-4 py-1 text-xs uppercase tracking-widest">
          Peta Digital
        </div>
        <h1 className="text-3xl md:text-4xl font-bold">
          Bantaragung Map Center
        </h1>
        <p className="text-white/80 max-w-3xl">
          Galeri peta digital Desa Bantaragung hasil mapping untuk transparansi informasi wilayah,
          wisata, infrastruktur, dan data spasial lainnya. Semua peta dapat dilihat detail dan diunduh
          untuk keperluan edukasi dan perencanaan.
        </p>

        {/* Stats */}
        <div className="flex flex-wrap gap-6 pt-4">
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center w-10 h-10 rounded-full badge-dark">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
              </svg>
            </div>
            <div>
              <div className="text-2xl font-bold">
                {mapsConfig.categories.reduce((sum, cat) => sum + cat.maps.length, 0)}
              </div>
              <div className="text-xs text-white/60">Total Peta</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center w-10 h-10 rounded-full badge-dark">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
              </svg>
            </div>
            <div>
              <div className="text-2xl font-bold">{mapsConfig.categories.length}</div>
              <div className="text-xs text-white/60">Kategori</div>
            </div>
          </div>
        </div>
      </section>

      {/* Map Gallery */}
      <MapGalleryClient mapsConfig={mapsConfig} />

      {/* Info Section */}
      <section className="bg-slate-50 rounded-3xl p-8 border border-[#e7c277]/20">
        <h2 className="text-xl font-bold mb-4 text-[#102440] flex items-center gap-2">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Informasi Peta
        </h2>
        <div className="space-y-3 text-sm text-slate-600">
          <p>
            <strong>Sumber Data:</strong> Peta-peta ini merupakan hasil mapping dan digitalisasi
            wilayah Desa Bantaragung untuk mendukung transparansi informasi dan perencanaan pembangunan desa.
          </p>
          <p>
            <strong>Lisensi:</strong> Peta-peta ini dapat digunakan untuk keperluan edukasi, penelitian,
            dan perencanaan dengan tetap mencantumkan sumber dari Desa Bantaragung.
          </p>
        </div>
      </section>

    </main>
  );
}

