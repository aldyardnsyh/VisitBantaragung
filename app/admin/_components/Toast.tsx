"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { AlertCircle, CheckCircle2, Info, X } from "lucide-react";

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
      const ttl = kind === "error" ? 6500 : 4000;
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
        className="pointer-events-none fixed bottom-5 right-5 z-[80] flex w-[min(380px,calc(100vw-2.5rem))] flex-col gap-2"
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

const KIND: Record<ToastKind, { icon: ReactNode; ring: string }> = {
  success: {
    icon: <CheckCircle2 aria-hidden className="h-4 w-4 shrink-0 text-adm-success" />,
    ring: "border-l-[3px] border-l-adm-success",
  },
  error: {
    icon: <AlertCircle aria-hidden className="h-4 w-4 shrink-0 text-adm-danger" />,
    ring: "border-l-[3px] border-l-adm-danger",
  },
  info: {
    icon: <Info aria-hidden className="h-4 w-4 shrink-0 text-adm-info" />,
    ring: "border-l-[3px] border-l-adm-info",
  },
};

function ToastCard({ toast, onClose }: { toast: Toast; onClose: () => void }) {
  const style = KIND[toast.kind];
  return (
    <div
      className={`adm-toast-in pointer-events-auto flex items-start gap-2.5 rounded-[var(--radius-adm-md)] border border-adm-border bg-adm-surface px-3.5 py-3 shadow-adm-md ${style.ring}`}
    >
      <span className="mt-px">{style.icon}</span>
      <p className="flex-1 text-[12.5px] leading-relaxed text-adm-text">{toast.message}</p>
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

export function useToast(): ToastContextValue {
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
