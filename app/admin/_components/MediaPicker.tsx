"use client";

import { useEffect, useRef, useState } from "react";
import { ImagePlus, Loader2, Trash2, Upload, X } from "lucide-react";
import Button from "./Button";
import Dialog from "./Dialog";
import { useToast } from "./Toast";
import { apiGet, apiSend, apiUpload } from "../_lib/api";

export interface MediaItem {
  path: string;
  name: string;
  size: number;
  url: string;
  sha: string;
}

/**
 * Kompresi gambar di browser sebelum dikirim.
 *
 * Batas badan permintaan Vercel adalah 4,5 MB dan tidak dapat dinaikkan, jadi
 * gambar besar harus diperkecil lebih dulu. Lebar maksimum 1920 px dan WebP
 * kualitas 0,82 menghasilkan berkas ratusan kilobyte tanpa kehilangan detail
 * yang terlihat pada halaman situs.
 */
export async function compressImage(file: File): Promise<File> {
  if (!file.type.startsWith("image/")) return file;
  if (file.type === "image/svg+xml" || file.type === "image/gif") return file;
  if (file.size <= 400_000) return file;

  try {
    const bitmap = await createImageBitmap(file);
    const maxWidth = 1920;
    const scale = Math.min(1, maxWidth / bitmap.width);
    const width = Math.round(bitmap.width * scale);
    const height = Math.round(bitmap.height * scale);

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) return file;
    context.drawImage(bitmap, 0, 0, width, height);
    bitmap.close?.();

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob((result) => resolve(result), "image/webp", 0.82)
    );
    if (!blob) return file;
    if (blob.size >= file.size) return file;

    const name = file.name.replace(/\.[^.]+$/, "") + ".webp";
    return new File([blob], name, { type: "image/webp" });
  } catch {
    return file;
  }
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

/** Nilai yang disimpan di JSON konten: path relatif untuk aset CDN,
 *  atau path /public untuk berita yang dikelola crawler. */
export function toContentPath(target: "assets" | "local", path: string): string {
  if (target === "local") return path.startsWith("/") ? path : `/${path}`;
  return path.replace(/^\/+/, "");
}

interface SinglePickerProps {
  value: string;
  folder: string;
  target: "assets" | "local";
  onChange: (path: string) => void;
}

