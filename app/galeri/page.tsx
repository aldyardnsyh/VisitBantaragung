import fs from "fs";
import path from "path";
import Link from "next/link";
import type { ReactNode } from "react";
import PageHeader from "@/app/components/layout/PageHeader";
import { assetUrl } from "@/lib/asset";
import { toJsonLd } from "@/lib/jsonld";
import GaleriClient from "./GaleriClient";
import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Galeri KKN-PPM UGM Simfoni Sindangwangi di Bantaragung",
    description:
        "Dokumentasi foto Kuliah Kerja Nyata (KKN) UGM Simfoni Sindangwangi di Desa Bantaragung dan Desa Sindangwangi, Majalengka: edukasi, UMKM, kampung herbal, budaya, dan wisata. Lengkap dengan cerita tiap momen.",
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

// Tanya-jawab nyata seputar KKN di desa ini: ditulis dari fakta program
// (lokasi, periode, kegiatan), bukan template generik.
const FAQ_KKN: { q: string; t?: string; a: ReactNode }[] = [
    {
        q: "Apa itu KKN-PPM UGM Simfoni Sindangwangi?",
        a: "KKN-PPM UGM Simfoni Sindangwangi adalah program Kuliah Kerja Nyata Pembelajaran Pemberdayaan Masyarakat Universitas Gadjah Mada yang ditempatkan di Kecamatan Sindangwangi, Kabupaten Majalengka. Tim mendampingi warga membangun wisata berkelanjutan, mengelola kampung herbal, memberdayakan UMKM, dan mengembangkan platform digital desa seperti situs ini.",
    },
    {
        q: "Di mana lokasi kegiatan KKN?",
        a: "Kegiatan berpusat di Desa Bantaragung dan Desa Sindangwangi, Kecamatan Sindangwangi, Kabupaten Majalengka, Jawa Barat, di kaki Gunung Ciremai. Seluruh destinasi yang terdokumentasi di galeri ini berada di kedua desa tersebut.",
    },
    {
        q: "Apa saja program yang dijalankan mahasiswa KKN?",
        a: "Programnya meliputi pendampingan desa wisata (Curug Cipeuteuy, Terasering Ciboer Pass, Pasar Bumi Pakuwon), pengembangan Kampung Herbal Mertasela dan workshop jamu, pelatihan UMKM seperti emping melinjo, edukasi di sekolah, penanaman pohon endemik, serta digitalisasi desa melalui peta digital dan situs web.",
    },
    {
        q: "Apakah wisatawan bisa berkunjung ke lokasi KKN?",
        t: "Bisa. Seluruh destinasi di Desa Wisata Bantaragung terbuka untuk umum, dari wisata alam, kuliner, hingga live-in bersama warga dan homestay. Lihat pilihannya di laman wisata atau hubungi pengelola melalui laman kontak.",
        a: (
            <>
                Bisa. Seluruh destinasi di Desa Wisata Bantaragung terbuka untuk umum, dari wisata alam, kuliner, hingga live-in bersama warga dan homestay. Lihat pilihannya di{" "}
                <Link href="/wisata" className="text-forest-600 font-medium hover:text-clay-500">laman wisata</Link>{" "}
                atau hubungi pengelola melalui{" "}
                <Link href="/kontak" className="text-forest-600 font-medium hover:text-clay-500">laman kontak</Link>.
            </>
        ),
    },
    {
        q: "Di mana bisa melihat dokumentasi kegiatan KKN lainnya?",
        t: "Selain galeri foto ini, cerita dan dokumentasi kegiatan dipublikasikan berkala di laman berita. Arsip postingan harian juga tersedia di situs dan media sosial resmi desa.",
        a: (
            <>
                Selain galeri foto ini, cerita dan dokumentasi kegiatan dipublikasikan berkala di{" "}
                <Link href="/bic/artikel" className="text-forest-600 font-medium hover:text-clay-500">laman berita</Link>.
                Arsip postingan harian juga tersedia di situs dan media sosial resmi desa.
            </>
        ),
    },
];

