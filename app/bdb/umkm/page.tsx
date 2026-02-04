import Link from "next/link";
import { getAllUMKM } from "@/lib/content";
import { assetUrl } from "@/lib/asset";

export default function UMKMList() {
  const items = getAllUMKM();

  return (
    <main className="max-w-6xl mx-auto px-6 py-16 space-y-12">

      <section className="rounded-3xl bg-gradient-to-br from-emerald-600 to-teal-500 text-white p-10 md:p-12 space-y-4 shadow-lg">
        <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-1 text-xs uppercase tracking-widest">
          UMKM Lokal
        </div>
        <h1 className="text-3xl md:text-4xl font-bold">UMKM Desa Bantaragung</h1>
        <p className="text-white/90 max-w-2xl">
          Produk unggulan hasil karya masyarakat Desa Bantaragung.
        </p>
      </section>

      <section className="grid md:grid-cols-3 gap-8">
        {items.map((u: any) => (
          <Link key={u.slug} href={`/bdb/umkm/${u.slug}`}>
            <div className="group bg-white rounded-3xl overflow-hidden shadow-sm hover:shadow-xl transition border border-emerald-100/70">
              <div className="relative">
                <img
                  src={assetUrl(u.cover)}
                  alt={u.name}
                  className="h-48 w-full object-cover group-hover:scale-105 transition duration-300"
                />
              </div>

              <div className="p-5 space-y-2">
                <h3 className="font-semibold text-lg">{u.name}</h3>
                <p className="text-sm text-gray-600 line-clamp-2">{u.excerpt}</p>

                <span className="inline-flex items-center gap-1 text-emerald-700 text-sm font-medium">
                  Lihat produk
                  <span aria-hidden>→</span>
                </span>
              </div>
            </div>
          </Link>
        ))}
      </section>

    </main>
  );
}
