"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const WHATSAPP_URL = "https://wa.me/6281324427327";

const menuItems = [
  { href: "/", label: "Beranda" },
  { href: "/bic/artikel", label: "Berita" },
  { href: "/wisata", label: "Wisata" },
  { href: "/b2h", label: "Kampung Herbal" },
  { href: "/bmc", label: "Peta Digital" },
  { href: "/galeri", label: "Galeri" },
  { href: "/tentang", label: "Tentang" },
];

export default function Navbar() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  const close = () => setIsOpen(false);

  return (
    <header className="sticky top-0 z-50 bg-[#0c1f16]/90 backdrop-blur-md border-b border-white/10 text-[#f4f7f2]">
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between gap-4">
        {/* Logo / Brand */}
        <Link href="/" className="flex items-center gap-3" aria-label="Visit Bantaragung Beranda">
          <img src="/logo.svg" alt="Logo Visit Bantaragung" className="h-10 w-10 rounded-full" />
          <span className="flex flex-col leading-tight">
            <span className="font-bold text-lg text-[#f4f7f2]">Visit Bantaragung</span>
            <span className="text-xs text-white/70">Desa Wisata di Kaki Gunung Ciremai</span>
          </span>
        </Link>

        {/* Desktop Menu */}
        <nav aria-label="Navigasi utama" className="hidden lg:flex items-center gap-1 text-sm font-medium">
          {menuItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`relative px-3 py-2 leading-tight transition-colors duration-200 cursor-pointer border-b-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clay-500 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0c1f16] rounded-t-lg ${
                isActive(item.href)
                  ? "border-clay-500 text-white hover:text-gold-400 hover:font-semibold"
                  : "border-transparent text-white/80 hover:text-gold-400 hover:font-semibold"
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        {/* Desktop CTA */}
        <Link
          href={WHATSAPP_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="hidden lg:inline-flex items-center bg-clay-500 hover:bg-clay-600 text-white rounded-full px-5 py-2 text-sm font-semibold transition-all hover:scale-[1.02] active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clay-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0c1f16]"
        >
          Pesan WA
        </Link>

        {/* Mobile Hamburger */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="lg:hidden p-2 rounded-lg hover:bg-white/10 transition cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clay-400"
          aria-label="Buka menu"
          aria-expanded={isOpen}
        >
          {isOpen ? (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          )}
        </button>
      </div>

      {/* Mobile Menu */}
      {isOpen && (
        <div className="lg:hidden bg-[#0c1f16] border-t border-white/10">
          <nav aria-label="Navigasi mobile" className="flex flex-col px-6 py-4 space-y-2">
            {menuItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={close}
                className={`px-3 py-2.5 rounded-lg border-l-2 text-sm font-medium transition-colors duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clay-400 ${
                  isActive(item.href)
                    ? "border-clay-500 bg-white/5 text-white hover:text-gold-400 hover:font-semibold"
                    : "border-transparent text-white/80 hover:bg-white/5 hover:text-gold-400 hover:font-semibold"
                }`}
              >
                {item.label}
              </Link>
            ))}
            <Link
              href={WHATSAPP_URL}
              target="_blank"
              rel="noopener noreferrer"
              onClick={close}
              className="inline-flex items-center justify-center bg-clay-500 hover:bg-clay-600 text-white px-4 py-3 rounded-full text-sm font-semibold transition-all hover:scale-[1.02] active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clay-400 mt-2"
            >
              Pesan WA
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}
