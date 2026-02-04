import Link from "next/link";

export default function Navbar() {
  return (
    <header className="sticky top-0 z-50 bg-white/80 backdrop-blur border-b border-emerald-100 shadow-sm">
      <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between gap-4">

        {/* Logo / Brand */}
        <Link href="/" className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-600 text-white text-lg shadow-md">
            VB
          </span>
          <span className="flex flex-col">
            <span className="font-bold text-lg text-emerald-700">Visit Bantaragung</span>
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
            { href: "/kontak", label: "Kontak" },
          ].map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="px-3 py-2 rounded-full hover:bg-emerald-50 hover:text-emerald-700 transition"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        {/* CTA */}
        <Link
          href="/wisata"
          className="hidden md:inline-flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-full text-sm font-semibold shadow-md hover:bg-emerald-700 transition"
        >
          Jelajah
          <span aria-hidden>→</span>
        </Link>

      </div>
    </header>
  );
}
