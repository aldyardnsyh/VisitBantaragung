import { ADMIN_INFO, publicSiteUrl, readSettings } from "@/lib/admin/settings";
import { configStatus } from "@/lib/admin/config";
import SettingsClient from "./SettingsClient";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const [site, seo] = await Promise.all([readSettings("site"), readSettings("seo")]);
  const status = configStatus();

  return (
    <SettingsClient
      site={site}
      seo={seo}
      info={{ ...ADMIN_INFO, siteUrl: publicSiteUrl() }}
      config={status}
    />
  );
}
