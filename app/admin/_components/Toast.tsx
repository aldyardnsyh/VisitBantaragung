"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { CheckCircle2, AlertTriangle, Info, X } from "lucide-react";

type ToastKind = "success" | "error" | "info";

interface Toast {
  id: number;
  kind: ToastKind;
  message: string;
}

interface ToastContextValue {
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

let counter = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const remove = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const push = useCallback(
    (kind: ToastKind, message: string) => {
      counter += 1;
      const id = counter;
      setToasts((current) => [...current.slice(-2), { id, kind, message }]);
      const ttl = kind === "error" ? 6000 : 4000;
      window.setTimeout(() => remove(id), ttl);
    },
    [remove]
  );

  const value = useMemo<ToastContextValue>(
    () => ({
      success: (message) => push("success", message),
      error: (message) => push("error", message),
      info: (message) => push("info", message),
    }),
    [push]
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        className="pointer-events-none fixed bottom-4 right-4 z-[60] flex w-[min(360px,calc(100vw-2rem))] flex-col gap-2"
        role="status"
        aria-live="polite"
      >
        {toasts.map((toast) => (
          <ToastCard key={toast.id} toast={toast} onClose={() => remove(toast.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

const KIND_STYLE: Record<ToastKind, { border: string; icon: ReactNode }> = {
  success: {
    border: "border-l-adm-success",
    icon: <CheckCircle2 aria-hidden className="h-4 w-4 shrink-0 text-adm-success" />,
  },
  error: {
    border: "border-l-adm-danger",
    icon: <AlertTriangle aria-hidden className="h-4 w-4 shrink-0 text-adm-danger" />,
  },
  info: {
    border: "border-l-adm-info",
    icon: <Info aria-hidden className="h-4 w-4 shrink-0 text-adm-info" />,
  },
};

function ToastCard({ toast, onClose }: { toast: Toast; onClose: () => void }) {
  const style = KIND_STYLE[toast.kind];
  return (
    <div
      className={`adm-dialog-in pointer-events-auto flex items-start gap-3 rounded-[10px] border border-adm-border border-l-4 bg-adm-surface px-4 py-3 shadow-[0_1px_3px_rgba(22,48,36,0.06)] ${style.border}`}
    >
      <span className="mt-0.5">{style.icon}</span>
      <p className="flex-1 text-sm leading-relaxed text-adm-text">{toast.message}</p>
      <button
        type="button"
        onClick={onClose}
        aria-label="Tutup notifikasi"
        className="adm-ring adm-transition -mr-1 -mt-1 rounded p-1 text-adm-subtle hover:bg-adm-muted hover:text-adm-ink"
      >
        <X aria-hidden className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast harus dipakai di dalam ToastProvider.");
  }
  return context;
}

/** Tutup dengan tombol Escape untuk dialog. */
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
