import Link from "next/link";
import { getWisataBySlug } from "@/lib/content";
import { assetUrl } from "@/lib/asset";
import Breadcrumb from "@/app/components/ui/Breadcrumb";
import type { Metadata } from "next";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
    const { slug } = await params;
    const data = getWisataBySlug(slug);
    return {
        title: data.title,
        description: data.excerpt,
    };
}

export default async function WisataDetail({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params;
    const data = getWisataBySlug(slug);

    return (
        <main className="max-w-5xl mx-auto px-6 py-16 space-y-12">

            {/* Title */}
            <section className="space-y-6">
                <Breadcrumb items={[
                    { label: "Wisata", href: "/wisata" },
                    { label: data.title },
                ]} />
                <div className="space-y-3">
                    <div className="inline-flex items-center gap-2 rounded-full bg-[#102440]/10 px-4 py-1 text-xs uppercase tracking-widest text-[#e7c277]">
                        Destinasi Wisata
                    </div>
                    <h1 className="text-3xl md:text-4xl font-bold">{data.title}</h1>
                    <p className="text-slate-600 max-w-2xl">{data.excerpt}</p>
                </div>
                <div className="flex flex-wrap gap-3 text-xs text-slate-600">
                    <span className="rounded-full bg-white px-3 py-1 border border-[#e7c277]/40 shadow-sm">
                        {data.activities.length} Aktivitas
                    </span>
                    <span className="rounded-full bg-white px-3 py-1 border border-[#e7c277]/40 shadow-sm">
                        {data.facilities.length} Fasilitas
                    </span>
                </div>
            </section>

            {/* Cover */}
            <section className="relative overflow-hidden rounded-3xl shadow-lg border border-[#e7c277]/40">
                <img
                    src={assetUrl(data.cover)}
                    alt={data.title}
                    className="w-full h-[420px] object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/10 to-transparent" />
                <div className="absolute bottom-6 left-6 text-white">
                    <p className="text-sm uppercase tracking-widest text-white/80">Sorotan</p>
                    <p className="text-2xl font-semibold">{data.title}</p>
                </div>
            </section>

            {/* Description */}
            <section className="grid lg:grid-cols-[1.2fr_0.8fr] gap-8">
                <div className="prose max-w-none">
                    <h3>Deskripsi</h3>
                    <p>{data.description}</p>
                </div>
                <div className="space-y-4">
                    <div className="rounded-3xl bg-white border border-[#e7c277]/40 p-6 shadow-sm space-y-4">
                        <h3 className="font-semibold">Informasi Wisata</h3>
                        <div className="space-y-3 text-sm">
                            <div className="flex items-start gap-3">
                                <div className="w-1.5 h-1.5 rounded-full bg-[#e7c277] mt-1.5"></div>
                                <div>
                                    <p className="font-medium text-slate-700">Aktivitas</p>
                                    <p className="text-slate-600">{data.activities.length} pilihan aktivitas</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-3">
                                <div className="w-1.5 h-1.5 rounded-full bg-[#e7c277] mt-1.5"></div>
                                <div>
                                    <p className="font-medium text-slate-700">Fasilitas</p>
                                    <p className="text-slate-600">{data.facilities.length} fasilitas tersedia</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-3">
                                <div className="w-1.5 h-1.5 rounded-full bg-[#e7c277] mt-1.5"></div>
                                <div>
                                    <p className="font-medium text-slate-700">Waktu Kunjungan</p>
                                    <p className="text-slate-600">Pagi hingga sore hari</p>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="rounded-3xl bg-[#102440]/10 p-6 space-y-3">
                        <h4 className="font-semibold text-[#102440]">Tips Wisata</h4>
                        <ul className="text-sm text-[#102440]/80 space-y-2">
                            <li>Gunakan alas kaki yang nyaman untuk trekking ringan.</li>
                            <li>Jaga kebersihan area dan bawa kembali sampah Anda.</li>
                            <li>Siapkan kamera untuk menangkap panorama hutan pinus.</li>
                        </ul>
                    </div>
                </div>
            </section>

            {/* Info Grid */}
            <section className="grid md:grid-cols-2 gap-8">

                <div className="rounded-3xl bg-white border border-[#e7c277]/40 p-6 shadow-sm">
                    <h3 className="font-semibold mb-4">Aktivitas</h3>
                    <ul className="space-y-2 text-slate-700 text-sm">
                        {data.activities.map((a: string) => (
                            <li key={a} className="flex items-center gap-2">
                                <span className="h-2 w-2 rounded-full bg-[#e7c277]" />
                                {a}
                            </li>
                        ))}
                    </ul>
                </div>

                <div className="rounded-3xl bg-white border border-[#e7c277]/40 p-6 shadow-sm">
                    <h3 className="font-semibold mb-4">Fasilitas</h3>
                    <ul className="space-y-2 text-slate-700 text-sm">
                        {data.facilities.map((f: string) => (
                            <li key={f} className="flex items-center gap-2">
                                <span className="h-2 w-2 rounded-full bg-[#e7c277]" />
                                {f}
                            </li>
                        ))}
                    </ul>
                </div>

            </section>

            {/* CTA */}
            <section className="bg-[#0b1a2f] text-white rounded-3xl p-10 text-center space-y-4 shadow-lg">
                <h3 className="text-2xl font-semibold">
                    Siap menjelajah {data.title}?
                </h3>
                <p className="text-white/80 max-w-2xl mx-auto">
                    Hubungi tim pengelola desa wisata untuk informasi rute, tiket, dan paket kunjungan edukatif.
                </p>

                <a
                    href="https://wa.me/6281384990974"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 bg-white text-[#e7c277] px-6 py-3 rounded-full font-semibold shadow hover:scale-105 transition"
                >
                    Hubungi via WhatsApp
                    <span aria-hidden>→</span>
                </a>
            </section>

        </main>
    );
}
