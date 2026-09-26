import { MetadataRoute } from "next";
import fs from "fs";
import path from "path";
import { getAllTags, getArticlesByTag } from "@/lib/content";

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
const CONTENT_DIR = path.join(process.cwd(), "content");

function getSlugs(dir: string) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir)
    .filter((f) => f.endsWith(".json"))
    .map((f) => f.replace(".json", ""));
}

// Ambil waktu modifikasi nyata dari file konten (dari field updatedAt bila
// ada, else waktu tulis file). Dipakai agar lastmod di sitemap jujur.
function lastModifiedFromFile(file: string): Date | null {
  try {
    if (!fs.existsSync(file)) return null;
    const data = JSON.parse(fs.readFileSync(file, "utf-8"));
    const raw = data.updatedAt || data.sourcePublishedAt || data.date;
    if (raw) {
      const d = new Date(String(raw));
      if (!Number.isNaN(d.getTime())) return d;
    }
    return fs.statSync(file).mtime;
  } catch {
    return null;
  }
}

export default function sitemap(): MetadataRoute.Sitemap {
  const urls: MetadataRoute.Sitemap = [];

  // Static pages
  const staticRoutes: { route: string; priority: number }[] = [
    { route: "", priority: 1.0 },
    { route: "/wisata", priority: 0.9 },
    { route: "/bic/artikel", priority: 0.8 },
    { route: "/galeri", priority: 0.8 },
    { route: "/b2h", priority: 0.7 },
    { route: "/b2h/katalog", priority: 0.7 },
    { route: "/bmc", priority: 0.7 },
    { route: "/bic", priority: 0.7 },
    { route: "/bdb", priority: 0.7 },
    { route: "/bdb/umkm", priority: 0.7 },
    { route: "/bdb/homestay", priority: 0.7 },
    { route: "/tentang", priority: 0.6 },
    { route: "/kontak", priority: 0.5 },
  ];

  // Halaman statis: TIDAK diberi lastModified. Kalau diisi new Date() setiap
  // build, Google diberi tahu semua halaman berubah tiap hari. Itu membohongi
  // crawler dan membuat lastmod diabaikan untuk seluruh sitemap.
  staticRoutes.forEach(({ route, priority }) => {
    urls.push({
      url: `${BASE_URL}${route}`,
      changeFrequency: "weekly",
      priority,
    });
  });

  // Wisata
  getSlugs(path.join(CONTENT_DIR, "wisata")).forEach((slug) => {
    const stamp = lastModifiedFromFile(path.join(CONTENT_DIR, "wisata", `${slug}.json`));
    urls.push({
      url: `${BASE_URL}/wisata/${slug}`,
      ...(stamp ? { lastModified: stamp } : {}),
      changeFrequency: "monthly",
      priority: 0.8,
    });
  });

  // B2H Herbal
  getSlugs(path.join(CONTENT_DIR, "b2h/katalog-tanaman")).forEach((slug) => {
    const stamp = lastModifiedFromFile(path.join(CONTENT_DIR, "b2h/katalog-tanaman", `${slug}.json`));
    urls.push({
      url: `${BASE_URL}/b2h/katalog/${slug}`,
      ...(stamp ? { lastModified: stamp } : {}),
      changeFrequency: "monthly",
      priority: 0.6,
    });
  });

  // BIC Artikel & Berita
  ["bic/artikel", "bic/berita"].forEach((dir) => {
    const dirPath = path.join(CONTENT_DIR, dir);
    if (!fs.existsSync(dirPath)) return;

    fs.readdirSync(dirPath).forEach((file) => {
      const raw = fs.readFileSync(path.join(dirPath, file), "utf-8");
      const data = JSON.parse(raw);

      urls.push({
        url: `${BASE_URL}/bic/artikel/${data.slug}`,
        lastModified: (data.updatedAt ? new Date(data.updatedAt) : data.date ? new Date(data.date) : new Date()),
        changeFrequency: "monthly",
        priority: 0.7,
      });
    });
  });

  // Halaman tag: hub yang menghubungkan artikel satu sama lain lewat topik.
  // lastmod memakai tanggal artikel terbaru di tag itu, bukan hari build.
  getAllTags().forEach((t) => {
    const latest = getArticlesByTag(t.slug)
      .map((a) => new Date(a.updatedAt || a.date).getTime())
      .filter((n) => Number.isFinite(n))
      .sort((a, b) => b - a)[0];
    urls.push({
      url: `${BASE_URL}/tag/${t.slug}`,
      ...(latest ? { lastModified: new Date(latest) } : {}),
      changeFrequency: "weekly",
      priority: 0.6,
    });
  });

  // BMC Lokasi
  getSlugs(path.join(CONTENT_DIR, "bmc/lokasi")).forEach((slug) => {
    const stamp = lastModifiedFromFile(path.join(CONTENT_DIR, "bmc/lokasi", `${slug}.json`));
    urls.push({
      url: `${BASE_URL}/bmc/lokasi/${slug}`,
      ...(stamp ? { lastModified: stamp } : {}),
      changeFrequency: "yearly",
      priority: 0.5,
    });
  });

  // UMKM
  getSlugs(path.join(CONTENT_DIR, "bdb/umkm")).forEach((slug) => {
    const stamp = lastModifiedFromFile(path.join(CONTENT_DIR, "bdb/umkm", `${slug}.json`));
    urls.push({
      url: `${BASE_URL}/bdb/umkm/${slug}`,
      ...(stamp ? { lastModified: stamp } : {}),
      changeFrequency: "monthly",
      priority: 0.6,
    });
  });

  // Homestay
  getSlugs(path.join(CONTENT_DIR, "bdb/homestay")).forEach((slug) => {
    const stamp = lastModifiedFromFile(path.join(CONTENT_DIR, "bdb/homestay", `${slug}.json`));
    urls.push({
      url: `${BASE_URL}/bdb/homestay/${slug}`,
      ...(stamp ? { lastModified: stamp } : {}),
      changeFrequency: "monthly",
      priority: 0.6,
    });
  });

  return urls;
}
