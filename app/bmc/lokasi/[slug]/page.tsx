import { getLocationBySlug } from "@/lib/content";
import { assetUrl } from "@/lib/asset";

export default async function LocationDetail({ params }: any) {
    const { slug } = await params;
    const data = getLocationBySlug(slug);

    return (
        <main style={{ padding: 32 }}>
            <h1>{data.name}</h1>

            <img src={assetUrl(data.cover)} alt={data.name} width={500} />

            <p>{data.excerpt}</p>

            <h4>Koordinat</h4>
            <p>
                {data.lat}, {data.lng}
            </p>

            <a
                href={`https://www.google.com/maps?q=${data.lat},${data.lng}`}
                target="_blank"
            >
                Buka di Google Maps
            </a>
        </main>
    );
}
