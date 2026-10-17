"use client";

import Link from "next/link";
import { useState } from "react";
import {
  ArrowRight,
  BookOpen,
  Clock3,
  GitCommitHorizontal,
  Images,
  LayoutDashboard,
  MapPin,
  Newspaper,
  RefreshCw,
  Sprout,
  Store,
  Tent,
  TrendingUp,
} from "lucide-react";
import { PageHeader, Card, CardHeader, StatRow } from "../_components/Card";
import Badge from "../_components/Badge";
import Button from "../_components/Button";
import { InfoNotice, LoadingCards } from "../_components/EmptyState";
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

/** Ikon per koleksi, dipilih sesuai makna isinya. */
const ICON: Record<string, React.ReactNode> = {
  wisata: <MapPin aria-hidden className="h-[17px] w-[17px]" />,
  herbal: <Sprout aria-hidden className="h-[17px] w-[17px]" />,
  homestay: <Tent aria-hidden className="h-[17px] w-[17px]" />,
  umkm: <Store aria-hidden className="h-[17px] w-[17px]" />,
  artikel: <BookOpen aria-hidden className="h-[17px] w-[17px]" />,
  berita: <Newspaper aria-hidden className="h-[17px] w-[17px]" />,
  lokasi: <MapPin aria-hidden className="h-[17px] w-[17px]" />,
};

