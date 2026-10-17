"use client";

import type {
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";
import { ChevronDown } from "lucide-react";

/**
 * Gaya dasar kontrol formulir.
 *
 * Keadaan yang ditangani:
 * - default      : garis netral, permukaan putih
 * - hover        : garis menguat, memberi isyarat dapat disunting
 * - focus        : garis hijau + cincin 3 px, tanpa menggeser tata letak
 * - invalid      : garis merah; cincin fokus ikut merah
 * - disabled     : permukaan redup, kursor dilarang
 * - readOnly     : permukaan redup namun teks tetap terbaca
 */
const BASE =
  "adm-transition w-full rounded-[var(--radius-adm-sm)] border bg-adm-surface text-[13.5px] text-adm-ink " +
  "placeholder:text-adm-subtle/75 " +
  "hover:border-adm-border-strong " +
  "focus:border-adm-primary focus:outline-none focus:ring-[3px] focus:ring-adm-primary/15 " +
  "disabled:cursor-not-allowed disabled:border-adm-border disabled:bg-adm-muted disabled:text-adm-subtle disabled:hover:border-adm-border " +
  "read-only:bg-adm-surface-2";

const INVALID =
  "border-adm-danger hover:border-adm-danger focus:border-adm-danger focus:ring-adm-danger/15";

const NORMAL = "border-adm-border";

/* ------------------------------------------------------------------ */
/* Field wrapper: label + kontrol + pesan bantuan/galat                 */
/* ------------------------------------------------------------------ */
export function Field({
  label,
  htmlFor,
  required,
  help,
  error,
  hint,
  children,
}: {
  label: string;
  htmlFor?: string;
  required?: boolean;
  help?: string;
  error?: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={htmlFor} className="block text-[12.5px] font-medium text-adm-ink">
          {label}
          {required ? (
            <span aria-hidden className="ml-0.5 text-adm-danger" title="Wajib diisi">
              *
            </span>
          ) : null}
        </label>
        {hint ? <span className="tabular-nums text-[11px] text-adm-subtle">{hint}</span> : null}
      </div>
      {children}
      {error ? (
        <p role="alert" className="flex items-start gap-1.5 text-[11.5px] font-medium text-adm-danger">
          <svg
            aria-hidden
            viewBox="0 0 16 16"
            className="mt-px h-3 w-3 shrink-0"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
          >
            <circle cx="8" cy="8" r="6.5" />
            <path d="M8 5v4M8 11h.01" strokeLinecap="round" />
          </svg>
          {error}
        </p>
      ) : help ? (
        <p className="text-[11.5px] leading-relaxed text-adm-subtle">{help}</p>
      ) : null}
    </div>
  );
}

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean;
}

export function Input({ className = "", invalid = false, ...rest }: InputProps) {
  return (
    <input
      aria-invalid={invalid || undefined}
      className={`${BASE} h-9.5 px-3 ${invalid ? INVALID : NORMAL} ${className}`}
      {...rest}
    />
  );
}

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  invalid?: boolean;
  autoGrow?: boolean;
}

export function Textarea({
  className = "",
  invalid = false,
  autoGrow = false,
  rows = 4,
  ...rest
}: TextareaProps) {
  return (
    <textarea
      rows={rows}
      aria-invalid={invalid || undefined}
      className={`${BASE} resize-y px-3 py-2 leading-relaxed ${autoGrow ? "adm-textarea-auto" : ""} ${
        invalid ? INVALID : NORMAL
      } ${className}`}
      {...rest}
    />
  );
}

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  invalid?: boolean;
  children: ReactNode;
}

export function Select({ className = "", invalid = false, children, ...rest }: SelectProps) {
  return (
    <div className="group relative">
      <select
        aria-invalid={invalid || undefined}
        className={`${BASE} h-9.5 cursor-pointer appearance-none px-3 pr-9 ${
          invalid ? INVALID : NORMAL
        } ${className}`}
        {...rest}
      >
        {children}
      </select>
      <ChevronDown
        aria-hidden
        className="adm-transition pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-adm-subtle group-hover:text-adm-text"
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Switch: untuk nilai boolean                                        */
/* ------------------------------------------------------------------ */
export function Switch({
  checked,
  onChange,
  label,
  disabled,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`adm-ring adm-transition relative inline-flex h-5 w-9 shrink-0 items-center rounded-full outline-offset-2 hover:brightness-95 active:brightness-90 disabled:cursor-not-allowed disabled:opacity-45 ${
        checked ? "bg-adm-primary" : "bg-adm-border-strong"
      }`}
    >
      <span
        aria-hidden
        className={`adm-transition inline-block h-4 w-4 rounded-full bg-white shadow-adm-xs ${
          checked ? "translate-x-[18px]" : "translate-x-0.5"
        }`}
      />
    </button>
  );
}
