import Link from "next/link";

export default function B2HPage() {
  return (
    <main style={{ padding: 32 }}>
      <h1>Bantaragung Herbal Hub (B2H)</h1>
      <p>Kampung Herbal Digital Desa Bantaragung.</p>

      <Link href="/b2h/katalog">Masuk Katalog Tanaman</Link>
    </main>
  );
}
