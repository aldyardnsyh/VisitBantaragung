import { getUMKMBySlug } from "@/lib/content";
import { assetUrl } from "@/lib/asset";

export default async function UMKMDetail({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const data = getUMKMBySlug(slug);

  return (
    <main className="max-w-5xl mx-auto px-6 py-16 space-y-12">

      <section className="space-y-5">
        <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-4 py-1 text-xs uppercase tracking-widest text-emerald-700">
          UMKM Unggulan
        </div>
        <div className="space-y-2">
          <h1 className="text-3xl md:text-4xl font-bold">{data.name}</h1>
          <p className="text-slate-600 max-w-2xl">{data.excerpt}</p>
        </div>
      </section>

      <section className="relative overflow-hidden rounded-3xl shadow-lg border border-emerald-100/70">
        <img
          src={assetUrl(data.cover)}
          alt={data.name}
          className="w-full h-[380px] object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
        <div className="absolute bottom-6 left-6 text-white">
          <p className="text-xs uppercase tracking-widest text-white/80">Produk Lokal</p>
          <p className="text-2xl font-semibold">{data.name}</p>
        </div>
      </section>

      <section className="grid lg:grid-cols-[1.2fr_0.8fr] gap-8">
        <div className="prose max-w-none">
          <h3>Deskripsi</h3>
          <p>{data.description}</p>
        </div>
        <div className="space-y-4">
          <div className="rounded-3xl bg-white border border-emerald-100/70 p-6 shadow-sm space-y-3">
            <h3 className="font-semibold">Sorotan UMKM</h3>
            <p className="text-sm text-slate-600">
              Produk dibuat oleh perajin lokal dengan bahan pilihan dan motif khas Bantaragung.
            </p>
            <div className="flex flex-wrap gap-2 text-xs text-emerald-700">
              <span className="rounded-full bg-emerald-50 px-3 py-1">Produk Handmade</span>
              <span className="rounded-full bg-emerald-50 px-3 py-1">Bahan Alami</span>
              <span className="rounded-full bg-emerald-50 px-3 py-1">Oleh-oleh</span>
            </div>
          </div>
          <div className="rounded-3xl bg-emerald-50 p-6 space-y-3">
            <h4 className="font-semibold text-emerald-900">Tips Pembelian</h4>
            <p className="text-sm text-emerald-900/80">
              Pesan lebih awal untuk produk custom, dan tanyakan pilihan motif terbaru.
            </p>
          </div>
        </div>
      </section>

      {/* Gallery */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-xl">Galeri Produk</h3>
          <span className="text-sm text-slate-500">{data.gallery.length} foto</span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {data.gallery.map((g: string) => (
            <img
              key={g}
              src={assetUrl(g)}
              alt=""
              className="h-40 w-full object-cover rounded-2xl"
            />
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="bg-emerald-700 text-white rounded-3xl p-10 text-center space-y-4 shadow-lg">
        <h3 className="text-2xl font-semibold">Tertarik dengan produk ini?</h3>
        <p className="text-white/80 max-w-2xl mx-auto">
          Hubungi pengelola UMKM untuk informasi harga, katalog, dan pemesanan.
        </p>

        <a
          href={`https://wa.me/${data.contact.whatsapp}`}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-2 bg-white text-emerald-700 px-6 py-3 rounded-full font-semibold shadow hover:scale-105 transition"
        >
          Hubungi via WhatsApp
          <span aria-hidden>→</span>
        </a>
      </section>

    </main>
  );
}
