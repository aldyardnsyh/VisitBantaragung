import Link from "next/link";
import type { Metadata } from "next";
import {
    getAllArticles,
    getArticlesByOrigin,
    type Article,
    type ArticleOrigin,
} from "@/lib/content";
import { assetUrl } from "@/lib/asset";
import PageHeader from "@/app/components/layout/PageHeader";
import ImageWithSkeleton from "@/app/components/ui/ImageWithSkeleton";

interface ListPageProps {
    searchParams: Promise<{ origin?: string }>;
}

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://visitbantaragung.com";

const TABS: { key: ArticleOrigin | "all"; label: string }[] = [
    { key: "all", label: "Semua" },
    { key: "kkn", label: "Kegiatan KKN" },
    { key: "berita", label: "Berita Desa" },
];

function formatDate(date: string): string {
    const d = new Date(date);
    if (Number.isNaN(d.getTime())) return date;
    return new Intl.DateTimeFormat("id-ID", {
        day: "numeric",
        month: "short",
        year: "numeric",
    }).format(d);
}

function ArticleCard({ article }: { article: Article }) {
    return (
        <Link href={`/bic/artikel/${article.slug}`} className="group block h-full">
            <article className="h-full flex flex-col rounded-2xl overflow-hidden bg-white/80 border border-forest-200/60 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300">
                <div className="relative">
                    <ImageWithSkeleton
                        src={assetUrl(article.cover)}
                        alt={article.title}
                        className="aspect-[16/10] overflow-hidden group-hover:scale-105 transition-transform duration-300"
                    />
                    <span
                        className={`absolute top-3 left-3 rounded-full px-3 py-1 text-xs font-semibold ${
                            article.origin === "berita"
                                ? "bg-forest-100 text-forest-700"
                                : "bg-clay-100 text-clay-500"
                        }`}
                    >
                        {article.origin === "berita" ? "Berita Desa" : "Kegiatan KKN"}
                    </span>
                </div>
                <div className="p-5 flex flex-col gap-2 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className="bg-forest-100 text-forest-700 rounded-full px-3 py-1 text-xs">
                            {article.category}
                        </span>
                        <span className="text-sm text-slate-500">
                            {formatDate(article.date)}
                            <span aria-hidden> | </span>
                            {article.author || "Admin"}
                        </span>
                    </div>
                    <h3 className="font-semibold text-forest-800 leading-snug line-clamp-2">
                        {article.title}
                    </h3>
                    <p className="text-sm text-slate-600 line-clamp-2 flex-1">{article.excerpt}</p>
                    <span className="inline-flex items-center gap-1 text-forest-600 text-sm font-medium transition-colors duration-200 group-hover:text-clay-600">
                        Baca Selengkapnya
                        <span aria-hidden className="transition-transform group-hover:translate-x-0.5">→</span>
                    </span>
                </div>
            </article>
        </Link>
    );
}

export async function generateMetadata({
    searchParams,
}: ListPageProps): Promise<Metadata> {
    const { origin } = await searchParams;
    const isBerita = origin === "berita";
    const isKkn = origin === "kkn";
    const label = isBerita ? "Berita Desa" : isKkn ? "Kegiatan KKN" : "Artikel";
    return {
        title: `${label} | Pusat Informasi`,
        description:
            "Kumpulan artikel kegiatan, edukasi, dan publikasi program pengembangan masyarakat Desa Bantaragung.",
        alternates: {
            canonical: `${SITE_URL}/bic/artikel${
                isBerita || isKkn ? `?origin=${origin}` : ""
            }`,
        },
    };
}

export default async function ArtikelListPage({ searchParams }: ListPageProps) {
    const { origin } = await searchParams;
    const selected: ArticleOrigin | "all" =
        origin === "kkn" || origin === "berita" ? origin : "all";
    const articles =
        selected === "all" ? getAllArticles() : getArticlesByOrigin(selected);

    const allCount = getAllArticles().length;
    const kknCount = getArticlesByOrigin("kkn").length;
    const beritaCount = getArticlesByOrigin("berita").length;
    const counts: Record<ArticleOrigin | "all", number> = {
        all: allCount,
        kkn: kknCount,
        berita: beritaCount,
    };

    return (
        <main className="min-h-screen">
            <PageHeader
                breadcrumb={[
                    { label: "Pusat Informasi", href: "/bic" },
                    { label: "Artikel" },
                ]}
                eyebrow="Publikasi Desa"
                title="Pusat Pengetahuan Bantaragung"
                subtitle="Dokumentasi kegiatan KKN, berita desa, edukasi, dan publikasi program Desa Bantaragung."
            />

            <section className="max-w-7xl mx-auto px-6 py-12 md:py-16 space-y-10">
                <div className="flex flex-wrap items-center gap-2" role="tablist" aria-label="Filter asal artikel">
                    {TABS.map((tab) => {
                        const active = selected === tab.key;
                        const href =
                            tab.key === "all"
                                ? "/bic/artikel"
                                : `/bic/artikel?origin=${tab.key}`;
                        return (
                            <Link
                                key={tab.key}
                                href={href}
                                role="tab"
                                aria-selected={active}
                                className={`rounded-full px-5 py-2 text-sm font-semibold transition ${
                                    active
                                        ? "bg-forest-800 text-white shadow-sm"
                                        : "bg-white/80 border border-forest-200/70 text-forest-700 hover:bg-forest-100"
                                }`}
                            >
                                {tab.label} ({counts[tab.key]})
                            </Link>
                        );
                    })}
                </div>

                {articles.length > 0 ? (
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 items-stretch" data-stagger>
                        {articles.map((article) => (
                            <ArticleCard key={article.slug} article={article} />
                        ))}
                    </div>
                ) : (
                    <div className="rounded-2xl bg-white/80 border border-forest-200/70 p-12 text-center text-slate-600">
                        Belum ada artikel pada kategori ini.
                    </div>
                )}
            </section>
        </main>
    );
}
