import { MetadataRoute } from "next";
import fs from "fs";
import path from "path";

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
const CONTENT_DIR = path.join(process.cwd(), "content");

function getSlugs(dir: string) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).map((f) => f.replace(".json", ""));
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

  staticRoutes.forEach(({ route, priority }) => {
    urls.push({
      url: `${BASE_URL}${route}`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority,
    });
  });

  // Wisata
  getSlugs(path.join(CONTENT_DIR, "wisata")).forEach((slug) => {
    urls.push({
      url: `${BASE_URL}/wisata/${slug}`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.8,
    });
  });

  // B2H Herbal
  getSlugs(path.join(CONTENT_DIR, "b2h/katalog-tanaman")).forEach((slug) => {
    urls.push({
      url: `${BASE_URL}/b2h/katalog/${slug}`,
      lastModified: new Date(),
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

  // BMC Lokasi
  getSlugs(path.join(CONTENT_DIR, "bmc/lokasi")).forEach((slug) => {
    urls.push({
      url: `${BASE_URL}/bmc/lokasi/${slug}`,
      lastModified: new Date(),
    });
  });

  // UMKM
  getSlugs(path.join(CONTENT_DIR, "bdb/umkm")).forEach((slug) => {
    urls.push({
      url: `${BASE_URL}/bdb/umkm/${slug}`,
      lastModified: new Date(),
    });
  });

  // Homestay
  getSlugs(path.join(CONTENT_DIR, "bdb/homestay")).forEach((slug) => {
    urls.push({
      url: `${BASE_URL}/bdb/homestay/${slug}`,
      lastModified: new Date(),
    });
  });

  return urls;
}
