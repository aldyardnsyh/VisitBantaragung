import Link from "next/link";
import { getAllUMKM } from "@/lib/content";
import { assetUrl } from "@/lib/asset";
import ImageWithSkeleton from "@/app/components/ui/ImageWithSkeleton";
import PageHeader from "@/app/components/layout/PageHeader";
import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "UMKM Desa Bantaragung",
    description:
        "Katalog produk unggulan UMKM lokal Desa Bantaragung, Majalengka. Dukung ekonomi kreatif desa wisata.",
};

export default function UMKMListPage() {
    const items = getAllUMKM();

    return (
        <main className="min-h-screen">
            <PageHeader
                breadcrumb={[{ label: "Branding Desa", href: "/bdb" }, { label: "UMKM" }]}
                eyebrow="UMKM Lokal"
                title="UMKM Desa Bantaragung"
                subtitle="Produk unggulan hasil karya masyarakat Desa Bantaragung  -  dukung ekonomi kreatif desa wisata."
            />

            <section className="max-w-7xl mx-auto px-6 py-16">
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6" data-stagger>
                    {items.map((u) => (
                        <Link
                            key={u.slug}
                            href={`/bdb/umkm/${u.slug}`}
                            className="group flex flex-col bg-white rounded-2xl overflow-hidden border border-forest-200/60 shadow-sm hover:shadow-lg hover:-translate-y-1 transition"
                        >
                            <ImageWithSkeleton
                                src={assetUrl(u.cover)}
                                alt={u.name}
                                className="aspect-[4/3] group-hover:scale-105 transition-transform duration-300"
                            />
                            <div className="p-5 flex flex-col gap-2 flex-1">
                                <h3 className="font-semibold text-forest-800 leading-snug">
                                    {u.name}
                                </h3>
                                <p className="text-sm text-slate-600 line-clamp-2">{u.excerpt}</p>
                                <span className="mt-auto inline-flex items-center gap-1 text-sm font-semibold text-forest-600 transition-colors duration-200 group-hover:text-clay-600 pt-2">
                                    Lihat produk
                                    <span aria-hidden className="transition-transform group-hover:translate-x-0.5">→</span>
                                </span>
                            </div>
                        </Link>
                    ))}
                </div>
            </section>
        </main>
    );
}
