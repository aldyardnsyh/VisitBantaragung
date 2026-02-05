import Link from "next/link";
import { assetUrl } from "@/lib/asset";

export default function Footer() {
  return (
    <footer className="bg-[#102440] text-[#e7c277] mt-20">
      <div className="max-w-6xl mx-auto px-6 py-14 grid md:grid-cols-3 gap-10">

        <div>
          <h3 className="font-bold text-xl text-[#e7c277]">Visit Bantaragung</h3>
          <p className="text-sm text-[#e7c277]/80 mt-3">
            Smart Tourism Digital Platform Desa Bantaragung, menghubungkan wisata,
            edukasi, dan pemberdayaan masyarakat lokal.
          </p>
          <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-[#e7c277]/40 px-3 py-1 text-xs text-[#e7c277]/80">
            #DesaWisataBantaragung
          </div>
          <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-[#e7c277]/40 px-3 py-1 text-xs text-[#e7c277]/80">
            #DesaWisataDigital
          </div>
          <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-[#e7c277]/40 px-3 py-1 text-xs text-[#e7c277]/80">
            #75 Besar ADWI 2023
          </div>
          <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-[#e7c277]/40 px-3 py-1 text-xs text-[#e7c277]/80">
            #300 Besar ADWI 2021
          </div>
        </div>

        <div>
          <h4 className="font-semibold mb-3 text-[#e7c277]">Menu</h4>
          <ul className="space-y-2 text-sm text-[#e7c277]/80">
            <li><Link href="/wisata" className="hover:text-white">Wisata</Link></li>
            <li><Link href="/b2h" className="hover:text-white">Kampung Herbal</Link></li>
            <li><Link href="/bmc" className="hover:text-white">Peta Digital</Link></li>
            <li><Link href="/bic" className="hover:text-white">Publikasi</Link></li>
            <li><Link href="/bdb" className="hover:text-white">Branding Desa</Link></li>
            <li><Link href="/galeri" className="hover:text-white">Galeri KKN</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="font-semibold mb-3 text-[#e7c277]">Kontak</h4>
          <p className="text-sm text-[#e7c277]/80">
            Desa Bantaragung, Kecamatan Sindangwangi, Kabupaten Majalengka, Jawa Barat,<br />
            Indonesia
          </p>
          <div className="mt-4 text-xs text-[#e7c277]/70">
            Email: desawisatabantaragung@gmail.com
          </div>
        </div>

      </div>

      <div className="border-t border-[#e7c277]/30 text-center py-4 text-sm text-[#e7c277]/70">
        © {new Date().getFullYear()} Visit Bantaragung | KKN-PPM UGM Simfoni Sindangwangi Periode IV Tahun 2025
      </div>
    </footer>
  );
}
