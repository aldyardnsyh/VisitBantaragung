import "server-only";
import { ADMIN } from "./config";
import { getContentTree, listAssetDir, listContentDir } from "./github";
import { buildMediaUsage, normalizeMediaPath } from "./media-usage";

/**
 * Pencatatan seluruh gambar di repositori aset, termasuk subfolder.
 *
 * Sebelumnya daftar gambar hanya membaca satu tingkat folder, sehingga
 * struktur seperti b2h/katalog-tanaman/<slug>/cover.webp dan
 * bic/artikel/<slug>/cover.webp tidak terlihat. Akibatnya laporan
 * penyimpanan melaporkan angka yang jauh lebih kecil dari kenyataan.
 *
 * Solusi: satu panggilan Git Trees API rekursif yang mengembalikan semua
 * berkas beserta ukurannya, lalu disaring per folder.
 */

export interface AssetFile {
  path: string;
  name: string;
  size: number;
  url: string;
  sha: string;
}

export interface FolderStat {
  folder: string;
  files: number;
  bytes: number;
  unusedFiles: number;
  unusedBytes: number;
}

export interface StorageReport {
  totalFiles: number;
  totalBytes: number;
  usedFiles: number;
  usedBytes: number;
  unusedFiles: number;
  unusedBytes: number;
  folders: FolderStat[];
  analyzedAt: string;
  /** Lokasi penyimpanan, untuk konteks di antarmuka. */
  where: string;
}

const IMAGE_EXT = /\.(png|jpe?g|webp|gif|svg|avif)$/i;

/** Tree aset di-cache singkat; repositori ini jarang berubah. */
let treeCache: { files: AssetFile[]; expires: number } | null = null;
const TREE_CACHE_MS = 120_000;

/** Seluruh berkas gambar di repo aset, rekursif. */
export async function listAllAssetFiles(force = false): Promise<AssetFile[]> {
  if (!force && treeCache && treeCache.expires > Date.now()) return treeCache.files;

  const tree = await getContentTreeForRepo(ADMIN.assetsRepo);
  const files = tree
    .filter((entry) => entry.type === "blob" && IMAGE_EXT.test(entry.path))
    .map((entry) => ({
      path: entry.path,
      name: entry.path.split("/").pop() ?? entry.path,
      size: entry.size,
      sha: entry.sha,
      url: `${ADMIN.cdnBase}/${entry.path}`,
    }));

  treeCache = { files, expires: Date.now() + TREE_CACHE_MS };
  return files;
}

export function invalidateAssetTree() {
  treeCache = null;
}

/**
 * Ambil pohon berkas dari repo mana pun.
 *
 * github.ts menyediakan getContentTree() khusus repo konten. Fungsi ini
 * menggeneralisasi untuk repo aset tanpa menduplikasi logika retry.
 */
async function getContentTreeForRepo(repoSlug: string): Promise<
  Array<{ path: string; sha: string; size: number; type: string }>
> {
  const [owner, repo] = repoSlug.split("/");
  const headers = {
    Authorization: `Bearer ${ADMIN.token}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "visitbantaragung-cms",
  };

  const refRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/ref/heads/${ADMIN.assetsBranch}`, {
    headers,
    cache: "no-store",
  });
  if (!refRes.ok) throw new Error(`Gagal membaca ref repo aset: ${refRes.status}`);
  const ref = (await refRes.json()) as { object: { sha: string } };

  const commitRes = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/git/commits/${ref.object.sha}`,
    { headers, cache: "no-store" }
  );
  if (!commitRes.ok) throw new Error(`Gagal membaca commit repo aset: ${commitRes.status}`);
  const commit = (await commitRes.json()) as { tree: { sha: string } };

  const treeRes = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/git/trees/${commit.tree.sha}?recursive=1`,
    { headers, cache: "no-store" }
  );
  if (!treeRes.ok) throw new Error(`Gagal membaca tree repo aset: ${treeRes.status}`);
  const tree = (await treeRes.json()) as {
    tree: Array<{ path: string; sha: string; size?: number; type: string }>;
    truncated?: boolean;
  };

  return tree.tree.map((entry) => ({
    path: entry.path,
    sha: entry.sha,
    size: entry.size ?? 0,
    type: entry.type,
  }));
}

/** Daftar gambar dalam satu folder (rekursif ke subfolder). */
export async function listFolderFiles(folder: string, force = false): Promise<AssetFile[]> {
  const all = await listAllAssetFiles(force);
  const prefix = folder.replace(/^\/+|\/+$/g, "");
  if (!prefix) return all;
  return all.filter((file) => file.path.startsWith(`${prefix}/`));
}

/**
 * Laporan penyimpanan lengkap: per folder, dengan penanda terpakai/tidak.
 * Inilah data yang menjawab pertanyaan "gambar mana yang memakan tempat dan
 * mana yang aman dihapus".
 */
export async function buildStorageReport(force = false): Promise<StorageReport> {
  const [files, usage] = await Promise.all([listAllAssetFiles(force), buildMediaUsage(force)]);

  const byFolder = new Map<string, FolderStat>();

  for (const file of files) {
    const root = file.path.split("/")[0] || "(lainnya)";
    const key = normalizeMediaPath(file.path);
    const used = usage.usage[key];
    const isUsed = Boolean(used && used.length > 0);

    const stat = byFolder.get(root) ?? {
      folder: root,
      files: 0,
      bytes: 0,
      unusedFiles: 0,
      unusedBytes: 0,
    };
    stat.files += 1;
    stat.bytes += file.size;
    if (!isUsed) {
      stat.unusedFiles += 1;
      stat.unusedBytes += file.size;
    }
    byFolder.set(root, stat);
  }

  const folders = [...byFolder.values()].sort((a, b) => b.bytes - a.bytes);
  const totalBytes = files.reduce((sum, f) => sum + f.size, 0);
  const unusedBytes = folders.reduce((sum, f) => sum + f.unusedBytes, 0);
  const unusedFiles = folders.reduce((sum, f) => sum + f.unusedFiles, 0);

  return {
    totalFiles: files.length,
    totalBytes,
    usedFiles: files.length - unusedFiles,
    usedBytes: totalBytes - unusedBytes,
    unusedFiles,
    unusedBytes,
    folders,
    analyzedAt: new Date().toISOString(),
    where: `Repositori aset ${ADMIN.assetsRepo} (CDN), terpisah dari penyimpanan Vercel`,
  };
}
