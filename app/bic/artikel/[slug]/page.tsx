import { getArticleBySlug } from "@/lib/content";
import { assetUrl } from "@/lib/asset";

export default async function ArtikelDetail({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params;
    const data = getArticleBySlug(slug);

    if (!data) return <main>Artikel tidak ditemukan.</main>;

    return (
        <main style={{ padding: 32 }}>
            <h1>{data.title}</h1>
            <small>{data.date}</small>

            <img src={assetUrl(data.cover)} alt={data.title} width={600} />

            {data.content.map((p: string, i: number) => (
                <p key={i}>{p}</p>
            ))}

            <h3>Dokumentasi</h3>
            <div style={{ display: "flex", gap: 12 }}>
                {data.gallery.map((g: string) => (
                    <img key={g} src={assetUrl(g)} alt="" width={200} />
                ))}
            </div>
        </main>
    );
}
