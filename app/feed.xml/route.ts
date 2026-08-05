import { getAllArticles } from "@/lib/content";

// RSS 2.0 feed — sinyal fresh untuk crawler Google & agregator berita
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://visitbantaragung.com";

function esc(s: string): string {
    return s
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}

export function GET() {
    const items = getAllArticles()
        .slice(0, 20)
        .map((a) => {
            const url = `${SITE_URL}/bic/artikel/${a.slug}`;
            const pub = new Date(a.date).toUTCString();
            return `    <item>
      <title>${esc(a.title)}</title>
      <link>${esc(url)}</link>
      <guid isPermaLink="true">${esc(url)}</guid>
      <description>${esc(a.excerpt)}</description>
      <category>${esc(a.category)}</category>
      <author>${esc(a.author || "Admin")}</author>
      <pubDate>${pub}</pubDate>
    </item>`;
        })
        .join("\n");

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:dc="http://purl.org/dc/elements/1.1/">
  <channel>
    <title>Desa Wisata Bantaragung — Berita &amp; Kegiatan</title>
    <link>${esc(SITE_URL)}</link>
    <description>Berita desa, kegiatan KKN-PPM UGM Simfoni Sindangwangi, wisata, kuliner, dan pemberdayaan masyarakat Desa Bantaragung, Majalengka.</description>
    <language>id</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
${items}
  </channel>
</rss>`;

    return new Response(xml, {
        headers: {
            "Content-Type": "application/rss+xml; charset=utf-8",
            "Cache-Control": "public, max-age=0, s-maxage=300",
        },
    });
}