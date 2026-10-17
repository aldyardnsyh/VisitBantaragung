import { NextRequest } from "next/server";
import { requireSession, jsonError, jsonOk } from "@/lib/admin/guard";
import { configStatus } from "@/lib/admin/config";
import { getLatestWorkflowRun, getRateLimit } from "@/lib/admin/github";
import { COLLECTIONS } from "@/lib/admin/collections";
import { listRecords } from "@/lib/admin/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Ringkasan dasbor: jumlah konten per koleksi, status crawler, kuota API. */
export async function GET(request: NextRequest) {
  try {
    await requireSession();
    const withCounts = request.nextUrl.searchParams.get("counts") === "1";

    const [run, rateLimit] = await Promise.all([getLatestWorkflowRun(), getRateLimit()]);

    let counts: Array<{ id: string; label: string; count: number }> | undefined;
    if (withCounts) {
      const results = await Promise.all(
        COLLECTIONS.map(async (collection) => {
          try {
            const records = await listRecords(collection);
            return { id: collection.id, label: collection.label, count: records.length };
          } catch {
            return { id: collection.id, label: collection.label, count: -1 };
          }
        })
      );
      counts = results;
    }

    return jsonOk({
      config: configStatus(),
      counts,
      lastRun: run,
      rateLimit,
    });
  } catch (error) {
    return jsonError(error);
  }
}
