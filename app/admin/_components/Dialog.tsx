"use client";

import { useEffect, useRef } from "react";
import type { ReactNode } from "react";
import { X } from "lucide-react";
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
 * Dialog konfirmasi. Fokus dipindahkan ke tombol batal saat dibuka (aksi
 * destruktif tidak boleh menjadi sasaran default), dapat ditutup dengan Escape
 * maupun klik latar.
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

  if (!open) return null;

  return (
    <div
      className="adm-overlay-in fixed inset-0 z-[70] flex items-center justify-center bg-[rgba(11,31,22,0.45)] p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="adm-dialog-title"
        className="adm-dialog-in w-full max-w-[480px] rounded-[12px] border border-adm-border bg-adm-surface p-6 shadow-[0_4px_12px_rgba(22,48,36,0.08)]"
      >
        <div className="flex items-start justify-between gap-4">
          <h2 id="adm-dialog-title" className="text-lg font-semibold text-adm-ink">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup dialog"
            className="adm-ring adm-transition rounded p-1 text-adm-subtle hover:bg-adm-muted hover:text-adm-ink"
          >
            <X aria-hidden className="h-4 w-4" />
          </button>
        </div>
        {description ? (
          <div className="mt-3 text-sm leading-relaxed text-adm-text">{description}</div>
        ) : null}
        <div className="mt-6 flex justify-end gap-3">
          <Button ref={cancelRef} variant="secondary" onClick={onClose} disabled={loading}>
            {cancelLabel}
          </Button>
          <Button
            variant={destructive ? "destructive" : "primary"}
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
