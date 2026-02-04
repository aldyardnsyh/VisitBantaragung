import { getLocationBySlug } from "@/lib/content";
import { assetUrl } from "@/lib/asset";

export default async function LocationDetail({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params;
    const data = getLocationBySlug(slug);

    return (
        <main className="max-w-4xl mx-auto px-6 py-16 space-y-10">

            <section className="space-y-3">
                <h1 className="text-3xl md:text-4xl font-bold">{data.name}</h1>
                <p className="text-gray-600">{data.excerpt}</p>
            </section>

            <img
                src={assetUrl(data.cover)}
                alt={data.name}
                className="w-full h-[350px] object-cover rounded-2xl shadow"
            />

            {/* Map */}
            <div className="rounded-2xl overflow-hidden shadow h-[350px]">
                <iframe
                    className="w-full h-full"
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                    src={`https://www.google.com/maps?q=${data.lat},${data.lng}&z=16&output=embed`}
                />
            </div>

            <section className="text-center">
                <a
                    href={`https://www.google.com/maps?q=${data.lat},${data.lng}`}
                    target="_blank"
                    className="inline-block bg-green-700 text-white px-6 py-3 rounded-xl"
                >
                    Buka di Google Maps
                </a>
            </section>

        </main>
    );
}
