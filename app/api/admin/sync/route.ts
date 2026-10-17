import { requireSession, jsonError, jsonOk } from "@/lib/admin/guard";
import { dispatchWorkflow } from "@/lib/admin/github";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** POST /api/admin/sync — jalankan workflow crawler berita secara manual. */
export async function POST() {
  try {
    await requireSession();
    const result = await dispatchWorkflow();
    if (!result.ok) {
      return jsonOk({ error: result.message }, { status: 502 });
    }
    return jsonOk({ ok: true, message: result.message });
  } catch (error) {
    return jsonError(error);
  }
}
