import Link from "next/link";
import { assetUrl } from "@/lib/asset";

export default function Navbar() {
  return (
    <header className="sticky top-0 z-50 bg-white/80 backdrop-blur border-b border-[#e7c277]/40 shadow-sm">
      <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between gap-4">

        {/* Logo / Brand */}
        <Link href="/" className="flex items-center gap-3">
          <img
            src={assetUrl("_brand/logo/LogoVisitBantaragung.png")}
            alt="Visit Bantaragung Logo"
            className="h-12 w-auto"
          />
          <span className="flex flex-col">
            <span className="font-bold text-lg text-[#e7c277]">Visit Bantaragung</span>
            <span className="text-xs text-slate-500">Desa Wisata &amp; Edukasi</span>
          </span>
        </Link>

        {/* Menu */}
        <nav className="hidden md:flex items-center gap-2 text-sm font-medium text-slate-600">
          {[
            { href: "/wisata", label: "Wisata" },
            { href: "/b2h", label: "B2H" },
            { href: "/bmc", label: "BMC" },
            { href: "/bic", label: "BIC" },
            { href: "/bdb", label: "BDB" },
            { href: "/galeri", label: "Galeri" },
          ].map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="px-3 py-2 rounded-full hover:bg-[#102440]/10 hover:text-[#e7c277] transition"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        {/* CTA */}
        <Link
          href="/wisata"
          className="hidden md:inline-flex items-center gap-2 bg-[#102440] text-white px-4 py-2 rounded-full text-sm font-semibold shadow-md hover:bg-[#0b1a2f] transition"
        >
          Jelajah
          <span aria-hidden>→</span>
        </Link>

      </div>
    </header>
  );
}
