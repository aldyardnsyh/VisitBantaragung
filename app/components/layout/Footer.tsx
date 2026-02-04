import Link from "next/link";

export default function Footer() {
  return (
    <footer className="bg-gray-100 mt-20">
      <div className="max-w-6xl mx-auto px-6 py-12 grid md:grid-cols-3 gap-8">

        <div>
          <h3 className="font-bold text-lg text-green-700">Visit Bantaragung</h3>
          <p className="text-sm text-gray-600 mt-2">
            Smart Tourism Digital Platform Desa Bantaragung.
          </p>
        </div>

        <div>
          <h4 className="font-semibold mb-2">Menu</h4>
          <ul className="space-y-1 text-sm">
            <li><Link href="/wisata">Wisata</Link></li>
            <li><Link href="/b2h">Kampung Herbal</Link></li>
            <li><Link href="/bmc">Peta Digital</Link></li>
            <li><Link href="/bic">Publikasi</Link></li>
            <li><Link href="/bdb">Branding Desa</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="font-semibold mb-2">Kontak</h4>
          <p className="text-sm text-gray-600">
            Desa Bantaragung<br />
            Jawa Barat
          </p>
        </div>

      </div>

      <div className="border-t text-center py-4 text-sm text-gray-500">
        © {new Date().getFullYear()} KKN-PPM UGM | Simfoni Sindangwangi Periode IV 2025
      </div>
    </footer>
  );
}
