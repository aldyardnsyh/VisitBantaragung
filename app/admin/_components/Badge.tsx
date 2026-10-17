import type { ReactNode } from "react";

type Variant = "neutral" | "success" | "warning" | "info" | "accent" | "danger";

const VARIANT: Record<Variant, string> = {
  neutral: "bg-adm-divider text-adm-text",
  success: "bg-adm-success-soft text-adm-success",
  warning: "bg-adm-warning-soft text-adm-warning",
  info: "bg-adm-info-soft text-adm-info",
  accent: "bg-adm-accent-soft text-adm-accent-ink",
  danger: "bg-adm-danger-soft text-adm-danger",
};

export default function Badge({
  variant = "neutral",
  children,
}: {
  variant?: Variant;
  children: ReactNode;
}) {
  return (
    <span
      className={`inline-flex h-[22px] items-center rounded-[6px] px-2 text-xs font-medium ${VARIANT[variant]}`}
    >
      {children}
    </span>
  );
}
