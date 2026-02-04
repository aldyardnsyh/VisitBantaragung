import Link from "next/link";

export default function B2HLanding() {
  return (
    <main className="max-w-6xl mx-auto px-6 py-16 space-y-16">

      {/* Header */}
      <section className="space-y-4">
        <h1 className="text-3xl md:text-4xl font-bold">
          Bantaragung Herbal Hub (B2H)
        </h1>
        <p className="text-gray-600 max-w-2xl">
          Kampung Herbal Desa Bantaragung merupakan pusat edukasi tanaman obat
          keluarga yang mengintegrasikan wisata, kesehatan alami, dan pemberdayaan masyarakat.
        </p>

        <Link
          href="/b2h/katalog"
          className="inline-block bg-green-700 text-white px-6 py-3 rounded-xl"
        >
          Lihat Katalog Tanaman Herbal
        </Link>
      </section>

      {/* Features */}
      <section className="grid md:grid-cols-3 gap-8">
        <div className="bg-white rounded-2xl shadow p-6 space-y-2">
          <h3 className="font-semibold">🌱 Katalog Tanaman</h3>
          <p className="text-sm text-gray-600">
            Data lengkap tanaman herbal beserta manfaat dan cara pemanfaatannya.
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow p-6 space-y-2">
          <h3 className="font-semibold">📚 Edukasi Herbal</h3>
          <p className="text-sm text-gray-600">
            Materi pembelajaran seputar tanaman obat dan kesehatan alami.
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow p-6 space-y-2">
          <h3 className="font-semibold">🗺️ Peta Herbal</h3>
          <p className="text-sm text-gray-600">
            Lokasi penanaman TOGA dan jalur edukasi Kampung Herbal.
          </p>
        </div>
      </section>

    </main>
  );
}
