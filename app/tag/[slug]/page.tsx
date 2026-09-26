import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getAllTags, getArticlesByTag, getTagBySlug } from "@/lib/content";
import { assetUrl } from "@/lib/asset";
import { toJsonLd } from "@/lib/jsonld";
import PageHeader from "@/app/components/layout/PageHeader";
import SectionHeading from "@/app/components/ui/SectionHeading";
import ImageWithSkeleton from "@/app/components/ui/ImageWithSkeleton";
import Reveal from "@/app/components/ui/Reveal";

interface TagPageProps {
    params: Promise<{ slug: string }>;
}

export const dynamic = "force-static";

export function generateStaticParams() {
    return getAllTags().map((t) => ({ slug: t.slug }));
}

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://visitbantaragung.com";

export async function generateMetadata({ params }: TagPageProps): Promise<Metadata> {
    const { slug } = await params;
    const tag = getTagBySlug(slug);
    if (!tag) return { title: "Tag Tidak Ditemukan" };
    const label = tag.slug.replace(/-/g, " ");
    return {
        title: `Tag ${label}`,
        description: `Kumpulan berita dan kegiatan di Desa Wisata Bantaragung dengan topik ${label}. ${tag.count} artikel terkait.`,
        keywords: [label, `${label} bantaragung`, `${label} majalengka`],
        alternates: { canonical: `${SITE_URL}/tag/${tag.slug}` },
    };
}

export default async function TagPage({ params }: TagPageProps) {
    const { slug } = await params;
    const tag = getTagBySlug(slug);
    if (!tag) notFound();
    const articles = getArticlesByTag(tag.slug);
    const label = tag.slug.replace(/-/g, " ");

    const jsonLd = {
        "@context": "https://schema.org",
        "@type": "CollectionPage",
        name: `Tag ${label}`,
        description: `Kumpulan berita berkategori ${label} di Desa Wisata Bantaragung.`,
        url: `${SITE_URL}/tag/${tag.slug}`,
        numberOfItems: articles.length,
    };

    return (
        <main className="min-h-screen">
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: toJsonLd(jsonLd) }}
            />
            <PageHeader
                breadcrumb={[{ label: "Berita", href: "/bic/artikel" }, { label: `Tag ${label}` }]}
                eyebrow="Kumpulan Artikel"
                title={label}
                subtitle={`${articles.length} artikel terkait di Desa Wisata Bantaragung.`}
            />

            <section className="max-w-7xl mx-auto px-6 py-16">
                <Reveal>
                    <SectionHeading
                        align="left"
                        title={`${articles.length} Artikel`}
                        subtitle="Urut dari yang terbaru."
                    />
                </Reveal>

                {articles.length === 0 ? (
                    <p className="text-slate-600">Belum ada artikel pada tag ini.</p>
                ) : (
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3" data-stagger>
                        {articles.map((a, i) => (
                            <Reveal key={a.slug} delay={(i % 3) * 100} className="h-full">
                                <Link href={`/bic/artikel/${a.slug}`} className="group block h-full">
                                    <article className="h-full flex flex-col rounded-2xl overflow-hidden bg-white/80 border border-forest-200/60 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300">
                                        <ImageWithSkeleton
                                            src={assetUrl(a.cover)}
                                            alt={a.title}
                                            className="aspect-[16/10] overflow-hidden group-hover:scale-105 transition-transform duration-300"
                                        />
                                        <div className="flex flex-1 flex-col p-5 gap-2">
                                            <p className="text-sm text-slate-500">
                                                {new Date(a.date).toLocaleDateString("id-ID", {
                                                    day: "numeric",
                                                    month: "long",
                                                    year: "numeric",
                                                })}
                                            </p>
                                            <h3 className="font-semibold text-forest-800 line-clamp-2">
                                                {a.title}
                                            </h3>
                                            <p className="text-sm text-slate-600 line-clamp-2 flex-1">
                                                {a.excerpt}
                                            </p>
                                        </div>
                                    </article>
                                </Link>
                            </Reveal>
                        ))}
                    </div>
                )}

                <Reveal>
                    <div className="mt-12 rounded-2xl bg-white/60 border border-forest-200/60 p-6">
                        <h2 className="font-bold text-forest-800 mb-3">Tag lain</h2>
                        <div className="flex flex-wrap gap-2">
                            {getAllTags()
                                .filter((t) => t.slug !== tag.slug)
                                .slice(0, 40)
                                .map((t) => (
                                    <Link
                                        key={t.slug}
                                        href={`/tag/${t.slug}`}
                                        className="rounded-full bg-forest-100 text-forest-700 px-3 py-1 text-xs hover:bg-forest-200 transition-colors"
                                    >
                                        {t.slug.replace(/-/g, " ")} ({t.count})
                                    </Link>
                                ))}
                        </div>
                    </div>
                </Reveal>
            </section>
        </main>
    );
}
