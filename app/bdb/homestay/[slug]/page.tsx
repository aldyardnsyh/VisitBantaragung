import { getHomestayBySlug } from "@/lib/content";
import { assetUrl } from "@/lib/asset";

export default async function HomestayDetail({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params;
    const data = getHomestayBySlug(slug);

    return (
        <main className="max-w-5xl mx-auto px-6 py-16 space-y-12">

            <section className="space-y-5">
                <div className="inline-flex items-center gap-2 rounded-full bg-[#102440]/10 px-4 py-1 text-xs uppercase tracking-widest text-[#e7c277]">
                    Homestay
                </div>
                <div className="space-y-2">
                    <h1 className="text-3xl md:text-4xl font-bold">{data.name}</h1>
                    <p className="text-slate-600 max-w-2xl">{data.excerpt}</p>
                    {data.price && (
                        <p className="text-2xl font-semibold text-[#e7c277]">{data.price}</p>
                    )}
                </div>
                <div className="flex flex-wrap gap-3 text-xs text-slate-600">
                    <span className="rounded-full bg-white px-3 py-1 border border-[#e7c277]/40 shadow-sm">
                        Kapasitas {data.capacity}
                    </span>
                    <span className="rounded-full bg-white px-3 py-1 border border-[#e7c277]/40 shadow-sm">
                        {data.facilities.length} Fasilitas
                    </span>
                </div>
                {data.address && (
                    <div className="flex items-start gap-2 text-sm text-slate-600">
                        <span className="text-[#e7c277]">📍</span>
                        <span>{data.address}</span>
                    </div>
                )}
            </section>

            <section className="relative overflow-hidden rounded-3xl shadow-lg border border-[#e7c277]/40">
                <img
                    src={assetUrl(data.cover)}
                    alt={data.name}
                    className="w-full h-[380px] object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                <div className="absolute bottom-6 left-6 text-white">
                    <p className="text-xs uppercase tracking-widest text-white/80">Penginapan</p>
                    <p className="text-2xl font-semibold">{data.name}</p>
                </div>
            </section>

            <section className="grid lg:grid-cols-[1.2fr_0.8fr] gap-8">
                <div className="prose max-w-none">
                    <h3>Deskripsi</h3>
                    <p>{data.description}</p>
                </div>
                <div className="space-y-4">
                    <div className="rounded-3xl bg-white border border-[#e7c277]/40 p-6 shadow-sm space-y-3">
                        <h3 className="font-semibold">Fasilitas Utama</h3>
                        <ul className="space-y-2 text-sm text-slate-700">
                            {data.facilities.map((f: string) => (
                                <li key={f} className="flex items-center gap-2">
                                    <span className="h-2 w-2 rounded-full bg-[#e7c277]" />
                                    {f}
                                </li>
                            ))}
                        </ul>
                        <p className="text-sm text-slate-600">Kapasitas: {data.capacity}</p>
                    </div>
                    <div className="rounded-3xl bg-[#102440]/10 p-6 space-y-3">
                        <h4 className="font-semibold text-[#102440]">Pengalaman Live-in</h4>
                        <p className="text-sm text-[#102440]/80">
                            Nikmati suasana pedesaan, kuliner lokal, dan aktivitas bersama warga.
                        </p>
                    </div>
                </div>
            </section>

            {/* Gallery */}
            <section className="space-y-4">
                <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-xl">Galeri Homestay</h3>
                    <span className="text-sm text-slate-500">{data.gallery.length} foto</span>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {data.gallery.map((g: string) => (
                        <img
                            key={g}
                            src={assetUrl(g)}
                            alt=""
                            className="h-40 w-full object-cover rounded-2xl"
                        />
                    ))}
                </div>
            </section>

            {/* CTA */}
            <section className="bg-[#0b1a2f] text-white rounded-3xl p-10 text-center space-y-4 shadow-lg">
                <h3 className="text-2xl font-semibold">Booking Homestay</h3>
                <p className="text-white/80 max-w-2xl mx-auto">
                    Hubungi pengelola untuk jadwal ketersediaan dan paket live-in.
                </p>

                <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
                    <a
                        href={`https://wa.me/${data.contact.whatsapp}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-2 bg-white text-[#e7c277] px-6 py-3 rounded-full font-semibold shadow hover:scale-105 transition"
                    >
                        Hubungi via WhatsApp
                        <span aria-hidden>→</span>
                    </a>
                    {data.contact.email && (
                        <a
                            href={`mailto:${data.contact.email}`}
                            className="inline-flex items-center gap-2 bg-white/10 text-white px-6 py-3 rounded-full font-semibold shadow hover:scale-105 transition border border-white/20"
                        >
                            Email
                            <span aria-hidden>✉</span>
                        </a>
                    )}
                </div>
            </section>

        </main>
    );
}
