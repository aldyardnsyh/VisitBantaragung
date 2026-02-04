import Link from "next/link";

export default function Footer() {
  return (
    <footer className="bg-slate-900 text-slate-100 mt-20">
      <div className="max-w-6xl mx-auto px-6 py-14 grid md:grid-cols-3 gap-10">

        <div>
          <h3 className="font-bold text-xl text-white">Visit Bantaragung</h3>
          <p className="text-sm text-slate-300 mt-3">
            Smart Tourism Digital Platform Desa Bantaragung, menghubungkan wisata,
            edukasi, dan pemberdayaan masyarakat lokal.
          </p>
          <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs text-slate-200">
            #DesaWisataBantaragung
          </div>
        </div>

        <div>
          <h4 className="font-semibold mb-3 text-white">Menu</h4>
          <ul className="space-y-2 text-sm text-slate-300">
            <li><Link href="/wisata" className="hover:text-white">Wisata</Link></li>
            <li><Link href="/b2h" className="hover:text-white">Kampung Herbal</Link></li>
            <li><Link href="/bmc" className="hover:text-white">Peta Digital</Link></li>
            <li><Link href="/bic" className="hover:text-white">Publikasi</Link></li>
            <li><Link href="/bdb" className="hover:text-white">Branding Desa</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="font-semibold mb-3 text-white">Kontak</h4>
          <p className="text-sm text-slate-300">
            Desa Bantaragung<br />
            Jawa Barat
          </p>
          <div className="mt-4 text-xs text-slate-400">
            Email: info@visitbantaragung.id
          </div>
        </div>

      </div>

      <div className="border-t border-white/10 text-center py-4 text-sm text-slate-400">
        © {new Date().getFullYear()} KKN-PPM UGM | Simfoni Sindangwangi Periode IV 2025
      </div>
    </footer>
  );
}
