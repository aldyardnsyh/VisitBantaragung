"use client";

import type { ButtonHTMLAttributes, ReactNode, Ref } from "react";
import { Loader2 } from "lucide-react";

type Variant = "primary" | "secondary" | "ghost" | "destructive" | "link";
type Size = "default" | "small" | "icon";

const VARIANT: Record<Variant, string> = {
  primary:
    "bg-adm-primary text-white border border-transparent hover:bg-adm-primary-hover disabled:hover:bg-adm-primary",
  secondary:
    "bg-adm-surface text-adm-ink border border-adm-border-strong hover:bg-adm-muted",
  ghost: "bg-transparent text-adm-ink border border-transparent hover:bg-adm-divider",
  destructive:
    "bg-adm-danger text-white border border-transparent hover:bg-[#991b1b] disabled:hover:bg-adm-danger",
  link: "bg-transparent text-adm-primary border border-transparent hover:underline px-0",
};

const SIZE: Record<Size, string> = {
  default: "h-10 px-4 text-sm gap-2",
  small: "h-8 px-3 text-[13px] gap-1.5",
  icon: "h-9 w-9 justify-center",
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
  const padding = variant === "link" ? "" : SIZE[size];
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      className={`adm-ring adm-transition inline-flex items-center justify-center rounded-[8px] font-medium disabled:cursor-not-allowed disabled:opacity-50 ${VARIANT[variant]} ${padding} ${className}`}
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
