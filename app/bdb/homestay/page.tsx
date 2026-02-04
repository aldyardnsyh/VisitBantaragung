import Link from "next/link";
import { getAllHomestay } from "@/lib/content";
import { assetUrl } from "@/lib/asset";

export default function HomestayList() {
  const items = getAllHomestay();

  return (
    <main className="max-w-6xl mx-auto px-6 py-16 space-y-12">

      <section className="rounded-3xl bg-gradient-to-br from-[#102440] to-[#1b3b6f] text-white p-10 md:p-12 space-y-4 shadow-lg">
        <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-1 text-xs uppercase tracking-widest">
          Homestay
        </div>
        <h1 className="text-3xl md:text-4xl font-bold">Homestay Desa Bantaragung</h1>
        <p className="text-white/90 max-w-2xl">
          Penginapan warga untuk pengalaman live-in desa wisata.
        </p>
      </section>

      <section className="grid md:grid-cols-3 gap-8">
        {items.map((h: any) => (
          <Link key={h.slug} href={`/bdb/homestay/${h.slug}`}>
            <div className="group bg-white rounded-3xl overflow-hidden shadow-sm hover:shadow-xl transition border border-[#e7c277]/40">
              <div className="relative">
                <img
                  src={assetUrl(h.cover)}
                  alt={h.name}
                  className="h-48 w-full object-cover group-hover:scale-105 transition duration-300"
                />
              </div>

              <div className="p-5 space-y-2">
                <h3 className="font-semibold text-lg">{h.name}</h3>
                <p className="text-sm text-gray-600 line-clamp-2">{h.excerpt}</p>

                <span className="inline-flex items-center gap-1 text-[#e7c277] text-sm font-medium">
                  Lihat homestay
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
