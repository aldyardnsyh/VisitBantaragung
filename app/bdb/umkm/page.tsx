import Link from "next/link";
import { getAllUMKM } from "@/lib/content";
import { assetUrl } from "@/lib/asset";

export default function UMKMList() {
  const items = getAllUMKM();

  return (
    <main style={{ padding: 32 }}>
      <h1>UMKM Desa Bantaragung</h1>

      {items.map((u: any) => (
        <div key={u.slug}>
          <Link href={`/bdb/umkm/${u.slug}`}>
            <img src={assetUrl(u.cover)} alt={u.name} width={300} />
            <h3>{u.name}</h3>
            <p>{u.excerpt}</p>
          </Link>
        </div>
      ))}
    </main>
  );
}