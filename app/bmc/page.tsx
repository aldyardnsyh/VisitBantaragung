import Link from "next/link";
import { getAllLocations } from "@/lib/content";
import { assetUrl } from "@/lib/asset";

export default function BMCPage() {
  const locations = getAllLocations();

  return (
    <main className="max-w-6xl mx-auto px-6 py-16 space-y-12">

      {/* Header */}
      <section className="rounded-3xl bg-gradient-to-br from-[#102440] to-[#1b3b6f] text-white p-10 md:p-12 space-y-4 shadow-lg">
        <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-1 text-xs uppercase tracking-widest">
          Peta Digital
        </div>
        <h1 className="text-3xl md:text-4xl font-bold">
          Bantaragung Map Center
        </h1>
        <p className="text-white/90 max-w-2xl">
          Peta digital lokasi wisata, kampung herbal, UMKM, dan titik edukasi Desa Bantaragung.
        </p>
      </section>

      {/* Map + List */}
      <section className="grid md:grid-cols-2 gap-8">

        {/* MAP */}
        <div className="rounded-3xl overflow-hidden shadow-lg border border-[#e7c277]/40 h-[450px] bg-white">
          <iframe
            className="w-full h-full"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            src="https://www.google.com/maps?q=-6.0,108.0&z=14&output=embed"
          />
        </div>

        {/* LIST */}
        <div className="space-y-4 max-h-[450px] overflow-y-auto pr-2">

          {locations.map((loc: any) => (
            <Link key={loc.slug} href={`/bmc/lokasi/${loc.slug}`}>
              <div className="group flex gap-4 bg-white rounded-2xl border border-[#e7c277]/40 shadow-sm hover:shadow-lg transition p-4">

                <img
                  src={assetUrl(loc.cover)}
                  alt={loc.name}
                  className="w-24 h-24 object-cover rounded-xl group-hover:scale-105 transition duration-300"
                />

                <div className="space-y-1">
                  <h4 className="font-semibold">{loc.name}</h4>
                  <small className="inline-flex items-center gap-1 rounded-full bg-[#102440]/10 px-2 py-0.5 text-xs text-[#e7c277]">
                    {loc.category}
                  </small>
                  <p className="text-sm text-gray-600 line-clamp-2">{loc.excerpt}</p>
                </div>

              </div>
            </Link>
          ))}

        </div>

      </section>

    </main>
  );
}
