import Link from "next/link";
import { getAllWisata } from "@/lib/content";
import { assetUrl } from "@/lib/asset";
import ImageWithSkeleton from "@/app/components/ui/ImageWithSkeleton";
import SectionHeading from "@/app/components/ui/SectionHeading";
import Reveal from "@/app/components/ui/Reveal";
import PageHeader from "@/app/components/layout/PageHeader";
import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Wisata Alam & Edukasi",
    description:
        "Jelajahi destinasi wisata alam dan edukasi terbaik di Desa Bantaragung, Majalengka. Ciboer Pass, Curug Cipeuteuy, dan lainnya.",
};

// Destinasi (alam/kuliner/edukasi) tampil dulu; tradisi, akomodasi, dan paket di akhir.
const URUTAN_KATEGORI: Record<string, number> = {
    alam: 1,
    kuliner: 2,
    edukasi: 3,
    akomodasi: 4,
    budaya: 5,
    paket: 6,
};

const LABEL_KATEGORI: Record<string, string> = {
    alam: "Wisata Alam",
    kuliner: "Kuliner",
    edukasi: "Edukasi",
    akomodasi: "Akomodasi",
    budaya: "Budaya",
    paket: "Paket Wisata",
};

export default function WisataPage() {
    const items = getAllWisata().sort(
        (a, b) =>
            (URUTAN_KATEGORI[a.kategori] ?? 99) - (URUTAN_KATEGORI[b.kategori] ?? 99) ||
            a.title.localeCompare(b.title, "id")
    );

    return (
        <main className="min-h-screen">
            <PageHeader
                breadcrumb={[{ label: "Wisata" }]}
                eyebrow="Wisata Desa"
                title="Jelajahi Wisata Bantaragung"
                subtitle="Temukan destinasi wisata alam dan edukasi terbaik di Desa Bantaragung, lengkap dengan informasi aktivitas, fasilitas, dan cerita lokal."
            />

            <section className="max-w-7xl mx-auto px-6 py-16">
                <Reveal>
                    <SectionHeading
                        align="left"
                        title={`${items.length} Destinasi Pilihan`}
                        subtitle="Alam, edukasi, dan budaya yang bisa Anda jelajahi di kaki Gunung Ciremai."
                    />
                </Reveal>

                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6" data-stagger>
                    {items.map((w) => (
                        <Link
                            key={w.slug}
                            href={`/wisata/${w.slug}`}
                            className="group flex flex-col bg-white rounded-2xl overflow-hidden border border-forest-200/60 shadow-sm hover:shadow-lg hover:-translate-y-1 transition"
                        >
                            <ImageWithSkeleton
                                src={assetUrl(w.cover)}
                                alt={w.title}
                                className="aspect-[4/3] group-hover:scale-105 transition-transform duration-300"
                            />
                            <div className="p-5 flex flex-col gap-2 flex-1">
                                <span className="w-fit bg-clay-100 text-clay-600 rounded-full px-3 py-1 text-xs font-semibold">
                                    {LABEL_KATEGORI[w.kategori] ?? w.kategori}
                                </span>
                                <h3 className="font-semibold text-forest-800 leading-snug">
                                    {w.title}
                                </h3>
                                <p className="text-sm text-slate-600 line-clamp-2">
                                    {w.excerpt}
                                </p>
                                <div className="mt-auto flex flex-wrap gap-2 pt-2">
                                    {w.activities.slice(0, 2).map((a) => (
                                        <span
                                            key={a}
                                            className="bg-forest-100 text-forest-700 rounded-full px-3 py-1 text-xs"
                                        >
                                            {a}
                                        </span>
                                    ))}
                                </div>
                                <span className="inline-flex items-center gap-1 text-sm font-semibold text-forest-600 transition-colors duration-200 group-hover:text-clay-600">
                                    Selengkapnya
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