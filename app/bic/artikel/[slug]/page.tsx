import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getAllArticles, getArticleBySlug } from "@/lib/content";
import { assetUrl } from "@/lib/asset";
import ResponsiveArticle from "@/app/components/ui/ResponsiveArticle";
import ImageWithSkeleton from "@/app/components/ui/ImageWithSkeleton";

interface ArticleDetailProps {
    params: Promise<{ slug: string }>;
}

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://visitbantaragung.com";

export const dynamic = "force-static";

export function generateStaticParams() {
    return getAllArticles().map((article) => ({ slug: article.slug }));
}

export async function generateMetadata({
    params,
}: ArticleDetailProps): Promise<Metadata> {
    const { slug } = await params;
    const article = getArticleBySlug(slug);
    if (!article) return { title: "Artikel Tidak Ditemukan" };
    return {
        title: article.title,
        description: article.excerpt,
        alternates: {
            canonical: `${SITE_URL}/bic/artikel/${article.slug}`,
        },
        openGraph: {
            title: article.title,
            description: article.excerpt,
            type: "article",
            publishedTime: article.date,
            ...(article.updatedAt ? { modifiedTime: article.updatedAt } : {}),
            images: [assetUrl(article.cover)],
        },
    };
}

function formatDate(date: string): string {
    const d = new Date(date);
    if (Number.isNaN(d.getTime())) return date;
    return new Intl.DateTimeFormat("id-ID", {
        day: "numeric",
        month: "long",
        year: "numeric",
    }).format(d);
}

