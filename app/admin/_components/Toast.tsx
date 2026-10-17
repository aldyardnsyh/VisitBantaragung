"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { AlertCircle, AlertTriangle, CheckCircle2, Info, Loader2, X } from "lucide-react";

/**
 * Tipe notifikasi singkat (toast).
 *
 * Setiap tipe punya ikon dan warna sendiri supaya artinya terbaca tanpa perlu
 * membaca teksnya:
 * - success  : hijau, centang
 * - error    : merah, lingkaran seru
 * - warning  : kuning, segitiga
 * - info     : biru, huruf i
 * - loading  : netral, spinner; dipakai saat proses berjalan dan diganti
 *              hasilnya lewat id yang sama.
 */
export type ToastKind = "success" | "error" | "warning" | "info" | "loading";

export interface ToastOptions {
  /** Lama tampil dalam milidetik. 0 = tidak menutup sendiri. */
  duration?: number;
  /** Tindakan tambahan, mis. tombol "Lihat commit". */
  action?: { label: string; href?: string; onClick?: () => void };
  /** Mengganti toast dengan id yang sama (dipakai loading -> hasil). */
  id?: string;
}

interface ToastItem {
  key: number;
  /** Id stabil untuk memperbarui toast yang sudah tampil. */
  uid?: string;
  kind: ToastKind;
  message: string;
  action?: ToastOptions["action"];
}

interface ToastApi {
  success: (message: string, options?: ToastOptions) => void;
  error: (message: string, options?: ToastOptions) => void;
  warning: (message: string, options?: ToastOptions) => void;
  info: (message: string, options?: ToastOptions) => void;
  loading: (message: string, options?: ToastOptions) => void;
  /** Tutup satu toast berdasarkan uid. */
  dismiss: (uid: string) => void;
}

const ToastContext = createContext<ToastApi | null>(null);

let counter = 0;

