import { getArticleBySlug } from "@/lib/content";
import { assetUrl } from "@/lib/asset";

export default async function ArtikelDetail({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params;
    const data = getArticleBySlug(slug);

    if (!data) return <main>Artikel tidak ditemukan.</main>;

    return (
        <main className="max-w-4xl mx-auto px-6 py-16 space-y-12">

            {/* Header */}
            <section className="space-y-5">
                <div className="inline-flex items-center gap-2 rounded-full bg-[#102440]/10 px-4 py-1 text-xs uppercase tracking-widest text-[#e7c277]">
                    Artikel Desa
                </div>
                <div className="space-y-2">
                    <h1 className="text-3xl md:text-4xl font-bold leading-tight">
                        {data.title}
                    </h1>
                    <div className="flex flex-wrap items-center gap-3 text-sm text-slate-500">
                        <span>{data.date}</span>
                        <span className="h-1 w-1 rounded-full bg-slate-400" />
                        <span className="uppercase tracking-wide">{data.category}</span>
                        {data.author && (
                            <>
                                <span className="h-1 w-1 rounded-full bg-slate-400" />
                                <span>Oleh: {data.author}</span>
                            </>
                        )}
                    </div>
                </div>
            </section>

            {/* Cover */}
            <section className="relative overflow-hidden rounded-3xl shadow-lg border border-[#e7c277]/40">
                <img
                    src={assetUrl(data.cover)}
                    alt={data.title}
                    className="w-full h-[380px] object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                <div className="absolute bottom-6 left-6 text-white space-y-1">
                    <p className="text-xs uppercase tracking-widest text-white/80">Sorotan Artikel</p>
                    <p className="text-2xl font-semibold">{data.title}</p>
                </div>
            </section>

            {/* Content */}
            <section className="grid lg:grid-cols-[1.4fr_0.6fr] gap-8">
                <article className="prose max-w-none">
                    {data.content.map((p: string, i: number) => (
                        <p key={i}>{p}</p>
                    ))}
                </article>
                <aside className="space-y-4">
                    <div className="rounded-3xl bg-white border border-[#e7c277]/40 p-6 shadow-sm space-y-3">
                        <h3 className="font-semibold">Ringkasan</h3>
                        <p className="text-sm text-slate-600">
                            Dokumentasi kegiatan terbaru untuk memperkuat potensi wisata dan edukasi desa.
                        </p>
                        <div className="flex flex-wrap gap-2 text-xs text-[#e7c277]">
                            <span className="rounded-full bg-[#102440]/10 px-3 py-1">Kegiatan</span>
                            <span className="rounded-full bg-[#102440]/10 px-3 py-1">Edukasi</span>
                            <span className="rounded-full bg-[#102440]/10 px-3 py-1">Komunitas</span>
                        </div>
                    </div>
                    <div className="rounded-3xl bg-[#102440]/10 p-6 space-y-3">
                        <h4 className="font-semibold text-[#102440]">Baca juga</h4>
                        <p className="text-sm text-[#102440]/80">
                            Temukan artikel lain seputar budaya, UMKM, dan wisata unggulan Bantaragung.
                        </p>
                    </div>
                </aside>
            </section>

            {/* Gallery */}
            <section className="space-y-4">
                <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-xl">Dokumentasi</h3>
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
            <section className="rounded-3xl bg-slate-900 text-white p-10 text-center space-y-4">
                <p className="text-white/80">
                    Ingin mengetahui lebih banyak kegiatan Desa Bantaragung?
                </p>

                <a
                    href="/bic/artikel"
                    className="inline-flex items-center gap-2 bg-white text-slate-900 px-6 py-3 rounded-full font-semibold shadow hover:scale-105 transition"
                >
                    Lihat Artikel Lainnya
                    <span aria-hidden>→</span>
                </a>
            </section>

        </main>
    );
}
