import { NextRequest } from "next/server";
import { requireSession, jsonError, jsonOk } from "@/lib/admin/guard";
import { isSettingsKey, readSettingsWithSha, saveSettings } from "@/lib/admin/settings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** GET /api/admin/settings?key=site */
export async function GET(request: NextRequest) {
  try {
    await requireSession();
    const key = request.nextUrl.searchParams.get("key") ?? "";
    if (!isSettingsKey(key)) {
      return jsonOk({ error: "Pengaturan tidak dikenal." }, { status: 404 });
    }
    const { data } = await readSettingsWithSha(key);
    return jsonOk({ data });
  } catch (error) {
    return jsonError(error);
  }
}

/** POST /api/admin/settings — { key, values } */
export async function POST(request: NextRequest) {
  try {
    const session = await requireSession();
    const body = (await request.json()) as { key?: string; values?: unknown };
    const key = body.key ?? "";
    if (!isSettingsKey(key)) {
      return jsonOk({ error: "Pengaturan tidak dikenal." }, { status: 404 });
    }
    if (!body.values || typeof body.values !== "object") {
      return jsonOk({ error: "Data pengaturan tidak dikirim." }, { status: 422 });
    }

    const result = await saveSettings(key, body.values as Record<string, unknown>, session.sub);
    return jsonOk({
      ok: true,
      commitUrl: result.commitUrl,
      message: "Pengaturan diperbarui. Situs akan menyesuaikan dalam 1 sampai 2 menit.",
    });
  } catch (error) {
    return jsonError(error);
  }
}
