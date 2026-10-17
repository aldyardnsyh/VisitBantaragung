"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import {
  BookOpen,
  LayoutDashboard,
  LogOut,
  MapPin,
  Menu,
  Images,
  Newspaper,
  Settings,
  Sprout,
  Store,
  Tent,
  Users,
  X,
} from "lucide-react";
import type { ReactNode } from "react";
import { apiSend } from "../_lib/api";

interface NavItem {
  href: string;
  label: string;
  icon: ReactNode;
}

const KONTEN_ITEMS: NavItem[] = [
  { href: "/admin/berita", label: "Berita", icon: <Newspaper aria-hidden className="h-4 w-4" /> },
  { href: "/admin/artikel", label: "Artikel KKN", icon: <BookOpen aria-hidden className="h-4 w-4" /> },
  { href: "/admin/wisata", label: "Destinasi Wisata", icon: <MapPin aria-hidden className="h-4 w-4" /> },
  { href: "/admin/herbal", label: "Katalog Herbal", icon: <Sprout aria-hidden className="h-4 w-4" /> },
  { href: "/admin/homestay", label: "Homestay", icon: <Tent aria-hidden className="h-4 w-4" /> },
  { href: "/admin/umkm", label: "UMKM", icon: <Store aria-hidden className="h-4 w-4" /> },
  { href: "/admin/lokasi", label: "Lokasi Peta", icon: <MapPin aria-hidden className="h-4 w-4" /> },
];

const SISTEM_ITEMS: NavItem[] = [
  { href: "/admin/media", label: "Pustaka Gambar", icon: <Images aria-hidden className="h-4 w-4" /> },
  { href: "/admin/pengaturan", label: "Pengaturan Situs", icon: <Settings aria-hidden className="h-4 w-4" /> },
];

export default function AppShell({
  username,
  children,
}: {
  username: string;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const isActive = (href: string) =>
    pathname === href || pathname?.startsWith(`${href}/`);

  async function logout() {
    setLoggingOut(true);
    try {
      await apiSend("/api/admin/auth", "DELETE");
      router.replace("/admin/login");
      router.refresh();
    } catch {
      setLoggingOut(false);
    }
  }

  const nav = (
    <nav className="flex h-full flex-col gap-6 overflow-y-auto px-3 py-5">
      <Link
        href="/admin"
        onClick={() => setDrawerOpen(false)}
        className="adm-ring flex items-center gap-3 rounded-[8px] px-2 py-1"
      >
        <img src="/logo.svg" alt="" className="h-9 w-9 rounded-full" />
        <span className="flex flex-col leading-tight">
          <span className="text-sm font-semibold text-adm-sidebar-text">Visit Bantaragung</span>
          <span className="text-[11px] text-adm-sidebar-muted">Dasbor Konten</span>
        </span>
      </Link>

      <div className="space-y-1">
        <SidebarLink
          href="/admin"
          label="Ringkasan"
          icon={<LayoutDashboard aria-hidden className="h-4 w-4" />}
          active={pathname === "/admin"}
          onClick={() => setDrawerOpen(false)}
        />
      </div>

      <SidebarGroup label="Konten">
        {KONTEN_ITEMS.map((item) => (
          <SidebarLink
            key={item.href}
            href={item.href}
            label={item.label}
            icon={item.icon}
            active={isActive(item.href)}
            onClick={() => setDrawerOpen(false)}
          />
        ))}
      </SidebarGroup>

      <SidebarGroup label="Sistem">
        {SISTEM_ITEMS.map((item) => (
          <SidebarLink
            key={item.href}
            href={item.href}
            label={item.label}
            icon={item.icon}
            active={isActive(item.href)}
            onClick={() => setDrawerOpen(false)}
          />
        ))}
      </SidebarGroup>

      <div className="mt-auto space-y-1 border-t border-white/10 pt-4">
        <a
          href="/"
          target="_blank"
          rel="noreferrer"
          className="adm-ring adm-transition flex h-11 items-center gap-3 rounded-[8px] px-3 text-sm text-adm-sidebar-text hover:bg-white/5"
        >
          <Users aria-hidden className="h-4 w-4" />
          Lihat Situs
        </a>
        <button
          type="button"
          onClick={logout}
          disabled={loggingOut}
          className="adm-ring adm-transition flex h-11 w-full items-center gap-3 rounded-[8px] px-3 text-sm text-adm-sidebar-text hover:bg-white/5 disabled:opacity-50"
        >
          <LogOut aria-hidden className="h-4 w-4" />
          {loggingOut ? "Keluar..." : `Keluar (${username})`}
        </button>
      </div>
    </nav>
  );

  return (
    <div className="flex min-h-screen">
      {/* Sidebar desktop */}
      <aside className="hidden w-60 shrink-0 bg-adm-sidebar lg:block">
        <div className="sticky top-0 h-screen">{nav}</div>
      </aside>

      {/* Drawer mobile */}
      {drawerOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="adm-overlay-in absolute inset-0 bg-[rgba(11,31,22,0.5)]"
            onClick={() => setDrawerOpen(false)}
            role="presentation"
          />
          <aside className="adm-dialog-in absolute left-0 top-0 h-full w-[280px] bg-adm-sidebar">
            <button
              type="button"
              onClick={() => setDrawerOpen(false)}
              aria-label="Tutup menu"
              className="adm-ring absolute right-3 top-4 rounded p-2 text-adm-sidebar-text hover:bg-white/10"
            >
              <X aria-hidden className="h-4 w-4" />
            </button>
            {nav}
          </aside>
        </div>
      ) : null}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-40 flex h-16 items-center gap-3 border-b border-adm-divider bg-adm-surface px-4 sm:px-6">
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            aria-label="Buka menu"
            className="adm-ring adm-transition rounded-[8px] p-2 text-adm-ink hover:bg-adm-muted lg:hidden"
          >
            <Menu aria-hidden className="h-5 w-5" />
          </button>
          <p className="text-sm text-adm-subtle">
            Kelola konten situs Desa Wisata Bantaragung
          </p>
        </header>

        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 sm:py-8">{children}</main>
      </div>
    </div>
  );
}

function SidebarGroup({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-wide text-adm-sidebar-muted">
        {label}
      </p>
      <div className="space-y-1">{children}</div>
    </div>
  );
}

function SidebarLink({
  href,
  label,
  icon,
  active,
  onClick,
}: {
  href: string;
  label: string;
  icon: ReactNode;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      className={`adm-ring adm-transition flex h-11 items-center gap-3 rounded-[8px] px-3 text-sm ${
        active
          ? "bg-adm-sidebar-active font-medium text-adm-sidebar-text"
          : "text-adm-sidebar-text/85 hover:bg-white/5"
      }`}
    >
      <span className={active ? "text-adm-accent" : ""}>{icon}</span>
      <span className="truncate">{label}</span>
    </Link>
  );
}
