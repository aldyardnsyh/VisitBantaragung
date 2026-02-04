import Link from "next/link";
import { getAllUMKM } from "@/lib/content";
import { assetUrl } from "@/lib/asset";

export default function UMKMList() {
  const items = getAllUMKM();

  return (
    <main className="max-w-6xl mx-auto px-6 py-16 space-y-10">

      <section className="space-y-2">
        <h1 className="text-3xl md:text-4xl font-bold">UMKM Desa Bantaragung</h1>
        <p className="text-gray-600">
          Produk unggulan hasil karya masyarakat Desa Bantaragung.
        </p>
      </section>

      <section className="grid md:grid-cols-3 gap-8">
        {items.map((u: any) => (
          <Link key={u.slug} href={`/bdb/umkm/${u.slug}`}>
            <div className="bg-white rounded-2xl overflow-hidden shadow hover:shadow-xl transition">
              <img
                src={assetUrl(u.cover)}
                alt={u.name}
                className="h-48 w-full object-cover"
              />

              <div className="p-5 space-y-2">
                <h3 className="font-semibold">{u.name}</h3>
                <p className="text-sm text-gray-600">{u.excerpt}</p>

                <span className="inline-block text-green-700 text-sm font-medium">
                  Lihat produk →
                </span>
              </div>
            </div>
          </Link>
        ))}
      </section>

    </main>
  );
}