import { getWisataBySlug } from "@/lib/content";
import { assetUrl } from "@/lib/asset";

export default async function WisataDetail({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params;
    const data = getWisataBySlug(slug);

    return (
        <main className="max-w-4xl mx-auto px-6 py-16 space-y-10">

            {/* Title */}
            <section className="space-y-4">
                <h1 className="text-3xl md:text-4xl font-bold">{data.title}</h1>
                <p className="text-gray-600">{data.excerpt}</p>
            </section>

            {/* Cover */}
            <img
                src={assetUrl(data.cover)}
                alt={data.title}
                className="w-full h-[400px] object-cover rounded-2xl shadow"
            />

            {/* Description */}
            <section className="prose max-w-none">
                <p>{data.description}</p>
            </section>

            {/* Info Grid */}
            <section className="grid md:grid-cols-2 gap-10">

                <div>
                    <h3 className="font-semibold mb-3">Aktivitas</h3>
                    <ul className="list-disc list-inside space-y-1 text-gray-700">
                        {data.activities.map((a: string) => (
                            <li key={a}>{a}</li>
                        ))}
                    </ul>
                </div>

                <div>
                    <h3 className="font-semibold mb-3">Fasilitas</h3>
                    <ul className="list-disc list-inside space-y-1 text-gray-700">
                        {data.facilities.map((f: string) => (
                            <li key={f}>{f}</li>
                        ))}
                    </ul>
                </div>

            </section>

            {/* Gallery */}
            <section className="space-y-4">
                <h3 className="font-semibold text-xl">Galeri</h3>

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
            <section className="bg-green-700 text-white rounded-2xl p-8 text-center space-y-4">
                <h3 className="text-xl font-semibold">
                    Tertarik mengunjungi {data.title}?
                </h3>

                <a
                    href="https://wa.me/628xxxxxxxxxx"
                    target="_blank"
                    className="inline-block bg-white text-green-700 px-6 py-3 rounded-xl font-medium"
                >
                    Hubungi via WhatsApp
                </a>
            </section>

        </main>
    );
}