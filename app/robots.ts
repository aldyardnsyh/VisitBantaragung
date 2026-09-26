import { MetadataRoute } from "next";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // Parameter query tidak pernah menghasilkan halaman unik, jadi jangan
        // dirayapi agar tidak menguras kuota crawl untuk URL duplikat.
        disallow: ["/*?*", "/api/"],
      },
    ],
    sitemap: [`${siteUrl}/sitemap.xml`, `${siteUrl}/news-sitemap.xml`],
    host: siteUrl,
  };
}
