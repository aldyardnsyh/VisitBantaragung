import { getHerbalBySlug } from "@/lib/content";
import { assetUrl } from "@/lib/asset";

export default async function HerbalDetail({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params;
    const data = getHerbalBySlug(slug);

    return (
        <main className="max-w-5xl mx-auto px-6 py-16 space-y-12">

            {/* Header */}
            <section className="space-y-5">
                <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-4 py-1 text-xs uppercase tracking-widest text-emerald-700">
                    Herbal Unggulan
                </div>
                <div className="space-y-2">
                    <h1 className="text-3xl md:text-4xl font-bold">{data.name}</h1>
                    <p className="italic text-slate-500">{data.latin}</p>
                    <p className="text-slate-600 max-w-2xl">{data.excerpt}</p>
                </div>
                <div className="flex flex-wrap gap-3 text-xs text-slate-600">
                    <span className="rounded-full bg-white px-3 py-1 border border-emerald-100 shadow-sm">
                        {data.benefits.length} Manfaat
                    </span>
                    <span className="rounded-full bg-white px-3 py-1 border border-emerald-100 shadow-sm">
                        {data.usage.length} Cara Pemanfaatan
                    </span>
                </div>
            </section>

            {/* Cover */}
            <section className="relative overflow-hidden rounded-3xl shadow-lg border border-emerald-100/70">
                <img
                    src={assetUrl(data.cover)}
                    alt={data.name}
                    className="w-full h-[380px] object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                <div className="absolute bottom-5 left-6 text-white">
                    <p className="text-sm uppercase tracking-widest text-white/80">Tanaman</p>
                    <p className="text-2xl font-semibold">{data.name}</p>
                </div>
            </section>

            {/* Description */}
            <section className="grid lg:grid-cols-[1.2fr_0.8fr] gap-8">
                <div className="prose max-w-none">
                    <h3>Deskripsi</h3>
                    <p>{data.description}</p>
                </div>
                <div className="rounded-3xl bg-emerald-50 p-6 space-y-4">
                    <h4 className="font-semibold text-emerald-900">Tips Pemanfaatan</h4>
                    <ul className="text-sm text-emerald-900/80 space-y-2">
                        <li>Gunakan bahan segar untuk hasil terbaik.</li>
                        <li>Campurkan dengan rempah lain agar rasa lebih seimbang.</li>
                        <li>Simpan di tempat kering dan sejuk.</li>
                    </ul>
                </div>
            </section>

            {/* Benefits & Usage */}
            <section className="grid md:grid-cols-2 gap-8">

                <div className="rounded-3xl bg-white border border-emerald-100/70 p-6 shadow-sm">
                    <h3 className="font-semibold mb-4">Manfaat</h3>
                    <ul className="space-y-2 text-slate-700 text-sm">
                        {data.benefits.map((b: string) => (
                            <li key={b} className="flex items-center gap-2">
                                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                                {b}
                            </li>
                        ))}
                    </ul>
                </div>

                <div className="rounded-3xl bg-white border border-emerald-100/70 p-6 shadow-sm">
                    <h3 className="font-semibold mb-4">Cara Pemanfaatan</h3>
                    <ul className="space-y-2 text-slate-700 text-sm">
                        {data.usage.map((u: string) => (
                            <li key={u} className="flex items-center gap-2">
                                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                                {u}
                            </li>
                        ))}
                    </ul>
                </div>

            </section>

            {/* Gallery */}
            <section className="space-y-4">
                <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-xl">Galeri</h3>
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

        </main>
    );
}
