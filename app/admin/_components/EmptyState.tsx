"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { AlertCircle, RefreshCw } from "lucide-react";
import Button from "./Button";

/* ------------------------------------------------------------------ */
/* Keadaan kosong: selalu menyebut sebab + satu langkah berikutnya     */
/* ------------------------------------------------------------------ */
export default function EmptyState({
  title,
  description,
  action,
  icon,
}: {
  title: string;
  description: string;
  action?: { label: string; href: string } | { label: string; onClick: () => void };
  icon?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-[var(--radius-adm-lg)] border border-dashed border-adm-border-strong bg-adm-surface-2 px-6 py-14 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-adm-muted text-adm-subtle">
        {icon ?? <EmptyGlyph />}
      </span>
      <p className="text-[14px] font-medium text-adm-ink">{title}</p>
      <p className="max-w-sm text-[12.5px] leading-relaxed text-adm-subtle">{description}</p>
      {action ? (
        "href" in action ? (
          <Link
            href={action.href}
            className="adm-ring adm-transition mt-1.5 inline-flex h-9 items-center rounded-[var(--radius-adm-sm)] bg-adm-primary px-4 text-[13.5px] font-medium text-white shadow-adm-xs hover:bg-adm-primary-hover"
          >
            {action.label}
          </Link>
        ) : (
          <Button variant="primary" className="mt-1.5" onClick={action.onClick}>
            {action.label}
          </Button>
        )
      ) : null}
    </div>
  );
}

function EmptyGlyph() {
  return (
    <svg aria-hidden viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M4 7.5A1.5 1.5 0 0 1 5.5 6h13A1.5 1.5 0 0 1 20 7.5v9a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 16.5v-9Z" strokeLinecap="round" />
      <path d="M4 10h16" strokeLinecap="round" />
      <path d="M8 14h5" strokeLinecap="round" />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* Skeleton: meniru bentuk konten asli supaya tidak ada lompatan layout */
/* ------------------------------------------------------------------ */
export function SkeletonLine({ width = "100%", height = 12 }: { width?: string; height?: number }) {
  return <div className="adm-skeleton rounded-[4px]" style={{ width, height }} />;
}

export function LoadingRows({ rows = 4 }: { rows?: number }) {
  return (
    <div className="overflow-hidden rounded-[var(--radius-adm-lg)] border border-adm-border bg-adm-surface" aria-hidden>
      <div className="flex items-center gap-4 border-b border-adm-divider bg-adm-surface-2 px-4 py-3">
        <SkeletonLine width="35%" height={10} />
        <SkeletonLine width="20%" height={10} />
        <SkeletonLine width="15%" height={10} />
      </div>
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="flex items-center gap-4 border-b border-adm-divider px-4 py-4 last:border-0">
          <SkeletonLine width={`${45 + ((index * 13) % 25)}%`} />
          <SkeletonLine width="18%" />
          <SkeletonLine width="12%" />
        </div>
      ))}
    </div>
  );
}

export function LoadingCards({ cards = 4 }: { cards?: number }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4" aria-hidden>
      {Array.from({ length: cards }).map((_, index) => (
        <div key={index} className="rounded-[var(--radius-adm-lg)] border border-adm-border bg-adm-surface p-5">
          <SkeletonLine width="55%" height={10} />
          <div className="mt-3.5">
            <SkeletonLine width="30%" height={22} />
          </div>
          <div className="mt-4">
            <SkeletonLine width="40%" height={10} />
          </div>
        </div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Galat: pesan spesifik + tindakan pemulihan                          */
/* ------------------------------------------------------------------ */
export function ErrorNotice({
  message,
  onRetry,
  retryLabel = "Coba lagi",
}: {
  message: string;
  onRetry?: () => void;
  retryLabel?: string;
}) {
  return (
    <div
      role="alert"
      className="flex items-start gap-3 rounded-[var(--radius-adm-lg)] border border-[#f3d3d3] bg-adm-danger-soft px-4 py-3.5"
    >
      <AlertCircle aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-adm-danger" />
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-medium text-adm-danger">{message}</p>
        {onRetry ? (
          <button
            type="button"
            onClick={onRetry}
            className="adm-ring adm-transition mt-1.5 inline-flex items-center gap-1.5 rounded text-[12.5px] font-medium text-adm-danger underline underline-offset-2 hover:text-adm-danger-hover"
          >
            <RefreshCw aria-hidden className="h-3 w-3" />
            {retryLabel}
          </button>
        ) : null}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Pita informasi netral                                               */
/* ------------------------------------------------------------------ */
export function InfoNotice({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "warning" | "info";
}) {
  const toneClass =
    tone === "warning"
      ? "border-[#f2e0bb] bg-adm-warning-soft text-adm-warning"
      : tone === "info"
        ? "border-[#d7e3fb] bg-adm-info-soft text-adm-info"
        : "border-adm-border bg-adm-surface-2 text-adm-text";
  return (
    <div className={`rounded-[var(--radius-adm-md)] border px-3.5 py-2.5 text-[12.5px] leading-relaxed ${toneClass}`}>
      {children}
    </div>
  );
}