export default function DashboardClient({
  counts,
  lastRun,
  commits,
  assetBaseUrl,
}: {
  counts: Count[];
  lastRun: RunInfo | null;
  commits: CommitInfo[];
  assetBaseUrl: string;
}) {
  const toast = useToast();
  const [syncing, setSyncing] = useState(false);

  const totalKonten = counts.reduce((sum, item) => (item.count > 0 ? sum + item.count : sum), 0);

  async function runSync() {
    setSyncing(true);
    // Toast loading memakai id tetap, lalu diganti hasilnya lewat id yang sama
    // sehingga tidak menumpuk menjadi dua notifikasi.
    toast.loading("Memulai sinkronisasi berita...", { id: "sync" });
    try {
      const result = await apiSend<{ message: string }>("/api/admin/sync", "POST");
      toast.success(result.message, { id: "sync", duration: 6000 });
    } catch (failure) {
      const message =
        typeof failure === "object" && failure !== null && "error" in failure
          ? String((failure as { error: unknown }).error)
          : "Gagal memulai sinkronisasi.";
      toast.error(message, { id: "sync" });
    } finally {
      setSyncing(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Dasbor"
        title="Ringkasan"
        description="Pantau isi konten situs dan jalankan pembaruan berita dari satu tempat."
        actions={
          <Button
            variant="primary"
            icon={<RefreshCw aria-hidden className="h-3.5 w-3.5" />}
            loading={syncing}
            onClick={runSync}
          >
            {syncing ? "Menjalankan..." : "Sinkronkan berita"}
          </Button>
        }
      />

      {/* Sorotan utama: total konten + status singkat */}
      <section aria-label="Ikhtisar" className="grid gap-3 lg:grid-cols-[1.15fr_1fr]">
        <div className="relative overflow-hidden rounded-[var(--radius-adm-lg)] border border-adm-border bg-adm-surface p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-adm-subtle">
                Total entri konten
              </p>
              <p className="mt-2 font-display text-[38px] font-semibold leading-none tracking-[-0.03em] text-adm-ink">
                {counts.length === 0 ? "—" : totalKonten}
              </p>
              <p className="mt-2 text-[12.5px] text-adm-subtle">
                Tersebar di {counts.length} koleksi konten
              </p>
            </div>
            <span className="flex h-9 w-9 items-center justify-center rounded-[var(--radius-adm-sm)] bg-adm-primary-soft text-adm-primary">
              <TrendingUp aria-hidden className="h-4 w-4" />
            </span>
          </div>

          {lastRun ? (
            <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1.5 border-t border-adm-divider pt-3.5">
              <span className="flex items-center gap-1.5 text-[12px] text-adm-subtle">
                <Clock3 aria-hidden className="h-3 w-3" />
                Sync terakhir {formatRelative(lastRun.createdAt)}
              </span>
              <RunBadge run={lastRun} />
            </div>
          ) : (
            <div className="mt-4 border-t border-adm-divider pt-3.5">
              <span className="text-[12px] text-adm-subtle">Status crawler belum terbaca</span>
            </div>
          )}
        </div>

        <div className="rounded-[var(--radius-adm-lg)] border border-adm-border bg-adm-surface p-5">
          <CardHeader
            title="Status sinkronisasi berita"
            description="Crawler berjalan otomatis setiap 3 hari pukul 19.00 WIB."
            icon={<RefreshCw aria-hidden className="h-4 w-4" />}
          />
          <div className="mt-3.5">
            {lastRun ? (
              <>
                <StatRow
                  label="Hasil terakhir"
                  value={<RunBadge run={lastRun} />}
                />
                <StatRow
                  label="Dipicu oleh"
                  value={lastRun.event === "schedule" ? "Jadwal otomatis" : "Dijalankan manual"}
                />
                <StatRow label="Waktu" value={formatDateTime(lastRun.createdAt)} />
                <div className="pt-3">
                  <a
                    href={lastRun.htmlUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="adm-ring adm-transition inline-flex items-center gap-1 rounded text-[12.5px] font-medium text-adm-primary hover:underline underline-offset-2"
                  >
                    Lihat catatan lengkap
                    <ArrowRight aria-hidden className="h-3 w-3" />
                  </a>
                </div>
              </>
            ) : (
              <InfoNotice>
                Status belum terbaca. Pastikan token GitHub memiliki izin Actions untuk
                menampilkannya di sini.
              </InfoNotice>
            )}
          </div>
        </div>
      </section>

      {/* Jumlah konten per koleksi */}
      <section aria-labelledby="jumlah-konten" className="space-y-3">
        <div className="flex items-end justify-between gap-3">
          <div>
            <h2 id="jumlah-konten" className="text-[15px] font-semibold tracking-[-0.01em] text-adm-ink">
              Konten per bagian
            </h2>
            <p className="mt-0.5 text-[12.5px] text-adm-subtle">
              Klik salah satu untuk mulai mengelola.
            </p>
          </div>
          <Link
            href="/admin/media"
            className="adm-ring adm-transition hidden shrink-0 items-center gap-1.5 rounded text-[12.5px] font-medium text-adm-primary hover:underline hover:underline-offset-2 active:text-adm-primary-active sm:inline-flex"
          >
            <Images aria-hidden className="h-3.5 w-3.5" />
            Pustaka gambar
          </Link>
        </div>

        {counts.length === 0 ? (
          <LoadingCards cards={4} />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {counts.map((item) => (
              <Link
                key={item.id}
                href={`/admin/${item.id}`}
                className="adm-ring adm-transition group relative overflow-hidden rounded-[var(--radius-adm-lg)] border border-adm-border bg-adm-surface p-4 hover:border-adm-border-strong hover:shadow-adm-sm active:translate-y-px active:shadow-none"
              >
                <div className="flex items-start justify-between gap-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-[var(--radius-adm-sm)] bg-adm-muted text-adm-text transition-colors group-hover:bg-adm-primary-soft group-hover:text-adm-primary">
                    {ICON[item.id] ?? <LayoutDashboard aria-hidden className="h-[17px] w-[17px]" />}
                  </span>
                  <ArrowRight
                    aria-hidden
                    className="h-3.5 w-3.5 translate-x-1 text-adm-border-strong opacity-0 transition-all group-hover:translate-x-0 group-hover:text-adm-primary group-hover:opacity-100"
                  />
                </div>
                <p className="mt-3 text-[11.5px] font-medium uppercase tracking-[0.06em] text-adm-subtle">
                  {item.label}
                </p>
                <p className="mt-1 font-display text-[24px] font-semibold leading-none tracking-[-0.02em] text-adm-ink">
                  {item.count < 0 ? (
                    <span className="text-[13px] font-medium text-adm-danger">Gagal dibaca</span>
                  ) : (
                    item.count
                  )}
                </p>
              </Link>
            ))}

            {/* Kartu penyeimbang: melengkapi baris terakhir agar grid tidak
                menyisakan lubang, sekaligus jalan cepat ke pustaka gambar. */}
            <Link
              href="/admin/media"
              className="adm-ring adm-transition group relative flex flex-col justify-between overflow-hidden rounded-[var(--radius-adm-lg)] border border-dashed border-adm-border-strong bg-adm-surface-2 p-4 hover:border-adm-primary/40 hover:bg-adm-primary-soft/40 active:translate-y-px"
            >
              <div className="flex items-start justify-between gap-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-[var(--radius-adm-sm)] bg-adm-muted text-adm-subtle transition-colors group-hover:bg-adm-primary-soft group-hover:text-adm-primary">
                  <Images aria-hidden className="h-[17px] w-[17px]" />
                </span>
                <ArrowRight
                  aria-hidden
                  className="h-3.5 w-3.5 translate-x-1 text-adm-border-strong opacity-0 transition-all group-hover:translate-x-0 group-hover:text-adm-primary group-hover:opacity-100"
                />
              </div>
              <div>
                <p className="mt-3 text-[11.5px] font-medium uppercase tracking-[0.06em] text-adm-subtle">
                  Pustaka Gambar
                </p>
                <p className="mt-1 text-[13px] font-medium text-adm-primary">Kelola aset</p>
              </div>
            </Link>
          </div>
        )}
      </section>

      {/* Riwayat perubahan */}
      <section aria-labelledby="riwayat">
        <Card padded={false}>
          <div className="border-b border-adm-divider px-5 py-4">
            <CardHeader
              title="Riwayat perubahan terakhir"
              description="Setiap penyimpanan di dasbor tercatat sebagai satu perubahan di GitHub."
              icon={<GitCommitHorizontal aria-hidden className="h-4 w-4" />}
            />
          </div>

          {commits.length === 0 ? (
            <div className="px-5 py-4">
              <InfoNotice>
                Riwayat belum terbaca. Periksa koneksi token GitHub pada environment.
              </InfoNotice>
            </div>
          ) : (
            <ul className="divide-y divide-adm-divider">
              {commits.map((commit) => (
                <li key={commit.sha} className="group flex items-start gap-3 px-5 py-3 transition-colors hover:bg-adm-surface-2">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-adm-border-strong transition-colors group-hover:bg-adm-primary" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[12.5px] text-adm-ink">{commit.message}</p>
                    <p className="mt-0.5 text-[11.5px] text-adm-subtle">
                      {commit.authorName} · {formatRelative(commit.date)}
                    </p>
                  </div>
                  <a
                    href={commit.htmlUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="adm-ring adm-transition mt-0.5 shrink-0 rounded px-1.5 py-0.5 font-mono text-[11px] text-adm-subtle hover:bg-adm-muted hover:text-adm-primary"
                    title="Buka commit di GitHub"
                  >
                    {commit.sha}
                  </a>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </section>

      <p className="text-center text-[11.5px] text-adm-subtle">
        Aset gambar disajikan lewat CDN. Basis: <code className="font-mono">{assetBaseUrl}</code>
      </p>
    </div>
  );
}

function RunBadge({ run }: { run: RunInfo }) {
  if (run.status === "in_progress" || run.status === "queued") {
    return (
      <Badge variant="info" dot>
        Sedang berjalan
      </Badge>
    );
  }
  if (run.conclusion === "success")
    return (
      <Badge variant="success" dot>
        Berhasil
      </Badge>
    );
  if (run.conclusion === "cancelled")
    return (
      <Badge variant="neutral" dot>
        Dibatalkan
      </Badge>
    );
  return (
    <Badge variant="danger" dot>
      Gagal
    </Badge>
  );
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

function formatRelative(value: string): string {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  const diffMs = Date.now() - date.getTime();
  const minutes = Math.round(diffMs / 60000);
  if (minutes < 1) return "baru saja";
  if (minutes < 60) return `${minutes} menit lalu`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} jam lalu`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days} hari lalu`;
  return formatDateTime(value);
}
