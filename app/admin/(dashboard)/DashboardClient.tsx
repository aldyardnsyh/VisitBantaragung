"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowUpRight, RefreshCw } from "lucide-react";
import { PageHeader } from "../_components/EmptyState";
import Badge from "../_components/Badge";
import Button from "../_components/Button";
import { useToast } from "../_components/Toast";
import { apiSend } from "../_lib/api";

interface Count {
  id: string;
  label: string;
  count: number;
}

interface RunInfo {
  status: string;
  conclusion: string | null;
  createdAt: string;
  htmlUrl: string;
  event: string;
}

interface CommitInfo {
  sha: string;
  message: string;
  authorName: string;
  date: string;
  htmlUrl: string;
}

export default function DashboardClient({
  counts,
  lastRun,
  commits,
}: {
  counts: Count[];
  lastRun: RunInfo | null;
  commits: CommitInfo[];
  assetBaseUrl: string;
}) {
  const toast = useToast();
  const [syncing, setSyncing] = useState(false);

  async function runSync() {
    setSyncing(true);
    try {
      const result = await apiSend<{ message: string }>("/api/admin/sync", "POST");
      toast.success(result.message);
    } catch (failure) {
      const message =
        typeof failure === "object" && failure !== null && "error" in failure
          ? String((failure as { error: unknown }).error)
          : "Gagal memulai sinkronisasi.";
      toast.error(message);
    } finally {
      setSyncing(false);
    }
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Ringkasan"
        description="Pantau isi konten situs dan jalankan pembaruan berita dari satu tempat."
        actions={
          <Button
            variant="primary"
            icon={<RefreshCw aria-hidden className="h-4 w-4" />}
            loading={syncing}
            onClick={runSync}
          >
            {syncing ? "Menjalankan..." : "Sinkronkan berita"}
          </Button>
        }
      />

      <section aria-labelledby="jumlah-konten" className="space-y-3">
        <h2 id="jumlah-konten" className="text-lg font-semibold text-adm-ink">
          Jumlah konten
        </h2>
        {counts.length === 0 ? (
          <div className="rounded-[12px] border border-adm-border bg-adm-surface px-5 py-6">
            <p className="text-sm font-medium text-adm-ink">Jumlah konten belum terbaca</p>
            <p className="mt-1 text-[13px] leading-relaxed text-adm-subtle">
              Dasbor tidak dapat membaca repositori. Periksa <code>ADMIN_GITHUB_TOKEN</code> pada
              environment, lalu muat ulang halaman ini.
            </p>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {counts.map((item) => (
              <Link
                key={item.id}
                href={`/admin/${item.id}`}
                className="adm-ring adm-transition group rounded-[12px] border border-adm-border bg-adm-surface p-5 hover:border-adm-border-strong"
              >
                <p className="text-[13px] text-adm-subtle">{item.label}</p>
                <p className="mt-2 text-2xl font-semibold text-adm-ink">
                  {item.count < 0 ? "Gagal dibaca" : item.count}
                </p>
                <span className="adm-transition mt-3 inline-flex items-center gap-1 text-[13px] font-medium text-adm-primary group-hover:underline">
                  Kelola
                  <ArrowUpRight aria-hidden className="h-3.5 w-3.5" />
                </span>
              </Link>
            ))}
          </div>
        )}
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section
          aria-labelledby="status-sync"
          className="rounded-[12px] border border-adm-border bg-adm-surface p-5"
        >
          <h2 id="status-sync" className="text-base font-semibold text-adm-ink">
            Status sinkronisasi berita
          </h2>
          <p className="mt-1 text-[13px] leading-relaxed text-adm-subtle">
            Crawler berjalan otomatis setiap 3 hari pukul 19.00 WIB dan bisa dijalankan manual
            dari tombol di atas.
          </p>

          {lastRun ? (
            <dl className="mt-4 space-y-3">
              <div className="flex items-center justify-between gap-4">
                <dt className="text-[13px] text-adm-subtle">Hasil terakhir</dt>
                <dd>
                  <RunBadge run={lastRun} />
                </dd>
              </div>
              <div className="flex items-center justify-between gap-4">
                <dt className="text-[13px] text-adm-subtle">Dipicu oleh</dt>
                <dd className="text-sm text-adm-ink">
                  {lastRun.event === "schedule" ? "Jadwal otomatis" : "Dijalankan manual"}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-4">
                <dt className="text-[13px] text-adm-subtle">Waktu</dt>
                <dd className="text-sm text-adm-ink">{formatDateTime(lastRun.createdAt)}</dd>
              </div>
              <div className="pt-1">
                <a
                  href={lastRun.htmlUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="adm-ring adm-transition inline-flex items-center gap-1 rounded text-[13px] font-medium text-adm-primary hover:underline"
                >
                  Lihat catatan lengkap
                  <ArrowUpRight aria-hidden className="h-3.5 w-3.5" />
                </a>
              </div>
            </dl>
          ) : (
            <p className="mt-4 rounded-[10px] border border-adm-border bg-adm-muted px-3 py-2.5 text-[13px] text-adm-text">
              Belum ada catatan sinkronisasi yang terbaca. Pastikan token GitHub memiliki izin
              Actions untuk menampilkan status di sini.
            </p>
          )}
        </section>

        <section
          aria-labelledby="riwayat"
          className="rounded-[12px] border border-adm-border bg-adm-surface p-5"
        >
          <h2 id="riwayat" className="text-base font-semibold text-adm-ink">
            Riwayat perubahan terakhir
          </h2>
          <p className="mt-1 text-[13px] leading-relaxed text-adm-subtle">
            Setiap penyimpanan di dasbor tercatat sebagai satu perubahan di GitHub.
          </p>

          {commits.length === 0 ? (
            <p className="mt-4 rounded-[10px] border border-adm-border bg-adm-muted px-3 py-2.5 text-[13px] text-adm-text">
              Riwayat belum terbaca. Periksa koneksi token GitHub.
            </p>
          ) : (
            <ul className="mt-4 space-y-3">
              {commits.map((commit) => (
                <li key={commit.sha} className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="truncate text-sm text-adm-ink">{commit.message}</p>
                    <p className="mt-0.5 text-xs text-adm-subtle">
                      {commit.authorName} · {formatDateTime(commit.date)}
                    </p>
                  </div>
                  <a
                    href={commit.htmlUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="adm-ring adm-transition shrink-0 rounded font-mono text-xs text-adm-subtle hover:text-adm-primary"
                  >
                    {commit.sha}
                  </a>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

function RunBadge({ run }: { run: RunInfo }) {
  if (run.status === "in_progress" || run.status === "queued") {
    return <Badge variant="info">Sedang berjalan</Badge>;
  }
  if (run.conclusion === "success") return <Badge variant="success">Berhasil</Badge>;
  if (run.conclusion === "cancelled") return <Badge variant="neutral">Dibatalkan</Badge>;
  return <Badge variant="danger">Gagal</Badge>;
}

function formatDateTime(value: string): string {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Jakarta",
  }).format(date);
}
