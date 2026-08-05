import Link from "next/link";
import type { Metadata } from "next";
import { getRecentArticles, type Article } from "@/lib/content";
import { assetUrl } from "@/lib/asset";
import PageHeader from "@/app/components/layout/PageHeader";
import SectionHeading from "@/app/components/ui/SectionHeading";
import ImageWithSkeleton from "@/app/components/ui/ImageWithSkeleton";

export const metadata: Metadata = {
    title: "Pusat Informasi (BIC)",
    description:
        "Bantaragung Information Center  -  Artikel kegiatan, edukasi desa, dan publikasi program pengembangan masyarakat Desa Bantaragung.",
    alternates: { canonical: "/bic" },
};

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
                        <span className="text-sm text-slate-500">{formatDate(article.date)}</span>
                    </div>
                    <h3 className="font-semibold text-forest-800 leading-snug line-clamp-2">
                        {article.title}
                    </h3>
                    <p className="text-sm text-slate-600 line-clamp-2 flex-1">{article.excerpt}</p>
                    <span className="mt-auto inline-flex items-center gap-1 text-forest-600 text-sm font-medium transition-colors duration-200 group-hover:text-clay-600">
                        Baca Selengkapnya
                        <span aria-hidden className="transition-transform group-hover:translate-x-0.5">→</span>
                    </span>
                </div>
            </article>
        </Link>
    );
}

export default function BICLanding() {
    const featured = getRecentArticles(6);

    return (
        <main className="min-h-screen">
            <PageHeader
                breadcrumb={[{ label: "Pusat Informasi" }]}
                eyebrow="BIC"
                title="Pusat Informasi Bantaragung"
                subtitle="Pusat dokumentasi digital Desa Bantaragung yang memuat artikel kegiatan, edukasi desa, dan publikasi program pengembangan masyarakat."
            />

            <section className="max-w-7xl mx-auto px-6 py-16 md:py-20 space-y-12">
                <SectionHeading
                    eyebrow="Sorotan"
                    title="Artikel Terbaru"
                    subtitle="Kumpulan dokumentasi kegiatan dan berita terkini dari Desa Bantaragung."
                />

                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 items-stretch" data-stagger>
                    {featured.map((article) => (
                        <ArticleCard key={article.slug} article={article} />
                    ))}
                </div>

                <section className="rounded-2xl bg-gradient-to-br from-forest-700 to-forest-800 p-8 md:p-10 flex flex-col md:flex-row items-center justify-between gap-6 shadow-md">
                    <div className="text-center md:text-left space-y-2">
                        <h2 className="font-display text-2xl font-bold text-white">
                            Jelajahi Semua Artikel
                        </h2>
                        <p className="text-white/85 max-w-xl">
                            Telusuri seluruh dokumentasi kegiatan KKN, berita desa, edukasi, dan
                            publikasi program pengembangan masyarakat.
                        </p>
                    </div>
                    <Link
                        href="/bic/artikel"
                        className="inline-flex items-center gap-2 bg-clay-500 hover:bg-clay-600 text-white rounded-full px-5 py-2.5 font-semibold transition hover:scale-[1.02] active:scale-[0.98] shrink-0"
                    >
                        Lihat Semua Artikel
                        <span aria-hidden>→</span>
                    </Link>
                </section>
            </section>
        </main>
    );
}
