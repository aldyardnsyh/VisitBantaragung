import Link from "next/link";
import { getAllHomestay } from "@/lib/content";
import { assetUrl } from "@/lib/asset";
import ImageWithSkeleton from "@/app/components/ui/ImageWithSkeleton";
import PageHeader from "@/app/components/layout/PageHeader";
import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Homestay Desa Bantaragung",
    description:
        "Penginapan warga untuk pengalaman live-in di desa wisata Bantaragung. Nikmati suasana pedesaan dan kuliner lokal.",
};

export default function HomestayListPage() {
    const items = getAllHomestay();

    return (
        <main className="min-h-screen">
            <PageHeader
                breadcrumb={[{ label: "Branding Desa", href: "/bdb" }, { label: "Homestay" }]}
                eyebrow="Homestay"
                title="Homestay Desa Bantaragung"
                subtitle="Penginapan warga untuk pengalaman live-in desa wisata, lengkap dengan fasilitas dan harga."
            />

            <section className="max-w-7xl mx-auto px-6 py-16">
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6" data-stagger>
                    {items.map((h) => (
                        <Link
                            key={h.slug}
                            href={`/bdb/homestay/${h.slug}`}
                            className="group flex flex-col bg-white rounded-2xl overflow-hidden border border-forest-200/60 shadow-sm hover:shadow-lg hover:-translate-y-1 transition"
                        >
                            <ImageWithSkeleton
                                src={assetUrl(h.cover)}
                                alt={h.name}
                                className="aspect-[4/3] group-hover:scale-105 transition-transform duration-300"
                            />
                            <div className="p-5 flex flex-col gap-2 flex-1">
                                <div className="flex items-center justify-between gap-2">
                                    <h3 className="font-semibold text-forest-800 leading-snug">
                                        {h.name}
                                    </h3>
                                    {h.price && (
                                        <span className="bg-clay-100 text-clay-500 rounded-full px-3 py-1 text-xs font-semibold whitespace-nowrap">
                                            {h.price}
                                        </span>
                                    )}
                                </div>
                                <p className="text-sm text-slate-600 line-clamp-2">{h.excerpt}</p>
                                <div className="mt-auto flex flex-wrap gap-2 pt-2">
                                    <span className="bg-forest-100 text-forest-700 rounded-full px-3 py-1 text-xs">
                                        Kapasitas {h.capacity}
                                    </span>
                                    <span className="bg-forest-100 text-forest-700 rounded-full px-3 py-1 text-xs">
                                        {h.facilities.length} Fasilitas
                                    </span>
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>
            </section>
        </main>
    );
}