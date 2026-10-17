"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Pencil, Plus, Search, Trash2 } from "lucide-react";
import EmptyState, {
  PageHeader,
  LoadingRows,
  ErrorNotice,
} from "./EmptyState";
import Button from "./Button";
import Dialog from "./Dialog";
import { useToast } from "./Toast";
import { apiGet, apiSend } from "../_lib/api";

export interface RecordSummary {
  slug: string;
  title: string;
  subtitle: string;
  date?: string;
  image?: string;
  sha: string;
  updatedAt?: string;
}

interface CollectionInfo {
  id: string;
  label: string;
  labelSingular: string;
  description: string;
  hasDate: boolean;
  canCreate: boolean;
}

export default function CollectionList({
  collection,
}: {
  collection: CollectionInfo;
}) {
  const toast = useToast();
  const [records, setRecords] = useState<RecordSummary[] | null>(null);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [pendingDelete, setPendingDelete] = useState<RecordSummary | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function load() {
    setError("");
    setRecords(null);
    try {
      const data = await apiGet<{ records: RecordSummary[] }>(
        `/api/admin/content?collection=${collection.id}`
      );
      setRecords(data.records);
    } catch (failure) {
      setError(readError(failure));
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [collection.id]);

  const filtered = useMemo(() => {
    if (!records) return null;
    const needle = query.trim().toLowerCase();
    if (!needle) return records;
    return records.filter(
      (record) =>
        record.title.toLowerCase().includes(needle) ||
        record.slug.toLowerCase().includes(needle) ||
        record.subtitle.toLowerCase().includes(needle)
    );
  }, [records, query]);

  async function confirmDelete() {
    if (!pendingDelete) return;
    setDeleting(true);
    try {
      const result = await apiSend<{ message: string }>(
        `/api/admin/content?collection=${collection.id}&slug=${encodeURIComponent(pendingDelete.slug)}`,
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

  return (
    <div className="space-y-6">
      <PageHeader
        title={collection.label}
        description={collection.description}
        actions={
          collection.canCreate ? (
            <Link
              href={`/admin/${collection.id}/baru`}
              className="adm-ring adm-transition inline-flex h-10 items-center gap-2 rounded-[8px] bg-adm-primary px-4 text-sm font-medium text-white hover:bg-adm-primary-hover"
            >
              <Plus aria-hidden className="h-4 w-4" />
              Tambah {collection.labelSingular}
            </Link>
          ) : null
        }
      />

      <div className="relative max-w-sm">
        <Search
          aria-hidden
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-adm-subtle"
        />
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={`Cari ${collection.label.toLowerCase()}...`}
          aria-label={`Cari ${collection.label}`}
          className="adm-ring adm-transition h-10 w-full rounded-[8px] border border-adm-border bg-adm-surface pl-9 pr-3 text-sm text-adm-ink placeholder:text-adm-subtle focus:border-adm-primary"
        />
      </div>

      {error ? <ErrorNotice message={error} onRetry={load} /> : null}

      {records === null && !error ? <LoadingRows rows={5} /> : null}

      {filtered && filtered.length === 0 && records && records.length === 0 ? (
        <EmptyState
          title={`Belum ada ${collection.label.toLowerCase()}`}
          description={
            collection.canCreate
              ? `Tambahkan ${collection.labelSingular.toLowerCase()} pertama agar tampil di situs publik.`
              : "Konten akan muncul di sini setelah sinkronisasi berita berjalan."
          }
          action={
            collection.canCreate
              ? { label: `Tambah ${collection.labelSingular}`, href: `/admin/${collection.id}/baru` }
              : undefined
          }
        />
      ) : null}

      {filtered && filtered.length === 0 && records && records.length > 0 ? (
        <EmptyState
          title="Tidak ada hasil untuk pencarian ini"
          description="Ubah kata kunci atau kosongkan kolom pencarian untuk melihat semua isi."
          action={{ label: "Kosongkan pencarian", onClick: () => setQuery("") }}
        />
      ) : null}

      {filtered && filtered.length > 0 ? (
        <>
          {/* Tabel untuk layar lebar */}
          <div className="hidden overflow-hidden rounded-[12px] border border-adm-border bg-adm-surface md:block">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-adm-border bg-adm-muted text-xs font-semibold uppercase tracking-wide text-adm-subtle">
                  <th scope="col" className="px-4 py-3">
                    Judul
                  </th>
                  <th scope="col" className="px-4 py-3">
                    Slug
                  </th>
                  {collection.hasDate ? (
                    <th scope="col" className="px-4 py-3">
                      Tanggal
                    </th>
                  ) : null}
                  <th scope="col" className="px-4 py-3 text-right">
                    Tindakan
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((record) => (
                  <tr
                    key={record.slug}
                    className="adm-transition border-b border-adm-divider last:border-0 hover:bg-adm-muted"
                  >
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/${collection.id}/${record.slug}`}
                        className="adm-ring adm-transition rounded font-medium text-adm-ink hover:text-adm-primary"
                      >
                        {record.title}
                      </Link>
                      {record.subtitle ? (
                        <p className="mt-0.5 line-clamp-1 max-w-xl text-xs text-adm-subtle">
                          {record.subtitle}
                        </p>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-adm-subtle">{record.slug}</td>
                    {collection.hasDate ? (
                      <td className="px-4 py-3 text-adm-text">{record.date ?? "-"}</td>
                    ) : null}
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <Link
                          href={`/admin/${collection.id}/${record.slug}`}
                          aria-label={`Ubah ${record.title}`}
                          className="adm-ring adm-transition inline-flex h-9 w-9 items-center justify-center rounded-[8px] text-adm-subtle hover:bg-adm-divider hover:text-adm-ink"
                        >
                          <Pencil aria-hidden className="h-4 w-4" />
                        </Link>
                        <button
                          type="button"
                          onClick={() => setPendingDelete(record)}
                          aria-label={`Hapus ${record.title}`}
                          className="adm-ring adm-transition inline-flex h-9 w-9 items-center justify-center rounded-[8px] text-adm-subtle hover:bg-adm-danger-soft hover:text-adm-danger"
                        >
                          <Trash2 aria-hidden className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Daftar kartu untuk layar kecil */}
          <ul className="space-y-3 md:hidden">
            {filtered.map((record) => (
              <li
                key={record.slug}
                className="rounded-[12px] border border-adm-border bg-adm-surface p-4"
              >
                <Link
                  href={`/admin/${collection.id}/${record.slug}`}
                  className="adm-ring adm-transition rounded text-sm font-medium text-adm-ink"
                >
                  {record.title}
                </Link>
                {record.subtitle ? (
                  <p className="mt-1 line-clamp-2 text-xs text-adm-subtle">{record.subtitle}</p>
                ) : null}
                <dl className="mt-3 space-y-1 text-xs">
                  <div className="flex justify-between gap-3">
                    <dt className="text-adm-subtle">Slug</dt>
                    <dd className="font-mono text-adm-text">{record.slug}</dd>
                  </div>
                  {collection.hasDate ? (
                    <div className="flex justify-between gap-3">
                      <dt className="text-adm-subtle">Tanggal</dt>
                      <dd className="text-adm-text">{record.date ?? "-"}</dd>
                    </div>
                  ) : null}
                </dl>
                <div className="mt-4 flex gap-2">
                  <Link
                    href={`/admin/${collection.id}/${record.slug}`}
                    className="adm-ring adm-transition inline-flex h-9 flex-1 items-center justify-center rounded-[8px] border border-adm-border-strong text-[13px] font-medium text-adm-ink hover:bg-adm-muted"
                  >
                    Ubah
                  </Link>
                  <Button
                    variant="secondary"
                    size="small"
                    className="h-9 flex-1"
                    onClick={() => setPendingDelete(record)}
                  >
                    Hapus
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </>
      ) : null}

      <Dialog
        open={Boolean(pendingDelete)}
        title={`Hapus ${collection.labelSingular.toLowerCase()} "${pendingDelete?.title ?? ""}"?`}
        description="Konten ini akan dihapus dari situs. Tindakan ini tidak dapat dibatalkan, tetapi masih bisa dipulihkan lewat riwayat GitHub."
        confirmLabel="Hapus"
        destructive
        loading={deleting}
        onConfirm={confirmDelete}
        onClose={() => setPendingDelete(null)}
      />
    </div>
  );
}

export function readError(failure: unknown): string {
  if (typeof failure === "object" && failure !== null && "error" in failure) {
    return String((failure as { error: unknown }).error);
  }
  return "Terjadi kesalahan. Coba lagi.";
}
