import Link from "next/link";

export default function B2HLanding() {
  return (
    <main className="max-w-6xl mx-auto px-6 py-16 space-y-16">

      {/* Header */}
      <section className="rounded-3xl bg-white shadow-lg border border-emerald-100/70 p-10 md:p-12 space-y-5">
        <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-4 py-1 text-xs uppercase tracking-widest text-emerald-700">
          Kampung Herbal
        </div>
        <h1 className="text-3xl md:text-4xl font-bold">
          Bantaragung Herbal Hub (B2H)
        </h1>
        <p className="text-slate-600 max-w-2xl">
          Kampung Herbal Desa Bantaragung merupakan pusat edukasi tanaman obat
          keluarga yang mengintegrasikan wisata, kesehatan alami, dan pemberdayaan masyarakat.
        </p>

        <div className="flex flex-wrap gap-4">
          <Link
            href="/b2h/katalog"
            className="inline-flex items-center gap-2 bg-emerald-600 text-white px-6 py-3 rounded-full shadow hover:bg-emerald-700 transition"
          >
            Lihat Katalog Tanaman Herbal
            <span aria-hidden>→</span>
          </Link>
          <Link
            href="/bmc"
            className="inline-flex items-center gap-2 border border-emerald-200 px-6 py-3 rounded-full text-emerald-700 hover:bg-emerald-50 transition"
          >
            Peta Kampung Herbal
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="grid md:grid-cols-3 gap-8">
        {[
          {
            title: "Katalog Tanaman",
            description:
              "Data lengkap tanaman herbal beserta manfaat dan cara pemanfaatannya.",
            icon: "🌱",
          },
          {
            title: "Edukasi Herbal",
            description:
              "Materi pembelajaran seputar tanaman obat dan kesehatan alami.",
            icon: "📚",
          },
          {
            title: "Peta Herbal",
            description:
              "Lokasi penanaman TOGA dan jalur edukasi Kampung Herbal.",
            icon: "🗺️",
          },
        ].map((feature) => (
          <div
            key={feature.title}
            className="group bg-white rounded-3xl border border-emerald-100/70 shadow-sm hover:shadow-xl transition p-6 space-y-3"
          >
            <div className="flex items-center justify-center h-12 w-12 rounded-2xl bg-emerald-50 text-xl">
              {feature.icon}
            </div>
            <h3 className="font-semibold text-lg">{feature.title}</h3>
            <p className="text-sm text-slate-600">{feature.description}</p>
            <span className="inline-flex items-center gap-1 text-emerald-700 text-sm font-medium opacity-0 group-hover:opacity-100 transition">
              Pelajari lebih lanjut
              <span aria-hidden>→</span>
            </span>
          </div>
        ))}
      </section>

    </main>
  );
}
