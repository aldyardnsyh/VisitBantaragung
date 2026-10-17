"use client";

import { useState } from "react";
import { ArrowDown, ArrowUp, Plus, Trash2, X } from "lucide-react";
import { Field, Input, Select, Textarea } from "./Form";
import Button from "./Button";

// Definisi field dikirim dari server (lib/admin/collections.ts) supaya hanya
// ada satu sumber kebenaran untuk skema konten.
export interface ClientField {
  key: string;
  label: string;
  type:
    | "text"
    | "textarea"
    | "paragraphs"
    | "number"
    | "date"
    | "select"
    | "tags"
    | "list"
    | "image"
    | "gallery"
    | "whatsapp"
    | "url"
    | "boolean";
  required?: boolean;
  help?: string;
  placeholder?: string;
  options?: string[];
  rows?: number;
  maxLength?: number;
}

export interface ClientCollection {
  id: string;
  label: string;
  labelSingular: string;
  slugKey: string;
  /** Kunci judul utama, dipakai untuk mengusulkan slug otomatis. */
  titleKey: string;
  lockedFields: string[];
  fields: ClientField[];
  assetPrefix: string;
  assetTarget: "assets" | "local";
  hasDate: boolean;
}

export type Values = Record<string, string | string[]>;

interface ContentFormProps {
  collection: ClientCollection;
  initialValues: Values;
  initialSha?: string;
  originalSlug?: string;
  saving: boolean;
  errors: Record<string, string>;
  onChange: (key: string, value: string | string[]) => void;
  onSubmit: (event: React.FormEvent) => void;
  onCancel: () => void;
  renderImageField: (field: ClientField, value: string) => React.ReactNode;
}

export default function ContentForm({
  collection,
  initialValues,
  saving,
  errors,
  onChange,
  onSubmit,
  onCancel,
  renderImageField,
}: ContentFormProps) {
  const primaryFields = collection.fields.filter(
    (field) => field.type !== "image" && field.type !== "gallery"
  );
  const imageFields = collection.fields.filter(
    (field) => field.type === "image" || field.type === "gallery"
  );

  // Pecah field utama jadi dua kelompok supaya formulir panjang tetap terbaca:
  // isi pokok (kiri) dan metadata (kanan, di panel samping).
  const metaKeys = new Set([collection.slugKey, "date", "category", "author", "tags"]);
  const isMeta = (key: string) => metaKeys.has(key);
  const contentFields = primaryFields.filter((field) => !isMeta(field.key));
  const metaFields = primaryFields.filter((field) => isMeta(field.key));

  return (
    <form
      id="adm-record-form"
      onSubmit={onSubmit}
      noValidate
      className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_300px] lg:items-start"
    >
      {/* Kolom utama */}
      <div className="space-y-5">
        <div className="space-y-4 rounded-[var(--radius-adm-lg)] border border-adm-border bg-adm-surface p-5">
          {contentFields.map((field) => (
            <FieldRenderer
              key={field.key}
              field={field}
              collection={collection}
              value={initialValues[field.key]}
              error={errors[field.key]}
              onChange={onChange}
            />
          ))}
        </div>
      </div>

      {/* Panel samping: gambar, metadata, aksi */}
      <aside className="space-y-4 lg:sticky lg:top-[72px]">
        {imageFields.length ? (
          <div className="space-y-4 rounded-[var(--radius-adm-lg)] border border-adm-border bg-adm-surface p-4">
            <h2 className="text-[12.5px] font-semibold tracking-[-0.01em] text-adm-ink">Gambar</h2>
            {imageFields.map((field) => (
              <div key={field.key}>
                <div className="mb-1.5 flex items-baseline justify-between gap-2">
                  <span className="text-[11.5px] font-medium text-adm-text">{field.label}</span>
                  {field.required ? (
                    <span aria-hidden className="text-adm-danger">
                      *
                    </span>
                  ) : null}
                </div>
                {renderImageField(field, String(initialValues[field.key] ?? ""))}
                {field.help ? (
                  <p className="mt-1.5 text-[11px] leading-relaxed text-adm-subtle">{field.help}</p>
                ) : null}
                {errors[field.key] ? (
                  <p className="mt-1 text-[11.5px] font-medium text-adm-danger">{errors[field.key]}</p>
                ) : null}
              </div>
            ))}
          </div>
        ) : null}

        {metaFields.length ? (
          <div className="space-y-4 rounded-[var(--radius-adm-lg)] border border-adm-border bg-adm-surface p-4">
            <h2 className="text-[12.5px] font-semibold tracking-[-0.01em] text-adm-ink">
              Metadata
            </h2>
            {metaFields.map((field) => (
              <FieldRenderer
                key={field.key}
                field={field}
                collection={collection}
                value={initialValues[field.key]}
                error={errors[field.key]}
                onChange={onChange}
                compact
              />
            ))}
          </div>
        ) : null}

        {/* Catatan: tombol Simpan hanya ada di kepala halaman (RecordEditor).
            Panel ini sengaja tidak menampilkan tombol agar tidak ada dua tombol
            berbeda untuk aksi yang sama. */}
        <div className="rounded-[var(--radius-adm-lg)] border border-adm-border bg-adm-surface-2 p-3.5">
          <div className="flex items-start gap-2">
            <svg
              aria-hidden
              viewBox="0 0 20 20"
              className="mt-0.5 h-3.5 w-3.5 shrink-0 text-adm-subtle"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
            >
              <circle cx="10" cy="10" r="7.5" />
              <path d="M10 6.5V10l2.2 1.6" strokeLinecap="round" />
            </svg>
            <p className="text-[11px] leading-relaxed text-adm-subtle">
              Perubahan langsung tersimpan ke repositori dan tayang dalam 1 sampai 2 menit.
            </p>
          </div>
        </div>
      </aside>
    </form>
  );
}

