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
  const staticRoutes = [
    "",
    "/wisata",
    "/b2h",
    "/b2h/katalog",
    "/bmc",
    "/bic",
    "/bic/artikel",
    "/bdb",
    "/bdb/umkm",
    "/bdb/homestay",
    "/kontak",
  ];

  staticRoutes.forEach((route) => {
    urls.push({
      url: `${BASE_URL}${route}`,
      lastModified: new Date(),
    });
  });

  // Wisata
  getSlugs(path.join(CONTENT_DIR, "wisata")).forEach((slug) => {
    urls.push({
      url: `${BASE_URL}/wisata/${slug}`,
      lastModified: new Date(),
    });
  });

  // B2H Herbal
  getSlugs(path.join(CONTENT_DIR, "b2h/katalog-tanaman")).forEach((slug) => {
    urls.push({
      url: `${BASE_URL}/b2h/katalog/${slug}`,
      lastModified: new Date(),
    });
  });

  // BIC Artikel
  getSlugs(path.join(CONTENT_DIR, "bic/artikel")).forEach((file) => {
    const raw = fs.readFileSync(
      path.join(CONTENT_DIR, "bic/artikel", `${file}.json`),
      "utf-8"
    );
    const data = JSON.parse(raw);

    urls.push({
      url: `${BASE_URL}/bic/artikel/${data.slug}`,
      lastModified: new Date(),
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
