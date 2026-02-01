import { getHerbalBySlug } from "@/lib/content";
import { assetUrl } from "@/lib/asset";

export default async function HerbalDetail({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params;
    const data = getHerbalBySlug(slug);

    return (
        <main style={{ padding: 32 }}>
            <h1>{data.name}</h1>
            <em>{data.latin}</em>

            <img src={assetUrl(data.cover)} alt={data.name} width={500} />

            <p>{data.description}</p>

            <h3>Manfaat</h3>
            <ul>
                {data.benefits.map((b: string) => (
                    <li key={b}>{b}</li>
                ))}
            </ul>

            <h3>Cara Pemanfaatan</h3>
            <ul>
                {data.usage.map((u: string) => (
                    <li key={u}>{u}</li>
                ))}
            </ul>
        </main>
    );
}
