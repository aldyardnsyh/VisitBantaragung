import Link from "next/link";
import { getAllWisata } from "@/lib/content";
import { assetUrl } from "@/lib/asset";

export default function WisataPage() {
  const items = getAllWisata();

  return (
    <main style={{ padding: 32 }}>
      <h1>Jelajah Wisata</h1>

      <ul style={{ display: "grid", gap: 24 }}>
        {items.map((item: any) => (
          <li key={item.slug}>
            <Link href={`/wisata/${item.slug}`}>
              <img
                src={assetUrl(item.cover)}
                alt={item.title}
                style={{ width: "100%", maxWidth: 400 }}
              />
              <h3>{item.title}</h3>
              <p>{item.excerpt}</p>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
