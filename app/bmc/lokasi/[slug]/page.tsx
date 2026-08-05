import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getAllLocations, getLocationBySlug, type Location } from "@/lib/content";
import { assetUrl } from "@/lib/asset";
import Breadcrumb from "@/app/components/ui/Breadcrumb";
import ImageWithSkeleton from "@/app/components/ui/ImageWithSkeleton";

interface LocationDetailProps {
    params: Promise<{ slug: string }>;
}

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://visitbantaragung.com";

type LocationDetailData = Location & { description?: string };

export const dynamic = "force-static";

export function generateStaticParams() {
    return getAllLocations().map((location) => ({ slug: location.slug }));
}

export async function generateMetadata({
    params,
}: LocationDetailProps): Promise<Metadata> {
    const { slug } = await params;
    let location: LocationDetailData;
    try {
        location = getLocationBySlug(slug) as LocationDetailData;
    } catch {
        return { title: "Lokasi Tidak Ditemukan" };
    }
    return {
        title: `${location.name} - Lokasi Bantaragung`,
        description: location.excerpt,
        alternates: {
            canonical: `${SITE_URL}/bmc/lokasi/${location.slug}`,
        },
    };
}

export default async function LocationDetailPage({ params }: LocationDetailProps) {
    const { slug } = await params;

    let location: LocationDetailData;
    try {
        location = getLocationBySlug(slug) as LocationDetailData;
    } catch {
        notFound();
    }

    const embedUrl = `https://maps.google.com/maps?q=${location.lat},${location.lng}&z=14&output=embed`;
    const externalUrl = `https://www.google.com/maps?q=${location.lat},${location.lng}`;

    return (
        <main className="min-h-screen bg-white">
            <div className="max-w-5xl mx-auto px-6 py-16 space-y-8 animate-fade-up">
                <Breadcrumb
                    items={[
                        { label: "Peta Digital", href: "/bmc" },
                        { label: location.name },
                    ]}
                />

                <section className="space-y-4">
                    <div className="flex items-center gap-2">
                        <span className="bg-forest-100 text-forest-700 rounded-full px-3 py-1 text-xs font-semibold">
                            {location.category}
                        </span>
                        <span className="rounded-full bg-white border border-forest-200/70 px-3 py-1 text-xs text-slate-600">
                            {location.lat}, {location.lng}
                        </span>
                    </div>
                    <h1 className="font-display font-bold text-forest-800 text-3xl md:text-4xl leading-tight">
                        {location.name}
                    </h1>
                </section>

                <div className="rounded-2xl overflow-hidden shadow-md border border-forest-200/70 bg-white/80">
                    <ImageWithSkeleton
                        src={assetUrl(location.cover)}
                        alt={location.name}
                        aspectRatio="auto"
                        className="aspect-[16/9] max-h-[30rem] rounded-2xl"
                    />
                </div>

                <section className="rounded-2xl p-6 md:p-8 bg-white/80 border border-forest-200/70 shadow-sm space-y-4">
                    <p className="text-slate-600 leading-relaxed">{location.excerpt}</p>
                    {location.description && (
                        <p className="text-slate-600 leading-relaxed">
                            {location.description}
                        </p>
                    )}
                    <div className="flex flex-wrap gap-3 pt-2">
                        <a
                            href={externalUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-2 bg-clay-500 hover:bg-clay-600 text-white rounded-full px-5 py-2.5 font-semibold transition hover:scale-[1.02] active:scale-[0.98]"
                        >
                            Buka di Google Maps
                            <span aria-hidden>→</span>
                        </a>
                        <Link
                            href="/bmc"
                            className="inline-flex items-center gap-2 text-forest-600 hover:text-clay-500 hover:font-semibold font-medium transition"
                        >
                            <span aria-hidden>←</span> Kembali ke Peta Digital
                        </Link>
                    </div>
                </section>

                <section className="rounded-2xl overflow-hidden shadow-md border border-forest-200/70 bg-white/80">
                    <iframe
                        src={embedUrl}
                        loading="lazy"
                        referrerPolicy="no-referrer-when-downgrade"
                        title={`Peta lokasi ${location.name}`}
                        className="w-full h-[420px] border-0"
                        allowFullScreen
                    />
                </section>
            </div>
        </main>
    );
}
