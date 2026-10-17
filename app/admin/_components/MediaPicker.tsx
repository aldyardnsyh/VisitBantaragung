"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ImagePlus, Loader2, Trash2, Upload, X } from "lucide-react";
import Button from "./Button";
import Dialog from "./Dialog";
import { useEscape, useToast } from "./Toast";
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
      <div className="group relative overflow-hidden rounded-[var(--radius-adm-md)] border border-adm-border bg-adm-muted transition-shadow hover:shadow-adm-xs">
        {value ? (
          <img
            src={previewUrl(value, target)}
            alt="Pratinjau gambar terpilih"
            className="aspect-[4/3] w-full object-cover"
          />
        ) : (
          <div className="flex aspect-[4/3] flex-col items-center justify-center gap-1.5 text-adm-subtle">
            <ImagePlus aria-hidden className="h-6 w-6" />
            <span className="text-[11.5px]">Belum ada gambar</span>
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
    let skipped = 0;
    const daftar = Array.from(files);
    try {
      for (let i = 0; i < daftar.length; i += 1) {
        const file = daftar[i];
        // Toast kemajuan dengan id tetap supaya tidak menumpuk per berkas.
        toast.loading(
          daftar.length > 1
            ? `Mengunggah ${i + 1} dari ${daftar.length}: ${file.name}`
            : `Mengunggah ${file.name}...`,
          { id: "galeri-upload" }
        );
        const compressed = await compressImage(file);
        if (compressed.size > 3_500_000) {
          skipped += 1;
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
        toast.success(
          skipped > 0
            ? `${added.length} foto diunggah, ${skipped} dilewati karena terlalu besar.`
            : `${added.length} foto diunggah.`,
          { id: "galeri-upload" }
        );
      } else if (skipped > 0) {
        toast.warning(`${skipped} foto dilewati karena terlalu besar.`, { id: "galeri-upload" });
      }
    } catch (failure) {
      toast.error(readError(failure), { id: "galeri-upload" });
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
              className="group overflow-hidden rounded-[var(--radius-adm-sm)] border border-adm-border bg-adm-muted transition-shadow hover:shadow-adm-xs"
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
                  className="adm-ring adm-transition rounded p-1 text-adm-subtle hover:bg-adm-danger-soft hover:text-adm-danger active:bg-[#f6d9d9]"
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


// Pengganti blok MediaLibraryDialog dengan UX yang lebih baik.
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
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);

  // Escape menutup dialog.
  useEscape(open, onClose);

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

  // Fokus awal + kembalikan fokus setelah ditutup.
  useEffect(() => {
    if (!open) return;
    previouslyFocused.current = document.activeElement as HTMLElement | null;
    const timer = window.setTimeout(() => closeRef.current?.focus(), 30);
    return () => {
      window.clearTimeout(timer);
      previouslyFocused.current?.focus?.();
    };
  }, [open]);

  // Kunci gulir halaman di belakang.
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  // Jebakan fokus Tab agar tidak bocor ke halaman di belakang.
  useEffect(() => {
    if (!open) return;
    const handler = (event: KeyboardEvent) => {
      if (event.key !== "Tab") return;
      const panel = panelRef.current;
      if (!panel) return;
      const nodes = Array.from(
        panel.querySelectorAll<HTMLElement>(
          'a[href],button:not([disabled]),input:not([disabled]),[tabindex]:not([tabindex="-1"])'
        )
      ).filter((el) => el.offsetParent !== null);
      if (nodes.length === 0) return;
      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      const active = document.activeElement as HTMLElement | null;
      if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      } else if (event.shiftKey && (active === first || !panel.contains(active))) {
        event.preventDefault();
        last.focus();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open]);

  const filtered = useMemo(() => {
    if (!items) return null;
    const needle = query.trim().toLowerCase();
    if (!needle) return items;
    return items.filter((item) => item.name.toLowerCase().includes(needle) || item.path.toLowerCase().includes(needle));
  }, [items, query]);

  function toggle(path: string) {
    if (!multiple) {
      onPick(path);
      return;
    }
    setSelected((current) =>
      current.includes(path) ? current.filter((p) => p !== path) : [...current, path]
    );
  }

  if (!open) return null;

  return (
    <div
      className="adm-overlay-in fixed inset-0 z-[70] flex items-end justify-center bg-[rgba(20,32,28,0.46)] p-0 sm:items-center sm:p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      role="presentation"
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="media-dialog-title"
        className="adm-dialog-in flex h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-t-[var(--radius-adm-xl)] border border-adm-border bg-adm-surface shadow-adm-lg sm:h-auto sm:max-h-[86vh] sm:rounded-[var(--radius-adm-xl)]"
      >
        {/* Kepala: judul + folder + tutup */}
        <div className="flex items-start justify-between gap-3 border-b border-adm-divider px-4 py-3.5 sm:px-5">
          <div className="min-w-0">
            <h2 id="media-dialog-title" className="text-[14.5px] font-semibold tracking-[-0.01em] text-adm-ink">
              Pustaka gambar
            </h2>
            <p className="mt-0.5 flex items-center gap-1.5 text-[11.5px] text-adm-subtle">
              Folder
              <code className="rounded bg-adm-muted px-1 py-0.5 font-mono text-[10.5px] text-adm-text">
                {folder}
              </code>
            </p>
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Tutup pustaka gambar"
            className="adm-ring adm-transition -mr-1 -mt-1 shrink-0 rounded-[var(--radius-adm-sm)] p-1.5 text-adm-subtle hover:bg-adm-muted hover:text-adm-ink active:bg-adm-pressed"
          >
            <X aria-hidden className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Pencarian di dalam pustaka */}
        {items && items.length > 4 ? (
          <div className="border-b border-adm-divider px-4 py-2.5 sm:px-5">
            <div className="relative">
              <svg
                aria-hidden
                viewBox="0 0 16 16"
                className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-adm-subtle"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
              >
                <circle cx="7" cy="7" r="4.5" />
                <path d="m10.5 10.5 3 3" strokeLinecap="round" />
              </svg>
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Cari nama berkas…"
                aria-label="Cari gambar"
                className="adm-transition h-8.5 w-full rounded-[var(--radius-adm-sm)] border border-adm-border bg-adm-surface-2 pl-8 pr-3 text-[12.5px] text-adm-ink placeholder:text-adm-subtle/75 hover:border-adm-border-strong focus:border-adm-primary focus:outline-none focus:ring-[3px] focus:ring-adm-primary/15"
              />
            </div>
          </div>
        ) : null}

        {/* Isi */}
        <div className="adm-scroll flex-1 overflow-y-auto p-4 sm:p-5">
          {error ? (
            <div className="rounded-[var(--radius-adm-md)] border border-[#f3d3d3] bg-adm-danger-soft px-3.5 py-3">
              <p className="text-[12.5px] font-medium text-adm-danger">{error}</p>
            </div>
          ) : null}

          {!error && items === null ? (
            <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4 md:grid-cols-5">
              {Array.from({ length: 10 }).map((_, index) => (
                <div key={index} className="adm-skeleton aspect-square rounded-[var(--radius-adm-sm)]" />
              ))}
            </div>
          ) : null}

          {!error && items && items.length === 0 ? (
            <div className="flex flex-col items-center gap-1.5 px-4 py-12 text-center">
              <ImagesPlaceholder />
              <p className="text-[13px] font-medium text-adm-ink">Belum ada gambar</p>
              <p className="max-w-xs text-[12px] leading-relaxed text-adm-subtle">
                Unggah gambar lewat tombol di formulir, lalu pilih dari sini.
              </p>
            </div>
          ) : null}

          {!error && filtered && filtered.length === 0 && items && items.length > 0 ? (
            <div className="px-4 py-10 text-center">
              <p className="text-[13px] font-medium text-adm-ink">Tidak ada yang cocok</p>
              <p className="mt-0.5 text-[12px] text-adm-subtle">
                Tidak ada berkas bernama “{query}”. Coba kata lain.
              </p>
            </div>
          ) : null}

          {!error && filtered && filtered.length > 0 ? (
            <ul className="grid grid-cols-3 gap-2.5 sm:grid-cols-4 md:grid-cols-5">
              {filtered.map((item, index) => {
                const isSelected = selected.includes(item.path);
                return (
                  <li key={item.path}>
                    <button
                      type="button"
                      onClick={() => toggle(item.path)}
                      onMouseEnter={() => setActiveIndex(index)}
                      aria-pressed={multiple ? isSelected : undefined}
                      title={item.name}
                      className={`adm-ring adm-transition group relative block w-full overflow-hidden rounded-[var(--radius-adm-sm)] border text-left ${
                        isSelected
                          ? "border-adm-primary ring-2 ring-adm-primary/25"
                          : "border-adm-border hover:border-adm-border-strong hover:shadow-adm-xs active:translate-y-px"
                      }`}
                    >
                      <img
                        src={previewUrl(item.path, target)}
                        alt={item.name}
                        loading="lazy"
                        className="aspect-square w-full bg-adm-muted object-cover"
                      />
                      {isSelected ? (
                        <span className="absolute right-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-adm-primary text-white shadow-adm-xs">
                          <svg aria-hidden viewBox="0 0 16 16" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2.2">
                            <path d="m3.5 8.5 3 3 6-6.5" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        </span>
                      ) : null}
                      <span className="block truncate border-t border-adm-divider bg-adm-surface px-2 py-1.5 text-[10.5px] text-adm-subtle">
                        {formatBytes(item.size)}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : null}
        </div>

        {/* Kaki: hanya untuk mode pilih-banyak */}
        <div className="flex flex-col gap-2 border-t border-adm-divider bg-adm-surface-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <p className="text-[12px] text-adm-subtle">
            {multiple ? (
              selected.length > 0 ? (
                <>
                  <span className="font-medium text-adm-ink">{selected.length}</span> gambar dipilih
                </>
              ) : (
                "Pilih satu atau beberapa gambar"
              )
            ) : (
              "Klik gambar untuk memilih"
            )}
          </p>
          <div className="flex gap-2">
            <Button variant="secondary" size="small" onClick={onClose} className="flex-1 sm:flex-none">
              {multiple ? "Batal" : "Tutup"}
            </Button>
            {multiple ? (
              <Button
                variant="primary"
                size="small"
                disabled={selected.length === 0}
                onClick={() => {
                  selected.forEach((path) => onPick(path));
                  onClose();
                }}
                className="flex-1 sm:flex-none"
              >
                Tambahkan{selected.length > 0 ? ` (${selected.length})` : ""}
              </Button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

function ImagesPlaceholder() {
  return (
    <span className="flex h-11 w-11 items-center justify-center rounded-full bg-adm-muted text-adm-subtle">
      <svg aria-hidden viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.6">
        <rect x="3.5" y="5" width="17" height="14" rx="2.5" />
        <circle cx="9" cy="10" r="1.5" />
        <path d="m4.5 16.5 4.2-4.2a2 2 0 0 1 2.8 0l4 4M14 14l1.6-1.6a2 2 0 0 1 2.8 0l1.6 1.6" strokeLinecap="round" />
      </svg>
    </span>
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