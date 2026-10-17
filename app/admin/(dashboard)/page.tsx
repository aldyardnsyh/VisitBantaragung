import { COLLECTIONS } from "@/lib/admin/collections";
import { ADMIN } from "@/lib/admin/config";
import { getLatestWorkflowRun, listRecentCommits } from "@/lib/admin/github";
import { countAllCollections } from "@/lib/admin/service";
import DashboardClient from "./DashboardClient";

export const dynamic = "force-dynamic";

export default async function AdminHome() {
  // Data diambil di server agar halaman ringkas dan tidak memicu waterfall
  // permintaan dari browser.
  const [counts, lastRun, commits] = await Promise.all([
    countAllCollections(COLLECTIONS).catch(() => []),
    getLatestWorkflowRun(),
    listRecentCommits(6),
  ]);

  return (
    <DashboardClient
      counts={counts}
      lastRun={lastRun}
      commits={commits}
      assetBaseUrl={ADMIN.cdnBase}
    />
  );
}
