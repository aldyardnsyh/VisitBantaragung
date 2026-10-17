"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import {
  BookOpen,
  ChevronRight,
  ExternalLink,
  Images,
  LayoutDashboard,
  LogOut,
  MapPin,
  Menu,
  Search,
  Newspaper,
  Settings,
  Sprout,
  Store,
  Tent,
  X,
} from "lucide-react";
import type { ReactNode } from "react";
import { apiSend } from "../_lib/api";
import { SectionLabel } from "./Card";
import NotificationBell from "./NotificationBell";
import CommandPalette from "./CommandPalette";

interface NavItem {
  href: string;
  label: string;
  icon: ReactNode;
  description: string;
}

const NAV_UTAMA: NavItem = {
  href: "/admin",
  label: "Ringkasan",
  icon: <LayoutDashboard aria-hidden className="h-[17px] w-[17px]" />,
  description: "Ikhtisar konten",
};

const KONTEN_ITEMS: NavItem[] = [
  {
    href: "/admin/berita",
    label: "Berita",
    icon: <Newspaper aria-hidden className="h-[17px] w-[17px]" />,
    description: "Hasil sinkronisasi",
  },
  {
    href: "/admin/artikel",
    label: "Artikel KKN",
    icon: <BookOpen aria-hidden className="h-[17px] w-[17px]" />,
    description: "Program KKN",
  },
  {
    href: "/admin/wisata",
    label: "Destinasi Wisata",
    icon: <MapPin aria-hidden className="h-[17px] w-[17px]" />,
    description: "Titik wisata",
  },
  {
    href: "/admin/herbal",
    label: "Katalog Herbal",
    icon: <Sprout aria-hidden className="h-[17px] w-[17px]" />,
    description: "Tanaman obat",
  },
  {
    href: "/admin/homestay",
    label: "Homestay",
    icon: <Tent aria-hidden className="h-[17px] w-[17px]" />,
    description: "Penginapan",
  },
  {
    href: "/admin/umkm",
    label: "UMKM",
    icon: <Store aria-hidden className="h-[17px] w-[17px]" />,
    description: "Usaha warga",
  },
  {
    href: "/admin/lokasi",
    label: "Lokasi Peta",
    icon: <MapPin aria-hidden className="h-[17px] w-[17px]" />,
    description: "Titik peta",
  },
];

