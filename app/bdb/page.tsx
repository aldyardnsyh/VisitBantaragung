import Link from "next/link";
import { getAllHomestay, getAllUMKM } from "@/lib/content";
import PageHeader from "@/app/components/layout/PageHeader";
import Reveal from "@/app/components/ui/Reveal";
import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Branding Desa (BDB)",
    description:
        "Bantaragung Digital Branding  -  Katalog digital UMKM lokal, homestay, dan potensi ekonomi kreatif Desa Bantaragung, Majalengka.",
};

export default function BDBLanding() {
    const homestayCount = getAllHomestay().length;
    const umkmCount = getAllUMKM().length;

    const cards = [
        {
            href: "/bdb/homestay",
            title: "Homestay",
            count: homestayCount,
            description:
                "Penginapan warga untuk pengalaman live-in di tengah desa wisata: suasana pedesaan, kuliner lokal, dan keramahan tuan rumah.",
            icon: (
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
                    />
                </svg>
            ),
        },
        {
            href: "/bdb/umkm",
            title: "UMKM Lokal",
            count: umkmCount,
            description:
                "Katalog usaha mikro masyarakat Bantaragung: warung, toko, dan produk lokal yang siap dipesan langsung via WhatsApp.",
            icon: (
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
                    />
                </svg>
            ),
        },
    ];

    return (
        <main className="min-h-screen">
            <PageHeader
                breadcrumb={[{ label: "Branding Desa" }]}
                eyebrow="BDB"
                title="Bantaragung Digital Branding"
                subtitle="Katalog digital potensi Desa Bantaragung yang mencakup UMKM lokal, homestay, serta paket wisata edukasi."
            />

            <section className="max-w-7xl mx-auto px-6 py-16 space-y-12">
                <section className="prose max-w-3xl">
                    <h2 className="font-display text-2xl md:text-3xl font-bold text-forest-800">
                        Bisnis Desa Bantaragung
                    </h2>
                    <p className="text-slate-600 leading-relaxed">
                        BDB menghadirkan panggung digital bagi pelaku usaha dan penyedia penginapan
                        desa. Setiap kunjungan wisatawan turut mendorong ekonomi warga  -  mulai dari
                        menginap di homestay warga hingga berbelanja kebutuhan di UMKM setempat.
                    </p>
                </section>

                <section className="grid md:grid-cols-2 gap-6">
                    {cards.map((card, i) => (
                        <Reveal key={card.href} delay={i * 120} className="h-full">
                            <Link
                                href={card.href}
                                className="group flex flex-col bg-white rounded-2xl border border-forest-200/60 shadow-sm hover:shadow-md transition p-8 gap-4 h-full"
                        >
                            <div className="flex items-center justify-between">
                                <span className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-forest-100 text-forest-700">
                                    {card.icon}
                                </span>
                                <span className="bg-clay-100 text-clay-500 rounded-full px-3 py-1 text-xs font-semibold">
                                    {card.count} Tersedia
                                </span>
                            </div>
                            <h3 className="font-display text-2xl font-bold text-forest-800">
                                {card.title}
                            </h3>
                            <p className="text-slate-600 leading-relaxed">{card.description}</p>
                            <span className="mt-auto inline-flex items-center gap-1 text-sm font-semibold text-forest-600 transition-colors duration-200 group-hover:text-clay-600">
                                Jelajahi {card.title}
                                <span aria-hidden className="transition-transform group-hover:translate-x-0.5">→</span>
                            </span>
                            </Link>
                        </Reveal>
                    ))}
                </section>
            </section>
        </main>
    );
}
