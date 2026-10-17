"use client";

import { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  Copy,
  ExternalLink,
  HardDrive,
  ImageOff,
  PencilLine,
  Trash2,
  X,
} from "lucide-react";
import Link from "next/link";
import Button from "./Button";
import { useEscape } from "./Toast";

export interface UsageLocation {
  collection: string;
  collectionLabel: string;
  slug: string;
  title: string;
  field: string;
  href: string;
}

export interface MediaDetail {
  path: string;
  name: string;
  size: number;
  url: string;
  usedBy: UsageLocation[];
}

/**
 * Panel detail satu gambar.
 *
 * Menjawab kebutuhan yang sebelumnya tidak terpenuhi: dari Pustaka Gambar,
 * admin harus bisa melihat gambar lebih besar, mengetahui di halaman mana
 * gambar itu dipakai, membuka halaman tersebut untuk menggantinya, menyalin
 * URL, dan menghapusnya. Sebelumnya satu-satunya cara adalah menebak lewat
 * ikon kecil yang muncul saat kursor kebetulan berada di atas gambar.
 *
 * Panel ini juga bisa dibuka dengan klik pada gambarnya, bukan hanya lewat
 * tombol di sudut, sehingga tetap dapat dipakai di layar sentuh.
 */
export default function MediaDetailSheet({
  open,
  detail,
  loading,
  onClose,
  onDelete,
  onCopy,
  copied,
}: {
  open: boolean;
  detail: MediaDetail | null;
  loading: boolean;
  onClose: () => void;
  onDelete: (path: string) => void;
  onCopy: (url: string) => void;
  copied: boolean;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);

  useEscape(open, onClose);

  // Fokus awal ke tombol tutup; kembalikan fokus saat panel ditutup.
  useEffect(() => {
    if (!open) return;
    previouslyFocused.current = document.activeElement as HTMLElement | null;
    const timer = window.setTimeout(() => closeRef.current?.focus(), 40);
    return () => {
      window.clearTimeout(timer);
      previouslyFocused.current?.focus?.();
    };
  }, [open]);

  // Kunci gulir halaman di belakang.
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  // Jebakan fokus Tab.
  useEffect(() => {
    if (!open) return;
    const handler = (event: KeyboardEvent) => {
      if (event.key !== "Tab") return;
      const panel = panelRef.current;
      if (!panel) return;
      const nodes = Array.from(
        panel.querySelectorAll<HTMLElement>(
          'a[href],button:not([disabled]),[tabindex]:not([tabindex="-1"])'
        )
      ).filter((el) => el.offsetParent !== null);
      if (nodes.length === 0) return;
      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      const active = document.activeElement as HTMLElement | null;
      if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      } else if (event.shiftKey && (active === first || !panel.contains(active))) {
        event.preventDefault();
        last.focus();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open]);

  if (!open) return null;

  const usedCount = detail?.usedBy.length ?? 0;
  const isUnused = usedCount === 0;

  return (
    <div
      className="adm-overlay-in fixed inset-0 z-[72] flex items-end justify-center bg-[rgba(20,32,28,0.46)] p-0 sm:items-center sm:p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      role="presentation"
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="media-detail-title"
        className="adm-dialog-in flex max-h-[92vh] w-full max-w-[560px] flex-col overflow-hidden rounded-t-[var(--radius-adm-xl)] border border-adm-border bg-adm-surface shadow-adm-lg sm:max-h-[88vh] sm:rounded-[var(--radius-adm-xl)]"
      >
        {/* Kepala */}
        <div className="flex items-start justify-between gap-3 border-b border-adm-divider px-4 py-3.5 sm:px-5">
          <div className="min-w-0">
            <h2
              id="media-detail-title"
              className="truncate text-[14.5px] font-semibold tracking-[-0.01em] text-adm-ink"
              title={detail?.name}
            >
              {detail?.name ?? "Memuat…"}
            </h2>
            {detail ? (
              <p className="mt-0.5 flex items-center gap-1.5 font-mono text-[11px] text-adm-subtle">
                <HardDrive aria-hidden className="h-3 w-3" />
                {formatBytes(detail.size)}
              </p>
            ) : null}
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Tutup detail gambar"
            className="adm-ring adm-transition -mr-1 -mt-1 shrink-0 rounded-[var(--radius-adm-sm)] p-1.5 text-adm-subtle hover:bg-adm-muted hover:text-adm-ink active:bg-adm-pressed"
          >
            <X aria-hidden className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Isi */}
        <div className="adm-scroll flex-1 overflow-y-auto">
          {loading || !detail ? (
            <div className="space-y-3 p-4 sm:p-5">
              <div className="adm-skeleton aspect-[4/3] w-full rounded-[var(--radius-adm-md)]" />
              <div className="adm-skeleton h-3 w-2/3 rounded" />
              <div className="adm-skeleton h-3 w-1/3 rounded" />
            </div>
          ) : (
            <div className="space-y-4 p-4 sm:p-5">
              {/* Pratinjau */}
              <div className="overflow-hidden rounded-[var(--radius-adm-md)] border border-adm-border bg-adm-muted">
                <img
                  src={detail.url}
                  alt={detail.name}
                  className="max-h-[46vh] w-full object-contain"
                />
              </div>

              {/* Status pemakaian: inti dari panel ini */}
              <div
                className={`rounded-[var(--radius-adm-md)] border px-3.5 py-3 ${
                  isUnused
                    ? "border-[#f2e0bb] bg-adm-warning-soft"
                    : "border-[#c7ecd3] bg-adm-success-soft"
                }`}
              >
                <div className="flex items-start gap-2">
                  {isUnused ? (
                    <ImageOff aria-hidden className="mt-0.5 h-3.5 w-3.5 shrink-0 text-adm-warning" />
                  ) : (
                    <ArrowRight aria-hidden className="mt-0.5 h-3.5 w-3.5 shrink-0 text-adm-success" />
                  )}
                  <div className="min-w-0">
                    <p
                      className={`text-[12.5px] font-medium ${
                        isUnused ? "text-adm-warning" : "text-adm-success-ink"
                      }`}
                    >
                      {isUnused
                        ? "Tidak dipakai di halaman mana pun"
                        : `Dipakai di ${usedCount} tempat`}
                    </p>
                    <p className="mt-0.5 text-[11.5px] leading-relaxed text-adm-subtle">
                      {isUnused
                        ? "Gambar ini aman dihapus. Berkas tidak lagi dirujuk oleh konten mana pun."
                        : "Ganti gambar di halaman berikut sebelum menghapusnya, supaya tampilan situs tidak kosong."}
                    </p>
                  </div>
                </div>

                {/* Daftar halaman pemakai, bisa diklik untuk menyunting */}
                {!isUnused ? (
                  <ul className="mt-2.5 space-y-1 border-t border-black/5 pt-2.5">
                    {detail.usedBy.map((u) => (
                      <li key={`${u.collection}-${u.slug}-${u.field}`}>
                        <Link
                          href={u.href}
                          className="adm-ring adm-transition group flex items-center gap-1.5 rounded text-[12px] hover:text-adm-primary"
                        >
                          <span className="truncate font-medium text-adm-ink group-hover:text-adm-primary">
                            {u.title}
                          </span>
                          <span className="shrink-0 text-adm-subtle">
                            · {u.collectionLabel} · {u.field}
                          </span>
                          <PencilLine
                            aria-hidden
                            className="ml-auto h-3 w-3 shrink-0 text-adm-border-strong group-hover:text-adm-primary"
                          />
                        </Link>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>

              {/* Path berkas */}
              <div>
                <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.07em] text-adm-subtle">
                  Lokasi berkas
                </p>
                <code className="block break-all rounded-[var(--radius-adm-sm)] bg-adm-muted px-2.5 py-2 font-mono text-[11.5px] text-adm-text">
                  {detail.path}
                </code>
              </div>
            </div>
          )}
        </div>

        {/* Kaki: aksi */}
        <div className="flex flex-col gap-2 border-t border-adm-divider bg-adm-surface-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-end sm:px-5">
          <Button
            variant="secondary"
            size="small"
            className="w-full sm:w-auto"
            disabled={!detail}
            icon={<Copy aria-hidden className="h-3 w-3" />}
            onClick={() => detail && onCopy(detail.url)}
          >
            {copied ? "URL tersalin" : "Salin URL"}
          </Button>
          <a
            href={detail?.url ?? "#"}
            target="_blank"
            rel="noreferrer"
            className={`adm-ring adm-transition inline-flex h-8 w-full items-center justify-center gap-1.5 rounded-[var(--radius-adm-sm)] border border-adm-border-strong bg-adm-surface px-3 text-[13px] font-medium text-adm-ink shadow-adm-xs hover:bg-adm-muted active:bg-adm-pressed sm:w-auto ${
              detail ? "" : "pointer-events-none opacity-50"
            }`}
          >
            <ExternalLink aria-hidden className="h-3 w-3" />
            Buka gambar
          </a>
          <Button
            variant="destructive"
            size="small"
            className="w-full sm:w-auto"
            disabled={!detail}
            icon={<Trash2 aria-hidden className="h-3 w-3" />}
            onClick={() => detail && onDelete(detail.path)}
          >
            Hapus gambar
          </Button>
        </div>
      </div>
    </div>
  );
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
