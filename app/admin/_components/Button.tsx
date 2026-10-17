"use client";

import type { ButtonHTMLAttributes, ReactNode, Ref } from "react";
import { Loader2 } from "lucide-react";

type Variant = "primary" | "secondary" | "ghost" | "destructive" | "link" | "soft";
type Size = "default" | "small" | "icon" | "icon-sm";

/**
 * Gaya per varian.
 *
 * Setiap varian mendefinisikan empat keadaan supaya umpan balik terasa jelas:
 * - default
 * - hover   : sedikit berubah warna
 * - active  : lebih gelap lagi, plus turun 1 px (kesan tombol ditekan)
 * - disabled: diredupkan, kursor dilarang
 *
 * `focus-visible` ditangani oleh kelas adm-ring agar cincin hanya muncul untuk
 * navigasi keyboard, bukan setiap klik.
 */
const VARIANT: Record<Variant, string> = {
  primary:
    "bg-adm-primary text-white shadow-adm-xs hover:bg-adm-primary-hover active:bg-adm-primary-active active:shadow-none active:translate-y-px",
  secondary:
    "bg-adm-surface text-adm-ink border border-adm-border-strong shadow-adm-xs hover:border-adm-border-strong hover:bg-adm-surface-2 active:bg-adm-pressed active:shadow-none active:translate-y-px",
  ghost:
    "bg-transparent text-adm-text hover:bg-adm-muted hover:text-adm-ink active:bg-adm-pressed",
  soft:
    "bg-adm-primary-soft text-adm-primary-ink hover:bg-[#e0ebe4] active:bg-[#d3e3d9] active:translate-y-px",
  destructive:
    "bg-adm-danger text-white shadow-adm-xs hover:bg-adm-danger-hover active:bg-adm-danger-active active:shadow-none active:translate-y-px",
  link: "bg-transparent text-adm-primary hover:underline hover:underline-offset-4 active:text-adm-primary-active px-0 h-auto",
};

const SIZE: Record<Size, string> = {
  default: "h-9 px-3.5 text-[13.5px] gap-2",
  small: "h-8 px-3 text-[13px] gap-1.5",
  icon: "h-9 w-9",
  "icon-sm": "h-8 w-8",
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  icon?: ReactNode;
  /** Mengisi lebar induk. */
  block?: boolean;
  ref?: Ref<HTMLButtonElement>;
}

export default function Button({
  variant = "secondary",
  size = "default",
  loading = false,
  icon,
  block = false,
  children,
  className = "",
  disabled,
  type = "button",
  ref,
  ...rest
}: ButtonProps) {
  const isLink = variant === "link";
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      // aria-busy memberi tahu pembaca layar bahwa tombol sedang bekerja.
      aria-busy={loading || undefined}
      className={`adm-ring adm-transition inline-flex shrink-0 select-none items-center justify-center whitespace-nowrap rounded-[var(--radius-adm-sm)] font-medium outline-offset-2 disabled:pointer-events-none disabled:opacity-45 disabled:shadow-none ${VARIANT[variant]} ${
        isLink ? "" : SIZE[size]
      } ${block ? "w-full" : ""} ${className}`}
      {...rest}
    >
      {loading ? (
        <Loader2 aria-hidden className="h-4 w-4 animate-spin" />
      ) : (
        icon ?? null
      )}
      {children ? <span className="truncate">{children}</span> : null}
    </button>
  );
}
