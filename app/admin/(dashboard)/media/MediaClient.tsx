"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Check, Copy, ImagePlus, Loader2, Trash2, Upload, X } from "lucide-react";
import { PageHeader, Card, CardHeader } from "../../_components/Card";
import { LoadingRows, ErrorNotice, InfoNotice } from "../../_components/EmptyState";
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
  const [dragging, setDragging] = useState(false);
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
    let skipped = 0;
    const daftar = Array.from(files);

    try {
      for (let i = 0; i < daftar.length; i += 1) {
        const file = daftar[i];
        // Satu toast dengan id tetap: isinya diperbarui tiap berkas sehingga
        // pengguna melihat kemajuan nyata, bukan spinner tanpa keterangan.
        toast.loading(
          daftar.length > 1
            ? `Mengunggah ${i + 1} dari ${daftar.length}: ${file.name}`
            : `Mengunggah ${file.name}...`,
          { id: "upload" }
        );

        const compressed = await compressImage(file);
        if (compressed.size > 3_500_000) {
          skipped += 1;
          continue;
        }
        const form = new FormData();
        form.append("file", compressed);
        form.append("folder", folder);
        form.append("target", "assets");
        await apiUpload("/api/admin/media", form);
        added += 1;
      }

      if (added > 0) {
        toast.success(
          skipped > 0
            ? `${added} gambar diunggah, ${skipped} dilewati karena terlalu besar.`
            : `${added} gambar diunggah. Situs akan memuatnya dalam 1 sampai 2 menit.`,
          { id: "upload" }
        );
        await load();
      } else {
        toast.warning(
          skipped > 0
            ? `${skipped} gambar dilewati karena terlalu besar setelah dikompresi.`
            : "Tidak ada berkas yang diunggah.",
          { id: "upload" }
        );
      }
    } catch (failure) {
      toast.error(readError(failure), { id: "upload" });
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
    <div className="space-y-5">
      <PageHeader
        eyebrow="Sistem"
        title="Pustaka Gambar"
        description="Semua gambar situs tersimpan di repositori aset dan disajikan lewat CDN."
        actions={
          <Button
            variant="primary"
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
        }
      />

      {/* Pemilih folder + area unggah */}
      <div className="grid gap-4 lg:grid-cols-[280px_minmax(0,1fr)]">
        <Card>
          <CardHeader title="Folder" description="Pilih bagian situs yang memakai gambar ini." />
          <div className="adm-scroll mt-3 flex max-h-[260px] flex-wrap gap-1.5 overflow-y-auto pr-1">
            {folders.map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setFolder(value)}
                className={`adm-ring adm-transition rounded-full border px-2.5 py-1 font-mono text-[11.5px] ${
                  folder === value
                    ? "border-adm-primary bg-adm-primary-soft text-adm-primary-ink"
                    : "border-adm-border text-adm-text hover:border-adm-border-strong hover:bg-adm-muted"
                }`}
              >
                {value}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setFolder("berita")}
              className={`adm-ring adm-transition rounded-full border px-2.5 py-1 font-mono text-[11.5px] ${
                folder === "berita"
                  ? "border-adm-primary bg-adm-primary-soft text-adm-primary-ink"
                  : "border-adm-border text-adm-text hover:border-adm-border-strong hover:bg-adm-muted"
              }`}
            >
              berita
            </button>
          </div>
          <div className="mt-4 border-t border-adm-divider pt-3">
            <p className="text-[11.5px] leading-relaxed text-adm-subtle">
              Gambar besar dikompresi otomatis di peramban (lebar maks. 1920 px, WebP).
            </p>
          </div>
        </Card>

        <div
          onDragOver={(event) => {
            event.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(event) => {
            event.preventDefault();
            setDragging(false);
            if (event.dataTransfer.files?.length) void upload(event.dataTransfer.files);
          }}
          className={`adm-transition flex min-h-[150px] flex-col items-center justify-center gap-1.5 rounded-[var(--radius-adm-lg)] border border-dashed px-6 py-5 text-center ${
            dragging
              ? "border-adm-primary bg-adm-primary-soft"
              : "border-adm-border-strong bg-adm-surface-2"
          }`}
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-adm-surface text-adm-subtle shadow-adm-xs">
            <ImagePlus aria-hidden className="h-[18px] w-[18px]" />
          </span>
          <p className="text-[13px] font-medium text-adm-ink">
            Seret berkas ke sini, atau pilih folder lalu unggah
          </p>
          <p className="text-[11.5px] text-adm-subtle">JPG, PNG, atau WebP. Maksimal 4 MB per berkas.</p>
          <Button
            size="small"
            className="mt-1"
            disabled={uploading}
            onClick={() => inputRef.current?.click()}
            icon={<Upload aria-hidden className="h-3 w-3" />}
          >
            Pilih berkas
          </Button>
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
        <InfoNotice tone="warning">
          Folder <code className="font-mono">berita</code> berada di repositori konten (bukan CDN)
          karena dipakai crawler otomatis. Gambar di sini biasanya dipilih dari formulir berita.
        </InfoNotice>
      ) : null}

      {error ? <ErrorNotice message={error} onRetry={load} /> : null}
      {items === null && !error ? <LoadingRows rows={2} /> : null}

      {items && items.length === 0 ? (
        <div className="rounded-[var(--radius-adm-lg)] border border-dashed border-adm-border-strong bg-adm-surface-2 px-6 py-14 text-center">
          <p className="text-[13.5px] font-medium text-adm-ink">Belum ada gambar di folder ini</p>
          <p className="mx-auto mt-1 max-w-sm text-[12.5px] leading-relaxed text-adm-subtle">
            Seret berkas ke area unggah di atas, atau klik Unggah gambar.
          </p>
          <div className="mt-3 flex justify-center">
            <Button variant="primary" size="small" onClick={() => inputRef.current?.click()}>
              Unggah gambar
            </Button>
          </div>
        </div>
      ) : null}

      {items && items.length > 0 ? (
        <div>
          <p className="mb-2.5 text-[12px] text-adm-subtle">
            <span className="font-medium text-adm-ink">{items.length}</span> gambar di folder{" "}
            <code className="font-mono">{folder}</code>
          </p>
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {items.map((item) => (
              <li
                key={item.path}
                className="group overflow-hidden rounded-[var(--radius-adm-lg)] border border-adm-border bg-adm-surface transition-shadow hover:shadow-adm-sm"
              >
                <div className="relative">
                  <img
                    src={previewUrl(item.path, "assets")}
                    alt={item.name}
                    loading="lazy"
                    className="aspect-square w-full bg-adm-muted object-cover"
                  />
                  <div className="absolute inset-x-0 bottom-0 flex justify-end gap-1 bg-gradient-to-t from-black/45 to-transparent p-1.5 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
                    <button
                      type="button"
                      onClick={() => copyUrl(item)}
                      aria-label={`Salin URL ${item.name}`}
                      title="Salin URL"
                      className="adm-ring adm-transition inline-flex h-7 w-7 items-center justify-center rounded-[var(--radius-adm-xs)] bg-white/95 text-adm-ink hover:bg-white"
                    >
                      {copied === item.path ? (
                        <Check aria-hidden className="h-3.5 w-3.5 text-adm-success" />
                      ) : (
                        <Copy aria-hidden className="h-3.5 w-3.5" />
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => setPendingDelete(item)}
                      aria-label={`Hapus ${item.name}`}
                      title="Hapus"
                      className="adm-ring adm-transition inline-flex h-7 w-7 items-center justify-center rounded-[var(--radius-adm-xs)] bg-white/95 text-adm-danger hover:bg-white"
                    >
                      <Trash2 aria-hidden className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
                <div className="px-2.5 py-2">
                  <p className="truncate text-[11.5px] font-medium text-adm-ink" title={item.name}>
                    {item.name}
                  </p>
                  <p className="mt-0.5 text-[10.5px] text-adm-subtle">{formatBytes(item.size)}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <Dialog
        open={Boolean(pendingDelete)}
        title={`Hapus "${pendingDelete?.name ?? ""}"?`}
        description={
          <>
            Gambar akan dihapus dari repositori aset. Bila gambar masih dipakai di sebuah halaman,
            tampilan gambar tersebut akan kosong. Periksa dulu dengan menyalin URL dan mencarinya di
            konten.
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
