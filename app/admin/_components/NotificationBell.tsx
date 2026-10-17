"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AlertCircle, AlertTriangle, Bell, CheckCircle2, Info, X } from "lucide-react";
import Link from "next/link";
import { apiGet } from "../_lib/api";
import { useEscape } from "./Toast";

interface NotificationItem {
  id: string;
  kind: "success" | "error" | "warning" | "info";
  title: string;
  body?: string;
  at: string;
  href?: string;
}

/** Kunci penyimpanan status "sudah dibaca" di localStorage. */
const READ_KEY = "vb_admin_read_notifications";

const KIND_ICON = {
  success: CheckCircle2,
  error: AlertCircle,
  warning: AlertTriangle,
  info: Info,
} as const;

const KIND_STYLE = {
  success: "bg-adm-success-soft text-adm-success",
  error: "bg-adm-danger-soft text-adm-danger",
  warning: "bg-adm-warning-soft text-adm-warning",
  info: "bg-adm-info-soft text-adm-info",
} as const;

function loadRead(): string[] {
  try {
    const raw = window.localStorage.getItem(READ_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === "string") : [];
  } catch {
    return [];
  }
}

function saveRead(ids: string[]) {
  try {
    // Batasi agar tidak tumbuh tanpa batas.
    window.localStorage.setItem(READ_KEY, JSON.stringify(ids.slice(-200)));
  } catch {
    // localStorage bisa diblokir; abaikan, status baca jadi tidak persisten.
  }
}

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotificationItem[] | null>(null);
  const [read, setRead] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEscape(open, () => setOpen(false));

  // Baca status "sudah dibaca" sekali saat komponen dipasang.
  useEffect(() => {
    setRead(loadRead());
  }, []);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await apiGet<{ items: NotificationItem[] }>("/api/admin/notifications");
      setItems(data.items);
    } catch (failure) {
      setError(
        typeof failure === "object" && failure !== null && "error" in failure
          ? String((failure as { error: unknown }).error)
          : "Gagal memuat notifikasi."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  // Muat pertama kali, lalu segarkan berkala supaya lonceng ikut hidup.
  useEffect(() => {
    void fetchItems();
    const timer = window.setInterval(() => void fetchItems(), 120_000);
    return () => window.clearInterval(timer);
  }, [fetchItems]);

  // Tutup saat klik di luar panel.
  useEffect(() => {
    if (!open) return;
    const handler = (event: MouseEvent) => {
      const target = event.target as Node;
      if (panelRef.current?.contains(target) || buttonRef.current?.contains(target)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const unread = (items ?? []).filter((item) => !read.includes(item.id)).length;

  function markAllRead() {
    if (!items) return;
    const next = [...new Set([...read, ...items.map((item) => item.id)])];
    setRead(next);
    saveRead(next);
  }

  function markOne(id: string) {
    if (read.includes(id)) return;
    const next = [...read, id];
    setRead(next);
    saveRead(next);
  }

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => {
          setOpen((value) => !value);
          if (!open && !items) void fetchItems();
        }}
        aria-label={unread > 0 ? `Notifikasi, ${unread} belum dibaca` : "Notifikasi"}
        aria-expanded={open}
        aria-haspopup="dialog"
        className="adm-ring adm-transition relative inline-flex h-8 w-8 items-center justify-center rounded-[var(--radius-adm-sm)] text-adm-text hover:bg-adm-muted hover:text-adm-ink"
      >
        <Bell aria-hidden className="h-[17px] w-[17px]" />
        {unread > 0 ? (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-adm-accent-ink px-1 text-[10px] font-semibold leading-none text-white ring-2 ring-adm-surface">
            {unread > 9 ? "9+" : unread}
          </span>
        ) : null}
      </button>

      {open ? (
        <div
          ref={panelRef}
          role="dialog"
          aria-label="Notifikasi"
          className="adm-dialog-in absolute right-0 top-[calc(100%+8px)] z-50 w-[min(360px,calc(100vw-2rem))] overflow-hidden rounded-[var(--radius-adm-lg)] border border-adm-border bg-adm-surface shadow-adm-lg"
        >
          <div className="flex items-center justify-between gap-2 border-b border-adm-divider px-3.5 py-2.5">
            <div className="flex items-center gap-2">
              <h2 className="text-[13px] font-semibold text-adm-ink">Notifikasi</h2>
              {unread > 0 ? (
                <span className="rounded-[var(--radius-adm-xs)] bg-adm-accent-soft px-1.5 py-0.5 text-[10.5px] font-medium text-adm-accent-ink">
                  {unread} baru
                </span>
              ) : null}
            </div>
            <div className="flex items-center gap-0.5">
              {unread > 0 ? (
                <button
                  type="button"
                  onClick={markAllRead}
                  className="adm-ring adm-transition rounded px-1.5 py-1 text-[11.5px] font-medium text-adm-primary hover:bg-adm-primary-soft"
                >
                  Tandai dibaca
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Tutup notifikasi"
                className="adm-ring adm-transition rounded p-1 text-adm-subtle hover:bg-adm-muted hover:text-adm-ink"
              >
                <X aria-hidden className="h-3 w-3" />
              </button>
            </div>
          </div>

          <div className="adm-scroll max-h-[min(60vh,380px)] overflow-y-auto">
            {loading && !items ? (
              <div className="space-y-2 p-3" aria-hidden>
                {[0, 1, 2].map((i) => (
                  <div key={i} className="flex gap-2.5">
                    <div className="adm-skeleton h-6 w-6 shrink-0 rounded-full" />
                    <div className="flex-1 space-y-1.5">
                      <div className="adm-skeleton h-2.5 w-3/4 rounded" />
                      <div className="adm-skeleton h-2.5 w-1/2 rounded" />
                    </div>
                  </div>
                ))}
              </div>
            ) : null}

            {error ? (
              <div className="p-3.5">
                <p className="text-[12px] text-adm-danger">{error}</p>
                <button
                  type="button"
                  onClick={() => void fetchItems()}
                  className="adm-ring adm-transition mt-1.5 rounded text-[11.5px] font-medium text-adm-danger underline underline-offset-2"
                >
                  Coba lagi
                </button>
              </div>
            ) : null}

            {items && items.length === 0 ? (
              <div className="flex flex-col items-center gap-1.5 px-4 py-10 text-center">
                <Bell aria-hidden className="h-5 w-5 text-adm-border-strong" />
                <p className="text-[12.5px] font-medium text-adm-ink">Belum ada notifikasi</p>
                <p className="text-[11.5px] leading-relaxed text-adm-subtle">
                  Pemberitahuan muncul saat ada perubahan konten atau hasil sinkronisasi berita.
                </p>
              </div>
            ) : null}

            {items && items.length > 0 ? (
              <ul className="divide-y divide-adm-divider">
                {items.map((item) => {
                  const Icon = KIND_ICON[item.kind];
                  const isUnread = !read.includes(item.id);
                  return (
                    <li key={item.id}>
                      <Link
                        href={item.href ?? "#"}
                        target={item.href ? "_blank" : undefined}
                        rel={item.href ? "noreferrer" : undefined}
                        onClick={() => markOne(item.id)}
                        className={`adm-ring adm-transition flex gap-2.5 px-3.5 py-2.5 hover:bg-adm-surface-2 ${
                          isUnread ? "bg-adm-primary-soft/30" : ""
                        }`}
                      >
                        <span
                          className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${KIND_STYLE[item.kind]}`}
                        >
                          <Icon aria-hidden className="h-3.5 w-3.5" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="flex items-start gap-1.5">
                            <span className="line-clamp-2 flex-1 text-[12px] font-medium leading-relaxed text-adm-ink">
                              {item.title}
                            </span>
                            {isUnread ? (
                              <span
                                aria-label="Belum dibaca"
                                className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-adm-accent"
                              />
                            ) : null}
                          </span>
                          {item.body ? (
                            <span className="mt-0.5 block truncate text-[11px] text-adm-subtle">
                              {item.body}
                            </span>
                          ) : null}
                          <span className="mt-0.5 block text-[10.5px] text-adm-subtle">
                            {relativeTime(item.at)}
                          </span>
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            ) : null}
          </div>

          <div className="flex items-center justify-between border-t border-adm-divider bg-adm-surface-2 px-3.5 py-2">
              <Link
                href="/admin"
                className="adm-ring adm-transition rounded text-[11.5px] font-medium text-adm-primary hover:underline underline-offset-2"
              >
                Lihat riwayat lengkap
              </Link>
            <button
              type="button"
              onClick={() => void fetchItems()}
              disabled={loading}
              className="adm-ring adm-transition rounded px-1.5 py-1 text-[11.5px] text-adm-subtle hover:text-adm-ink disabled:opacity-50"
            >
              {loading ? "Memuat..." : "Segarkan"}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function relativeTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const diff = Date.now() - date.getTime();
  const minutes = Math.round(diff / 60000);
  if (minutes < 1) return "baru saja";
  if (minutes < 60) return `${minutes} menit lalu`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} jam lalu`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days} hari lalu`;
  return new Intl.DateTimeFormat("id-ID", { dateStyle: "medium" }).format(date);
}