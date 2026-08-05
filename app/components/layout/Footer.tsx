import Link from "next/link";
import { getSiteSettings } from "@/lib/content";

const WHATSAPP_URL = "https://wa.me/6281324427327";
const EMAIL = "desawisatabantaragung@gmail.com";
const MAPS_URL = "https://maps.google.com/?q=Desa+Bantaragung+Sindangwangi+Majalengka+Jawa+Barat";

const exploreLinks = [
  { href: "/wisata", label: "Wisata" },
  { href: "/b2h", label: "Kampung Herbal" },
  { href: "/bmc", label: "Peta Digital" },
  { href: "/galeri", label: "Galeri" },
  { href: "/tentang", label: "Tentang" },
];

const infoLinks = [
  { href: "/bic/artikel", label: "Berita" },
  { href: `mailto:${EMAIL}`, label: "Kontak" },
  { href: "/bmc", label: "Peta" },
  { href: "/bdb", label: "Branding Desa" },
  { href: "/tentang", label: "Dewi" },
];

const hashtags = [
  "#DesaWisataBantaragung",
  "#DesaWisataDigital",
  "#75BesarADWI2023",
  "#300BesarADWI2021",
];

const followUs = [
  { handle: "@visitbantaragung", url: "https://instagram.com/visitbantaragung" },
  { handle: "@kampungherbalmertasela", url: "https://instagram.com/kampungherbalmertasela" },
  { handle: "@desawisata_bantaragung", url: "https://instagram.com/desawisata_bantaragung" },
  { handle: "@teras_pakuwon", url: "https://instagram.com/teras_pakuwon" },
];

export default function Footer() {
  const site = getSiteSettings();

  return (
    <footer className="bg-forest-900 text-[#c8d5cd] border-t-4 border-clay-500 mt-20">
      <div className="max-w-7xl mx-auto px-6 py-14 grid gap-10 md:grid-cols-2 lg:grid-cols-5">
        {/* Brand */}
        <div>
          <Link href="/" className="flex items-center gap-3" aria-label="Visit Bantaragung Beranda">
            <img src="/logo.svg" alt="Logo Visit Bantaragung" className="h-10 w-10 rounded-full" />
            <span className="flex flex-col leading-tight">
              <span className="font-bold text-lg text-white">Visit Bantaragung</span>
              <span className="text-xs text-white/70">{site.tagline}</span>
            </span>
          </Link>
          <p className="text-sm text-forest-100/70 mt-4 leading-relaxed">
            Desa wisata yang memadukan keindahan alam, kampung herbal, dan pemberdayaan
            masyarakat lokal di kaki Gunung Ciremai, Majalengka, Jawa Barat.
          </p>
          {/* Hashtag strip */}
          <div className="flex flex-wrap gap-2 mt-4">
            {hashtags.map((tag) => (
              <span
                key={tag}
                className="inline-block rounded-full bg-clay-100/10 text-gold-400 border border-gold-400/20 px-3 py-1 text-xs"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>

        {/* Jelajahi */}
        <nav aria-label="Jelajahi">
          <h4 className="font-semibold text-white mb-4">Jelajahi</h4>
          <ul className="space-y-2.5 text-sm">
            {exploreLinks.map((link) => (
              <li key={link.href}>
                <Link href={link.href} className="text-forest-100/70 hover:text-white hover:font-semibold transition-colors duration-200">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        {/* Informasi */}
        <nav aria-label="Informasi">
          <h4 className="font-semibold text-white mb-4">Informasi</h4>
          <ul className="space-y-2.5 text-sm">
            {infoLinks.map((link) => (
              <li key={link.label}>
                <Link
                  href={link.href}
                  className="text-forest-100/70 hover:text-white hover:font-semibold transition-colors duration-200"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        {/* Follow Us */}
        <div>
          <h4 className="font-semibold text-white mb-4">Follow Us</h4>
          <ul className="space-y-2.5 text-sm">
            {followUs.map((s) => (
              <li key={s.handle}>
                <a
                  href={s.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-white/80 hover:text-gold-400 hover:font-semibold transition-colors duration-200"
                >
                  <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.28.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.058-1.28.072-1.689.072-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98zM12 7.273a4.727 4.727 0 100 9.454 4.727 4.727 0 000-9.454zm0 7.795a3.068 3.068 0 110-6.136 3.068 3.068 0 010 6.136zM18.406 5.02a1.105 1.105 0 110 2.21 1.105 1.105 0 010-2.21z" />
                </svg>
                {s.handle}
              </a>
            </li>
          ))}
          </ul>
        </div>

        {/* Hubungi Kami */}
        <div>
          <h4 className="font-semibold text-white mb-4">Hubungi Kami</h4>
          <p className="text-sm text-forest-100/70">
            Desa Bantaragung, Kec. Sindangwangi,<br />
            Kab. Majalengka, Jawa Barat
          </p>
          <a
            href={WHATSAPP_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center bg-clay-500 hover:bg-clay-600 text-white rounded-full px-5 py-2 mt-5 text-sm font-semibold transition active:scale-[0.98]"
          >
            Chat WhatsApp
          </a>
          <a
            href={`mailto:${EMAIL}`}
            className="block text-sm mt-3 text-white/80 hover:text-gold-400 hover:font-semibold transition-colors duration-200"
          >
            {EMAIL}
          </a>
          <a
            href={MAPS_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-sm text-forest-100/70 hover:text-white mt-3 transition-colors duration-200"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17.657 16.657L13.414 20.9a2 2 0 01-2.828 0l-4.243-4.243a8 8 0 1111.314 0zM15 11a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
            Lihat di Google Maps
          </a>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-white/10">
        <div className="max-w-7xl mx-auto px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-2 text-center sm:text-left text-sm text-[#c8d5cd]/80">
          <p>© {new Date().getFullYear()} Visit Bantaragung | KKN-PPM UGM Simfoni Sindangwangi Periode IV Tahun 2025</p>
          <p>Supported by Pokdarwis Bantaragung</p>
        </div>
      </div>
    </footer>
  );
}
