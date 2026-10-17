"use client";

import type { ReactNode } from "react";
import Link from "next/link";

/**
 * Keadaan kosong selalu menyebut sebab dan satu langkah berikutnya, bukan
 * sekadar "tidak ada data".
 */
export default function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: { label: string; href: string } | { label: string; onClick: () => void };
}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-[12px] border border-adm-border bg-adm-surface px-6 py-12 text-center">
      <EmptyGlyph />
      <p className="text-sm font-medium text-adm-ink">{title}</p>
      <p className="max-w-md text-[13px] leading-relaxed text-adm-subtle">{description}</p>
      {action ? (
        "href" in action ? (
          <Link
            href={action.href}
            className="adm-ring adm-transition mt-1 inline-flex h-10 items-center rounded-[8px] bg-adm-primary px-4 text-sm font-medium text-white hover:bg-adm-primary-hover"
          >
            {action.label}
          </Link>
        ) : (
          <button
            type="button"
            onClick={action.onClick}
            className="adm-ring adm-transition mt-1 inline-flex h-10 items-center rounded-[8px] bg-adm-primary px-4 text-sm font-medium text-white hover:bg-adm-primary-hover"
          >
            {action.label}
          </button>
        )
      ) : null}
    </div>
  );
}

/** Penanda visual netral, bukan ilustrasi generik. */
function EmptyGlyph() {
  return (
    <svg aria-hidden viewBox="0 0 48 48" className="h-12 w-12 text-adm-border-strong">
      <rect x="7" y="10" width="34" height="28" rx="4" fill="none" stroke="currentColor" strokeWidth="2" />
      <path d="M7 19h34" stroke="currentColor" strokeWidth="2" />
      <path d="M14 26h12M14 31h8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function LoadingRows({ rows = 4 }: { rows?: number }) {
  return (
    <div className="space-y-2" aria-hidden>
      {Array.from({ length: rows }).map((_, index) => (
        <div
          key={index}
          className="h-[52px] animate-pulse rounded-[10px] border border-adm-border bg-adm-surface"
        />
      ))}
    </div>
  );
}

export function ErrorNotice({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div className="rounded-[12px] border border-[#fecaca] bg-adm-danger-soft px-4 py-3">
      <p className="text-sm font-medium text-adm-danger">{message}</p>
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="adm-ring adm-transition mt-2 rounded text-[13px] font-medium text-adm-danger underline"
        >
          Coba lagi
        </button>
      ) : null}
    </div>
  );
}

/** Kerangka halaman: judul + aksi kanan. */
export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight text-adm-ink">
          {title}
        </h1>
        {description ? (
          <p className="mt-1 max-w-2xl text-sm leading-relaxed text-adm-subtle">{description}</p>
        ) : null}
      </div>
      {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
    </div>
  );
}

/** Baris status ringkas, dipakai di dasbor dan halaman koleksi. */
export function StatRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-adm-divider py-2 last:border-0">
      <span className="text-[13px] text-adm-subtle">{label}</span>
      <span className="text-sm font-medium text-adm-ink">{value}</span>
    </div>
  );
}
