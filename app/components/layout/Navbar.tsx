"use client";

import Link from "next/link";
import { assetUrl } from "@/lib/asset";
import { usePathname } from "next/navigation";
import { useState } from "react";

export default function Navbar() {
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const menuItems = [
    { href: "/wisata", label: "Wisata" },
    { href: "/b2h", label: "B2H" },
    { href: "/bmc", label: "BMC" },
    { href: "/bic", label: "BIC" },
    { href: "/bdb", label: "BDB" },
    { href: "/galeri", label: "Galeri" },
  ];

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  };

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-[#e7c277]/40 shadow-sm">
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
            <span className="text-xs text-slate-500">Desa Wisata & Edukasi</span>
          </span>
        </Link>

        {/* Desktop Menu */}
        <nav className="hidden md:flex items-center gap-2 text-sm font-medium text-slate-600">
          {menuItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`px-3 py-2 rounded-full transition ${isActive(item.href)
                  ? "bg-[#e7c277] text-white shadow-md"
                  : "hover:bg-[#102440]/10 hover:text-[#e7c277]"
                }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        {/* Desktop CTA */}
        <Link
          href="/wisata"
          className="hidden md:inline-flex items-center gap-2 bg-[#102440] text-white px-4 py-2 rounded-full text-sm font-semibold shadow-md hover:bg-[#0b1a2f] transition"
        >
          Jelajah
          <span aria-hidden>→</span>
        </Link>

        {/* Mobile Hamburger Button */}
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="md:hidden p-2 rounded-lg hover:bg-slate-100 transition"
          aria-label="Toggle menu"
        >
          {isMobileMenuOpen ? (
            // Close icon
            <svg className="w-6 h-6 text-[#102440]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            // Hamburger icon
            <svg className="w-6 h-6 text-[#102440]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          )}
        </button>

      </div>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden border-t border-[#e7c277]/40 bg-white">
          <nav className="flex flex-col px-6 py-4 space-y-2">
            {menuItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setIsMobileMenuOpen(false)}
                className={`px-4 py-3 rounded-lg text-sm font-medium transition ${isActive(item.href)
                    ? "bg-[#e7c277] text-white shadow-md"
                    : "text-slate-600 hover:bg-[#102440]/10 hover:text-[#e7c277]"
                  }`}
              >
                {item.label}
              </Link>
            ))}

            {/* Mobile CTA */}
            <Link
              href="/wisata"
              onClick={() => setIsMobileMenuOpen(false)}
              className="inline-flex items-center justify-center gap-2 bg-[#102440] text-white px-4 py-3 rounded-lg text-sm font-semibold shadow-md hover:bg-[#0b1a2f] transition mt-2"
            >
              Jelajah
              <span aria-hidden>→</span>
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}
