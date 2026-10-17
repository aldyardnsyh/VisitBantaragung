import "server-only";
import { getContentTree, readRawFile } from "./github";
import { COLLECTIONS } from "./collections";
import { ADMIN } from "./config";

/**
 * Analisis pemakaian gambar.
 *
 * Masalah yang diselesaikan: Pustaka Gambar sebelumnya hanya menampilkan dan
 * mengunggah. Pengguna tidak tahu gambar mana yang benar-benar dipakai di
 * halaman, dan tidak bisa menghapus gambar iseng. Folder aset pun bisa menumpuk
 * gambar yatim yang memakan penyimpanan.
 *
 * Cara kerja: seluruh berkas JSON konten dibaca sekali, lalu setiap nilai teks
 * yang berbentuk path gambar dicatat. Hasilnya peta path -> daftar entri yang
 * memakainya. Data ini dipakai untuk menandai "dipakai" atau "tidak dipakai".
 */

export interface MediaUsageLocation {
  /** Koleksi asal, mis. "wisata" atau "berita". */
  collection: string;
  /** Label koleksi untuk ditampilkan. */
  collectionLabel: string;
  /** Slug entri. */
  slug: string;
  /** Judul entri. */
  title: string;
  /** Field tempat gambar dipakai, mis. "cover" atau "gallery". */
  field: string;
  /** Tautan halaman admin untuk menyunting entri ini. */
  href: string;
}

export interface MediaUsageMap {
  /** path gambar -> daftar lokasi pemakaian. */
  usage: Record<string, MediaUsageLocation[]>;
  /** Jumlah berkas JSON yang dibaca. */
  filesRead: number;
  /** Waktu analisis dibuat (ISO). */
  analyzedAt: string;
}

const IMAGE_EXT = /\.(png|jpe?g|webp|gif|svg|avif)$/i;

