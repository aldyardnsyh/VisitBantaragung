import Link from "next/link";
import type { Metadata } from "next";
import { getMapsConfig, getAllLocations } from "@/lib/content";
import { assetUrl } from "@/lib/asset";
import PageHeader from "@/app/components/layout/PageHeader";
import SectionHeading from "@/app/components/ui/SectionHeading";
import ImageWithSkeleton from "@/app/components/ui/ImageWithSkeleton";
import MapGalleryClient from "./MapGalleryClient";

export const metadata: Metadata = {
    title: "Peta Digital (BMC)",
    description:
        "Bantaragung Map Center  -  Galeri peta digital hasil mapping wilayah, wisata, infrastruktur, dan data spasial Desa Bantaragung.",
    alternates: { canonical: "/bmc" },
};

export default function BMCPage() {
    const mapsConfig = getMapsConfig();
    const locations = getAllLocations();
    const totalMaps = mapsConfig.categories.reduce(
        (sum, category) => sum + category.maps.length,
        0
    );

    return (
        <main className="min-h-screen">
            <PageHeader
                breadcrumb={[{ label: "Peta Digital" }]}
                eyebrow="BMC"
                title="Bantaragung Map Center"
                subtitle="Galeri peta digital Desa Bantaragung hasil mapping untuk transparansi informasi wilayah, wisata, infrastruktur, dan data spasial lainnya."
            >
                <div className="flex flex-wrap gap-4 pt-2">
                    <div className="bg-white/10 border border-white/15 rounded-2xl px-5 py-3 text-center">
                        <p className="font-display text-2xl font-bold text-clay-300">
                            {totalMaps}
                        </p>
                        <p className="text-xs text-white/80">Total Peta</p>
                    </div>
                    <div className="bg-white/10 border border-white/15 rounded-2xl px-5 py-3 text-center">
                        <p className="font-display text-2xl font-bold text-clay-300">
                            {mapsConfig.categories.length}
                        </p>
                        <p className="text-xs text-white/80">Kategori</p>
                    </div>
                    <div className="bg-white/10 border border-white/15 rounded-2xl px-5 py-3 text-center">
                        <p className="font-display text-2xl font-bold text-clay-300">
                            {locations.length}
                        </p>
                        <p className="text-xs text-white/80">Titik Lokasi</p>
                    </div>
                </div>
            </PageHeader>

            <section className="max-w-7xl mx-auto px-6 py-16 md:py-20 space-y-14">
                <section>
                    <SectionHeading
                        eyebrow="Kategori Peta"
                        title="Jelajahi Peta Berdasarkan Kategori"
                        subtitle="Peta hasil pemetaan dan digitalisasi wilayah Desa Bantaragung untuk mendukung transparansi informasi dan perencanaan pembangunan desa."
                    />
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3" data-stagger>
                        {mapsConfig.categories.map((category) => (
                            <div
                                key={category.id}
                                className="rounded-2xl p-6 bg-white/80 border border-forest-200/70 shadow-sm hover:shadow-md transition"
                            >
                                <div className="flex items-center gap-3 mb-3">
                                    <span className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-forest-100 text-xl">
                                        {category.icon}
                                    </span>
                                    <div>
                                        <h3 className="font-bold text-forest-800">
                                            {category.name}
                                        </h3>
                                        <p className="text-xs text-slate-500">
                                            {category.maps.length} peta
                                        </p>
                                    </div>
                                </div>
                                <p className="text-sm text-slate-600">
                                    {category.description}
                                </p>
                            </div>
                        ))}
                    </div>
                </section>

                <section>
                    <SectionHeading
                        eyebrow="Galeri"
                        title="Peta Digital Interaktif"
                        subtitle="Lihat detail setiap peta, perbesar, dan unduh untuk keperluan edukasi serta perencanaan."
                    />
                    <MapGalleryClient mapsConfig={mapsConfig} />
                </section>

                <section>
                    <SectionHeading
                        eyebrow="Titik Lokasi"
                        title="Peta Lokasi"
                        subtitle="Destinasi dan titik penting di Desa Bantaragung beserta koordinat dan peta lokasinya."
                    />
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3" data-stagger>
                        {locations.map((location) => (
                            <Link
                                key={location.slug}
                                href={`/bmc/lokasi/${location.slug}`}
                                className="group block h-full"
                            >
                                <article className="h-full flex flex-col rounded-2xl overflow-hidden bg-white/80 border border-forest-200/70 shadow-sm hover:shadow-lg hover:-translate-y-1 transition">
                                    <div className="relative">
                                        <ImageWithSkeleton
                                            src={assetUrl(location.cover)}
                                            alt={location.name}
                                            aspectRatio="auto"
                                            className="aspect-[4/3] group-hover:scale-105 transition-transform duration-300"
                                        />
                                        <span className="absolute top-3 left-3 rounded-full bg-forest-100 text-forest-700 px-3 py-1 text-xs font-semibold">
                                            {location.category}
                                        </span>
                                    </div>
                                    <div className="p-5 flex flex-col gap-2 grow">
                                        <h3 className="font-bold text-forest-800 leading-snug group-hover:text-forest-600 transition-colors">
                                            {location.name}
                                        </h3>
                                        <p className="text-sm text-slate-600 line-clamp-2">
                                            {location.excerpt}
                                        </p>
                                        <span className="mt-auto inline-flex items-center gap-1 text-forest-600 text-sm font-medium pt-1 transition-colors duration-200 group-hover:text-clay-600">
                                            Lihat Lokasi
                                            <span aria-hidden className="transition-transform group-hover:translate-x-0.5">→</span>
                                        </span>
                                    </div>
                                </article>
                            </Link>
                        ))}
                    </div>
                </section>
            </section>
        </main>
    );
}
