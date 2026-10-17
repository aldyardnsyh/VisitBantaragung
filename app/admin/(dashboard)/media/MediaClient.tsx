"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Copy,
  HardDrive,
  ImagePlus,
  Loader2,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { PageHeader, Card, CardHeader } from "../../_components/Card";
import { LoadingRows, ErrorNotice, InfoNotice } from "../../_components/EmptyState";
import Button from "../../_components/Button";
import Dialog from "../../_components/Dialog";
import { useToast } from "../../_components/Toast";
import { apiGet, apiSend, apiUpload } from "../../_lib/api";
import { compressImage, formatBytes, previewUrl, readError, MediaItem } from "../../_components/MediaPicker";

interface UsageLocation {
  collection: string;
  collectionLabel: string;
  slug: string;
  title: string;
  field: string;
  href: string;
}

interface FolderSummary {
  folder: string;
  files: number;
  bytes: number;
  unusedFiles: number;
  unusedBytes: number;
}

interface MediaReport {
  totalFiles: number;
  totalBytes: number;
  usedFiles: number;
  usedBytes: number;
  unusedFiles: number;
  unusedBytes: number;
  folders: FolderSummary[];
  analyzedAt: string;
  where: string;
}

export default function MediaClient({ folders }: { folders: string[] }) {
  const toast = useToast();
  const [folder, setFolder] = useState("galeri");
  const [items, setItems] = useState<MediaItem[] | null>(null);
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<MediaItem | null>(null);
  const [deleteUsage, setDeleteUsage] = useState<UsageLocation[] | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [report, setReport] = useState<MediaReport | null>(null);
  const [usage, setUsage] = useState<Record<string, UsageLocation[]>>({});
  const inputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setError("");
    setItems(null);
    try {
      const [data, reportData, usageData] = await Promise.all([
        apiGet<{ items: MediaItem[] }>(`/api/admin/media?target=assets&folder=${encodeURIComponent(folder)}`),
        apiGet<{ report: MediaReport }>("/api/admin/media/report").catch(() => null),
        apiGet<{ usage: Record<string, UsageLocation[]> }>("/api/admin/media/usage").catch(() => null),
      ]);
      setItems(data.items);
      if (reportData) setReport(reportData.report);
      if (usageData) setUsage(usageData.usage);
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
        toast.loading(
          daftar.length > 1 ? `Mengunggah ${i + 1} dari ${daftar.length}: ${file.name}` : `Mengunggah ${file.name}...`,
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

  /** Sebelum menghapus, cek dulu dipakai di mana saja. */
  async function askDelete(item: MediaItem) {
    setPendingDelete(item);
    setDeleteUsage(null);
    try {
      const data = await apiGet<{ usedBy: UsageLocation[] }>(
        `/api/admin/media/report?path=${encodeURIComponent(item.path)}`
      );
      setDeleteUsage(data.usedBy);
    } catch {
      setDeleteUsage([]);
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
      setDeleteUsage(null);
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

  // Ringkas pemakaian per item agar bisa ditandai di kartu.
  const usageByPath = useMemo(() => {
    const map = new Map<string, UsageLocation[]>();
    for (const item of items ?? []) {
      const key = item.path.replace(/^\/+/, "").split("?")[0];
      map.set(item.path, usage[key] ?? []);
    }
    return map;
  }, [items, usage]);

  const unusedInFolder = (items ?? []).filter((item) => (usageByPath.get(item.path) ?? []).length === 0).length;

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Sistem"
        title="Pustaka Gambar"
        description="Kelola gambar situs. Setiap gambar ditandai apakah sedang dipakai di sebuah halaman atau tidak."
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

      {/* Ringkasan penyimpanan */}
      {report ? (
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-[var(--radius-adm-lg)] border border-adm-border bg-adm-surface p-4">
            <div className="flex items-center gap-2 text-adm-subtle">
              <HardDrive aria-hidden className="h-3.5 w-3.5" />
              <p className="text-[11px] font-semibold uppercase tracking-[0.07em]">Total gambar</p>
            </div>
            <p className="mt-2 font-display text-[22px] font-semibold leading-none text-adm-ink">
              {report.totalFiles}
              <span className="ml-1.5 text-[12px] font-normal text-adm-subtle">berkas</span>
            </p>
            <p className="mt-1 text-[11.5px] text-adm-subtle">{formatBytes(report.totalBytes)}</p>
          </div>

          <div className="rounded-[var(--radius-adm-lg)] border border-adm-border bg-adm-surface p-4">
            <div className="flex items-center gap-2 text-adm-subtle">
              <AlertTriangle aria-hidden className="h-3.5 w-3.5" />
              <p className="text-[11px] font-semibold uppercase tracking-[0.07em]">Tidak dipakai</p>
            </div>
            <p className="mt-2 font-display text-[22px] font-semibold leading-none text-adm-ink">
              {report.unusedFiles}
              <span className="ml-1.5 text-[12px] font-normal text-adm-subtle">berkas</span>
            </p>
            <p className="mt-1 text-[11.5px] text-adm-subtle">
              {formatBytes(report.unusedBytes)} bisa dibersihkan
            </p>
          </div>

          <div className="rounded-[var(--radius-adm-lg)] border border-adm-border bg-adm-surface p-4">
            <div className="flex items-center gap-2 text-adm-subtle">
              <CheckCircle2 aria-hidden className="h-3.5 w-3.5" />
              <p className="text-[11px] font-semibold uppercase tracking-[0.07em]">Penyimpanan</p>
            </div>
            <p className="mt-2 text-[12px] leading-relaxed text-adm-text">{report.where}</p>
          </div>
        </div>
      ) : null}

      {/* Rincian per folder */}
      {report && report.folders.length > 0 ? (
        <Card padded={false}>
          <div className="border-b border-adm-divider px-4 py-3">
            <CardHeader title="Rincian per folder" description="Folder dengan berkas tak terpakai paling besar tampil lebih dulu." />
          </div>
          <div className="divide-y divide-adm-divider">
            {report.folders.map((f) => (
              <button
                key={f.folder}
                type="button"
                onClick={() => setFolder(f.folder)}
                className={`adm-transition flex w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-adm-surface-2 active:bg-adm-pressed ${
                  folder === f.folder ? "bg-adm-surface-2" : ""
                }`}
              >
                <code className="w-24 shrink-0 truncate font-mono text-[11.5px] text-adm-ink">{f.folder}</code>
                <span className="w-16 shrink-0 text-[11.5px] text-adm-subtle">{f.files} berkas</span>
                <span className="w-20 shrink-0 text-[11.5px] text-adm-subtle">{formatBytes(f.bytes)}</span>
                <span className="ml-auto shrink-0">
                  {f.unusedFiles > 0 ? (
                    <span className="rounded-[var(--radius-adm-xs)] bg-adm-warning-soft px-1.5 py-0.5 text-[10.5px] font-medium text-adm-warning">
                      {f.unusedFiles} tak terpakai · {formatBytes(f.unusedBytes)}
                    </span>
                  ) : (
                    <span className="rounded-[var(--radius-adm-xs)] bg-adm-success-soft px-1.5 py-0.5 text-[10.5px] font-medium text-adm-success-ink">
                      semua terpakai
                    </span>
                  )}
                </span>
              </button>
            ))}
          </div>
        </Card>
      ) : null}

      {/* Pemilih folder + area unggah */}
      <div className="grid gap-4 lg:grid-cols-[280px_minmax(0,1fr)]">
        <Card>
          <CardHeader title="Folder" description="Pilih bagian situs yang memakai gambar ini." />
          <div className="adm-scroll mt-3 flex max-h-[220px] flex-wrap gap-1.5 overflow-y-auto pr-1">
            {folders.map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setFolder(value)}
                className={`adm-ring adm-transition rounded-full border px-2.5 py-1 font-mono text-[11.5px] ${
                  folder === value
                    ? "border-adm-primary bg-adm-primary-soft text-adm-primary-ink"
                    : "border-adm-border text-adm-text hover:border-adm-border-strong hover:bg-adm-muted active:bg-adm-pressed"
                }`}
              >
                {value}
              </button>
            ))}
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
            dragging ? "border-adm-primary bg-adm-primary-soft" : "border-adm-border-strong bg-adm-surface-2"
          }`}
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-adm-surface text-adm-subtle shadow-adm-xs">
            <ImagePlus aria-hidden className="h-[18px] w-[18px]" />
          </span>
          <p className="text-[13px] font-medium text-adm-ink">Seret berkas ke sini, atau unggah</p>
          <p className="text-[11.5px] text-adm-subtle">JPG, PNG, atau WebP. Maksimal 4 MB per berkas.</p>
          <Button size="small" className="mt-1" disabled={uploading} onClick={() => inputRef.current?.click()} icon={<Upload aria-hidden className="h-3 w-3" />}>
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

      {error ? <ErrorNotice message={error} onRetry={load} /> : null}
      {items === null && !error ? <LoadingRows rows={2} /> : null}

      {items && items.length === 0 ? (
        <div className="rounded-[var(--radius-adm-lg)] border border-dashed border-adm-border-strong bg-adm-surface-2 px-6 py-14 text-center">
          <p className="text-[13.5px] font-medium text-adm-ink">Belum ada gambar di folder ini</p>
          <p className="mx-auto mt-1 max-w-sm text-[12.5px] leading-relaxed text-adm-subtle">
            Seret berkas ke area unggah di atas, atau klik Unggah gambar.
          </p>
        </div>
      ) : null}

      {items && items.length > 0 ? (
        <div>
          <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
            <p className="text-[12px] text-adm-subtle">
              <span className="font-medium text-adm-ink">{items.length}</span> gambar di{" "}
              <code className="font-mono">{folder}</code>
              {unusedInFolder > 0 ? (
                <>
                  {" · "}
                  <span className="text-adm-warning">{unusedInFolder} tak terpakai</span>
                </>
              ) : null}
            </p>
          </div>

          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {items.map((item) => {
              const used = usageByPath.get(item.path) ?? [];
              const isUnused = used.length === 0;
              return (
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
                    {/* Penanda pemakaian: ini yang menjawab "gambar ini dipakai di mana?" */}
                    <span className="absolute left-1.5 top-1.5">
                      {isUnused ? (
                        <span
                          className="inline-flex items-center gap-1 rounded-[var(--radius-adm-xs)] bg-adm-warning-soft/95 px-1.5 py-0.5 text-[10px] font-medium text-adm-warning shadow-adm-xs"
                          title="Tidak dipakai di halaman mana pun"
                        >
                          tak terpakai
                        </span>
                      ) : (
                        <span
                          className="inline-flex items-center gap-1 rounded-[var(--radius-adm-xs)] bg-adm-success-soft/95 px-1.5 py-0.5 text-[10px] font-medium text-adm-success-ink shadow-adm-xs"
                          title={used.map((u) => u.title).slice(0, 5).join(", ")}
                        >
                          dipakai {used.length}
                        </span>
                      )}
                    </span>
                    <div className="absolute inset-x-0 bottom-0 flex justify-end gap-1 bg-gradient-to-t from-black/45 to-transparent p-1.5 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
                      <button
                        type="button"
                        onClick={() => copyUrl(item)}
                        aria-label={`Salin URL ${item.name}`}
                        title="Salin URL"
                        className="adm-ring adm-transition inline-flex h-7 w-7 items-center justify-center rounded-[var(--radius-adm-xs)] bg-white/95 text-adm-ink hover:bg-white active:bg-adm-muted"
                      >
                        {copied === item.path ? (
                          <CheckCircle2 aria-hidden className="h-3.5 w-3.5 text-adm-success" />
                        ) : (
                          <Copy aria-hidden className="h-3.5 w-3.5" />
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => askDelete(item)}
                        aria-label={`Hapus ${item.name}`}
                        title="Hapus"
                        className="adm-ring adm-transition inline-flex h-7 w-7 items-center justify-center rounded-[var(--radius-adm-xs)] bg-white/95 text-adm-danger hover:bg-white active:bg-adm-danger-soft"
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
              );
            })}
          </ul>
        </div>
      ) : null}

      {/* Dialog hapus dengan peringatan pemakaian */}
      <Dialog
        open={Boolean(pendingDelete)}
        title={`Hapus "${pendingDelete?.name ?? ""}"?`}
        description={
          deleteUsage === null ? (
            "Memeriksa pemakaian gambar…"
          ) : deleteUsage.length === 0 ? (
            <>
              Gambar ini <strong className="text-adm-ink">tidak dipakai</strong> di halaman mana pun, jadi aman
              dihapus. Berkas akan dihapus dari repositori aset secara permanen.
            </>
          ) : (
            <div className="space-y-2">
              <p className="font-medium text-adm-danger">
                Gambar ini sedang dipakai di {deleteUsage.length} tempat. Menghapusnya akan membuat gambar
                kosong di halaman berikut:
              </p>
              <ul className="max-h-40 space-y-1 overflow-y-auto">
                {deleteUsage.map((u) => (
                  <li key={`${u.collection}-${u.slug}-${u.field}`} className="flex items-start gap-1.5">
                    <span aria-hidden className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-adm-danger" />
                    <span>
                      <span className="text-adm-ink">{u.title}</span>
                      <span className="text-adm-subtle"> · {u.collectionLabel} · {u.field}</span>
                    </span>
                  </li>
                ))}
              </ul>
              <p>Hapus gambar setelah menggantinya di halaman-halaman tersebut.</p>
            </div>
          )
        }
        confirmLabel={deleteUsage && deleteUsage.length > 0 ? "Tetap hapus" : "Hapus"}
        destructive
        loading={deleting}
        onConfirm={confirmDelete}
        onClose={() => {
          setPendingDelete(null);
          setDeleteUsage(null);
        }}
      />
    </div>
  );
}