export default async function ArtikelDetailPage({ params }: ArticleDetailProps) {
    const { slug } = await params;
    const article = getArticleBySlug(slug);
    if (!article) notFound();

    const shareUrl = `${SITE_URL}/bic/artikel/${article.slug}`;
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(
        `${article.title} - ${shareUrl}`
    )}`;

    // Navigasi prev/next + postingan terkait (urut tanggal menurun)
    const allArticles = getAllArticles();
    const idx = allArticles.findIndex((a) => a.slug === article.slug);
    const newer = idx > 0 ? allArticles[idx - 1] : null;
    const older = idx >= 0 && idx < allArticles.length - 1 ? allArticles[idx + 1] : null;
    const sameCategory = allArticles.filter(
        (a) => a.slug !== article.slug && a.category === article.category
    );
    const related = (sameCategory.length >= 3 ? sameCategory : allArticles.filter((a) => a.slug !== article.slug))
        .slice(0, 3);

    const jsonLd = {
        "@context": "https://schema.org",
        "@type": "Article",
        headline: article.title,
        description: article.excerpt,
        datePublished: article.date,
        ...(article.updatedAt ? { dateModified: article.updatedAt } : {}),
        ...(article.author ? { author: { "@type": "Person", name: article.author } } : {}),
        image: assetUrl(article.cover),
        mainEntityOfPage: shareUrl,
        publisher: {
            "@type": "Organization",
            name: "Desa Wisata Bantaragung",
            url: SITE_URL,
        },
    };

    return (
        <main className="min-h-screen">
            {/* Hero kecil: breadcrumb + badge asal */}
            <section className="bg-gradient-to-b from-forest-950 to-forest-900 text-white">
                <div className="max-w-7xl mx-auto px-6 py-8 md:py-10">
                    <ol className="flex flex-wrap items-center gap-1.5 text-sm text-white/60">
                        <li>
                            <Link href="/" className="hover:text-white transition-colors">
                                Beranda
                            </Link>
                        </li>
                        <li aria-hidden>/</li>
                        <li>
                            <Link href="/bic/artikel" className="hover:text-white transition-colors">
                                Artikel
                            </Link>
                        </li>
                        <li aria-hidden>/</li>
                        <li className="text-white/90 truncate max-w-[16rem] md:max-w-none">
                            {article.title}
                        </li>
                    </ol>
                    <span className="inline-block mt-4 rounded-full bg-white/10 border border-white/15 px-3 py-1 text-xs font-semibold text-white/90">
                        {article.origin === "berita" ? "Berita Desa" : "Kegiatan KKN"}
                    </span>
                </div>
            </section>

            <ResponsiveArticle cover={assetUrl(article.cover)} alt={article.title}>
                <header>
                    <h1 className="font-display font-bold text-forest-800 text-3xl md:text-4xl leading-tight mt-4 lg:mt-0">
                        {article.title}
                    </h1>
                    <div className="flex flex-wrap items-center gap-2 mt-3 text-slate-600">
                        <span className="rounded-full bg-forest-100 text-forest-700 px-3 py-1 text-xs font-semibold">
                            {article.category}
                        </span>
                        <span className="text-sm">
                            {formatDate(article.date)}
                            {article.author ? ` · Oleh ${article.author}` : ""}
                        </span>
                    </div>
                </header>

                <article className="text-base text-slate-700 leading-relaxed space-y-5">
                    {article.content.map((paragraph, index) => (
                        <p key={index}>{paragraph}</p>
                    ))}
                </article>

                {/* Dokumentasi kegiatan (khusus artikel KKN): galeri foto asli, rasio dinamis */}
                {article.origin === "kkn" &&
                    article.gallery &&
                    article.gallery.length > 0 && (
                        <div className="pt-4">
                            <h3 className="font-display text-2xl font-bold text-forest-800 mb-4">
                                Dokumentasi Kegiatan
                            </h3>
                            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                                {article.gallery.map((g, gi) => (
                                    <figure
                                        key={gi}
                                        className="rounded-2xl overflow-hidden border border-forest-200/60 bg-white shadow-sm"
                                    >
                                        <ImageWithSkeleton
                                            src={assetUrl(g)}
                                            alt={`${article.title} – dokumentasi ${gi + 1}`}
                                            className="w-full"
                                        />
                                    </figure>
                                ))}
                            </div>
                        </div>
                    )}

                {article.tags && article.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2 pt-2">
                        {article.tags.map((tag) => (
                            <span
                                key={tag}
                                className="bg-forest-100 text-forest-700 rounded-full px-3 py-1 text-xs"
                            >
                                {tag}
                            </span>
                        ))}
                    </div>
                )}

                {/* Navigasi prev/next antar postingan (ringan, satu baris) */}
                {(newer || older) && (
                    <nav
                        aria-label="Navigasi artikel"
                        className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-forest-200/70 text-sm"
                    >
                        {newer ? (
                            <Link
                                href={`/bic/artikel/${newer.slug}`}
                                className="group inline-flex items-center gap-2 text-forest-700 hover:text-clay-500 font-medium transition-colors min-w-0 max-w-full sm:max-w-[48%]"
                            >
                                <span aria-hidden className="text-base leading-none">←</span>
                                <span className="truncate">{newer.title}</span>
                            </Link>
                        ) : (
                            <span />
                        )}
                        {older ? (
                            <Link
                                href={`/bic/artikel/${older.slug}`}
                                className="group inline-flex items-center gap-2 text-right text-forest-700 hover:text-clay-500 font-medium transition-colors min-w-0 max-w-full sm:max-w-[48%] ml-auto"
                            >
                                <span className="truncate">{older.title}</span>
                                <span aria-hidden className="text-base leading-none">→</span>
                            </Link>
                        ) : (
                            <span className="ml-auto" />
                        )}
                    </nav>
                )}

                {/* Postingan terkait (khusus non-berita; berita desa cukup prev/next agar tidak ramai) */}
                {article.origin !== "berita" && related.length > 0 && (
                    <div className="pt-8">
                        <h3 className="font-display text-2xl font-bold text-forest-800 mb-4">
                            Postingan Terkait
                        </h3>
                        <div className="grid gap-4 md:grid-cols-3">
                            {related.map((a) => (
                                <Link key={a.slug} href={`/bic/artikel/${a.slug}`} className="group block">
                                    <div className="h-full flex flex-col rounded-2xl overflow-hidden bg-white/80 border border-forest-200/60 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300">
                                        <div className="aspect-[16/10] overflow-hidden">
                                            <ImageWithSkeleton
                                                src={assetUrl(a.cover)}
                                                alt={a.title}
                                                className="w-full h-full group-hover:scale-105 transition-transform duration-300"
                                            />
                                        </div>
                                        <div className="p-4 flex flex-col flex-1">
                                            <span className="text-[11px] uppercase tracking-wide text-clay-500 font-semibold">
                                                {a.category}
                                            </span>
                                            <span className="mt-1.5 text-sm font-medium text-forest-800 group-hover:text-clay-500 line-clamp-2 transition-colors">
                                                {a.title}
                                            </span>
                                        </div>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </div>
                )}

                {/* Bagikan */}
                <div className="flex justify-end pt-4 border-t border-forest-200/70">
                    <a
                        href={whatsappUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-2 bg-clay-500 hover:bg-clay-600 text-white rounded-full px-5 py-2.5 font-semibold transition"
                    >
                        Bagikan via WhatsApp
                    </a>
                </div>
            </ResponsiveArticle>

            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
            />
        </main>
    );
}
