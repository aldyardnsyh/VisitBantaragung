import Link from "next/link";
import { getAllHerbal } from "@/lib/content";
import PageHeader from "@/app/components/layout/PageHeader";
import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Kampung Herbal (B2H)",
    description:
        "Bantaragung Herbal Hub  -  Pusat edukasi tanaman obat keluarga yang mengintegrasikan wisata, kesehatan alami, dan pemberdayaan masyarakat.",
};

export default function B2HLanding() {
    const plants = getAllHerbal();
    const benefits = plants.reduce((n, p) => n + p.benefits.length, 0);
    const usage = plants.reduce((n, p) => n + p.usage.length, 0);

    const stats = [
        { value: String(plants.length), label: "Jenis Tanaman" },
        { value: String(benefits), label: "Manfaat Tercatat" },
        { value: String(usage), label: "Cara Pemanfaatan" },
    ];

    return (
        <main className="min-h-screen">
            <PageHeader
                breadcrumb={[{ label: "Kampung Herbal" }]}
                eyebrow="B2H"
                title="Bantaragung Herbal Hub"
                subtitle="Kampung Herbal Desa Bantaragung merupakan pusat edukasi tanaman obat keluarga (TOGA) yang mengintegrasikan wisata, kesehatan alami, dan pemberdayaan masyarakat."
            >
                <div className="flex flex-wrap gap-4 pt-2 animate-fade-up">
                    {stats.map((s) => (
                        <div
                            key={s.label}
                            className="bg-white/10 border border-white/15 rounded-2xl px-5 py-3 text-center"
                        >
                            <p className="font-display text-2xl font-bold text-clay-300">{s.value}</p>
                            <p className="text-xs text-white/80">{s.label}</p>
                        </div>
                    ))}
                </div>
            </PageHeader>

            <section className="max-w-7xl mx-auto px-6 py-16 space-y-12">
                <section className="grid gap-6 lg:grid-cols-2" data-stagger>
                    <h2 className="font-display text-2xl md:text-3xl font-bold text-forest-800">
                        Jelajah Katalog Tanaman Obat
                    </h2>
                    <p className="text-slate-600 leading-relaxed">
                        Kampung herbal membudidayakan ratusan jenis tanaman obat yang tumbuh subur di
                        kebun warga dan kawasan wisata desa. Katalog lengkap memuat nama Latin,
                        manfaat, dan cara pemanfaatan tiap tanaman untuk edukasi dan pengunjung
                        yang ingin mengenal warisan pengobatan tradisional.
                    </p>
                </section>

                <section className="rounded-2xl bg-gradient-to-br from-forest-700 to-forest-800 p-8 md:p-10 flex flex-col md:flex-row items-center justify-between gap-6 shadow-md">
                    <div className="text-center md:text-left space-y-2">
                        <h2 className="font-display text-2xl font-bold text-white">
                            {plants.length} Tanaman Obat Siap Dipelajari
                        </h2>
                        <p className="text-white/85 max-w-xl">
                            Telusuri katalog bergambar, lengkap dengan manfaat dan cara konsumsi
                            tradisional dari Kampung Herbal Bantaragung.
                        </p>
                    </div>
                    <Link
                        href="/b2h/katalog"
                        className="group relative inline-flex items-center gap-2 bg-clay-500 hover:bg-clay-600 text-white rounded-full px-5 py-2.5 font-semibold transition hover:scale-[1.02] active:scale-[0.98] overflow-hidden shrink-0"
                    >
                        <span className="animate-shine" aria-hidden />
                        Buka Katalog Herbal
                        <span aria-hidden>→</span>
                    </Link>
                </section>
            </section>
        </main>
    );
}
