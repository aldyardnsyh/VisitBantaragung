import { getAllHerbal, getHerbalBySlug } from "@/lib/content";
import { assetUrl } from "@/lib/asset";
import PageHeader from "@/app/components/layout/PageHeader";
import type { Metadata } from "next";

export const dynamic = "force-static";

export function generateStaticParams() {
    return getAllHerbal().map((h) => ({ slug: h.slug }));
}

export async function generateMetadata({
    params,
}: {
    params: Promise<{ slug: string }>;
}): Promise<Metadata> {
    const { slug } = await params;
    const data = getHerbalBySlug(slug);
    return { title: `${data.name} - Tanaman Herbal`, description: data.excerpt };
}

export default async function HerbalDetail({
    params,
}: {
    params: Promise<{ slug: string }>;
}) {
    const { slug } = await params;
    const data = getHerbalBySlug(slug);

    return (
        <main className="min-h-screen">
            <PageHeader
                breadcrumb={[
                    { label: "Kampung Herbal", href: "/b2h" },
                    { label: "Katalog", href: "/b2h/katalog" },
                    { label: data.name },
                ]}
                eyebrow="Tanaman Herbal"
                title={data.name}
                subtitle={data.excerpt}
            >
                <p className="italic text-white/80">{data.latin}</p>
                <div className="flex flex-wrap gap-2">
                    <span className="bg-white/10 border border-white/15 text-white rounded-full px-3 py-1 text-xs">
                        {data.benefits.length} Manfaat
                    </span>
                    <span className="bg-white/10 border border-white/15 text-white rounded-full px-3 py-1 text-xs">
                        {data.usage.length} Cara Pemanfaatan
                    </span>
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
                    <h2 className="font-display text-2xl md:text-3xl font-bold">
                        Deskripsi
                    </h2>
                    <p className="text-slate-600 leading-relaxed text-lg">{data.description}</p>
                </section>

                <section className="grid lg:grid-cols-2 gap-6">
                    <div className="bg-white rounded-2xl border border-forest-200/60 p-6 shadow-sm">
                        <h3 className="font-display text-xl font-bold text-forest-800 mb-4">
                            Manfaat
                        </h3>
                        <ul className="space-y-2 text-slate-700">
                            {data.benefits.map((b) => (
                                <li key={b} className="flex items-start gap-2">
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
                                    {b}
                                </li>
                            ))}
                        </ul>
                    </div>

                    <div className="bg-white rounded-2xl border border-forest-200/60 p-6 shadow-sm">
                        <h3 className="font-display text-xl font-bold text-forest-800 mb-4">
                            Cara Pemanfaatan
                        </h3>
                        <ul className="space-y-2 text-slate-700">
                            {data.usage.map((u) => (
                                <li key={u} className="flex items-start gap-2">
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
                                            d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                                        />
                                    </svg>
                                    {u}
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
                                    alt={`${data.name} - galeri`}
                                    loading="lazy"
                                    className="h-40 w-full object-cover rounded-2xl"
                                />
                            ))}
                        </div>
                    </section>
                )}
            </section>
        </main>
    );
}
