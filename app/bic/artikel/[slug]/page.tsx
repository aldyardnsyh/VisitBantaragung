import { getArticleBySlug } from "@/lib/content";
import { assetUrl } from "@/lib/asset";

export default async function ArtikelDetail({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params;
    const data = getArticleBySlug(slug);

    if (!data) return <main>Artikel tidak ditemukan.</main>;

    return (
        <main className="max-w-3xl mx-auto px-6 py-16 space-y-10">

            {/* Header */}
            <section className="space-y-3">
                <h1 className="text-3xl md:text-4xl font-bold leading-tight">
                    {data.title}
                </h1>
                <p className="text-sm text-gray-500">{data.date}</p>
            </section>

            {/* Cover */}
            <img
                src={assetUrl(data.cover)}
                alt={data.title}
                className="w-full h-[350px] object-cover rounded-2xl shadow"
            />

            {/* Content */}
            <article className="prose max-w-none">
                {data.content.map((p: string, i: number) => (
                    <p key={i}>{p}</p>
                ))}
            </article>

            {/* Gallery */}
            <section className="space-y-4">
                <h3 className="font-semibold text-xl">Dokumentasi</h3>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {data.gallery.map((g: string) => (
                        <img
                            key={g}
                            src={assetUrl(g)}
                            alt=""
                            className="h-40 w-full object-cover rounded-xl"
                        />
                    ))}
                </div>
            </section>

            {/* CTA */}
            <section className="border-t pt-8 text-center space-y-4">
                <p className="text-gray-600">
                    Ingin mengetahui lebih banyak kegiatan Desa Bantaragung?
                </p>

                <a
                    href="/bic/artikel"
                    className="inline-block bg-green-700 text-white px-6 py-3 rounded-xl"
                >
                    Lihat Artikel Lainnya
                </a>
            </section>

        </main>
    );
}
