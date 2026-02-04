import Link from "next/link";
import { getAllWisata } from "@/lib/content";
import { assetUrl } from "@/lib/asset";

export default function WisataPage() {
  const items = getAllWisata();

  return (
    <main className="max-w-6xl mx-auto px-6 py-16 space-y-10">

      {/* Header */}
      <section className="space-y-2">
        <h1 className="text-3xl md:text-4xl font-bold">Jelajah Wisata</h1>
        <p className="text-gray-600">
          Temukan destinasi wisata alam dan edukasi terbaik di Desa Bantaragung.
        </p>
      </section>

      {/* Grid */}
      <section className="grid md:grid-cols-3 gap-8">
        {items.map((w: any) => (
          <Link key={w.slug} href={`/wisata/${w.slug}`}>
            <div className="bg-white rounded-2xl overflow-hidden shadow hover:shadow-xl transition">
              <img
                src={assetUrl(w.cover)}
                alt={w.title}
                className="h-56 w-full object-cover"
              />

              <div className="p-5 space-y-2">
                <h3 className="font-semibold text-lg">{w.title}</h3>
                <p className="text-sm text-gray-600">{w.excerpt}</p>

                <span className="inline-block text-green-700 text-sm font-medium mt-2">
                  Lihat detail →
                </span>
              </div>
            </div>
          </Link>
        ))}
      </section>

    </main>
  );
}
