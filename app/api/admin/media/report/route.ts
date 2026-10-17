import { NextRequest } from "next/server";
import { requireSession, jsonError, jsonOk } from "@/lib/admin/guard";
import { buildStorageReport, listFolderFiles, invalidateAssetTree } from "@/lib/admin/storage";
import { buildMediaUsage, normalizeMediaPath, invalidateMediaUsage } from "@/lib/admin/media-usage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * GET /api/admin/media/report
 *
 * Ringkasan penyimpanan repositori aset: total berkas, ukuran, dan berapa
 * banyak yang tidak dipakai di konten mana pun. Menelusuri subfolder, jadi
 * angka yang dilaporkan mencerminkan penyimpanan sebenarnya.
 *
 * Parameter:
 *   ?path=wisata/batu-asahan/cover.webp  -> detail pemakaian satu gambar
 *   ?refresh=1                           -> paksa hitung ulang
 */
export async function GET(request: NextRequest) {
  try {
    await requireSession();
    const params = request.nextUrl.searchParams;
    const refresh = params.get("refresh") === "1";

    if (refresh) {
      invalidateAssetTree();
      invalidateMediaUsage();
    }

    // Detail pemakaian satu gambar.
    const path = params.get("path");
    if (path) {
      const usage = await buildMediaUsage(refresh);
      const key = normalizeMediaPath(path);
      return jsonOk({ path: key, usedBy: usage.usage[key] ?? [] });
    }

    // Laporan penuh.
    const report = await buildStorageReport(refresh);
    return jsonOk({ report });
  } catch (error) {
    return jsonError(error);
  }
}

/**
 * GET tidak dipakai untuk daftar folder; itu ada di /api/admin/media.
 * Berkas ini hanya menangani laporan agar tanggung jawabnya tunggal.
 */
export async function POST(request: NextRequest) {
  try {
    await requireSession();
    const body = (await request.json()) as { folder?: string };
    if (!body.folder) {
      return jsonOk({ error: "Folder wajib diisi." }, { status: 422 });
    }
    const files = await listFolderFiles(body.folder, true);
    return jsonOk({ files });
  } catch (error) {
    return jsonError(error);
  }
}
