import { getUMKMBySlug } from "@/lib/content";
import { assetUrl } from "@/lib/asset";

export default async function UMKMDetail({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const data = getUMKMBySlug(slug);

  return (
    <main style={{ padding: 32 }}>
      <h1>{data.name}</h1>

      <img src={assetUrl(data.cover)} alt={data.name} width={500} />

      <p>{data.description}</p>

      <a href={`https://wa.me/${data.contact.whatsapp}`} target="_blank">
        Hubungi via WhatsApp
      </a>
    </main>
  );
}
