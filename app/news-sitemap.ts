import { MetadataRoute } from "next";
import { getAllArticles } from "@/lib/content";

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

// Sitemap berita khusus (news sitemap). Berguna agar artikel baru bisa masuk
// indeks Google News lebih cepat. Hanya memuat artikel 2 hari terakhir karena
// itu aturan protokol news sitemap.
export default function newsSitemap(): MetadataRoute.Sitemap {
    const duaHariLalu = Date.now() - 2 * 24 * 60 * 60 * 1000;

    return getAllArticles()
        .filter((a) => {
            const t = new Date(a.updatedAt || a.date).getTime();
            return Number.isFinite(t) && t >= duaHariLalu;
        })
        .map((a) => ({
            url: `${BASE_URL}/bic/artikel/${a.slug}`,
            lastModified: new Date(a.updatedAt || a.date),
            changeFrequency: "daily" as const,
            priority: 0.9,
        }));
}