const DEFAULT_DURATION: Record<ToastKind, number> = {
  success: 4000,
  error: 7000,
  warning: 6000,
  info: 4500,
  loading: 0,
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const timers = useRef(new Map<number, number>());

  const clearTimer = useCallback((key: number) => {
    const timer = timers.current.get(key);
    if (timer) {
      window.clearTimeout(timer);
      timers.current.delete(key);
    }
  }, []);

  const remove = useCallback(
    (key: number) => {
      clearTimer(key);
      setToasts((current) => current.filter((toast) => toast.key !== key));
    },
    [clearTimer]
  );

  const dismiss = useCallback(
    (uid: string) => {
      setToasts((current) => {
        const found = current.find((toast) => toast.uid === uid);
        if (found) clearTimer(found.key);
        return current.filter((toast) => toast.uid !== uid);
      });
    },
    [clearTimer]
  );

  const push = useCallback(
    (kind: ToastKind, message: string, options: ToastOptions = {}) => {
      const duration = options.duration ?? DEFAULT_DURATION[kind];

      setToasts((current) => {
        // Bila uid sama, perbarui toast yang ada supaya tidak menumpuk.
        if (options.id) {
          const existing = current.find((toast) => toast.uid === options.id);
          if (existing) {
            clearTimer(existing.key);
            if (duration > 0) {
              const timer = window.setTimeout(() => remove(existing.key), duration);
              timers.current.set(existing.key, timer);
            }
            return current.map((toast) =>
              toast.key === existing.key
                ? { ...toast, kind, message, action: options.action }
                : toast
            );
          }
        }

        counter += 1;
        // Maksimal 3 toast tampil bersamaan agar tidak menutupi konten.
        const trimmed = current.length >= 3 ? current.slice(1) : current;
        const key = counter;
        if (duration > 0) {
          const timer = window.setTimeout(() => remove(key), duration);
          timers.current.set(key, timer);
        }
        return [...trimmed, { key, uid: options.id, kind, message, action: options.action }];
      });
    },
    [clearTimer, remove]
  );

  const api = useMemo<ToastApi>(
    () => ({
      success: (message, options) => push("success", message, options),
      error: (message, options) => push("error", message, options),
      warning: (message, options) => push("warning", message, options),
      info: (message, options) => push("info", message, options),
      loading: (message, options) => push("loading", message, options),
      dismiss,
    }),
    [push, dismiss]
  );

  // Bersihkan semua timer saat provider dilepas.
  useEffect(() => {
    const current = timers.current;
    return () => {
      current.forEach((timer) => window.clearTimeout(timer));
      current.clear();
    };
  }, []);

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div
        className="pointer-events-none fixed bottom-5 right-5 z-[80] flex w-[min(380px,calc(100vw-2.5rem))] flex-col-reverse gap-2"
        role="status"
        aria-live="polite"
      >
        {toasts.map((toast) => (
          <ToastCard key={toast.key} toast={toast} onClose={() => remove(toast.key)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

const KIND_STYLE: Record<
  ToastKind,
  { icon: ReactNode; accent: string; iconWrap: string }
> = {
  success: {
    icon: <CheckCircle2 aria-hidden className="h-4 w-4" />,
    accent: "text-adm-success",
    iconWrap: "bg-adm-success-soft",
  },
  error: {
    icon: <AlertCircle aria-hidden className="h-4 w-4" />,
    accent: "text-adm-danger",
    iconWrap: "bg-adm-danger-soft",
  },
  warning: {
    icon: <AlertTriangle aria-hidden className="h-4 w-4" />,
    accent: "text-adm-warning",
    iconWrap: "bg-adm-warning-soft",
  },
  info: {
    icon: <Info aria-hidden className="h-4 w-4" />,
    accent: "text-adm-info",
    iconWrap: "bg-adm-info-soft",
  },
  loading: {
    icon: <Loader2 aria-hidden className="h-4 w-4 animate-spin" />,
    accent: "text-adm-primary",
    iconWrap: "bg-adm-primary-soft",
  },
};

function ToastCard({ toast, onClose }: { toast: ToastItem; onClose: () => void }) {
  const style = KIND_STYLE[toast.kind];
  return (
    <div
      className="adm-toast-in pointer-events-auto flex items-start gap-2.5 rounded-[var(--radius-adm-md)] border border-adm-border bg-adm-surface px-3.5 py-3 shadow-adm-md"
      role={toast.kind === "error" ? "alert" : undefined}
    >
      <span
        className={`mt-px flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${style.iconWrap} ${style.accent}`}
      >
        {style.icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[12.5px] leading-relaxed text-adm-text">{toast.message}</p>
        {toast.action ? (
          <div className="mt-1.5">
            {toast.action.href ? (
              <a
                href={toast.action.href}
                target="_blank"
                rel="noreferrer"
                className={`adm-ring adm-transition inline-flex rounded text-[12px] font-medium underline underline-offset-2 ${style.accent}`}
              >
                {toast.action.label}
              </a>
            ) : (
              <button
                type="button"
                onClick={toast.action.onClick}
                className={`adm-ring adm-transition inline-flex rounded text-[12px] font-medium underline underline-offset-2 ${style.accent}`}
              >
                {toast.action.label}
              </button>
            )}
          </div>
        ) : null}
      </div>
      <button
        type="button"
        onClick={onClose}
        aria-label="Tutup notifikasi"
        className="adm-ring adm-transition -mr-1 -mt-0.5 rounded p-1 text-adm-subtle hover:bg-adm-muted hover:text-adm-ink"
      >
        <X aria-hidden className="h-3 w-3" />
      </button>
    </div>
  );
}

export function useToast(): ToastApi {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast harus dipakai di dalam ToastProvider.");
  return context;
}

export function useEscape(active: boolean, onEscape: () => void) {
  useEffect(() => {
    if (!active) return;
    const handler = (event: KeyboardEvent) => {
      if (event.key === "Escape") onEscape();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [active, onEscape]);
}
