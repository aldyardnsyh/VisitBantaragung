import { requireSession, jsonError, jsonOk } from "@/lib/admin/guard";
import { getLatestWorkflowRun, listRecentCommits } from "@/lib/admin/github";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export interface NotificationItem {
  /** Id stabil, dipakai untuk menandai sudah dibaca di sisi peramban. */
  id: string;
  /** Jenis menentukan ikon dan warna di antarmuka. */
  kind: "success" | "error" | "warning" | "info";
  title: string;
  body?: string;
  /** Waktu ISO kejadian. */
  at: string;
  /** Tautan sumber (commit atau catatan workflow). */
  href?: string;
}

/**
 * Notifikasi dasbor.
 *
 * Sumbernya data nyata, bukan karangan: commit terbaru di repositori konten dan
 * status sinkronisasi crawler berita. Setiap item punya id stabil (SHA commit
 * atau penanda waktu run) sehingga status "sudah dibaca" bisa disimpan di
 * peramban tanpa perlu basis data.
 */
export async function GET() {
  try {
    await requireSession();

    const [commits, run] = await Promise.all([listRecentCommits(10), getLatestWorkflowRun()]);

    const items: NotificationItem[] = [];

    // Status sinkronisasi berita: paling penting, taruh paling atas.
    if (run) {
      const failed = run.status === "completed" && run.conclusion !== "success";
      const running = run.status === "in_progress" || run.status === "queued";
      items.push({
        id: `run-${run.createdAt}`,
        kind: running ? "info" : failed ? "error" : "success",
        title: running
          ? "Sinkronisasi berita sedang berjalan"
          : failed
            ? "Sinkronisasi berita gagal"
            : "Sinkronisasi berita berhasil",
        body: running
          ? "Crawler sedang mengambil berita baru. Hasilnya muncul beberapa menit lagi."
          : failed
            ? `Run terakhir (${run.event === "schedule" ? "jadwal otomatis" : "manual"}) tidak selesai dengan sukses. Buka catatan untuk melihat penyebabnya.`
            : `Sinkronisasi lewat ${run.event === "schedule" ? "jadwal otomatis" : "sinkronisasi manual"} selesai. Jika tidak ada berita baru, daftar berita yang ada sudah yang terbaru.`,
        at: run.createdAt,
        href: run.htmlUrl,
      });
    }

    // Perubahan konten: satu entri per commit, hanya yang dibuat manusia.
    for (const commit of commits) {
      if (commit.authorName.includes("github-actions")) continue;
      items.push({
        id: `commit-${commit.sha}`,
        kind: "info",
        title: commit.message,
        body: `oleh ${commit.authorName}`,
        at: commit.date,
        href: commit.htmlUrl,
      });
    }

    // Urutkan dari yang terbaru.
    items.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());

    return jsonOk({ items });
  } catch (error) {
    return jsonError(error);
  }
}
