import Link from "next/link";
import { getAllHerbal } from "@/lib/content";
import { assetUrl } from "@/lib/asset";

export default function HerbalList() {
  const items = getAllHerbal();

  return (
    <main className="max-w-6xl mx-auto px-6 py-16 space-y-10">

      {/* Header */}
      <section className="space-y-2">
        <h1 className="text-3xl md:text-4xl font-bold">
          Katalog Tanaman Herbal
        </h1>
        <p className="text-gray-600">
          Daftar tanaman obat keluarga yang dibudidayakan di Kampung Herbal Bantaragung.
        </p>
      </section>

      {/* Grid */}
      <section className="grid md:grid-cols-3 gap-8">
        {items.map((item: any) => (
          <Link key={item.slug} href={`/b2h/katalog/${item.slug}`}>
            <div className="bg-white rounded-2xl overflow-hidden shadow hover:shadow-xl transition">
              <img
                src={assetUrl(item.cover)}
                alt={item.name}
                className="h-48 w-full object-cover"
              />

              <div className="p-5 space-y-1">
                <h3 className="font-semibold">{item.name}</h3>
                <p className="italic text-sm text-gray-500">{item.latin}</p>
                <p className="text-sm text-gray-600">{item.excerpt}</p>
              </div>
            </div>
          </Link>
        ))}
      </section>

    </main>
  );
}
