"use client";

import type { InputHTMLAttributes, ReactNode, TextareaHTMLAttributes } from "react";

const BASE_INPUT =
  "adm-ring adm-transition w-full rounded-[8px] border bg-adm-surface px-3 text-sm text-adm-ink placeholder:text-adm-subtle focus:border-adm-primary disabled:cursor-not-allowed disabled:bg-adm-muted";

export function Field({
  label,
  htmlFor,
  required,
  help,
  error,
  children,
}: {
  label: string;
  htmlFor?: string;
  required?: boolean;
  help?: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={htmlFor} className="block text-[13px] font-medium text-adm-ink">
        {label}
        {required ? (
          <span aria-hidden className="ml-0.5 text-adm-danger">
            *
          </span>
        ) : null}
      </label>
      {children}
      {error ? (
        <p className="text-xs font-medium text-adm-danger">{error}</p>
      ) : help ? (
        <p className="text-xs text-adm-subtle">{help}</p>
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
      className={`${BASE_INPUT} h-10 ${invalid ? "border-adm-danger" : "border-adm-border"} ${className}`}
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
      className={`${BASE_INPUT} py-2 leading-relaxed ${autoGrow ? "adm-textarea-auto" : ""} ${
        invalid ? "border-adm-danger" : "border-adm-border"
      } ${className}`}
      {...rest}
    />
  );
}

export function Select({
  className = "",
  invalid = false,
  children,
  ...rest
}: InputHTMLAttributes<HTMLSelectElement> & { invalid?: boolean; children: ReactNode }) {
  return (
    <div className="relative">
      <select
        className={`${BASE_INPUT} h-10 appearance-none pr-9 ${invalid ? "border-adm-danger" : "border-adm-border"} ${className}`}
        {...rest}
      >
        {children}
      </select>
      <svg
        aria-hidden
        viewBox="0 0 20 20"
        className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-adm-subtle"
      >
        <path
          d="M5 7.5 10 12.5 15 7.5"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}
