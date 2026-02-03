import Link from "next/link";

export default function Navbar() {
  return (
    <nav style={{ padding: 16, borderBottom: "1px solid #eee" }}>
      <ul style={{ display: "flex", gap: 16, listStyle: "none", margin: 0 }}>
        <li><Link href="/">Beranda</Link></li>
        <li><Link href="/wisata">Wisata</Link></li>
        <li><Link href="/b2h">B2H</Link></li>
        <li><Link href="/bmc">BMC</Link></li>
        <li><Link href="/bic">BIC</Link></li>
        <li><Link href="/bdb">BDB</Link></li>
        <li><Link href="/kontak">Kontak</Link></li>
      </ul>
    </nav>
  );
}
