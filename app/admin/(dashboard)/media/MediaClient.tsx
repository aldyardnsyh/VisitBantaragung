"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Check, Copy, Loader2, Trash2, Upload } from "lucide-react";
import { PageHeader, LoadingRows, ErrorNotice } from "../../_components/EmptyState";
import { Field } from "../../_components/Form";
import Button from "../../_components/Button";
import Dialog from "../../_components/Dialog";
import { useToast } from "../../_components/Toast";
import { apiGet, apiSend, apiUpload } from "../../_lib/api";
import { compressImage, formatBytes, previewUrl, readError, MediaItem } from "../../_components/MediaPicker";

export default function MediaClient({ folders }: { folders: string[] }) {
  const toast = useToast();
  const [folder, setFolder] = useState("galeri");
  const [items, setItems] = useState<MediaItem[] | null>(null);
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<MediaItem | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setError("");
    setItems(null);
    try {
      const data = await apiGet<{ items: MediaItem[] }>(
        `/api/admin/media?target=assets&folder=${encodeURIComponent(folder)}`
      );
      setItems(data.items);
    } catch (failure) {
      setError(readError(failure));
    }
  }, [folder]);

  useEffect(() => {
    void load();
  }, [load]);

  async function upload(files: FileList) {
    setUploading(true);
    let added = 0;
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
        form.append("target", "assets");
        await apiUpload("/api/admin/media", form);
        added += 1;
      }
      if (added) {
        toast.success(`${added} gambar diunggah. Situs akan memuatnya dalam 1 sampai 2 menit.`);
        await load();
      }
    } catch (failure) {
      toast.error(readError(failure));
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function confirmDelete() {
    if (!pendingDelete) return;
    setDeleting(true);
    try {
      const result = await apiSend<{ message: string }>(
        `/api/admin/media?target=assets&path=${encodeURIComponent(pendingDelete.path)}`,
        "DELETE"
      );
      toast.success(result.message);
      setPendingDelete(null);
      await load();
    } catch (failure) {
      toast.error(readError(failure));
    } finally {
      setDeleting(false);
    }
  }

  async function copyUrl(item: MediaItem) {
    try {
      await navigator.clipboard.writeText(item.url);
      setCopied(item.path);
      toast.success("URL disalin ke papan klip.");
      window.setTimeout(() => setCopied(null), 2000);
    } catch {
      toast.error("Gagal menyalin. Salin manual dari kolom path.");
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Pustaka Gambar"
        description="Semua gambar situs tersimpan di repositori aset dan disajikan lewat CDN. Unggahan baru selalu memakai nama berkas baru agar perubahan langsung terlihat."
      />

      <div className="grid gap-5 rounded-[12px] border border-adm-border bg-adm-surface p-5 sm:grid-cols-[240px_minmax(0,1fr)] sm:items-end">
        <Field label="Folder" htmlFor="media-folder" help="Pilih bagian situs yang memakai gambar ini.">
          <select
            id="media-folder"
            value={folder}
            onChange={(event) => setFolder(event.target.value)}
            className="adm-ring adm-transition h-10 w-full rounded-[8px] border border-adm-border bg-adm-surface px-3 text-sm text-adm-ink focus:border-adm-primary"
          >
            {folders.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
            <option value="berita">berita (berkas situs)</option>
          </select>
        </Field>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="primary"
            icon={
              uploading ? (
                <Loader2 aria-hidden className="h-4 w-4 animate-spin" />
              ) : (
                <Upload aria-hidden className="h-4 w-4" />
              )
            }
            disabled={uploading}
            onClick={() => inputRef.current?.click()}
          >
            {uploading ? "Mengunggah..." : "Unggah gambar"}
          </Button>
          <p className="text-xs text-adm-subtle">
            Gambar besar dikompresi otomatis di peramban (lebar maksimum 1920 px).
          </p>
        </div>

        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          multiple
          className="hidden"
          onChange={(event) => {
            if (event.target.files?.length) void upload(event.target.files);
          }}
        />
      </div>

      {folder === "berita" ? (
        <div className="rounded-[12px] border border-[#fde68a] bg-adm-warning-soft px-4 py-3 text-[13px] leading-relaxed text-adm-warning">
          Folder <code>berita</code> berada di repositori konten (bukan CDN) karena dipakai
          crawler otomatis. Gambar di sini biasanya hanya untuk berita, dan pemilihannya
          dilakukan dari formulir berita, bukan dari halaman ini.
        </div>
      ) : null}

      {error ? <ErrorNotice message={error} onRetry={load} /> : null}
      {items === null && !error ? <LoadingRows rows={3} /> : null}

      {items && items.length === 0 ? (
        <div className="rounded-[12px] border border-dashed border-adm-border-strong bg-adm-surface px-6 py-12 text-center">
          <p className="text-sm font-medium text-adm-ink">Belum ada gambar di folder ini</p>
          <p className="mx-auto mt-1 max-w-md text-[13px] leading-relaxed text-adm-subtle">
            Klik Unggah gambar untuk menambahkan berkas pertama ke folder {folder}.
          </p>
          <div className="mt-4 flex justify-center">
            <Button variant="primary" onClick={() => inputRef.current?.click()}>
              Unggah gambar
            </Button>
          </div>
        </div>
      ) : null}

      {items && items.length > 0 ? (
        <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {items.map((item) => (
            <li
              key={item.path}
              className="overflow-hidden rounded-[12px] border border-adm-border bg-adm-surface"
            >
              <img
                src={previewUrl(item.path, "assets")}
                alt={item.name}
                loading="lazy"
                className="aspect-square w-full bg-adm-muted object-cover"
              />
              <div className="space-y-2 p-3">
                <p className="truncate text-[13px] font-medium text-adm-ink" title={item.name}>
                  {item.name}
                </p>
                <p className="text-xs text-adm-subtle">{formatBytes(item.size)}</p>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => copyUrl(item)}
                    aria-label={`Salin URL ${item.name}`}
                    className="adm-ring adm-transition inline-flex h-8 flex-1 items-center justify-center gap-1.5 rounded-[8px] border border-adm-border-strong text-xs font-medium text-adm-ink hover:bg-adm-muted"
                  >
                    {copied === item.path ? (
                      <>
                        <Check aria-hidden className="h-3.5 w-3.5" />
                        Tersalin
                      </>
                    ) : (
                      <>
                        <Copy aria-hidden className="h-3.5 w-3.5" />
                        Salin URL
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => setPendingDelete(item)}
                    aria-label={`Hapus ${item.name}`}
                    className="adm-ring adm-transition inline-flex h-8 w-8 items-center justify-center rounded-[8px] text-adm-subtle hover:bg-adm-danger-soft hover:text-adm-danger"
                  >
                    <Trash2 aria-hidden className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      ) : null}

      <Dialog
        open={Boolean(pendingDelete)}
        title={`Hapus "${pendingDelete?.name ?? ""}"?`}
        description={
          <>
            Gambar akan dihapus dari repositori aset. Bila gambar ini masih dipakai di sebuah
            halaman, tampilan gambar di halaman tersebut akan kosong. Periksa dulu dengan
            menyalin URL dan mencarinya di konten.
          </>
        }
        confirmLabel="Hapus"
        destructive
        loading={deleting}
        onConfirm={confirmDelete}
        onClose={() => setPendingDelete(null)}
      />
    </div>
  );
}
