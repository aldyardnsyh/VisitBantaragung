import Link from "next/link";

export default function BICPage() {
  return (
    <main style={{ padding: 32 }}>
      <h1>Bantaragung Information Center (BIC)</h1>
      <p>Pusat dokumentasi dan publikasi digital Desa Bantaragung.</p>

      <Link href="/bic/artikel">Lihat Semua Artikel</Link>
    </main>
  );
}
