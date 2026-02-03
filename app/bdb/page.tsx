import Link from "next/link";

export default function BDBPage() {
  return (
    <main style={{ padding: 32 }}>
      <h1>Bantaragung Digital Branding (BDB)</h1>
      <p>Katalog digital potensi wisata, UMKM, dan homestay Desa Bantaragung.</p>

      <ul>
        <li><Link href="/bdb/umkm">UMKM</Link></li>
        <li><Link href="/bdb/homestay">Homestay</Link></li>
      </ul>
    </main>
  );
}