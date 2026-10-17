"use client";

import { useCallback, useEffect, useId, useRef } from "react";
import type { ReactNode } from "react";
import { AlertTriangle, CheckCircle2, Info, X } from "lucide-react";
import Button from "./Button";

export type DialogTone = "danger" | "default" | "success" | "info";

interface DialogProps {
  open: boolean;
  title: string;
  description?: ReactNode;
  /** Label tombol utama. */
  confirmLabel: string;
  cancelLabel?: string;
  /** Mewarnai ikon dan tombol utama. */
  tone?: DialogTone;
  /** Tetap didukung untuk kompatibilitas: sama dengan tone="danger". */
  destructive?: boolean;
  loading?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

const TONE_ICON: Record<DialogTone, { icon: ReactNode; wrap: string }> = {
  danger: {
    icon: <AlertTriangle aria-hidden className="h-4 w-4 text-adm-danger" />,
    wrap: "bg-adm-danger-soft",
  },
  success: {
    icon: <CheckCircle2 aria-hidden className="h-4 w-4 text-adm-success" />,
    wrap: "bg-adm-success-soft",
  },
  info: {
    icon: <Info aria-hidden className="h-4 w-4 text-adm-info" />,
    wrap: "bg-adm-info-soft",
  },
  default: {
    icon: <Info aria-hidden className="h-4 w-4 text-adm-primary" />,
    wrap: "bg-adm-primary-soft",
  },
};

/** Elemen yang bisa menerima fokus, dipakai untuk menjebak fokus di dalam dialog. */
const FOCUSABLE =
  'a[href],button:not([disabled]),textarea:not([disabled]),input:not([disabled]),select:not([disabled]),[tabindex]:not([tabindex="-1"])';

/**
 * Dialog konfirmasi.
 *
 * Perilaku yang dijaga:
 * - Fokus awal ke tombol batal, bukan tombol merusak.
 * - Tab dan Shift+Tab berputar di dalam dialog (focus trap), tidak bocor ke
 *   halaman di belakang.
 * - Escape dan klik latar menutup; selama proses berjalan (loading) keduanya
 *   diabaikan supaya pengguna tidak menutup di tengah operasi.
 * - Fokus kembali ke elemen pemicu setelah dialog ditutup.
 * - Halaman di belakang tidak ikut tergulir.
 * - aria-describedby menautkan judul dan isi agar pembaca layar membacakannya.
 */
export default function Dialog({
  open,
  title,
  description,
  confirmLabel,
  cancelLabel = "Batal",
  tone,
  destructive = false,
  loading = false,
  onConfirm,
  onClose,
}: DialogProps) {
  const resolvedTone: DialogTone = tone ?? (destructive ? "danger" : "default");
  const cancelRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);
  const titleId = useId();
  const descId = useId();

  const close = useCallback(() => {
    if (loading) return;
    onClose();
  }, [loading, onClose]);

  // Ingat elemen yang sedang fokus, kembalikan saat dialog ditutup.
  useEffect(() => {
    if (!open) return;
    previouslyFocused.current = document.activeElement as HTMLElement | null;
    // Fokus awal: tombol batal supaya Enter tidak langsung menjalankan aksi merusak.
    const timer = window.setTimeout(() => cancelRef.current?.focus(), 30);
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

  // Escape untuk menutup + jebakan fokus Tab.
  useEffect(() => {
    if (!open) return;
    const handler = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        close();
        return;
      }
      if (event.key !== "Tab") return;

      const panel = panelRef.current;
      if (!panel) return;
      const nodes = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (el) => el.offsetParent !== null
      );
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
  }, [open, close]);

  if (!open) return null;

  const toneStyle = TONE_ICON[resolvedTone];

  return (
    <div
      className="adm-overlay-in fixed inset-0 z-[75] flex items-end justify-center bg-[rgba(20,32,28,0.46)] p-4 sm:items-center"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) close();
      }}
      role="presentation"
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descId : undefined}
        className="adm-dialog-in flex max-h-[calc(100vh-2rem)] w-full max-w-[460px] flex-col overflow-hidden rounded-[var(--radius-adm-xl)] border border-adm-border bg-adm-surface shadow-adm-lg"
      >
        {/* Kepala */}
        <div className="flex items-start gap-3 px-5 pb-3.5 pt-5">
          <span
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${toneStyle.wrap}`}
          >
            {toneStyle.icon}
          </span>
          <div className="min-w-0 flex-1 pt-0.5">
            <h2 id={titleId} className="text-[15px] font-semibold leading-snug tracking-[-0.01em] text-adm-ink">
              {title}
            </h2>
            {description ? (
              <div
                id={descId}
                className="adm-scroll mt-1.5 max-h-[40vh] overflow-y-auto pr-1 text-[12.5px] leading-relaxed text-adm-subtle"
              >
                {description}
              </div>
            ) : null}
          </div>
          <button
            type="button"
            onClick={close}
            disabled={loading}
            aria-label="Tutup dialog"
            className="adm-ring adm-transition -mr-1 -mt-1 shrink-0 rounded-[var(--radius-adm-sm)] p-1.5 text-adm-subtle hover:bg-adm-muted hover:text-adm-ink active:bg-adm-pressed disabled:opacity-40"
          >
            <X aria-hidden className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Kaki: aksi. Di ponsel tombol menumpuk penuh lebar agar mudah disentuh. */}
        <div className="flex flex-col-reverse gap-2 border-t border-adm-divider bg-adm-surface-2 px-5 py-3.5 sm:flex-row sm:items-center sm:justify-end">
          <Button
            ref={cancelRef}
            variant="secondary"
            onClick={close}
            disabled={loading}
            className="w-full sm:w-auto"
          >
            {cancelLabel}
          </Button>
          <Button
            variant={resolvedTone === "danger" ? "destructive" : "primary"}
            onClick={onConfirm}
            loading={loading}
            className="w-full sm:w-auto"
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
