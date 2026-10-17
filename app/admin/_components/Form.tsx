"use client";

import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";
import { ChevronDown } from "lucide-react";

const BASE =
  "adm-ring adm-transition w-full rounded-[var(--radius-adm-sm)] border bg-adm-surface text-[13.5px] text-adm-ink placeholder:text-adm-subtle/80 focus:border-adm-primary disabled:cursor-not-allowed disabled:bg-adm-muted disabled:text-adm-subtle";

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
        <label
          htmlFor={htmlFor}
          className="block text-[12.5px] font-medium text-adm-ink"
        >
          {label}
          {required ? (
            <span aria-hidden className="ml-0.5 text-adm-danger">
              *
            </span>
          ) : null}
        </label>
        {hint ? <span className="text-[11px] text-adm-subtle">{hint}</span> : null}
      </div>
      {children}
      {error ? (
        <p className="flex items-start gap-1 text-[11.5px] font-medium text-adm-danger">
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
      className={`${BASE} h-9.5 px-3 ${invalid ? "border-adm-danger focus:border-adm-danger" : "border-adm-border"} ${className}`}
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
        invalid ? "border-adm-danger focus:border-adm-danger" : "border-adm-border"
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
    <div className="relative">
      <select
        aria-invalid={invalid || undefined}
        className={`${BASE} h-9.5 cursor-pointer appearance-none px-3 pr-9 ${invalid ? "border-adm-danger focus:border-adm-danger" : "border-adm-border"} ${className}`}
        {...rest}
      >
        {children}
      </select>
      <ChevronDown
        aria-hidden
        className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-adm-subtle"
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Switch: untuk nilai boolean                                     */
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
      className={`adm-ring adm-transition relative inline-flex h-5 w-9 shrink-0 items-center rounded-full disabled:opacity-50 ${
        checked ? "bg-adm-primary" : "bg-adm-border-strong"
      }`}
    >
      <span
        aria-hidden
        className={`adm-transition inline-block h-4 w-4 transform rounded-full bg-white shadow-adm-xs ${
          checked ? "translate-x-[18px]" : "translate-x-0.5"
        }`}
      />
    </button>
  );
}
