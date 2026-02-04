import Link from "next/link";
import { getAllHomestay } from "@/lib/content";
import { assetUrl } from "@/lib/asset";

export default function HomestayList() {
  const items = getAllHomestay();

  return (
    <main className="max-w-6xl mx-auto px-6 py-16 space-y-10">

      <section className="space-y-2">
        <h1 className="text-3xl md:text-4xl font-bold">Homestay Desa Bantaragung</h1>
        <p className="text-gray-600">
          Penginapan warga untuk pengalaman live-in desa wisata.
        </p>
      </section>

      <section className="grid md:grid-cols-3 gap-8">
        {items.map((h: any) => (
          <Link key={h.slug} href={`/bdb/homestay/${h.slug}`}>
            <div className="bg-white rounded-2xl overflow-hidden shadow hover:shadow-xl transition">
              <img
                src={assetUrl(h.cover)}
                alt={h.name}
                className="h-48 w-full object-cover"
              />

              <div className="p-5 space-y-2">
                <h3 className="font-semibold">{h.name}</h3>
                <p className="text-sm text-gray-600">{h.excerpt}</p>

                <span className="inline-block text-green-700 text-sm font-medium">
                  Lihat homestay →
                </span>
              </div>
            </div>
          </Link>
        ))}
      </section>

    </main>
  );
}