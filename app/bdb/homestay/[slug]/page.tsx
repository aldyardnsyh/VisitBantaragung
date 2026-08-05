import { getAllHomestay, getHomestayBySlug } from "@/lib/content";
import { assetUrl } from "@/lib/asset";
import PageHeader from "@/app/components/layout/PageHeader";
import type { Metadata } from "next";

export const dynamic = "force-static";

export function generateStaticParams() {
    return getAllHomestay().map((h) => ({ slug: h.slug }));
}

export async function generateMetadata({
    params,
}: {
    params: Promise<{ slug: string }>;
}): Promise<Metadata> {
    const { slug } = await params;
    const data = getHomestayBySlug(slug);
    return { title: `${data.name} - Homestay Bantaragung`, description: data.excerpt };
}

function sanitizePhone(raw: string): string {
    const digits = raw.replace(/\D/g, "");
    return digits.startsWith("0") ? `62${digits.slice(1)}` : digits;
}

export default async function HomestayDetail({
    params,
}: {
    params: Promise<{ slug: string }>;
}) {
    const { slug } = await params;
    const data = getHomestayBySlug(slug);
    const wa = sanitizePhone(data.contact.whatsapp);

    const jsonLd: Record<string, unknown> = {
        "@context": "https://schema.org",
        "@type": "Hotel",
        name: data.name,
        description: data.excerpt,
        image: assetUrl(data.cover),
        address: {
            "@type": "PostalAddress",
            addressLocality: "Desa Bantaragung, Kec. Sindangwangi",
            addressRegion: "Jawa Barat",
            addressCountry: "ID",
        },
    };
    if (data.price) jsonLd.priceRange = data.price;
    if (data.address) (jsonLd.address as Record<string, unknown>).streetAddress = data.address;
    if (data.contact.email) jsonLd.email = data.contact.email;

    return (
        <main className="min-h-screen">
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
            />

            <PageHeader
                breadcrumb={[
                    { label: "Branding Desa", href: "/bdb" },
                    { label: "Homestay", href: "/bdb/homestay" },
                    { label: data.name },
                ]}
                eyebrow="Homestay"
                title={data.name}
                subtitle={data.excerpt}
            >
                <div className="flex flex-wrap gap-2">
                    <span className="bg-white/10 border border-white/15 text-white rounded-full px-3 py-1 text-xs">
                        Kapasitas {data.capacity}
                    </span>
                    <span className="bg-white/10 border border-white/15 text-white rounded-full px-3 py-1 text-xs">
                        {data.facilities.length} Fasilitas
                    </span>
                    {data.price && (
                        <span className="bg-clay-500 text-white rounded-full px-3 py-1 text-xs font-semibold">
                            {data.price}
                        </span>
                    )}
                </div>
            </PageHeader>

            <section className="max-w-5xl mx-auto px-6 py-16 space-y-12">
                <div className="relative overflow-hidden rounded-2xl shadow-lg">
                    <img
                        src={assetUrl(data.cover)}
                        alt={data.name}
                        fetchPriority="high"
                        className="w-full aspect-[16/9] max-h-[30rem] object-cover"
                    />
                </div>

                <section className="prose max-w-none">
                    <h2 className="font-display text-2xl md:text-3xl font-bold">Deskripsi</h2>
                    <p className="text-slate-600 leading-relaxed text-lg">{data.description}</p>
                </section>

                {data.address && (
                    <section className="flex items-start gap-3 rounded-2xl bg-white border border-forest-200/60 p-6 shadow-sm">
                        <svg
                            className="w-5 h-5 mt-1 text-clay-500 shrink-0"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                            />
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                            />
                        </svg>
                        <div>
                            <h3 className="font-display text-lg font-bold text-forest-800">
                                Alamat
                            </h3>
                            <p className="text-slate-600">{data.address}</p>
                        </div>
                    </section>
                )}

                <section className="bg-white rounded-2xl border border-forest-200/60 p-6 shadow-sm">
                    <h3 className="font-display text-xl font-bold text-forest-800 mb-4">
                        Fasilitas
                    </h3>
                    <ul className="grid sm:grid-cols-2 gap-2 text-slate-700">
                        {data.facilities.map((f) => (
                            <li key={f} className="flex items-start gap-2">
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
                                {f}
                            </li>
                        ))}
                    </ul>
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
                                    alt={`${data.name} - galeri`}
                                    loading="lazy"
                                    className="h-40 w-full object-cover rounded-2xl"
                                />
                            ))}
                        </div>
                    </section>
                )}

                <section className="bg-gradient-to-br from-forest-700 to-forest-800 rounded-2xl p-8 md:p-10 text-center space-y-4 shadow-md">
                    <h2 className="font-display text-2xl font-bold text-white">
                        Book {data.name}
                    </h2>
                    <p className="text-white/90 max-w-2xl mx-auto">
                        Hubungi pengelola untuk jadwal ketersediaan dan paket live-in.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
                        <a
                            href={`https://wa.me/${wa}`}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-2 bg-white text-forest-700 rounded-full px-5 py-2.5 font-semibold shadow hover:scale-105 transition"
                        >
                            Hubungi via WhatsApp
                            <span aria-hidden>→</span>
                        </a>
                        {data.contact.email && (
                            <a
                                href={`mailto:${data.contact.email}`}
                                className="inline-flex items-center gap-2 bg-white/10 text-white rounded-full px-5 py-2.5 font-semibold shadow border border-white/20 hover:bg-white/20 transition"
                            >
                                Email
                            </a>
                        )}
                    </div>
                </section>
            </section>
        </main>
    );
}
