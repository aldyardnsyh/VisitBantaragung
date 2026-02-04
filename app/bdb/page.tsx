import Link from "next/link";

export default function BDBLanding() {
  return (
    <main className="max-w-6xl mx-auto px-6 py-16 space-y-16">

      {/* Header */}
      <section className="space-y-4">
        <h1 className="text-3xl md:text-4xl font-bold">
          Bantaragung Digital Branding (BDB)
        </h1>
        <p className="text-gray-600 max-w-2xl">
          Katalog digital potensi Desa Bantaragung yang mencakup UMKM lokal,
          homestay, serta paket wisata edukasi.
        </p>
      </section>

      {/* Features */}
      <section className="grid md:grid-cols-2 gap-8">

        <Link href="/bdb/umkm">
          <div className="bg-white rounded-2xl shadow hover:shadow-xl transition p-8 space-y-2">
            <h3 className="font-semibold text-lg">🛍️ UMKM Lokal</h3>
            <p className="text-sm text-gray-600">
              Produk unggulan masyarakat Desa Bantaragung.
            </p>
          </div>
        </Link>

        <Link href="/bdb/homestay">
          <div className="bg-white rounded-2xl shadow hover:shadow-xl transition p-8 space-y-2">
            <h3 className="font-semibold text-lg">🏡 Homestay</h3>
            <p className="text-sm text-gray-600">
              Penginapan warga untuk pengalaman live-in desa wisata.
            </p>
          </div>
        </Link>

      </section>

    </main>
  );
}