/** Pemilih satu gambar: unggah baru atau pilih dari pustaka. */
export function ImagePicker({ value, folder, target, onChange }: SinglePickerProps) {
  const toast = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [libraryOpen, setLibraryOpen] = useState(false);

  async function handleFile(file: File) {
    setUploading(true);
    try {
      const compressed = await compressImage(file);
      if (compressed.size > 3_500_000) {
        toast.error("Gambar masih terlalu besar setelah dikompresi. Gunakan berkas di bawah 3 MB.");
        return;
      }
      const form = new FormData();
      form.append("file", compressed);
      form.append("folder", folder);
      const result = await apiUpload<{ path: string; message: string }>(
        "/api/admin/media",
        form
      );
      onChange(toContentPath(target, result.path));
      toast.success(result.message);
    } catch (failure) {
      toast.error(readError(failure));
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="space-y-3">
      <div className="overflow-hidden rounded-[10px] border border-adm-border bg-adm-muted">
        {value ? (
          <img
            src={previewUrl(value, target)}
            alt="Pratinjau gambar terpilih"
            className="aspect-[4/3] w-full object-cover"
          />
        ) : (
          <div className="flex aspect-[4/3] flex-col items-center justify-center gap-2 text-adm-subtle">
            <ImagePlus aria-hidden className="h-6 w-6" />
            <span className="text-xs">Belum ada gambar</span>
          </div>
        )}
      </div>

      {value ? (
        <p className="break-all font-mono text-[11px] text-adm-subtle">{value}</p>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <Button
          size="small"
          icon={
            uploading ? (
              <Loader2 aria-hidden className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Upload aria-hidden className="h-3.5 w-3.5" />
            )
          }
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
        >
          {uploading ? "Mengunggah..." : "Unggah gambar"}
        </Button>
        <Button size="small" onClick={() => setLibraryOpen(true)} disabled={uploading}>
          Pilih dari pustaka
        </Button>
        {value ? (
          <Button
            size="small"
            variant="ghost"
            onClick={() => onChange("")}
            disabled={uploading}
            icon={<X aria-hidden className="h-3.5 w-3.5" />}
          >
            Kosongkan
          </Button>
        ) : null}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void handleFile(file);
        }}
      />

      <MediaLibraryDialog
        open={libraryOpen}
        folder={folder}
        target={target}
        onClose={() => setLibraryOpen(false)}
        key={libraryOpen ? `open-${folder}` : `closed`}
        onPick={(path) => {
          onChange(path);
          setLibraryOpen(false);
        }}
      />
    </div>
  );
}

interface GalleryPickerProps {
  value: string[];
  folder: string;
  target: "assets" | "local";
  onChange: (paths: string[]) => void;
}

/** Galeri foto: daftar gambar dengan urutan yang bisa diubah. */
export function GalleryPicker({ value, folder, target, onChange }: GalleryPickerProps) {
  const toast = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [libraryOpen, setLibraryOpen] = useState(false);

  async function handleFiles(files: FileList) {
    setUploading(true);
    const added: string[] = [];
    try {
      for (const file of Array.from(files)) {
        const compressed = await compressImage(file);
        if (compressed.size > 3_500_000) {
          toast.error(`${file.name} terlalu besar setelah dikompresi dan dilewati.`);
          continue;
        }
        const form = new FormData();
        form.append("file", compressed);
        form.append("folder", folder);
        const result = await apiUpload<{ path: string }>("/api/admin/media", form);
        added.push(toContentPath(target, result.path));
      }
      if (added.length) {
        onChange([...value, ...added]);
        toast.success(`${added.length} gambar diunggah.`);
      }
    } catch (failure) {
      toast.error(readError(failure));
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="space-y-3">
      {value.length === 0 ? (
        <p className="rounded-[8px] border border-dashed border-adm-border-strong px-3 py-4 text-center text-[13px] text-adm-subtle">
          Belum ada foto tambahan.
        </p>
      ) : (
        <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {value.map((path, index) => (
            <li
              key={`${path}-${index}`}
              className="overflow-hidden rounded-[8px] border border-adm-border bg-adm-muted"
            >
              <img
                src={previewUrl(path, target)}
                alt={`Foto ${index + 1}`}
                className="aspect-square w-full object-cover"
              />
              <div className="flex items-center justify-between gap-1 border-t border-adm-divider bg-adm-surface p-1.5">
                <span className="px-1 text-[11px] text-adm-subtle">Foto {index + 1}</span>
                <button
                  type="button"
                  onClick={() => onChange(value.filter((_, i) => i !== index))}
                  aria-label={`Hapus foto ${index + 1}`}
                  className="adm-ring adm-transition rounded p-1 text-adm-subtle hover:bg-adm-danger-soft hover:text-adm-danger"
                >
                  <Trash2 aria-hidden className="h-3.5 w-3.5" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="flex flex-wrap gap-2">
        <Button
          size="small"
          icon={
            uploading ? (
              <Loader2 aria-hidden className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Upload aria-hidden className="h-3.5 w-3.5" />
            )
          }
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
        >
          {uploading ? "Mengunggah..." : "Unggah foto"}
        </Button>
        <Button size="small" onClick={() => setLibraryOpen(true)} disabled={uploading}>
          Pilih dari pustaka
        </Button>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        multiple
        className="hidden"
        onChange={(event) => {
          if (event.target.files?.length) void handleFiles(event.target.files);
        }}
      />

      <MediaLibraryDialog
        open={libraryOpen}
        folder={folder}
        target={target}
        onClose={() => setLibraryOpen(false)}
        key={libraryOpen ? `open-${folder}` : `closed`}
        onPick={(path) => {
          if (!value.includes(path)) onChange([...value, path]);
        }}
        multiple
      />
    </div>
  );
}

/** Pratinjau: aset CDN memakai basis jsDelivr, berkas lokal memakai path publik. */
export function previewUrl(path: string, target: "assets" | "local"): string {
  if (!path) return "";
  if (path.startsWith("http") || path.startsWith("/")) return path;
  const base = process.env.NEXT_PUBLIC_ASSET_BASE_URL ?? "";
  if (!base) return `/${path}`;
  return `${base.replace(/\/+$/, "")}/${path}`;
}

/** Dialog pustaka gambar dari folder aset yang sama. */
export function MediaLibraryDialog({
  open,
  folder,
  target,
  onClose,
  onPick,
  multiple = false,
}: {
  open: boolean;
  folder: string;
  target: "assets" | "local";
  onClose: () => void;
  onPick: (path: string) => void;
  multiple?: boolean;
}) {
  const [items, setItems] = useState<MediaItem[] | null>(null);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<string[]>([]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    apiGet<{ items: MediaItem[] }>(`/api/admin/media?folder=${encodeURIComponent(folder)}`)
      .then((data) => {
        if (!cancelled) setItems(data.items);
      })
      .catch((failure) => {
        if (!cancelled) setError(readError(failure));
      });
    return () => {
      cancelled = true;
    };
  }, [open, folder]);

  if (!open) return null;

  return (
    <div
      className="adm-overlay-in fixed inset-0 z-[65] flex items-center justify-center bg-[rgba(11,31,22,0.45)] p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Pustaka gambar"
        className="adm-dialog-in flex max-h-[80vh] w-full max-w-2xl flex-col rounded-[12px] border border-adm-border bg-adm-surface"
      >
        <div className="flex items-center justify-between border-b border-adm-divider px-5 py-4">
          <div>
            <h2 className="text-base font-semibold text-adm-ink">Pustaka gambar</h2>
            <p className="mt-0.5 font-mono text-[11px] text-adm-subtle">{folder}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup pustaka gambar"
            className="adm-ring adm-transition rounded p-1.5 text-adm-subtle hover:bg-adm-muted hover:text-adm-ink"
          >
            <X aria-hidden className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {error ? <p className="text-sm text-adm-danger">{error}</p> : null}
          {!error && items === null ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {Array.from({ length: 8 }).map((_, index) => (
                <div
                  key={index}
                  className="aspect-square animate-pulse rounded-[8px] bg-adm-muted"
                />
              ))}
            </div>
          ) : null}
          {!error && items && items.length === 0 ? (
            <p className="py-8 text-center text-sm text-adm-subtle">
              Belum ada gambar di folder ini. Unggah gambar baru dari formulir.
            </p>
          ) : null}
          {!error && items && items.length > 0 ? (
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {items.map((item) => {
                const isSelected = selected.includes(item.path);
                return (
                  <li key={item.path}>
                    <button
                      type="button"
                      onClick={() => {
                        if (!multiple) {
                          onPick(item.path);
                          return;
                        }
                        setSelected((current) =>
                          current.includes(item.path)
                            ? current.filter((path) => path !== item.path)
                            : [...current, item.path]
                        );
                      }}
                      className={`adm-ring adm-transition w-full overflow-hidden rounded-[8px] border text-left ${
                        isSelected
                          ? "border-adm-primary ring-1 ring-adm-primary"
                          : "border-adm-border hover:border-adm-border-strong"
                      }`}
                    >
                      <img
                        src={previewUrl(item.path, target)}
                        alt={item.name}
                        loading="lazy"
                        className="aspect-square w-full object-cover"
                      />
                      <span className="block truncate border-t border-adm-divider px-2 py-1.5 text-[11px] text-adm-subtle">
                        {formatBytes(item.size)}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : null}
        </div>

        {multiple ? (
          <div className="flex items-center justify-between gap-3 border-t border-adm-divider px-5 py-3">
            <span className="text-[13px] text-adm-subtle">{selected.length} gambar dipilih</span>
            <div className="flex gap-2">
              <Button size="small" onClick={onClose}>
                Batal
              </Button>
              <Button
                size="small"
                variant="primary"
                disabled={selected.length === 0}
                onClick={() => {
                  selected.forEach((path) => onPick(path));
                  onClose();
                }}
              >
                Tambahkan
              </Button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function readError(failure: unknown): string {
  if (typeof failure === "object" && failure !== null && "error" in failure) {
    return String((failure as { error: unknown }).error);
  }
  return "Terjadi kesalahan. Coba lagi.";
}

/** Tombol hapus berkas media langsung dari pustaka. */
export async function deleteMediaFile(path: string): Promise<void> {
  await apiSend(`/api/admin/media?path=${encodeURIComponent(path)}`, "DELETE");
}

export { Dialog };
