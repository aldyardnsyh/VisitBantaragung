import { getAllArticles } from "@/lib/content";

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

// News sitemap (Google News). Berbeda dengan sitemap biasa, protokol ini
// memerlukan tag <news:>, jadi harus ditulis sendiri sebagai route handler.
// Hanya memuat artikel 2 hari terakhir sesuai aturan protokol.
export const dynamic = "force-static";

export async function GET() {
    const batas = Date.now() - 2 * 24 * 60 * 60 * 1000;

    const urlEntries = getAllArticles()
        .map((a) => {
            const t = new Date(a.updatedAt || a.date).getTime();
            if (!Number.isFinite(t) || t < batas) return null;
            const loc = `${BASE_URL}/bic/artikel/${a.slug}`;
            return [
                "  <url>",
                `    <loc>${loc}</loc>`,
                "    <news:news>",
                "      <news:publication>",
                "        <news:name>Desa Wisata Bantaragung</news:name>",
                "        <news:language>id</news:language>",
                "      </news:publication>",
                `      <news:publication_date>${new Date(a.updatedAt || a.date).toISOString()}</news:publication_date>`,
                `      <news:title>${a.title}</news:title>`,
                "    </news:news>",
                "  </url>",
            ].join("\n");
        })
        .filter(Boolean);

    const xml = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"',
        '        xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">',
        ...urlEntries,
        "</urlset>",
    ].join("\n");

    return new Response(xml, {
        headers: {
            "Content-Type": "application/xml; charset=utf-8",
            "Cache-Control": "public, max-age=0, s-maxage=3600",
        },
    });
}
