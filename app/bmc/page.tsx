import Link from "next/link";
import { getAllLocations } from "@/lib/content";
import { assetUrl } from "@/lib/asset";

export default function BMCPage() {
  const locations = getAllLocations();

  return (
    <main className="max-w-6xl mx-auto px-6 py-16 space-y-10">

      {/* Header */}
      <section className="space-y-2">
        <h1 className="text-3xl md:text-4xl font-bold">
          Bantaragung Map Center
        </h1>
        <p className="text-gray-600">
          Peta digital lokasi wisata, kampung herbal, UMKM, dan titik edukasi Desa Bantaragung.
        </p>
      </section>

      {/* Map + List */}
      <section className="grid md:grid-cols-2 gap-8">

        {/* MAP */}
        <div className="rounded-2xl overflow-hidden shadow h-[450px]">
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
              <div className="flex gap-4 bg-white rounded-xl shadow hover:shadow-lg transition p-4">

                <img
                  src={assetUrl(loc.cover)}
                  alt={loc.name}
                  className="w-24 h-24 object-cover rounded-lg"
                />

                <div>
                  <h4 className="font-semibold">{loc.name}</h4>
                  <small className="text-gray-500">{loc.category}</small>
                  <p className="text-sm text-gray-600">{loc.excerpt}</p>
                </div>

              </div>
            </Link>
          ))}

        </div>

      </section>

    </main>
  );
}