/** Cocokkan nilai yang memang berupa path gambar, bukan kalimat biasa. */
function isImagePath(value: unknown): value is string {
  if (typeof value !== "string") return false;
  if (value.length > 300) return false;
  if (!IMAGE_EXT.test(value)) return false;
  // Tolak URL absolut eksternal; yang dicatat hanya aset repositori sendiri.
  if (/^https?:\/\//i.test(value)) return false;
  return true;
}

/** Normalisasi path agar "/berita/x/cover.jpg", "berita/x/cover.jpg", dan
 *  "berita/x/cover.jpg?v=1" dianggap sama. */
export function normalizeMediaPath(path: string): string {
  return path
    .replace(/^\/+/, "")
    .split("?")[0]
    .trim();
}

/**
 * Bangun peta pemakaian seluruh gambar.
 *
 * Biaya: satu panggilan Tree API + membaca isi setiap berkas JSON konten.
 * Karena jumlahnya sekitar 300 berkas kecil, hasilnya di-cache singkat di
 * tingkat modul agar tidak diulang pada setiap permintaan.
 */
let cache: { data: MediaUsageMap; expires: number } | null = null;
const CACHE_MS = 60_000;

export async function buildMediaUsage(force = false): Promise<MediaUsageMap> {
  if (!force && cache && cache.expires > Date.now()) return cache.data;

  const tree = await getContentTree();
  const jsonPaths = tree
    .filter(
      (entry) =>
        entry.type === "blob" &&
        entry.path.startsWith("content/") &&
        entry.path.endsWith(".json")
    )
    .map((entry) => entry.path);

  const usage: Record<string, MediaUsageLocation[]> = {};
  let filesRead = 0;
  const batchSize = 10;

  for (let i = 0; i < jsonPaths.length; i += batchSize) {
    const batch = jsonPaths.slice(i, i + batchSize);
    const results = await Promise.all(
      batch.map(async (path) => ({ path, raw: await readRawFile(path) }))
    );

    for (const { path, raw } of results) {
      if (!raw) continue;
      filesRead += 1;

      // Tentukan koleksi dari path berkas.
      const rel = path.replace(/^content\//, "");
      const dir = rel.includes("/") ? rel.slice(0, rel.lastIndexOf("/")) : "";
      const collection = COLLECTIONS.find((c) => c.dir === dir);
      if (!collection) continue;

      let data: Record<string, unknown>;
      try {
        data = JSON.parse(raw) as Record<string, unknown>;
      } catch {
        continue;
      }

      const slug = typeof data[collection.slugKey] === "string" ? (data[collection.slugKey] as string) : "";
      const title =
        typeof data[collection.titleKey] === "string" ? (data[collection.titleKey] as string) : slug;

      for (const field of collection.fields) {
        if (field.type !== "image" && field.type !== "gallery") continue;
        const value = data[field.key];

        const record = (imagePath: string) => {
          const key = normalizeMediaPath(imagePath);
          if (!usage[key]) usage[key] = [];
          // Hindari duplikat entri yang sama pada field yang sama.
          if (usage[key].some((u) => u.collection === collection.id && u.slug === slug && u.field === field.key)) {
            return;
          }
          usage[key].push({
            collection: collection.id,
            collectionLabel: collection.label,
            slug,
            title,
            field: field.key,
            href: `/admin/${collection.id}/${slug}`,
          });
        };

        if (isImagePath(value)) record(value);
        else if (Array.isArray(value)) {
          for (const item of value) if (isImagePath(item)) record(item);
        }
      }
    }
  }

  const data: MediaUsageMap = { usage, filesRead, analyzedAt: new Date().toISOString() };
  cache = { data, expires: Date.now() + CACHE_MS };
  return data;
}

/** Buang cache setelah ada perubahan konten agar analisis ikut segar. */
export function invalidateMediaUsage() {
  cache = null;
}

export interface MediaItemWithUsage {
  path: string;
  name: string;
  size: number;
  url: string;
  sha: string;
  usageCount: number;
  usedBy: MediaUsageLocation[];
}

export interface FolderSummary {
  folder: string;
  files: number;
  bytes: number;
  unusedFiles: number;
  unusedBytes: number;
}

export interface MediaReport {
  totalFiles: number;
  totalBytes: number;
  unusedFiles: number;
  unusedBytes: number;
  folders: FolderSummary[];
  analyzedAt: string;
  /** Batas penyimpanan yang perlu diperhatikan, untuk konteks di antarmuka. */
  note: string;
}

/** Ringkasan penyimpanan per folder, dipakai halaman Pustaka Gambar. */
export async function buildMediaReport(
  listFolder: (folder: string) => Promise<{ path: string; size: number }[]>,
  folders: string[]
): Promise<MediaReport> {
  const usageMap = await buildMediaUsage();
  const summaries: FolderSummary[] = [];
  let totalFiles = 0;
  let totalBytes = 0;
  let unusedFiles = 0;
  let unusedBytes = 0;

  for (const folder of folders) {
    const files = await listFolder(folder);
    let bytes = 0;
    let unusedF = 0;
    let unusedB = 0;
    for (const file of files) {
      bytes += file.size;
      const key = normalizeMediaPath(file.path);
      const used = usageMap.usage[key];
      if (!used || used.length === 0) {
        unusedF += 1;
        unusedB += file.size;
      }
    }
    summaries.push({ folder, files: files.length, bytes, unusedFiles: unusedF, unusedBytes: unusedB });
    totalFiles += files.length;
    totalBytes += bytes;
    unusedFiles += unusedF;
    unusedBytes += unusedB;
  }

  return {
    totalFiles,
    totalBytes,
    unusedFiles,
    unusedBytes,
    folders: summaries.sort((a, b) => b.bytes - a.bytes),
    analyzedAt: usageMap.analyzedAt,
    note: `Gambar disajikan lewat CDN (${ADMIN.assetsRepo}), bukan disimpan di Vercel.`,
  };
}
