import { requireSession, jsonError, jsonOk } from "@/lib/admin/guard";
import { buildMediaUsage, invalidateMediaUsage } from "@/lib/admin/media-usage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * GET /api/admin/media/usage
 *
 * Peta pemakaian seluruh gambar: path gambar -> daftar entri yang memakainya.
 * Dipakai halaman Pustaka Gambar untuk menandai gambar mana yang terpakai dan
 * mana yang tidak, serta untuk menampilkan peringatan sebelum menghapus.
 */
export async function GET(request: Request) {
  try {
    await requireSession();
    const force = new URL(request.url).searchParams.get("refresh") === "1";
    if (force) invalidateMediaUsage();
    const data = await buildMediaUsage(force);
    return jsonOk({ usage: data.usage, filesRead: data.filesRead, analyzedAt: data.analyzedAt });
  } catch (error) {
    return jsonError(error);
  }
}
