"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Pencil, Plus, Search, Trash2, X } from "lucide-react";
import { PageHeader, Card } from "./Card";
import EmptyState, { LoadingRows, ErrorNotice } from "./EmptyState";
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

export default function CollectionList({ collection }: { collection: CollectionInfo }) {
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

  const total = records?.length ?? 0;

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Konten"
        title={collection.label}
        description={collection.description}
        actions={
          collection.canCreate ? (
            <Link
              href={`/admin/${collection.id}/baru`}
              className="adm-ring adm-transition inline-flex h-9 items-center gap-1.5 rounded-[var(--radius-adm-sm)] bg-adm-primary px-3.5 text-[13.5px] font-medium text-white shadow-adm-xs hover:bg-adm-primary-hover"
            >
              <Plus aria-hidden className="h-3.5 w-3.5" />
              Tambah {collection.labelSingular}
            </Link>
          ) : null
        }
      />

      {/* Bilah alat: pencarian + jumlah */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-xs">
          <Search
            aria-hidden
            className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-adm-subtle"
          />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={`Cari ${collection.label.toLowerCase()}…`}
            aria-label={`Cari ${collection.label}`}
            className="adm-ring adm-transition h-9 w-full rounded-[var(--radius-adm-sm)] border border-adm-border bg-adm-surface pl-8 pr-8 text-[13px] text-adm-ink placeholder:text-adm-subtle/80 focus:border-adm-primary"
          />
          {query ? (
            <button
              type="button"
              onClick={() => setQuery("")}
              aria-label="Kosongkan pencarian"
              className="adm-ring adm-transition absolute right-1.5 top-1/2 -translate-y-1/2 rounded p-1 text-adm-subtle hover:bg-adm-muted hover:text-adm-ink"
            >
              <X aria-hidden className="h-3 w-3" />
            </button>
          ) : null}
        </div>

        {records ? (
          <p className="text-[12px] text-adm-subtle">
            {query ? (
              <>
                <span className="font-medium text-adm-ink">{filtered?.length ?? 0}</span> dari{" "}
                {total} entri
              </>
            ) : (
              <>
                <span className="font-medium text-adm-ink">{total}</span> entri
              </>
            )}
          </p>
        ) : null}
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
          title="Tidak ada hasil"
          description={`Tidak ada ${collection.label.toLowerCase()} yang cocok dengan "${query}". Ubah kata kunci atau kosongkan pencarian.`}
          action={{ label: "Kosongkan pencarian", onClick: () => setQuery("") }}
        />
      ) : null}

      {filtered && filtered.length > 0 ? (
        <>
          {/* Tabel: layar sedang ke atas */}
          <Card padded={false} className="hidden overflow-hidden md:block">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-adm-border bg-adm-surface-2">
                  <th scope="col" className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[0.06em] text-adm-subtle">
                    Judul
                  </th>
                  <th scope="col" className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[0.06em] text-adm-subtle">
                    Slug
                  </th>
                  {collection.hasDate ? (
                    <th scope="col" className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[0.06em] text-adm-subtle">
                      Tanggal
                    </th>
                  ) : null}
                  <th scope="col" className="w-[88px] px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-[0.06em] text-adm-subtle">
                    <span className="sr-only">Tindakan</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-adm-divider">
                {filtered.map((record) => (
                  <tr key={record.slug} className="adm-transition group hover:bg-adm-surface-2">
                    <td className="max-w-0 px-4 py-3">
                      <Link
                        href={`/admin/${collection.id}/${record.slug}`}
                        className="adm-ring block truncate rounded text-[13px] font-medium text-adm-ink group-hover:text-adm-primary"
                      >
                        {record.title}
                      </Link>
                      {record.subtitle ? (
                        <p className="mt-0.5 truncate text-[11.5px] text-adm-subtle">{record.subtitle}</p>
                      ) : null}
                    </td>
                    <td className="px-4 py-3">
                      <code className="rounded bg-adm-muted px-1.5 py-0.5 font-mono text-[11px] text-adm-text">
                        {record.slug}
                      </code>
                    </td>
                    {collection.hasDate ? (
                      <td className="whitespace-nowrap px-4 py-3 text-[12.5px] text-adm-text">
                        {record.date ? formatDate(record.date) : <span className="text-adm-subtle">—</span>}
                      </td>
                    ) : null}
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1 opacity-70 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
                        <Link
                          href={`/admin/${collection.id}/${record.slug}`}
                          aria-label={`Ubah ${record.title}`}
                          title="Ubah"
                          className="adm-ring adm-transition inline-flex h-9 w-9 items-center justify-center rounded-[var(--radius-adm-sm)] text-adm-subtle hover:bg-adm-primary-soft hover:text-adm-primary"
                        >
                          <Pencil aria-hidden className="h-4 w-4" />
                        </Link>
                        <button
                          type="button"
                          onClick={() => setPendingDelete(record)}
                          aria-label={`Hapus ${record.title}`}
                          title="Hapus"
                          className="adm-ring adm-transition inline-flex h-9 w-9 items-center justify-center rounded-[var(--radius-adm-sm)] text-adm-subtle hover:bg-adm-danger-soft hover:text-adm-danger"
                        >
                          <Trash2 aria-hidden className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>

          {/* Kartu: ponsel */}
          <ul className="space-y-2.5 md:hidden">
            {filtered.map((record) => (
              <li key={record.slug} className="rounded-[var(--radius-adm-lg)] border border-adm-border bg-adm-surface">
                <Link
                  href={`/admin/${collection.id}/${record.slug}`}
                  className="adm-ring block rounded-t-[var(--radius-adm-lg)] px-4 pb-3 pt-4"
                >
                  <p className="text-[13.5px] font-medium text-adm-ink">{record.title}</p>
                  {record.subtitle ? (
                    <p className="mt-0.5 line-clamp-2 text-[12px] text-adm-subtle">{record.subtitle}</p>
                  ) : null}
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <code className="rounded bg-adm-muted px-1.5 py-0.5 font-mono text-[10.5px] text-adm-text">
                      {record.slug}
                    </code>
                    {collection.hasDate && record.date ? (
                      <span className="text-[11px] text-adm-subtle">{formatDate(record.date)}</span>
                    ) : null}
                  </div>
                </Link>
                <div className="flex gap-2 border-t border-adm-divider px-3 py-2.5">
                  <Link
                    href={`/admin/${collection.id}/${record.slug}`}
                    className="adm-ring adm-transition inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-[var(--radius-adm-sm)] border border-adm-border-strong text-[12.5px] font-medium text-adm-ink hover:bg-adm-muted"
                  >
                    <Pencil aria-hidden className="h-3 w-3" />
                    Ubah
                  </Link>
                  <Button
                    variant="ghost"
                    size="small"
                    className="h-9 flex-1 border border-adm-border-strong text-adm-danger hover:bg-adm-danger-soft hover:border-[#f0c9c9]"
                    icon={<Trash2 aria-hidden className="h-3 w-3" />}
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
        title={`Hapus "${pendingDelete?.title ?? ""}"?`}
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

function formatDate(value: string): string {
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", year: "numeric" }).format(date);
}

export function readError(failure: unknown): string {
  if (typeof failure === "object" && failure !== null && "error" in failure) {
    return String((failure as { error: unknown }).error);
  }
  return "Terjadi kesalahan. Coba lagi.";
}
