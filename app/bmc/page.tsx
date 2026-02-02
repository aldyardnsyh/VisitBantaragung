import Link from "next/link";
import { getAllLocations } from "@/lib/content";
import { assetUrl } from "@/lib/asset";

export default function BMCPage() {
  const locations = getAllLocations();

  return (
    <main style={{ padding: 32 }}>
      <h1>Bantaragung Map Center</h1>

      {locations.map((loc: any) => (
        <div key={loc.slug}>
          <Link href={`/bmc/lokasi/${loc.slug}`}>
            <img src={assetUrl(loc.cover)} alt={loc.name} width={300} />
            <h3>{loc.name}</h3>
            <small>{loc.category}</small>
            <p>{loc.excerpt}</p>
          </Link>
        </div>
      ))}
    </main>
  );
}