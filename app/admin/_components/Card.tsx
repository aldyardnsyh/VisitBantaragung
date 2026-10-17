import type { ReactNode } from "react";

/* ------------------------------------------------------------------ */
/* Kartu: permukaan dasar seluruh dasbor                               */
/* ------------------------------------------------------------------ */
export function Card({
  children,
  className = "",
  padded = true,
}: {
  children: ReactNode;
  className?: string;
  padded?: boolean;
}) {
  return (
    <div
      className={`rounded-[var(--radius-adm-lg)] border border-adm-border bg-adm-surface ${
        padded ? "p-5" : ""
      } ${className}`}
    >
      {children}
    </div>
  );
}

export function CardHeader({
  title,
  description,
  actions,
  icon,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="flex min-w-0 items-start gap-3">
        {icon ? (
          <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-[var(--radius-adm-sm)] bg-adm-muted text-adm-text">
            {icon}
          </span>
        ) : null}
        <div className="min-w-0">
          <h2 className="text-[14px] font-semibold tracking-[-0.01em] text-adm-ink">{title}</h2>
          {description ? (
            <p className="mt-0.5 text-[12.5px] leading-relaxed text-adm-subtle">{description}</p>
          ) : null}
        </div>
      </div>
      {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Judul halaman: hierarki jelas antara breadcrumb, judul, aksi        */
/* ------------------------------------------------------------------ */
export function PageHeader({
  title,
  description,
  actions,
  eyebrow,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  eyebrow?: string;
}) {
  return (
    <div className="flex flex-col gap-4 border-b border-adm-divider pb-5 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {eyebrow ? (
          <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-adm-subtle">
            {eyebrow}
          </p>
        ) : null}
        <h1 className="font-display text-[26px] font-semibold leading-tight tracking-[-0.02em] text-adm-ink">
          {title}
        </h1>
        {description ? (
          <p className="mt-1.5 max-w-2xl text-[13px] leading-relaxed text-adm-subtle line-clamp-2 sm:line-clamp-none">
            {description}
          </p>
        ) : null}
      </div>
      {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Bagian berjudul kecil (dipakai di sidebar & pengaturan)             */
/* ------------------------------------------------------------------ */
export function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <p className="px-2.5 text-[10.5px] font-semibold uppercase tracking-[0.09em] text-adm-subtle">
      {children}
    </p>
  );
}

export function StatRow({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: ReactNode;
  mono?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-adm-divider py-2.5 last:border-0 last:pb-0">
      <span className="shrink-0 text-[12.5px] text-adm-subtle">{label}</span>
      <span
        className={`min-w-0 break-all text-right text-[13px] font-medium text-adm-ink ${
          mono ? "font-mono text-[12px]" : ""
        }`}
      >
        {value}
      </span>
    </div>
  );
}
