import Link from "next/link";

export default function Navbar() {
  return (
    <header className="sticky top-0 z-50 bg-white/80 backdrop-blur border-b">
      <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">

        {/* Logo / Brand */}
        <Link href="/" className="font-bold text-xl text-green-700">
          Visit Bantaragung
        </Link>

        {/* Menu */}
        <nav className="hidden md:flex gap-6 text-sm font-medium">
          <Link href="/wisata" className="hover:text-green-700">Wisata</Link>
          <Link href="/b2h" className="hover:text-green-700">B2H</Link>
          <Link href="/bmc" className="hover:text-green-700">BMC</Link>
          <Link href="/bic" className="hover:text-green-700">BIC</Link>
          <Link href="/bdb" className="hover:text-green-700">BDB</Link>
          <Link href="/kontak" className="hover:text-green-700">Kontak</Link>
        </nav>

        {/* CTA */}
        <Link
          href="/wisata"
          className="hidden md:inline-block bg-green-700 text-white px-4 py-2 rounded-xl text-sm hover:bg-green-800 transition"
        >
          Jelajah
        </Link>

      </div>
    </header>
  );
}
