import { getHomestayBySlug } from "@/lib/content";
import { assetUrl } from "@/lib/asset";

export default async function HomestayDetail({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params;
    const data = getHomestayBySlug(slug);

    return (
        <main style={{ padding: 32 }}>
            <h1>{data.name}</h1>

            <img src={assetUrl(data.cover)} alt={data.name} width={500} />

            <p>{data.description}</p>

            <p>Kapasitas: {data.capacity}</p>

            <h4>Fasilitas</h4>
            <ul>
                {data.facilities.map((f: string) => (
                    <li key={f}>{f}</li>
                ))}
            </ul>

            <a href={`https://wa.me/${data.contact.whatsapp}`} target="_blank">
                Booking via WhatsApp
            </a>
        </main>
    );
}