export default function GaleriPage() {
    const dir = path.join(process.cwd(), "public", "galeri");
    const files = fs
        .readdirSync(dir)
        .filter((f) => /\.(png|jpe?g|webp|gif)$/i.test(f))
        .sort();

    const faqJsonLd = {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: FAQ_KKN.map((f) => ({
            "@type": "Question",
            name: f.q,
            acceptedAnswer: {
                "@type": "Answer",
                text:
                    f.t ??
                    (typeof f.a === "string"
                        ? f.a
                        : "Lihat jawaban lengkap di laman galeri Desa Wisata Bantaragung."),
            },
        })),
    };

    return (
        <main className="min-h-screen">
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: toJsonLd(faqJsonLd) }}
            />
            <PageHeader
                breadcrumb={[{ label: "Galeri" }]}
                eyebrow="Dokumentasi KKN-PPM UGM"
                title="Galeri KKN-PPM UGM Simfoni Sindangwangi"
                subtitle="Momen berharga Kuliah Kerja Nyata UGM di Desa Bantaragung dan Desa Sindangwangi, Majalengka: edukasi, UMKM, kampung herbal, budaya, dan wisata desa."
            />

            <section className="max-w-7xl mx-auto px-6 py-16">
                <GaleriClient files={files} />
            </section>

            {/* Profil KKN */}
            <section className="max-w-7xl mx-auto px-6 pb-16">
                <div className="bg-white/60 border border-forest-200/60 rounded-3xl p-8 md:p-12">
                    <p className="text-xs font-semibold uppercase tracking-widest text-clay-500 mb-2">
                        Profil Program
                    </p>
                    <h2 className="font-display font-bold text-forest-800 text-3xl md:text-4xl mb-4">
                        KKN-PPM UGM Simfoni Sindangwangi di Majalengka
                    </h2>
                    <p className="text-slate-600 max-w-3xl leading-relaxed">
                        Program Kuliah Kerja Nyata Pembelajaran Pemberdayaan Masyarakat
                        Universitas Gadjah Mada (KKN-PPM UGM) Simfoni Sindangwangi Periode IV 2025
                        ditempatkan di Desa Bantaragung dan Desa Sindangwangi, Kecamatan
                        Sindangwangi, Kabupaten Majalengka, Jawa Barat.
                    </p>
                    <dl className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-8">
                        {[
                            ["Lokasi", "Bantaragung dan Sindangwangi"],
                            ["Fokus", "Wisata, herbal, UMKM, digital desa"],
                            ["Kegiatan", "Edukasi, budaya, konservasi"],
                            ["Luaran", "Situs web dan peta digital"],
                        ].map(([k, v]) => (
                            <div
                                key={k}
                                className="rounded-2xl bg-white border border-forest-200/60 px-5 py-4"
                            >
                                <dt className="text-xs font-semibold uppercase tracking-widest text-clay-500">
                                    {k}
                                </dt>
                                <dd className="font-medium text-forest-800 mt-1">{v}</dd>
                            </div>
                        ))}
                    </dl>
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

            {/* Tanya Jawab KKN */}
            <section className="max-w-7xl mx-auto px-6 pb-16">
                <div className="bg-white/60 border border-forest-200/60 rounded-3xl p-8 md:p-12">
                    <p className="text-xs font-semibold uppercase tracking-widest text-clay-500 mb-2">
                        Tanya Jawab
                    </p>
                    <h2 className="font-display font-bold text-forest-800 text-3xl md:text-4xl mb-6">
                        Seputar KKN di Bantaragung
                    </h2>
                    <div className="space-y-3 max-w-3xl">
                        {FAQ_KKN.map((f) => (
                            <details
                                key={f.q}
                                className="group rounded-2xl border border-forest-200/60 bg-white px-5 py-4"
                            >
                                <summary className="cursor-pointer font-semibold text-forest-800 list-none flex items-center justify-between gap-4">
                                    {f.q}
                                    <span aria-hidden className="text-clay-500 transition-transform group-open:rotate-45 text-xl leading-none">+</span>
                                </summary>
                                <p className="text-slate-600 leading-relaxed mt-3 text-sm md:text-base">
                                    {f.a}
                                </p>
                            </details>
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
