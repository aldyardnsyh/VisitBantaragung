import Link from "next/link";
import { getAllHerbal } from "@/lib/content";
import { assetUrl } from "@/lib/asset";

export default function HerbalList() {
  const items = getAllHerbal();

  return (
    <main style={{ padding: 32 }}>
      <h1>Katalog Tanaman Herbal</h1>

      {items.map((item: any) => (
        <div key={item.slug}>
          <Link href={`/b2h/katalog/${item.slug}`}>
            <img src={assetUrl(item.cover)} alt={item.name} width={300} />
            <h3>{item.name}</h3>
            <p>{item.excerpt}</p>
          </Link>
        </div>
      ))}
    </main>
  );
}
