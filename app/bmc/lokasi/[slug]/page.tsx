import { getLocationBySlug } from "@/lib/content";
import { assetUrl } from "@/lib/asset";

export default async function LocationDetail({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params;
    const data = getLocationBySlug(slug);

    return (
        <main className="max-w-5xl mx-auto px-6 py-16 space-y-12">

            <section className="space-y-5">
                <div className="inline-flex items-center gap-2 rounded-full bg-[#102440]/10 px-4 py-1 text-xs uppercase tracking-widest text-[#e7c277]">
                    Lokasi {data.category}
                </div>
                <div className="space-y-2">
                    <h1 className="text-3xl md:text-4xl font-bold">{data.name}</h1>
                    <p className="text-slate-600 max-w-2xl">{data.excerpt}</p>
                </div>
                <div className="flex flex-wrap gap-3 text-xs text-slate-600">
                    <span className="rounded-full bg-white px-3 py-1 border border-[#e7c277]/40 shadow-sm">
                        Koordinat: {data.lat}, {data.lng}
                    </span>
                </div>
            </section>

            <section className="relative overflow-hidden rounded-3xl shadow-lg border border-[#e7c277]/40">
                <img
                    src={assetUrl(data.cover)}
                    alt={data.name}
                    className="w-full h-[380px] object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                <div className="absolute bottom-6 left-6 text-white">
                    <p className="text-xs uppercase tracking-widest text-white/80">Spot</p>
                    <p className="text-2xl font-semibold">{data.name}</p>
                </div>
            </section>

            {/* Map */}
            <section className="grid lg:grid-cols-[1.2fr_0.8fr] gap-8">
                <div className="rounded-3xl overflow-hidden shadow-lg border border-[#e7c277]/40 h-[380px] bg-white">
                    <iframe
                        className="w-full h-full"
                        loading="lazy"
                        referrerPolicy="no-referrer-when-downgrade"
                        src={`https://www.google.com/maps?q=${data.lat},${data.lng}&z=16&output=embed`}
                    />
                </div>
                <div className="space-y-4">
                    <div className="rounded-3xl bg-white border border-[#e7c277]/40 p-6 shadow-sm space-y-3">
                        <h3 className="font-semibold">Informasi Lokasi</h3>
                        <p className="text-sm text-slate-600">
                            Titik ini merupakan bagian dari jalur wisata dan edukasi Desa Bantaragung.
                        </p>
                        <div className="flex flex-wrap gap-2 text-xs text-[#e7c277]">
                            <span className="rounded-full bg-[#102440]/10 px-3 py-1">Akses Mudah</span>
                            <span className="rounded-full bg-[#102440]/10 px-3 py-1">Ramah Keluarga</span>
                        </div>
                    </div>
                    <div className="rounded-3xl bg-[#102440]/10 p-6 space-y-3">
                        <h4 className="font-semibold text-[#102440]">Panduan Kunjungan</h4>
                        <p className="text-sm text-[#102440]/80">
                            Gunakan peta digital untuk menemukan rute terbaik dan titik parkir terdekat.
                        </p>
                    </div>
                    <a
                        href={`https://www.google.com/maps?q=${data.lat},${data.lng}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-2 bg-[#102440] text-white px-6 py-3 rounded-full font-semibold shadow hover:bg-[#0b1a2f] transition"
                    >
                        Buka di Google Maps
                        <span aria-hidden>→</span>
                    </a>
                </div>
            </section>

        </main>
    );
}
