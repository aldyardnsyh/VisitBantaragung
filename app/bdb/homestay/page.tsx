import Link from "next/link";
import { getAllHomestay } from "@/lib/content";
import { assetUrl } from "@/lib/asset";

export default function HomestayList() {
  const items = getAllHomestay();

  return (
    <main style={{ padding: 32 }}>
      <h1>Homestay Desa Bantaragung</h1>

      {items.map((h: any) => (
        <div key={h.slug}>
          <Link href={`/bdb/homestay/${h.slug}`}>
            <img src={assetUrl(h.cover)} alt={h.name} width={300} />
            <h3>{h.name}</h3>
            <p>{h.excerpt}</p>
          </Link>
        </div>
      ))}
    </main>
  );
}