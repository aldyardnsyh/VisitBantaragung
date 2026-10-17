"use client";

import { useEffect, useRef } from "react";
import type { ReactNode } from "react";
import { AlertTriangle, X } from "lucide-react";
import { useEscape } from "./Toast";
import Button from "./Button";

interface DialogProps {
  open: boolean;
  title: string;
  description?: ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  destructive?: boolean;
  loading?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

/**
 * Dialog konfirmasi.
 *
 * Fokus awal dipindah ke tombol batal supaya aksi merusak tidak menjadi sasaran
 * default saat pengguna menekan Enter. Dapat ditutup dengan Escape maupun klik
 * latar.
 */
export default function Dialog({
  open,
  title,
  description,
  confirmLabel,
  cancelLabel = "Batal",
  destructive = false,
  loading = false,
  onConfirm,
  onClose,
}: DialogProps) {
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEscape(open, onClose);

  useEffect(() => {
    if (open) cancelRef.current?.focus();
  }, [open]);

  // Cegah halaman di belakang ikut tergulir saat dialog terbuka.
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="adm-overlay-in fixed inset-0 z-[75] flex items-end justify-center bg-[rgba(20,32,28,0.45)] p-4 sm:items-center"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="adm-dialog-title"
        className="adm-dialog-in w-full max-w-[440px] rounded-[var(--radius-adm-xl)] border border-adm-border bg-adm-surface shadow-adm-lg"
      >
        <div className="flex items-start gap-3 p-5 pb-4">
          {destructive ? (
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-adm-danger-soft">
              <AlertTriangle aria-hidden className="h-4 w-4 text-adm-danger" />
            </span>
          ) : null}
          <div className="min-w-0 flex-1">
            <h2 id="adm-dialog-title" className="text-[15px] font-semibold tracking-[-0.01em] text-adm-ink">
              {title}
            </h2>
            {description ? (
              <div className="mt-1.5 text-[12.5px] leading-relaxed text-adm-subtle">{description}</div>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup dialog"
            className="adm-ring adm-transition -mr-1 -mt-1 rounded p-1.5 text-adm-subtle hover:bg-adm-muted hover:text-adm-ink"
          >
            <X aria-hidden className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="flex flex-col-reverse gap-2 border-t border-adm-divider bg-adm-surface-2 px-5 py-3.5 sm:flex-row sm:justify-end">
          <Button ref={cancelRef} variant="secondary" size="small" onClick={onClose} disabled={loading}>
            {cancelLabel}
          </Button>
          <Button
            variant={destructive ? "destructive" : "primary"}
            size="small"
            onClick={onConfirm}
            loading={loading}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
