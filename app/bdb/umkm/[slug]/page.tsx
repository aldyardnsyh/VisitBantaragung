import { getUMKMBySlug } from "@/lib/content";
import { assetUrl } from "@/lib/asset";

export default async function UMKMDetail({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const data = getUMKMBySlug(slug);

  return (
    <main className="max-w-4xl mx-auto px-6 py-16 space-y-10">

      <section className="space-y-3">
        <h1 className="text-3xl md:text-4xl font-bold">{data.name}</h1>
        <p className="text-gray-600">{data.excerpt}</p>
      </section>

      <img
        src={assetUrl(data.cover)}
        alt={data.name}
        className="w-full h-[350px] object-cover rounded-2xl shadow"
      />

      <section className="prose max-w-none">
        <p>{data.description}</p>
      </section>

      {/* Gallery */}
      <section className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {data.gallery.map((g: string) => (
          <img
            key={g}
            src={assetUrl(g)}
            alt=""
            className="h-40 w-full object-cover rounded-xl"
          />
        ))}
      </section>

      {/* CTA */}
      <section className="bg-green-700 text-white rounded-2xl p-8 text-center space-y-4">
        <h3 className="text-xl font-semibold">Tertarik dengan produk ini?</h3>

        <a
          href={`https://wa.me/${data.contact.whatsapp}`}
          target="_blank"
          className="inline-block bg-white text-green-700 px-6 py-3 rounded-xl"
        >
          Hubungi via WhatsApp
        </a>
      </section>

    </main>
  );
}
