"use client";

import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, Plus, Trash2, X } from "lucide-react";
import { Field, Input, Select, Textarea } from "./Form";
import Button from "./Button";
import Badge from "./Badge";

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
  /** Komponen pemilih gambar, disuntikkan dari halaman. */
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

  return (
    <form
      onSubmit={onSubmit}
      // noValidate: validasi ditangani sendiri (di klien dan server) supaya
      // pesan galat muncul dalam Bahasa Indonesia di dekat kolomnya, bukan
      // sebagai tooltip bawaan peramban yang tidak konsisten antar browser.
      noValidate
      className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px]"
    >
      <div className="space-y-6">
        {primaryFields.map((field) => (
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

      <aside className="space-y-6">
        <div className="rounded-[12px] border border-adm-border bg-adm-surface p-5">
          <h2 className="text-sm font-semibold text-adm-ink">Terbitkan</h2>
          <p className="mt-1 text-xs leading-relaxed text-adm-subtle">
            Perubahan tersimpan langsung ke repositori dan tayang di situs dalam 1 sampai 2
            menit.
          </p>
          <div className="mt-4 flex flex-col gap-2">
            <Button type="submit" variant="primary" loading={saving}>
              {saving ? "Menyimpan..." : "Simpan"}
            </Button>
            <Button variant="secondary" onClick={onCancel} disabled={saving}>
              Batal
            </Button>
          </div>
        </div>

        {imageFields.map((field) => (
          <div
            key={field.key}
            className="rounded-[12px] border border-adm-border bg-adm-surface p-5"
          >
            <h2 className="text-sm font-semibold text-adm-ink">{field.label}</h2>
            {field.help ? (
              <p className="mt-1 text-xs leading-relaxed text-adm-subtle">{field.help}</p>
            ) : null}
            <div className="mt-3">
              {renderImageField(field, String(initialValues[field.key] ?? ""))}
            </div>
            {errors[field.key] ? (
              <p className="mt-2 text-xs font-medium text-adm-danger">{errors[field.key]}</p>
            ) : null}
          </div>
        ))}
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
}: {
  field: ClientField;
  collection: ClientCollection;
  value: string | string[] | undefined;
  error?: string;
  onChange: (key: string, value: string | string[]) => void;
}) {
  const locked = collection.lockedFields.includes(field.key);
  const id = `field-${field.key}`;

  if (field.type === "paragraphs") {
    return (
      <Field label={field.label} required={field.required} help={field.help} error={error}>
        <ParagraphEditor
          value={typeof value === "string" ? value : ""}
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
      <Field label={field.label} htmlFor={id} required={field.required} help={field.help} error={error}>
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
    return (
      <Field
        label={field.label}
        htmlFor={id}
        required={field.required}
        help={field.help}
        error={error}
      >
        <Textarea
          id={id}
          value={typeof value === "string" ? value : ""}
          rows={field.rows ?? 4}
          invalid={Boolean(error)}
          placeholder={field.placeholder}
          onChange={(event) => onChange(field.key, event.target.value)}
        />
        {field.maxLength ? (
          <p className="text-right text-xs text-adm-subtle">
            {(typeof value === "string" ? value : "").length}/{field.maxLength}
          </p>
        ) : null}
      </Field>
    );
  }

  if (field.type === "date") {
    return (
      <Field label={field.label} htmlFor={id} required={field.required} help={field.help} error={error}>
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
  const inputMode = field.type === "whatsapp" ? "tel" : undefined;

  return (
    <Field label={field.label} htmlFor={id} required={field.required} help={field.help} error={error}>
      <Input
        id={id}
        type={inputType}
        inputMode={inputMode}
        step={field.type === "number" ? "any" : undefined}
        value={typeof value === "string" ? value : ""}
        placeholder={field.placeholder}
        invalid={Boolean(error)}
        disabled={locked}
        onChange={(event) => onChange(field.key, event.target.value)}
      />
      {locked ? (
        <p className="text-xs text-adm-subtle">
          Field ini dikunci karena dikelola otomatis oleh sistem.
        </p>
      ) : null}
    </Field>
  );
}

/** Editor paragraf: satu blok per paragraf, bisa diurutkan dan dihapus. */
export function ParagraphEditor({
  value,
  onChange,
}: {
  value: string;
  onChange: (next: string) => void;
}) {
  const paragraphs = useMemo(
    () => value.split("\n").map((line) => line.trim()),
    [value]
  );

  function commit(next: string[]) {
    onChange(next.join("\n"));
  }

  return (
    <div className="space-y-3">
      <p className="text-xs leading-relaxed text-adm-subtle">
        Tulis satu paragraf per blok. Gunakan tombol panah untuk mengubah urutan.
      </p>
      {paragraphs.length === 0 ? (
        <p className="rounded-[8px] border border-dashed border-adm-border-strong px-3 py-4 text-center text-[13px] text-adm-subtle">
          Belum ada paragraf. Tambahkan paragraf pertama di bawah.
        </p>
      ) : null}
      {paragraphs.map((paragraph, index) => (
        <div key={index} className="rounded-[10px] border border-adm-border bg-adm-surface p-3">
          <div className="mb-2 flex items-center justify-between gap-2">
            <span className="text-xs font-medium text-adm-subtle">Paragraf {index + 1}</span>
            <div className="flex items-center gap-1">
              <IconAction
                label={`Naikkan paragraf ${index + 1}`}
                disabled={index === 0}
                onClick={() => {
                  const next = [...paragraphs];
                  [next[index - 1], next[index]] = [next[index], next[index - 1]];
                  commit(next);
                }}
              >
                <ArrowUp aria-hidden className="h-3.5 w-3.5" />
              </IconAction>
              <IconAction
                label={`Turunkan paragraf ${index + 1}`}
                disabled={index === paragraphs.length - 1}
                onClick={() => {
                  const next = [...paragraphs];
                  [next[index + 1], next[index]] = [next[index], next[index + 1]];
                  commit(next);
                }}
              >
                <ArrowDown aria-hidden className="h-3.5 w-3.5" />
              </IconAction>
              <IconAction
                label={`Hapus paragraf ${index + 1}`}
                danger
                onClick={() => commit(paragraphs.filter((_, i) => i !== index))}
              >
                <Trash2 aria-hidden className="h-3.5 w-3.5" />
              </IconAction>
            </div>
          </div>
          <textarea
            value={paragraph}
            rows={3}
            onChange={(event) => {
              const next = [...paragraphs];
              next[index] = event.target.value;
              commit(next);
            }}
            className="adm-ring adm-transition adm-textarea-auto w-full rounded-[8px] border border-adm-border bg-adm-surface px-3 py-2 text-sm leading-relaxed text-adm-ink focus:border-adm-primary"
          />
        </div>
      ))}
      <Button
        size="small"
        icon={<Plus aria-hidden className="h-3.5 w-3.5" />}
        onClick={() => commit([...paragraphs, ""])}
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
      <div className="flex flex-wrap gap-1.5">
        {value.map((tag) => (
          <span
            key={tag}
            className="inline-flex h-6 items-center gap-1 rounded-full border border-adm-border bg-adm-muted pl-2.5 pr-1 text-xs text-adm-text"
          >
            {tag}
            <button
              type="button"
              onClick={() => onChange(value.filter((item) => item !== tag))}
              aria-label={`Hapus tag ${tag}`}
              className="adm-ring adm-transition rounded-full p-0.5 text-adm-subtle hover:text-adm-danger"
            >
              <X aria-hidden className="h-3 w-3" />
            </button>
          </span>
        ))}
      </div>
      <Input
        value={draft}
        placeholder="Tambah tag, tekan Enter..."
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
        className="mt-2"
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
      className={`adm-ring adm-transition inline-flex h-8 w-8 items-center justify-center rounded-[6px] disabled:cursor-not-allowed disabled:opacity-40 ${
        danger
          ? "text-adm-subtle hover:bg-adm-danger-soft hover:text-adm-danger"
          : "text-adm-subtle hover:bg-adm-divider hover:text-adm-ink"
      }`}
    >
      {children}
    </button>
  );
}

/** Ringkasan status simpan untuk ditampilkan di atas form. */
export function SaveHint({ dirty }: { dirty: boolean }) {
  return dirty ? (
    <Badge variant="warning">Ada perubahan belum disimpan</Badge>
  ) : (
    <Badge variant="success">Tersimpan</Badge>
  );
}
