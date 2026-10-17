"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ChevronRight, Trash2 } from "lucide-react";
import ContentForm, { ClientCollection, Values } from "./ContentForm";
import { GalleryPicker, ImagePicker } from "./MediaPicker";
import Dialog from "./Dialog";
import Button from "./Button";
import Badge from "./Badge";
import { useToast } from "./Toast";
import { apiSend } from "../_lib/api";
import { slugify } from "../_lib/slug";

interface RecordEditorProps {
  collection: ClientCollection;
  mode: "create" | "edit";
  initialValues: Values;
  initialSha?: string;
  originalSlug?: string;
  mediaFolder: string;
}

export default function RecordEditor({
  collection,
  mode,
  initialValues,
  initialSha,
  originalSlug,
  mediaFolder,
}: RecordEditorProps) {
  const router = useRouter();
  const toast = useToast();
  const [values, setValues] = useState<Values>(initialValues);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const dirty = useMemo(
    () => JSON.stringify(values) !== JSON.stringify(initialValues),
    [values, initialValues]
  );

  function update(key: string, value: string | string[]) {
    setValues((current) => {
      const next: Values = { ...current, [key]: value };
      if (mode === "create" && key === collection.titleKey && typeof value === "string") {
        const slugKey = collection.slugKey;
        if (!String(current[slugKey] ?? "").trim()) {
          next[slugKey] = slugify(value);
        }
      }
      return next;
    });
    setErrors((current) => {
      if (!current[key]) return current;
      const next = { ...current };
      delete next[key];
      return next;
    });
  }

  const slugValue = String(values[collection.slugKey] ?? "");
  const effectiveFolder = slugValue
    ? mediaFolder.replace(/[^/]+$/, slugify(slugValue))
    : mediaFolder.replace(/\/[^/]+$/, "");

  async function save(event: React.FormEvent) {
    event.preventDefault();

    const localErrors: Record<string, string> = {};
    for (const field of collection.fields) {
      if (!field.required) continue;
      if (collection.lockedFields.includes(field.key)) continue;
      const value = values[field.key];
      const empty =
        value === undefined ||
        (typeof value === "string" && value.trim() === "") ||
        (Array.isArray(value) && value.length === 0);
      if (empty) localErrors[field.key] = "Kolom ini wajib diisi.";
    }
    if (Object.keys(localErrors).length) {
      setErrors(localErrors);
      toast.warning("Lengkapi dulu kolom yang ditandai.");
      const firstKey = Object.keys(localErrors)[0];
      document.getElementById(`field-${firstKey}`)?.focus();
      return;
    }

    setSaving(true);
    setErrors({});
    try {
      const payload = {
        collection: collection.id,
        slug: mode === "edit" ? originalSlug : undefined,
        expectedSha: mode === "edit" ? initialSha : undefined,
        values,
      };
      const result = await apiSend<{ message: string; warnings: string[]; commitUrl?: string }>(
        "/api/admin/content",
        "POST",
        payload
      );
      toast.success(result.message, {
        action: result.commitUrl ? { label: "Lihat commit", href: result.commitUrl } : undefined,
      });
      for (const warning of result.warnings ?? []) toast.warning(warning);
      router.push(`/admin/${collection.id}`);
      router.refresh();
    } catch (failure) {
      const message =
        typeof failure === "object" && failure !== null && "error" in failure
          ? String((failure as { error: unknown }).error)
          : "Gagal menyimpan. Coba lagi.";
      const fields =
        typeof failure === "object" &&
        failure !== null &&
        "fields" in failure &&
        (failure as { fields?: unknown }).fields &&
        typeof (failure as { fields: unknown }).fields === "object"
          ? ((failure as { fields: Record<string, string> }).fields ?? {})
          : {};
      setErrors(fields);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete() {
    setDeleting(true);
    try {
      const result = await apiSend<{ message: string }>(
        `/api/admin/content?collection=${collection.id}&slug=${encodeURIComponent(originalSlug ?? "")}`,
        "DELETE"
      );
      toast.success(result.message);
      router.push(`/admin/${collection.id}`);
      router.refresh();
    } catch (failure) {
      toast.error(
        typeof failure === "object" && failure !== null && "error" in failure
          ? String((failure as { error: unknown }).error)
          : "Gagal menghapus."
      );
      setDeleting(false);
    }
  }

  const title =
    mode === "create"
      ? `Tambah ${collection.labelSingular}`
      : String(values[collection.titleKey] ?? originalSlug ?? "");

  return (
    <div className="space-y-5">
      {/* Kepala halaman: breadcrumb + judul + status */}
      <div className="border-b border-adm-divider pb-4">
        <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-[12px]">
          <Link
            href={`/admin/${collection.id}`}
            className="adm-ring adm-transition inline-flex items-center gap-1 rounded text-adm-subtle hover:text-adm-ink"
          >
            <ArrowLeft aria-hidden className="h-3 w-3" />
            {collection.label}
          </Link>
          <ChevronRight aria-hidden className="h-3 w-3 text-adm-border-strong" />
          <span className="truncate font-medium text-adm-ink">
            {mode === "create" ? collection.labelSingular : "Ubah"}
          </span>
        </nav>

        <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <h1 className="font-display text-[24px] font-semibold leading-tight tracking-[-0.02em] text-adm-ink">
              {title}
            </h1>
            <div className="mt-1.5 flex flex-wrap items-center gap-2">
              {dirty ? (
                <Badge variant="warning" dot>
                  Belum disimpan
                </Badge>
              ) : (
                <Badge variant="success" dot>
                  Tersimpan
                </Badge>
              )}
              {mode === "create" ? (
                <span className="text-[11.5px] text-adm-subtle">Belum diterbitkan</span>
              ) : (
                <code className="rounded bg-adm-muted px-1.5 py-0.5 font-mono text-[11px] text-adm-text">
                  {originalSlug}
                </code>
              )}
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <Button variant="ghost" size="small" onClick={() => router.push(`/admin/${collection.id}`)}>
              Batal
            </Button>
            {mode === "edit" ? (
              <Button
                variant="ghost"
                size="small"
                className="text-adm-danger hover:bg-adm-danger-soft"
                icon={<Trash2 aria-hidden className="h-3.5 w-3.5" />}
                onClick={() => setDeleteOpen(true)}
              >
                Hapus
              </Button>
            ) : null}
            <Button variant="primary" loading={saving} onClick={() => {
              const form = document.getElementById("adm-record-form") as HTMLFormElement | null;
              form?.requestSubmit();
            }}>
              {saving ? "Menyimpan..." : "Simpan"}
            </Button>
          </div>
        </div>
      </div>

      <ContentForm
        collection={collection}
        initialValues={values}
        saving={saving}
        errors={errors}
        onChange={update}
        onSubmit={save}
        onCancel={() => router.push(`/admin/${collection.id}`)}
        renderImageField={(field, value) => {
          if (mode === "create" && !slugValue) {
            return (
              <p className="rounded-[var(--radius-adm-sm)] border border-dashed border-adm-border-strong px-3 py-4 text-[12px] leading-relaxed text-adm-subtle">
                Isi judul lebih dulu. Folder gambar akan dibuat otomatis mengikuti slug.
              </p>
            );
          }
          if (field.type === "gallery") {
            return (
              <GalleryPicker
                value={Array.isArray(values[field.key]) ? (values[field.key] as string[]) : []}
                folder={effectiveFolder}
                target={collection.assetTarget}
                onChange={(paths) => update(field.key, paths)}
              />
            );
          }
          return (
            <ImagePicker
              value={value}
              folder={effectiveFolder}
              target={collection.assetTarget}
              onChange={(path) => update(field.key, path)}
            />
          );
        }}
      />

      <Dialog
        open={deleteOpen}
        title={`Hapus ${collection.labelSingular.toLowerCase()} ini?`}
        description="Konten akan dihapus dari situs. Tindakan ini tidak dapat dibatalkan, tetapi masih bisa dipulihkan lewat riwayat GitHub."
        confirmLabel="Hapus"
        destructive
        loading={deleting}
        onConfirm={confirmDelete}
        onClose={() => setDeleteOpen(false)}
      />
    </div>
  );
}
