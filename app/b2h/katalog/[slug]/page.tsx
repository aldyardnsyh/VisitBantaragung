import { getHerbalBySlug } from "@/lib/content";
import { assetUrl } from "@/lib/asset";

export default async function HerbalDetail({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params;
    const data = getHerbalBySlug(slug);

    return (
        <main className="max-w-4xl mx-auto px-6 py-16 space-y-10">

            {/* Header */}
            <section className="space-y-3">
                <h1 className="text-3xl md:text-4xl font-bold">{data.name}</h1>
                <p className="italic text-gray-500">{data.latin}</p>
                <p className="text-gray-600">{data.excerpt}</p>
            </section>

            {/* Cover */}
            <img
                src={assetUrl(data.cover)}
                alt={data.name}
                className="w-full h-[350px] object-cover rounded-2xl shadow"
            />

            {/* Description */}
            <section className="prose max-w-none">
                <p>{data.description}</p>
            </section>

            {/* Benefits & Usage */}
            <section className="grid md:grid-cols-2 gap-10">

                <div>
                    <h3 className="font-semibold mb-3">Manfaat</h3>
                    <ul className="list-disc list-inside space-y-1 text-gray-700">
                        {data.benefits.map((b: string) => (
                            <li key={b}>{b}</li>
                        ))}
                    </ul>
                </div>

                <div>
                    <h3 className="font-semibold mb-3">Cara Pemanfaatan</h3>
                    <ul className="list-disc list-inside space-y-1 text-gray-700">
                        {data.usage.map((u: string) => (
                            <li key={u}>{u}</li>
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

        </main>
    );
}