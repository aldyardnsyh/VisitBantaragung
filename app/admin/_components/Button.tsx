"use client";

import type { ButtonHTMLAttributes, ReactNode, Ref } from "react";
import { Loader2 } from "lucide-react";

type Variant = "primary" | "secondary" | "ghost" | "destructive" | "link" | "soft";
type Size = "default" | "small" | "icon" | "icon-sm";

const VARIANT: Record<Variant, string> = {
  primary:
    "bg-adm-primary text-white shadow-adm-xs hover:bg-adm-primary-hover active:bg-adm-primary-hover",
  secondary:
    "bg-adm-surface text-adm-ink border border-adm-border-strong shadow-adm-xs hover:bg-adm-muted hover:border-adm-border-strong",
  ghost: "bg-transparent text-adm-text hover:bg-adm-muted hover:text-adm-ink",
  soft: "bg-adm-primary-soft text-adm-primary-ink hover:bg-[#e0ebe4]",
  destructive:
    "bg-adm-danger text-white shadow-adm-xs hover:bg-adm-danger-hover",
  link: "bg-transparent text-adm-primary hover:underline underline-offset-4 px-0 h-auto",
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
  ref?: Ref<HTMLButtonElement>;
}

export default function Button({
  variant = "secondary",
  size = "default",
  loading = false,
  icon,
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
      className={`adm-ring adm-transition inline-flex shrink-0 items-center justify-center whitespace-nowrap rounded-[var(--radius-adm-sm)] font-medium disabled:pointer-events-none disabled:opacity-50 ${
        VARIANT[variant]
      } ${isLink ? "" : SIZE[size]} ${className}`}
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
