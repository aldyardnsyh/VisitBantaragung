import type { ReactNode } from "react";

type Variant = "neutral" | "success" | "warning" | "info" | "accent" | "danger" | "primary";

const VARIANT: Record<Variant, string> = {
  neutral: "bg-adm-muted-2 text-adm-text ring-adm-border",
  primary: "bg-adm-primary-soft text-adm-primary-ink ring-[#cfe2d6]",
  success: "bg-adm-success-soft text-adm-success-ink ring-[#c7ecd3]",
  warning: "bg-adm-warning-soft text-adm-warning ring-[#f2dfb8]",
  info: "bg-adm-info-soft text-adm-info ring-[#d5e2fb]",
  accent: "bg-adm-accent-soft text-adm-accent-ink ring-[#f0d5c6]",
  danger: "bg-adm-danger-soft text-adm-danger ring-[#f6d4d4]",
};

const DOT: Record<Variant, string> = {
  neutral: "bg-adm-subtle",
  primary: "bg-adm-primary",
  success: "bg-adm-success",
  warning: "bg-adm-warning",
  info: "bg-adm-info",
  accent: "bg-adm-accent",
  danger: "bg-adm-danger",
};

export default function Badge({
  variant = "neutral",
  children,
  dot = false,
}: {
  variant?: Variant;
  children: ReactNode;
  /** Titik kecil di depan label. Hanya untuk status yang memang perlu dibedakan. */
  dot?: boolean;
}) {
  return (
    <span
      className={`inline-flex h-[21px] items-center gap-1.5 rounded-[var(--radius-adm-xs)] px-1.5 text-[11.5px] font-medium ring-1 ring-inset ${VARIANT[variant]}`}
    >
      {dot ? <span aria-hidden className={`h-1.5 w-1.5 rounded-full ${DOT[variant]}`} /> : null}
      {children}
    </span>
  );
}
