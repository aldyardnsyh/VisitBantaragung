import { getAllWisata, getWisataBySlug } from "@/lib/content";
import { assetUrl } from "@/lib/asset";
import PageHeader from "@/app/components/layout/PageHeader";
import type { Metadata } from "next";

export const dynamic = "force-static";

export function generateStaticParams() {
    return getAllWisata().map((w) => ({ slug: w.slug }));
}

export async function generateMetadata({
    params,
}: {
    params: Promise<{ slug: string }>;
}): Promise<Metadata> {
    const { slug } = await params;
    const data = getWisataBySlug(slug);
    return { title: data.title, description: data.excerpt };
}

function sanitizePhone(raw: string): string {
    const digits = raw.replace(/\D/g, "");
    return digits.startsWith("0") ? `62${digits.slice(1)}` : digits;
}

export default async function WisataDetail({
    params,
}: {
    params: Promise<{ slug: string }>;
}) {
    const { slug } = await params;
    const data = getWisataBySlug(slug);
    const hasMap = Boolean(data.location && data.location.lat && data.location.lng);

    const jsonLd = {
        "@context": "https://schema.org",
        "@type": "TouristAttraction",
        name: data.title,
        description: data.excerpt,
        image: assetUrl(data.cover),
        address: {
            "@type": "PostalAddress",
            addressLocality: "Desa Bantaragung, Kec. Sindangwangi",
            addressRegion: "Jawa Barat",
            addressCountry: "ID",
        },
        ...(hasMap
            ? { geo: { "@type": "GeoCoordinates", latitude: data.location.lat, longitude: data.location.lng } }
            : {}),
    };

    return (
        <main className="min-h-screen">
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
            />

            <PageHeader
                breadcrumb={[{ label: "Wisata", href: "/wisata" }, { label: data.title }]}
                eyebrow="Destinasi Wisata"
                title={data.title}
                subtitle={data.excerpt}
            >
                <div className="flex flex-wrap gap-2">
                    {data.activities.slice(0, 3).map((a) => (
                        <span
                            key={a}
                            className="bg-white/10 border border-white/15 text-white rounded-full px-3 py-1 text-xs"
                        >
                            {a}
                        </span>
                    ))}
                </div>
            </PageHeader>

            <section className="max-w-5xl mx-auto px-6 py-16 space-y-12 animate-fade-up">
                <div className="relative overflow-hidden rounded-2xl shadow-lg">
                    <img
                        src={assetUrl(data.cover)}
                        alt={data.title}
                        fetchPriority="high"
                        className="w-full aspect-[16/9] max-h-[30rem] object-cover"
                    />
                </div>

                <section className="prose max-w-none">
                    <h2 className="font-display text-2xl md:text-3xl font-bold">
                        Deskripsi
                    </h2>
                    <p className="text-slate-600 leading-relaxed text-lg">{data.description}</p>
                </section>

                <section className="grid lg:grid-cols-2 gap-6">
                    <div className="bg-white rounded-2xl border border-forest-200/60 p-6 shadow-sm">
                        <h3 className="font-display text-xl font-bold text-forest-800 mb-4">
                            Aktivitas
                        </h3>
                        <ul className="space-y-2 text-slate-700">
                            {data.activities.map((a) => (
                                <li key={a} className="flex items-start gap-2">
                                    <svg
                                        className="w-4 h-4 mt-1 text-forest-600 shrink-0"
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M5 13l4 4L19 7"
                                        />
                                    </svg>
                                    {a}
                                </li>
                            ))}
                        </ul>
                    </div>

                    <div className="bg-white rounded-2xl border border-forest-200/60 p-6 shadow-sm">
                        <h3 className="font-display text-xl font-bold text-forest-800 mb-4">
                            Fasilitas
                        </h3>
                        <ul className="space-y-2 text-slate-700">
                            {data.facilities.map((f) => (
                                <li key={f} className="flex items-start gap-2">
                                    <svg
                                        className="w-4 h-4 mt-1 text-clay-500 shrink-0"
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.804 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.804 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.804 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.804 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.804 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.804 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.804-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.804-1.946 3.42 3.42 0 013.138-3.138z"
                                        />
                                    </svg>
                                    {f}
                                </li>
                            ))}
                        </ul>
                    </div>
                </section>

                {data.gallery.length > 0 && (
                    <section className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="font-display text-2xl font-bold text-forest-800">
                                Galeri
                            </h3>
                            <span className="text-sm text-slate-500">
                                {data.gallery.length} foto
                            </span>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                            {data.gallery.map((g) => (
                                <img
                                    key={g}
                                    src={assetUrl(g)}
                                    alt={`${data.title} - galeri`}
                                    loading="lazy"
                                    className="h-40 w-full object-cover rounded-2xl"
                                />
                            ))}
                        </div>
                    </section>
                )}

                {hasMap && (
                    <section className="space-y-4">
                        <h3 className="font-display text-2xl font-bold text-forest-800">
                            Lokasi
                        </h3>
                        <iframe
                            src={`https://maps.google.com/maps?q=${data.location.lat},${data.location.lng}&output=embed`}
                            title={`Lokasi ${data.title}`}
                            className="w-full h-[320px] rounded-2xl border-0 shadow-md"
                            loading="lazy"
                            sandbox="allow-scripts allow-same-origin allow-popups"
                        />
                    </section>
                )}

                <section className="bg-gradient-to-br from-clay-500 to-clay-600 rounded-2xl p-8 md:p-10 text-center space-y-4 shadow-md">
                    <h2 className="font-display text-2xl font-bold text-white">
                        Siap menjelajah {data.title}?
                    </h2>
                    <p className="text-white/90 max-w-2xl mx-auto">
                        Hubungi tim pengelola desa wisata untuk informasi rute, tiket, dan paket
                        kunjungan edukatif.
                    </p>
                    <a
                        href={`https://wa.me/${sanitizePhone("6281384990974")}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-2 bg-white text-clay-600 rounded-full px-6 py-3 font-semibold shadow hover:scale-105 transition"
                    >
                        Hubungi via WhatsApp
                        <span aria-hidden>→</span>
                    </a>
                </section>
            </section>
        </main>
    );
}