"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  BookOpen,
  CornerDownLeft,
  Images,
  LayoutDashboard,
  MapPin,
  Newspaper,
  Search,
  Settings,
  Sprout,
  Store,
  Tent,
} from "lucide-react";

interface Command {
  label: string;
  href: string;
  group: string;
  icon: React.ReactNode;
  keywords?: string;
}

/**
 * Daftar perintah. Sengaja hanya berisi rute yang benar-benar ada, supaya tidak
 * ada tujuan mati saat dipilih.
 */
const COMMANDS: Command[] = [
  { label: "Ringkasan", href: "/admin", group: "Navigasi", icon: <LayoutDashboard aria-hidden className="h-4 w-4" />, keywords: "dashboard home beranda ikhtisar" },
  { label: "Berita", href: "/admin/berita", group: "Konten", icon: <Newspaper aria-hidden className="h-4 w-4" />, keywords: "news crawl sinkron" },
  { label: "Artikel KKN", href: "/admin/artikel", group: "Konten", icon: <BookOpen aria-hidden className="h-4 w-4" />, keywords: "artikel tulisan program" },
  { label: "Destinasi Wisata", href: "/admin/wisata", group: "Konten", icon: <MapPin aria-hidden className="h-4 w-4" />, keywords: "wisata destinasi tempat" },
  { label: "Katalog Herbal", href: "/admin/herbal", group: "Konten", icon: <Sprout aria-hidden className="h-4 w-4" />, keywords: "herbal tanaman obat b2h" },
  { label: "Homestay", href: "/admin/homestay", group: "Konten", icon: <Tent aria-hidden className="h-4 w-4" />, keywords: "penginapan inap bdb" },
  { label: "UMKM", href: "/admin/umkm", group: "Konten", icon: <Store aria-hidden className="h-4 w-4" />, keywords: "usaha umkm toko" },
  { label: "Lokasi Peta", href: "/admin/lokasi", group: "Konten", icon: <MapPin aria-hidden className="h-4 w-4" />, keywords: "peta lokasi titik bmc" },
  { label: "Pustaka Gambar", href: "/admin/media", group: "Sistem", icon: <Images aria-hidden className="h-4 w-4" />, keywords: "media gambar foto unggah aset" },
  { label: "Pengaturan Situs", href: "/admin/pengaturan", group: "Sistem", icon: <Settings aria-hidden className="h-4 w-4" />, keywords: "pengaturan setting seo kontak" },
];

export default function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Pintasan Ctrl+K / Cmd+K untuk membuka, Escape untuk menutup.
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      const modifier = event.metaKey || event.ctrlKey;
      if (modifier && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen((value) => !value);
        setQuery("");
        setActive(0);
      }
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  useEffect(() => {
    if (open) {
      // Fokus setelah panel terpasang.
      const timer = window.setTimeout(() => inputRef.current?.focus(), 30);
      return () => window.clearTimeout(timer);
    }
  }, [open]);

  const results = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return COMMANDS;
    return COMMANDS.filter((command) => {
      const haystack = `${command.label} ${command.group} ${command.keywords ?? ""}`.toLowerCase();
      return haystack.includes(needle);
    });
  }, [query]);

  // Jaga indeks aktif tetap di dalam rentang hasil.
  useEffect(() => {
    setActive((current) => Math.min(current, Math.max(0, results.length - 1)));
  }, [results.length]);

  function run(command: Command) {
    setOpen(false);
    router.push(command.href);
  }

  function onKeyDown(event: React.KeyboardEvent) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActive((current) => (current + 1) % Math.max(1, results.length));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActive((current) => (current - 1 + results.length) % Math.max(1, results.length));
    } else if (event.key === "Enter") {
      event.preventDefault();
      const command = results[active];
      if (command) run(command);
    }
  }

  if (!open) return null;

  // Kelompokkan hasil agar mudah dipindai.
  const groups = results.reduce<Record<string, Command[]>>((acc, command) => {
    (acc[command.group] ??= []).push(command);
    return acc;
  }, {});

  let flatIndex = -1;

  return (
    <div
      className="adm-overlay-in fixed inset-0 z-[85] flex items-start justify-center bg-[rgba(20,32,28,0.42)] px-4 pt-[12vh]"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) setOpen(false);
      }}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Pencarian cepat"
        className="adm-dialog-in w-full max-w-[520px] overflow-hidden rounded-[var(--radius-adm-xl)] border border-adm-border bg-adm-surface shadow-adm-lg"
      >
        <div className="flex items-center gap-2.5 border-b border-adm-divider px-3.5">
          <Search aria-hidden className="h-4 w-4 shrink-0 text-adm-subtle" />
          <input
            ref={inputRef}
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setActive(0);
            }}
            onKeyDown={onKeyDown}
            placeholder="Cari halaman atau menu…"
            aria-label="Cari halaman atau menu"
            className="h-11 flex-1 bg-transparent text-[13.5px] text-adm-ink outline-none placeholder:text-adm-subtle/80"
          />
          <kbd className="hidden shrink-0 rounded border border-adm-border bg-adm-muted px-1.5 py-0.5 font-mono text-[10.5px] text-adm-subtle sm:block">
            Esc
          </kbd>
        </div>

        <div className="adm-scroll max-h-[min(52vh,340px)] overflow-y-auto py-1.5">
          {results.length === 0 ? (
            <div className="px-4 py-8 text-center">
              <p className="text-[12.5px] font-medium text-adm-ink">Tidak ada yang cocok</p>
              <p className="mt-0.5 text-[11.5px] text-adm-subtle">
                Coba kata lain seperti “wisata”, “gambar”, atau “pengaturan”.
              </p>
            </div>
          ) : (
            Object.entries(groups).map(([group, items]) => (
              <div key={group}>
                <p className="px-3.5 pb-1 pt-2 text-[10.5px] font-semibold uppercase tracking-[0.08em] text-adm-subtle">
                  {group}
                </p>
                <ul>
                  {items.map((command) => {
                    flatIndex += 1;
                    const index = flatIndex;
                    const isActive = index === active;
                    return (
                      <li key={command.href}>
                        <button
                          type="button"
                          onMouseEnter={() => setActive(index)}
                          onClick={() => run(command)}
                          className={`adm-transition flex w-full items-center gap-2.5 px-3.5 py-2 text-left text-[13px] ${
                            isActive ? "bg-adm-primary-soft text-adm-primary-ink" : "text-adm-text"
                          }`}
                        >
                          <span className={isActive ? "text-adm-primary" : "text-adm-subtle"}>
                            {command.icon}
                          </span>
                          <span className="flex-1 truncate">{command.label}</span>
                          {isActive ? (
                            <CornerDownLeft aria-hidden className="h-3 w-3 shrink-0 text-adm-primary" />
                          ) : null}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))
          )}
        </div>

        <div className="flex items-center gap-3 border-t border-adm-divider bg-adm-surface-2 px-3.5 py-2 text-[10.5px] text-adm-subtle">
          <span className="flex items-center gap-1">
            <kbd className="rounded border border-adm-border bg-adm-surface px-1 py-0.5 font-mono">↑</kbd>
            <kbd className="rounded border border-adm-border bg-adm-surface px-1 py-0.5 font-mono">↓</kbd>
            pilih
          </span>
          <span className="flex items-center gap-1">
            <kbd className="rounded border border-adm-border bg-adm-surface px-1 py-0.5 font-mono">Enter</kbd>
            buka
          </span>
        </div>
      </div>
    </div>
  );
}
