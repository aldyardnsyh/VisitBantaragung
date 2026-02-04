import Link from "next/link";

export default function BDBLanding() {
  return (
    <main className="max-w-6xl mx-auto px-6 py-16 space-y-16">

      {/* Header */}
      <section className="rounded-3xl bg-white border border-emerald-100/70 shadow-lg p-10 md:p-12 space-y-4">
        <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-4 py-1 text-xs uppercase tracking-widest text-emerald-700">
          Branding Desa
        </div>
        <h1 className="text-3xl md:text-4xl font-bold">
          Bantaragung Digital Branding (BDB)
        </h1>
        <p className="text-slate-600 max-w-2xl">
          Katalog digital potensi Desa Bantaragung yang mencakup UMKM lokal,
          homestay, serta paket wisata edukasi.
        </p>
      </section>

      {/* Features */}
      <section className="grid md:grid-cols-2 gap-8">

        <Link href="/bdb/umkm">
          <div className="group bg-white rounded-3xl border border-emerald-100/70 shadow-sm hover:shadow-xl transition p-8 space-y-3">
            <div className="flex items-center justify-center h-12 w-12 rounded-2xl bg-emerald-50 text-xl">
              🛍️
            </div>
            <h3 className="font-semibold text-lg">UMKM Lokal</h3>
            <p className="text-sm text-slate-600">
              Produk unggulan masyarakat Desa Bantaragung.
            </p>
            <span className="inline-flex items-center gap-1 text-emerald-700 text-sm font-medium opacity-0 group-hover:opacity-100 transition">
              Lihat katalog
              <span aria-hidden>→</span>
            </span>
          </div>
        </Link>

        <Link href="/bdb/homestay">
          <div className="group bg-white rounded-3xl border border-emerald-100/70 shadow-sm hover:shadow-xl transition p-8 space-y-3">
            <div className="flex items-center justify-center h-12 w-12 rounded-2xl bg-emerald-50 text-xl">
              🏡
            </div>
            <h3 className="font-semibold text-lg">Homestay</h3>
            <p className="text-sm text-slate-600">
              Penginapan warga untuk pengalaman live-in desa wisata.
            </p>
            <span className="inline-flex items-center gap-1 text-emerald-700 text-sm font-medium opacity-0 group-hover:opacity-100 transition">
              Lihat homestay
              <span aria-hidden>→</span>
            </span>
          </div>
        </Link>

      </section>

    </main>
  );
}
