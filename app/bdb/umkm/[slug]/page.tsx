import { getAllUMKM, getUMKMBySlug } from "@/lib/content";
import { assetUrl } from "@/lib/asset";
import PageHeader from "@/app/components/layout/PageHeader";
import type { Metadata } from "next";

export const dynamic = "force-static";

export function generateStaticParams() {
    return getAllUMKM().map((u) => ({ slug: u.slug }));
}

export async function generateMetadata({
    params,
}: {
    params: Promise<{ slug: string }>;
}): Promise<Metadata> {
    const { slug } = await params;
    const data = getUMKMBySlug(slug);
    return { title: `${data.name} - UMKM Bantaragung`, description: data.excerpt };
}

function sanitizePhone(raw: string): string {
    const digits = raw.replace(/\D/g, "");
    return digits.startsWith("0") ? `62${digits.slice(1)}` : digits;
}

export default async function UMKMDetail({
    params,
}: {
    params: Promise<{ slug: string }>;
}) {
    const { slug } = await params;
    const data = getUMKMBySlug(slug);
    const wa = sanitizePhone(data.contact.whatsapp);

    const jsonLd = {
        "@context": "https://schema.org",
        "@type": "LocalBusiness",
        name: data.name,
        description: data.excerpt,
        image: assetUrl(data.cover),
        address: {
            "@type": "PostalAddress",
            addressLocality: "Desa Bantaragung, Kec. Sindangwangi",
            addressRegion: "Jawa Barat",
            addressCountry: "ID",
        },
        telephone: `+${wa}`,
    };

    return (
        <main className="min-h-screen">
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
            />

            <PageHeader
                breadcrumb={[
                    { label: "Branding Desa", href: "/bdb" },
                    { label: "UMKM", href: "/bdb/umkm" },
                    { label: data.name },
                ]}
                eyebrow="UMKM Unggulan"
                title={data.name}
                subtitle={data.excerpt}
            />

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

                {data.gallery.length > 0 && (
                    <section className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="font-display text-2xl font-bold text-forest-800">
                                Galeri Produk
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

                <section className="bg-gradient-to-br from-clay-500 to-clay-600 rounded-2xl p-8 md:p-10 text-center space-y-4 shadow-md">
                    <h2 className="font-display text-2xl font-bold text-white">
                        Tertarik dengan {data.name}?
                    </h2>
                    <p className="text-white/90 max-w-2xl mx-auto">
                        Hubungi pengelola UMKM untuk informasi harga, katalog, dan pemesanan.
                    </p>
                    <a
                        href={`https://wa.me/${wa}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-2 bg-white text-clay-600 rounded-full px-5 py-2.5 font-semibold shadow hover:scale-105 transition"
                    >
                        Hubungi via WhatsApp
                        <span aria-hidden>→</span>
                    </a>
                </section>
            </section>
        </main>
    );
}
