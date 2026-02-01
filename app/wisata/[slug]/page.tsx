import { getWisataBySlug } from "@/lib/content";
import { assetUrl } from "@/lib/asset";

export default async function WisataDetail({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params;
    const data = getWisataBySlug(slug);

    return (
        <main style={{ padding: 32 }}>
            <h1>{data.title}</h1>

            <img
                src={assetUrl(data.cover)}
                alt={data.title}
                style={{ width: "100%", maxWidth: 600 }}
            />

            <p>{data.description}</p>

            <h3>Aktivitas</h3>
            <ul>
                {data.activities.map((a: string) => (
                    <li key={a}>{a}</li>
                ))}
            </ul>

            <h3>Fasilitas</h3>
            <ul>
                {data.facilities.map((f: string) => (
                    <li key={f}>{f}</li>
                ))}
            </ul>

            <h3>Galeri</h3>
            <div style={{ display: "flex", gap: 12 }}>
                {data.gallery.map((g: string) => (
                    <img
                        key={g}
                        src={assetUrl(g)}
                        alt=""
                        style={{ width: 200 }}
                    />
                ))}
            </div>
        </main>
    );
}