const SISTEM_ITEMS: NavItem[] = [
  {
    href: "/admin/media",
    label: "Pustaka Gambar",
    icon: <Images aria-hidden className="h-[17px] w-[17px]" />,
    description: "Kelola aset",
  },
  {
    href: "/admin/pengaturan",
    label: "Pengaturan Situs",
    icon: <Settings aria-hidden className="h-[17px] w-[17px]" />,
    description: "Identitas & SEO",
  },
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
    href === "/admin" ? pathname === href : Boolean(pathname?.startsWith(href));

  const current = [...[NAV_UTAMA], ...KONTEN_ITEMS, ...SISTEM_ITEMS].find((item) =>
    isActive(item.href)
  );

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

  const sidebar = (
    <div className="flex h-full flex-col">
      {/* Merek */}
      <div className="flex h-14 shrink-0 items-center gap-2.5 border-b border-adm-divider px-4">
        <Link href="/admin" className="adm-ring flex min-w-0 items-center gap-2.5 rounded">
          <img src="/logo.svg" alt="" className="h-8 w-8 shrink-0 rounded-full ring-1 ring-adm-border" />
          <span className="flex min-w-0 flex-col leading-tight">
            <span className="truncate text-[13px] font-semibold tracking-[-0.01em] text-adm-ink">
              Visit Bantaragung
            </span>
            <span className="truncate text-[10.5px] text-adm-subtle">Dasbor Konten</span>
          </span>
        </Link>
      </div>

      {/* Navigasi */}
      <nav aria-label="Navigasi dasbor" className="adm-scroll flex-1 overflow-y-auto px-2.5 py-3">
        <div className="space-y-0.5">
          <NavLink item={NAV_UTAMA} active={isActive(NAV_UTAMA.href)} onNavigate={() => setDrawerOpen(false)} />
        </div>

        <div className="mt-5 space-y-0.5">
          <div className="mb-1.5 px-2.5">
            <SectionLabel>Konten</SectionLabel>
          </div>
          {KONTEN_ITEMS.map((item) => (
            <NavLink
              key={item.href}
              item={item}
              active={isActive(item.href)}
              onNavigate={() => setDrawerOpen(false)}
            />
          ))}
        </div>

        <div className="mt-5 space-y-0.5">
          <div className="mb-1.5 px-2.5">
            <SectionLabel>Sistem</SectionLabel>
          </div>
          {SISTEM_ITEMS.map((item) => (
            <NavLink
              key={item.href}
              item={item}
              active={isActive(item.href)}
              onNavigate={() => setDrawerOpen(false)}
            />
          ))}
        </div>
      </nav>

      {/* Kaki sidebar: akun */}
      <div className="shrink-0 border-t border-adm-divider p-2.5">
        <div className="mb-1 flex items-center gap-2.5 rounded-[var(--radius-adm-sm)] px-2 py-2">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-adm-primary-soft text-[11px] font-semibold uppercase text-adm-primary-ink">
            {username.slice(0, 2)}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[12.5px] font-medium text-adm-ink">{username}</span>
            <span className="block text-[10.5px] text-adm-subtle">Administrator</span>
          </span>
        </div>
        <Link
          href="/"
          target="_blank"
          rel="noreferrer"
          className="adm-ring adm-transition flex h-8.5 items-center gap-2 rounded-[var(--radius-adm-sm)] px-2 py-2 text-[12.5px] text-adm-text hover:bg-adm-nav-hover hover:text-adm-ink"
        >
          <ExternalLink aria-hidden className="h-3.5 w-3.5" />
          Lihat Situs
        </Link>
        <button
          type="button"
          onClick={logout}
          disabled={loggingOut}
          className="adm-ring adm-transition flex h-8.5 w-full items-center gap-2 rounded-[var(--radius-adm-sm)] px-2 py-2 text-[12.5px] text-adm-text hover:bg-adm-danger-soft hover:text-adm-danger disabled:opacity-50"
        >
          <LogOut aria-hidden className="h-3.5 w-3.5" />
          {loggingOut ? "Keluar..." : "Keluar"}
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-adm-page">
      <div className="flex">
        {/* Sidebar desktop */}
        <aside className="sticky top-0 hidden h-screen w-[248px] shrink-0 border-r border-adm-border bg-adm-nav lg:block">
          {sidebar}
        </aside>

        {/* Drawer mobile */}
        {drawerOpen ? (
          <div className="fixed inset-0 z-50 lg:hidden">
            <div
              className="adm-overlay-in absolute inset-0 bg-[rgba(20,32,28,0.42)]"
              onClick={() => setDrawerOpen(false)}
              role="presentation"
            />
            <aside className="adm-rise-in absolute left-0 top-0 h-full w-[276px] border-r border-adm-border bg-adm-nav shadow-adm-lg">
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                aria-label="Tutup menu"
                className="adm-ring adm-transition absolute right-2 top-3.5 rounded p-2 text-adm-subtle hover:bg-adm-muted hover:text-adm-ink"
              >
                <X aria-hidden className="h-4 w-4" />
              </button>
              {sidebar}
            </aside>
          </div>
        ) : null}

        {/* Area utama */}
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-30 border-b border-adm-border bg-adm-surface/95 backdrop-blur-sm">
            <div className="flex h-14 items-center gap-3 px-4 sm:px-6">
              <button
                type="button"
                onClick={() => setDrawerOpen(true)}
                aria-label="Buka menu"
                className="adm-ring adm-transition -ml-1 rounded-[var(--radius-adm-sm)] p-2 text-adm-text hover:bg-adm-muted hover:text-adm-ink lg:hidden"
              >
                <Menu aria-hidden className="h-[18px] w-[18px]" />
              </button>

              {/* Breadcrumb */}
              <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-1.5 text-[12.5px]">
                <Link
                  href="/admin"
                  className="adm-ring adm-transition hidden shrink-0 rounded text-adm-subtle hover:text-adm-ink sm:inline"
                >
                  Dasbor
                </Link>
                {current && current.href !== "/admin" ? (
                  <>
                    <ChevronRight aria-hidden className="hidden h-3 w-3 shrink-0 text-adm-border-strong sm:inline" />
                    <span className="truncate font-medium text-adm-ink">{current.label}</span>
                  </>
                ) : (
                  <span className="truncate font-medium text-adm-ink sm:hidden">Dasbor</span>
                )}
              </nav>

              <div className="ml-auto flex items-center gap-1.5">
                <Link
                  href="/"
                  target="_blank"
                  rel="noreferrer"
                  className="adm-ring adm-transition hidden h-8 items-center gap-1.5 rounded-[var(--radius-adm-sm)] px-2.5 text-[12.5px] text-adm-text hover:bg-adm-muted hover:text-adm-ink sm:inline-flex"
                >
                  <ExternalLink aria-hidden className="h-3.5 w-3.5" />
                  Situs
                </Link>              <button
                type="button"
                onClick={() => window.dispatchEvent(new KeyboardEvent("keydown", { key: "k", ctrlKey: true }))}
                aria-label="Cari halaman (Ctrl K)"
                className="adm-ring adm-transition hidden h-8 items-center gap-1.5 rounded-[var(--radius-adm-sm)] border border-adm-border bg-adm-surface-2 px-2.5 text-[12px] text-adm-subtle hover:bg-adm-muted hover:text-adm-ink md:inline-flex"
              >
                <Search aria-hidden className="h-3.5 w-3.5" />
                <span>Cari</span>
                <kbd className="ml-0.5 rounded border border-adm-border bg-adm-surface px-1 font-mono text-[10px]">
                  Ctrl K
                </kbd>
              </button>
              <NotificationBell />
              <CommandPalette />
                <span aria-hidden className="mx-1 hidden h-5 w-px bg-adm-divider sm:block" />
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-adm-primary-soft text-[11px] font-semibold uppercase text-adm-primary-ink">
                  {username.slice(0, 2)}
                </span>
              </div>
            </div>
          </header>

          <main className="mx-auto w-full max-w-[1240px] flex-1 px-4 py-6 sm:px-6 sm:py-8">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}

function NavLink({
  item,
  active,
  onNavigate,
}: {
  item: NavItem;
  active: boolean;
  onNavigate: () => void;
}) {
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={`adm-ring adm-transition group relative flex items-center gap-2.5 rounded-[var(--radius-adm-sm)] px-2.5 py-2 text-[13px] ${
        active
          ? "bg-adm-nav-active font-semibold text-adm-primary-ink"
          : "text-adm-text hover:bg-adm-nav-hover hover:text-adm-ink"
      }`}
    >
      <span
        className={`shrink-0 ${
          active ? "text-adm-primary" : "text-adm-subtle group-hover:text-adm-text"
        }`}
      >
        {item.icon}
      </span>
      <span className="truncate">{item.label}</span>
      {active ? (
        <span
          aria-hidden
          className="absolute left-0 top-1/2 h-4 w-[2px] -translate-y-1/2 rounded-r bg-adm-primary"
        />
      ) : null}
    </Link>
  );
}
