import fs from "fs";
import path from "path";
import PageHeader from "@/app/components/layout/PageHeader";
import Reveal from "@/app/components/ui/Reveal";
import { assetUrl } from "@/lib/asset";
import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Galeri Kegiatan KKN",
    description:
        "Dokumentasi kegiatan KKN-PPM UGM Simfoni Sindangwangi Periode IV 2025 di Desa Bantaragung dan Desa Sindangwangi, Majalengka.",
};

const CAPTIONS: Record<string, string> = {
    "curug-cipeuteuy": "Curug Cipeuteuy",
    "edukasi-sekolah": "Edukasi Sekolah",
    "festival-budaya": "Festival Budaya",
    "gotong-royong": "Gotong Royong",
    "keberangkatan": "Keberangkatan",
    "panen-bersama": "Panen Bersama",
    "pelatihan-umkm": "Pelatihan UMKM",
    "penanaman-herbal": "Penanaman Herbal",
    "Penerjunan": "Penerjunan",
    "penutupan": "Penutupan",
    "penyambutan": "Penyambutan",
    "terasering": "Terasering",
    "workshop-jamu": "Workshop Jamu",
};

const KKN_LOGOS = [
    { src: "_brand/logo/LogoAlmamaterUgm.png", alt: "Universitas Gadjah Mada" },
    { src: "_brand/logo/LogoKknPpmUgm.png", alt: "KKN-PPM UGM" },
    { src: "_brand/logo/LogoSimfoniSindangwangi.png", alt: "Simfoni Sindangwangi" },
];

const SPONSOR_LOGOS = [
    { src: "_brand/logo/LogoCimbNiaga.png", alt: "CIMB Niaga" },
    { src: "_brand/logo/LogoPupukKaltim.png", alt: "Pupuk Kaltim" },
    { src: "_brand/logo/LogoKaltimMethanolIndustri.png", alt: "Kaltim Methanol Industri" },
    { src: "_brand/logo/LogoSpesialSambal.png", alt: "Spesial Sambal SS" },
];

function LogoCard({ src, label }: { src: string; label: string }) {
    return (
        <div className="flex flex-col items-center justify-center gap-3 bg-white rounded-2xl border border-forest-200/60 shadow-sm px-6 py-6 min-h-24">
            {/* ponytail: naive <img>, upgrade to ImageWithSkeleton when needed */}
            <img src={assetUrl(src)} alt={label} className="h-14 w-auto object-contain" loading="lazy" />
            <span className="text-xs md:text-sm font-medium text-forest-800 text-center">{label}</span>
        </div>
    );
}

function humanize(file: string): string {
    const slug = file.replace(/\.[^.]+$/, "");
    const caption = CAPTIONS[slug];
    if (caption) return caption;
    return slug
        .replace(/[-_]+/g, " ")
        .trim()
        .replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function GaleriPage() {
    const dir = path.join(process.cwd(), "public", "galeri");
    const files = fs
        .readdirSync(dir)
        .filter((f) => /\.(png|jpe?g|webp|gif)$/i.test(f))
        .sort();

    return (
        <main className="min-h-screen">
            <PageHeader
                breadcrumb={[{ label: "Galeri" }]}
                eyebrow="Dokumentasi Kegiatan"
                title="Galeri Kegiatan KKN"
                subtitle="Momen-momen berharga selama pelaksanaan KKN-PPM UGM Simfoni Sindangwangi di Desa Bantaragung dan Desa Sindangwangi."
            />

            <section className="max-w-7xl mx-auto px-6 py-16">
                <div className="columns-1 md:columns-2 lg:columns-3 gap-4 space-y-4">
                    {files.map((file, i) => {
                        const caption = humanize(file);
                        const slug = file.replace(/\.[^.]+$/, "").toLowerCase();
                        return (
                            <Reveal
                                key={file}
                                delay={(i % 3) * 100}
                                className="break-inside-avoid"
                            >
                                <figure className="overflow-hidden rounded-2xl bg-white border border-forest-200/60 shadow-sm group">
                                <div className="overflow-hidden">
                                    <img
                                        src={`/galeri/${file}`}
                                        alt={caption}
                                        loading="lazy"
                                        decoding="async"
                                        className={`w-full object-cover group-hover:scale-105 transition-transform duration-300 ${
                                            slug === "penerjunan" || slug === "panen-bersama"
                                                ? "h-80"
                                                : "h-56"
                                        }`}
                                    />
                                </div>
                                <figcaption className="px-4 py-3 text-sm font-medium text-forest-800">
                                    {caption}
                                </figcaption>
                            </figure>
                            </Reveal>
                        );
                    })}
                </div>
            </section>

            {/* Tentang Program — KKN-PPM */}
            <section className="max-w-7xl mx-auto px-6 pb-16">
                <div className="bg-white/60 border border-forest-200/60 rounded-3xl p-8 md:p-12">
                    <p className="text-xs font-semibold uppercase tracking-widest text-clay-500 mb-2">
                        KKN-PPM
                    </p>
                    <h2 className="font-display font-bold text-forest-800 text-3xl md:text-4xl mb-4">
                        Tentang Program
                    </h2>
                    <p className="text-slate-600 max-w-3xl leading-relaxed">
                        KKN-PPM UGM Simfoni Sindangwangi Periode IV 2025 berbasis di Desa Bantaragung
                        untuk mendampingi warga membangun wisata berkelanjutan, mengelola kampung
                        herbal, dan mengembangkan potensi digital desa.
                    </p>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-8">
                        {KKN_LOGOS.map((logo) => (
                            <LogoCard key={logo.src} src={logo.src} label={logo.alt} />
                        ))}
                    </div>
                </div>
            </section>

            {/* Sponsor & Mitra */}
            <section className="max-w-7xl mx-auto px-6 pb-16">
                <div className="rounded-3xl bg-white/60 border border-forest-200/60 p-8 md:p-12">
                    <div className="text-center max-w-2xl mx-auto">
                        <p className="text-xs font-semibold uppercase tracking-widest text-clay-500 mb-2">
                            Sponsor & Mitra
                        </p>
                        <h2 className="font-display font-bold text-forest-800 text-3xl md:text-4xl mb-4">
                            Special Thanks
                        </h2>
                        <p className="text-slate-600 leading-relaxed">
                            Terima kasih atas dukungan dan kerja sama yang telah diberikan kepada
                            program ini.
                        </p>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
                        {SPONSOR_LOGOS.map((logo) => (
                            <LogoCard key={logo.src} src={logo.src} label={logo.alt} />
                        ))}
                    </div>
                </div>
            </section>
        </main>
    );
}