function FieldRenderer({
  field,
  collection,
  value,
  error,
  onChange,
  compact = false,
}: {
  field: ClientField;
  collection: ClientCollection;
  value: string | string[] | undefined;
  error?: string;
  onChange: (key: string, value: string | string[]) => void;
  compact?: boolean;
}) {
  const locked = collection.lockedFields.includes(field.key);
  const id = `field-${field.key}`;

  if (field.type === "paragraphs") {
    return (
      <Field label={field.label} required={field.required} help={field.help} error={error}>
        <ParagraphEditor
          value={Array.isArray(value) ? value : typeof value === "string" && value ? value.split("\n") : []}
          onChange={(next) => onChange(field.key, next)}
        />
      </Field>
    );
  }

  if (field.type === "tags") {
    return (
      <Field label={field.label} help={field.help} error={error}>
        <TagInput
          value={Array.isArray(value) ? value : []}
          onChange={(next) => onChange(field.key, next)}
        />
      </Field>
    );
  }

  if (field.type === "select") {
    return (
      <Field label={field.label} htmlFor={id} required={field.required} help={compact ? undefined : field.help} error={error}>
        <Select
          id={id}
          value={typeof value === "string" ? value : ""}
          invalid={Boolean(error)}
          onChange={(event) => onChange(field.key, event.target.value)}
        >
          <option value="">Pilih {field.label.toLowerCase()}</option>
          {(field.options ?? []).map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </Select>
      </Field>
    );
  }

  if (field.type === "list") {
    return (
      <Field label={field.label} help={field.help ?? "Satu item per baris."} error={error}>
        <Textarea
          id={id}
          value={typeof value === "string" ? value : ""}
          rows={5}
          onChange={(event) => onChange(field.key, event.target.value)}
        />
      </Field>
    );
  }

  if (field.type === "textarea") {
    const text = typeof value === "string" ? value : "";
    return (
      <Field
        label={field.label}
        htmlFor={id}
        required={field.required}
        help={field.help}
        error={error}
        hint={field.maxLength ? `${text.length}/${field.maxLength}` : undefined}
      >
        <Textarea
          id={id}
          value={text}
          rows={field.rows ?? 4}
          invalid={Boolean(error)}
          placeholder={field.placeholder}
          onChange={(event) => onChange(field.key, event.target.value)}
        />
      </Field>
    );
  }

  if (field.type === "date") {
    return (
      <Field label={field.label} htmlFor={id} required={field.required} help={compact ? undefined : field.help} error={error}>
        <Input
          id={id}
          type="date"
          value={typeof value === "string" ? value : ""}
          invalid={Boolean(error)}
          onChange={(event) => onChange(field.key, event.target.value)}
        />
      </Field>
    );
  }

  const inputType = field.type === "number" ? "number" : field.type === "url" ? "url" : "text";
  const inputMode = field.type === "whatsapp" ? "tel" : field.type === "number" ? "decimal" : undefined;

  return (
    <Field
      label={field.label}
      htmlFor={id}
      required={field.required}
      help={compact ? undefined : field.help}
      error={error}
    >
      <Input
        id={id}
        type={inputType}
        inputMode={inputMode}
        step={field.type === "number" ? "any" : undefined}
        value={typeof value === "string" ? value : ""}
        placeholder={field.placeholder}
        invalid={Boolean(error)}
        disabled={locked}
        className={`${field.type === "number" ? "adm-no-spinner" : ""} ${
          locked ? "font-mono text-[12px]" : ""
        }`}
        onChange={(event) => onChange(field.key, event.target.value)}
      />
      {locked ? (
        <p className="text-[11px] text-adm-subtle">Dikunci karena dikelola otomatis oleh sistem.</p>
      ) : null}
    </Field>
  );
}

/** Editor paragraf: satu blok per paragraf, bisa diurutkan dan dihapus. */
export function ParagraphEditor({
  value,
  onChange,
}: {
  value: string[];
  onChange: (next: string[]) => void;
}) {
  return (
    <div className="space-y-2">
      {value.length === 0 ? (
        <p className="rounded-[var(--radius-adm-sm)] border border-dashed border-adm-border-strong px-3 py-5 text-center text-[12px] text-adm-subtle">
          Belum ada paragraf. Klik tombol di bawah untuk menambahkan.
        </p>
      ) : null}

      {value.map((paragraph, index) => (
        <div
          key={index}
          className="group rounded-[var(--radius-adm-md)] border border-adm-border bg-adm-surface-2 p-2 transition-colors focus-within:border-adm-border-strong"
        >
          <div className="mb-1.5 flex items-center justify-between gap-2 px-0.5">
            <span className="text-[10.5px] font-semibold uppercase tracking-[0.06em] text-adm-subtle">
              Paragraf {index + 1}
            </span>
            <div className="flex items-center gap-0.5 opacity-60 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
              <IconAction
                label={`Naikkan paragraf ${index + 1}`}
                disabled={index === 0}
                onClick={() => {
                  const next = [...value];
                  [next[index - 1], next[index]] = [next[index], next[index - 1]];
                  onChange(next);
                }}
              >
                <ArrowUp aria-hidden className="h-3 w-3" />
              </IconAction>
              <IconAction
                label={`Turunkan paragraf ${index + 1}`}
                disabled={index === value.length - 1}
                onClick={() => {
                  const next = [...value];
                  [next[index + 1], next[index]] = [next[index], next[index + 1]];
                  onChange(next);
                }}
              >
                <ArrowDown aria-hidden className="h-3 w-3" />
              </IconAction>
              <IconAction
                label={`Hapus paragraf ${index + 1}`}
                danger
                onClick={() => onChange(value.filter((_, i) => i !== index))}
              >
                <Trash2 aria-hidden className="h-3 w-3" />
              </IconAction>
            </div>
          </div>
          <textarea
            value={paragraph}
            rows={3}
            aria-label={`Isi paragraf ${index + 1}`}
            onChange={(event) => {
              const next = [...value];
              next[index] = event.target.value;
              onChange(next);
            }}
            className="adm-ring adm-transition adm-textarea-auto w-full rounded-[var(--radius-adm-sm)] border border-adm-border bg-adm-surface px-2.5 py-2 text-[13px] leading-relaxed text-adm-ink focus:border-adm-primary"
          />
        </div>
      ))}

      <Button
        size="small"
        variant="secondary"
        icon={<Plus aria-hidden className="h-3 w-3" />}
        onClick={() => onChange([...value, ""])}
      >
        Tambah paragraf
      </Button>
    </div>
  );
}

/** Input tag berbentuk chip. */
export function TagInput({
  value,
  onChange,
}: {
  value: string[];
  onChange: (next: string[]) => void;
}) {
  const [draft, setDraft] = useState("");

  function addTag(raw: string) {
    const tag = raw.trim().toLowerCase().replace(/\s+/g, "-");
    if (!tag || value.includes(tag)) return;
    onChange([...value, tag]);
    setDraft("");
  }

  return (
    <div>
      {value.length ? (
        <div className="mb-1.5 flex flex-wrap gap-1">
          {value.map((tag) => (
            <span
              key={tag}
              className="inline-flex h-6 items-center gap-1 rounded-full border border-adm-border bg-adm-muted pl-2 pr-0.5 text-[11px] text-adm-text"
            >
              {tag}
              <button
                type="button"
                onClick={() => onChange(value.filter((item) => item !== tag))}
                aria-label={`Hapus tag ${tag}`}
                className="adm-ring adm-transition rounded-full p-0.5 text-adm-subtle hover:bg-adm-danger-soft hover:text-adm-danger"
              >
                <X aria-hidden className="h-2.5 w-2.5" />
              </button>
            </span>
          ))}
        </div>
      ) : null}
      <Input
        value={draft}
        placeholder="Tambah tag, tekan Enter…"
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === ",") {
            event.preventDefault();
            addTag(draft);
          }
          if (event.key === "Backspace" && !draft && value.length) {
            onChange(value.slice(0, -1));
          }
        }}
        onBlur={() => addTag(draft)}
      />
    </div>
  );
}

function IconAction({
  label,
  children,
  onClick,
  disabled,
  danger,
}: {
  label: string;
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={`adm-ring adm-transition inline-flex h-6 w-6 items-center justify-center rounded-[var(--radius-adm-xs)] disabled:cursor-not-allowed disabled:opacity-40 ${
        danger
          ? "text-adm-subtle hover:bg-adm-danger-soft hover:text-adm-danger"
          : "text-adm-subtle hover:bg-adm-muted-2 hover:text-adm-ink"
      }`}
    >
      {children}
    </button>
  );
}
