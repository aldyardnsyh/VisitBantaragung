import "server-only";
import { ADMIN } from "./config";
import {
  CollectionDef,
  buildRecord,
  serializeRecord,
  slugify,
} from "./collections";
import { commitAssetFiles, commitContentFiles, FileChange, getContentFile, getContentTree, listAssetDir, listContentDir, readRawFile } from "./github";
import { formValuesToRecord, FormValues, validateFormValues, recordToFormValues } from "./transform";
import { ApiError } from "./guard";

export interface RecordSummary {
  slug: string;
  title: string;
  subtitle: string;
  date?: string;
  image?: string;
  /** SHA berkas di GitHub, untuk deteksi konflik saat menyimpan. */
  sha: string;
  updatedAt?: string;
}

export interface RecordDetail extends RecordSummary {
  values: FormValues;
  /** Field mentah asli, dipakai untuk mempertahankan kunci tak dikenal. */
  raw: Record<string, unknown>;
}

function pickString(record: Record<string, unknown>, key: string | undefined): string {
  if (!key) return "";
  const value = record[key];
  return typeof value === "string" ? value : "";
}

/**
 * Validasi slug sebelum dipakai menyusun path repositori.
 *
 * Slug datang dari pengguna dan dipakai sebagai nama berkas. Tanpa pemeriksaan
 * ini, nilai seperti "../../package" dapat membaca atau menimpa berkas di luar
 * folder konten. Aturannya sengaja ketat: huruf kecil, angka, tanda hubung.
 */
function assertSafeSlug(slug: string): string {
  const clean = slug.trim();
  if (!clean) throw new ApiError("Slug wajib diisi.", 422);
  if (clean.length > 80) throw new ApiError("Slug terlalu panjang (maksimal 80 karakter).", 422);
  if (!/^[a-z0-9][a-z0-9-]*[a-z0-9]$|^[a-z0-9]$/.test(clean)) {
    throw new ApiError(
      "Slug hanya boleh berisi huruf kecil, angka, dan tanda hubung.",
      422
    );
  }
  return clean;
}

function fileToSlug(collection: CollectionDef, fileName: string): string {
  return fileName.replace(/\.json$/i, "");
}

export async function listRecords(collection: CollectionDef): Promise<RecordSummary[]> {
  // Satu panggilan Tree API mengambil daftar berkas + SHA sekaligus, lalu isi
  // dibaca dari raw.githubusercontent (tidak memakan kuota API).
  const tree = await getContentTree();
  const prefix = `content/${collection.dir}/`;
  const files = tree.filter(
    (entry) =>
      entry.type === "blob" &&
      entry.path.startsWith(prefix) &&
      entry.path.endsWith(".json") &&
      !entry.path.slice(prefix.length).includes("/")
  );

  const summaries: RecordSummary[] = [];
  const batchSize = 8;

  for (let i = 0; i < files.length; i += batchSize) {
    const batch = files.slice(i, i + batchSize);
    const results = await Promise.all(
      batch.map(async (file) => {
        const fileName = file.path.slice(prefix.length);
        const raw = await readRawFile(file.path);
        if (raw === null) return null;
        try {
          const parsed = JSON.parse(raw) as Record<string, unknown>;
          const summary: RecordSummary = {
            slug: pickString(parsed, collection.slugKey) || fileToSlug(collection, fileName),
            title: pickString(parsed, collection.titleKey) || fileToSlug(collection, fileName),
            subtitle: pickString(parsed, collection.subtitleKey),
            date: pickString(parsed, collection.dateKey) || undefined,
            image: pickString(parsed, collection.imageKey) || undefined,
            sha: file.sha,
            updatedAt: pickString(parsed, "updatedAt") || undefined,
          };
          return summary;
        } catch {
          return {
            slug: fileToSlug(collection, fileName),
            title: `(berkas rusak) ${fileName}`,
            subtitle: "JSON tidak dapat dibaca. Periksa berkas ini di GitHub.",
            sha: file.sha,
          } satisfies RecordSummary;
        }
      })
    );
    for (const item of results) if (item) summaries.push(item);
  }

  return summaries.sort((a, b) => {
    if (collection.dateKey) {
      const da = a.date ?? "";
      const db = b.date ?? "";
      if (da !== db) return db.localeCompare(da);
    }
    return a.title.localeCompare(b.title, "id");
  });
}

export async function getRecord(
  collection: CollectionDef,
  slug: string
): Promise<RecordDetail | null> {
  const safeSlug = assertSafeSlug(slug);
  const path = `content/${collection.dir}/${safeSlug}.json`;
  const file = await getContentFile(path);
  if (!file) return null;
  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(file.content) as Record<string, unknown>;
  } catch {
    throw new ApiError("Berkas konten tidak dapat dibaca (JSON tidak valid).", 500);
  }
  return {
    slug,
    title: pickString(parsed, collection.titleKey) || slug,
    subtitle: pickString(parsed, collection.subtitleKey),
    date: pickString(parsed, collection.dateKey) || undefined,
    image: pickString(parsed, collection.imageKey) || undefined,
    sha: file.sha,
    updatedAt: pickString(parsed, "updatedAt") || undefined,
    values: buildFormValues(collection, parsed),
    raw: parsed,
  };
}

function buildFormValues(collection: CollectionDef, parsed: Record<string, unknown>): FormValues {
  return recordToFormValues(collection, parsed);
}

export interface SaveInput {
  values: FormValues;
  /** Slug sebelum perubahan (untuk rename berkas). */
  originalSlug?: string;
  /** SHA yang dibaca saat membuka form; dipakai mendeteksi perubahan lain. */
  expectedSha?: string;
  /** Slug baru bila pengguna mengganti slug. */
  newSlug?: string;
  username: string;
}

export interface SaveResult {
  slug: string;
  commitUrl: string;
  warnings: string[];
}

export async function saveRecord(
  collection: CollectionDef,
  input: SaveInput
): Promise<SaveResult> {
  const errors = validateFormValues(collection, input.values);
  if (Object.keys(errors).length) {
    throw new ApiError("Periksa kembali kolom yang ditandai.", 422, errors);
  }

  const values = { ...input.values };
  const slugField = collection.slugKey;

  if (collection.readOnlyCreate && collection.lockedFields?.includes(slugField)) {
    values[slugField] = input.originalSlug ?? String(values[slugField] ?? "");
  }

  // Sumber kebenaran slug adalah nilai formulir. newSlug (bila dikirim) hanya
  // dipakai sebagai cadangan ketika field slug tidak ada di payload.
  const rawSlug = String(values[slugField] ?? input.newSlug ?? "");

  // Tolak slug berkarakter berbahaya SEBELUM dinormalisasi, supaya masukan
  // seperti "../../package" tidak diam-diam berubah menjadi slug lain.
  if (/[/\\]/.test(rawSlug) || rawSlug.includes("..")) {
    throw new ApiError("Slug tidak boleh berisi garis miring atau titik ganda.", 422);
  }
  if (rawSlug && !/^[a-zA-Z0-9][a-zA-Z0-9 -]*$/.test(rawSlug)) {
    throw new ApiError(
      "Slug hanya boleh berisi huruf, angka, spasi, dan tanda hubung.",
      422
    );
  }

  const finalSlug = slugify(rawSlug);
  if (!finalSlug) throw new ApiError("Slug tidak boleh kosong.", 422);
  values[slugField] = finalSlug;

  // Mode "buat baru" ditentukan oleh ada tidaknya slug sumber pada permintaan.
  // Ini penting: pada mode buat, slug yang sudah dipakai harus DITOLAK, bukan
  // dianggap sebagai penyuntingan entri yang sudah ada.
  const isCreate = !input.originalSlug;

  // Slug asal dipakai menyusun path baca dan path hapus, jadi wajib divalidasi.
  const originalSlug = input.originalSlug ? assertSafeSlug(input.originalSlug) : finalSlug;
  const targetPath = `content/${collection.dir}/${finalSlug}.json`;
  const sourcePath = `content/${collection.dir}/${originalSlug}.json`;

  const warnings: string[] = [];
  const changes: FileChange[] = [];

  // Pada mode buat, tolak lebih dulu bila slug sudah dipakai. Tanpa ini, entri
  // yang sudah ada akan tertimpa dan hilang.
  if (isCreate) {
    const occupied = await getContentFile(targetPath);
    if (occupied) {
      throw new ApiError(
        `Slug "${finalSlug}" sudah dipakai oleh konten lain. Gunakan slug yang berbeda.`,
        409
      );
    }
  }

  // Baca berkas lama untuk mempertahankan kunci tak dikenal & deteksi konflik.
  let extra: Record<string, unknown> = {};
  const existing = await getContentFile(sourcePath);
  if (existing) {
    if (input.expectedSha && existing.sha !== input.expectedSha) {
      throw new ApiError(
        "Konten ini sudah berubah sejak Anda membukanya. Muat ulang halaman lalu ulangi penyimpanan.",
        409
      );
    }
    try {
      extra = JSON.parse(existing.content) as Record<string, unknown>;
    } catch {
      extra = {};
    }
  } else if (input.expectedSha) {
    throw new ApiError(
      "Konten tidak ditemukan. Mungkin sudah dihapus di tempat lain. Muat ulang halaman.",
      409
    );
  } else if (!isCreate) {
    // Mode ubah tetapi slug sumber tidak ditemukan: permintaan tidak masuk akal.
    throw new ApiError(
      "Konten yang ingin diubah tidak ditemukan. Muat ulang halaman lalu coba lagi.",
      404
    );
  }

  // Ganti slug ke nama yang sudah dipakai entri lain juga harus ditolak, karena
  // berkas lama akan dihapus dan entri lain itu akan tertimpa.
  if (!isCreate && targetPath !== sourcePath) {
    const occupied = await getContentFile(targetPath);
    if (occupied) {
      throw new ApiError(
        `Slug "${finalSlug}" sudah dipakai oleh konten lain. Gunakan slug yang berbeda.`,
        409
      );
    }
  }

  const fieldValues = formValuesToRecord(collection, values);
  const nextRecord = buildRecord(collection, fieldValues, extra);

  // Penanda khusus: pastikan artikel baru selalu dikenali sebagai konten KKN,
  // dan berita tetap "berita" agar tidak berubah menjadi badge KKN.
  if (collection.id === "artikel" && !nextRecord.origin) nextRecord.origin = "kkn";
  if (collection.id === "berita") nextRecord.origin = "berita";
  if (collection.dateKey || collection.id === "artikel" || collection.id === "berita") {
    nextRecord.updatedAt = new Date().toISOString();
  }

  const serialized = serializeRecord(nextRecord);
  if (serialized.length > 400_000) {
    throw new ApiError("Isi konten terlalu besar (di atas 400 KB).", 422);
  }

  changes.push({ path: targetPath, content: serialized });
  if (sourcePath !== targetPath && existing) {
    changes.push({ path: sourcePath, remove: true });
    warnings.push(
      `Berkas lama ${originalSlug}.json dihapus karena slug berubah menjadi ${finalSlug}.`
    );
  }

  const message = `${collection.id}: ${originalSlug === finalSlug ? "ubah" : "ubah slug"} "${finalSlug}" oleh ${input.username}`;
  const result = await commitContentFiles(changes, message);

  return { slug: finalSlug, commitUrl: result.url, warnings };
}

export async function deleteRecord(
  collection: CollectionDef,
  slug: string,
  username: string
): Promise<{ commitUrl: string }> {
  const safeSlug = assertSafeSlug(slug);
  const path = `content/${collection.dir}/${safeSlug}.json`;
  const existing = await getContentFile(path);
  if (!existing) throw new ApiError("Konten tidak ditemukan atau sudah dihapus.", 404);

  const result = await commitContentFiles(
    [{ path, remove: true }],
    `${collection.id}: hapus "${safeSlug}" oleh ${username}`
  );
  return { commitUrl: result.url };
}

export interface CollectionCount {
  id: string;
  label: string;
  count: number;
}

/**
 * Hitung jumlah berkas per koleksi dari SATU panggilan Tree API.
 * Dipakai halaman ringkasan agar tidak membaca seluruh isi konten.
 */
export async function countAllCollections(
  collections: CollectionDef[]
): Promise<CollectionCount[]> {
  const tree = await getContentTree();
  return collections.map((collection) => {
    const prefix = `content/${collection.dir}/`;
    const count = tree.filter(
      (entry) =>
        entry.type === "blob" &&
        entry.path.startsWith(prefix) &&
        entry.path.endsWith(".json") &&
        !entry.path.slice(prefix.length).includes("/")
    ).length;
    return { id: collection.id, label: collection.label, count };
  });
}

export interface MediaItem {
  path: string;
  name: string;
  size: number;
  url: string;
  sha: string;
}

/** Media disimpan di repo aset (CDN) atau repo konten (public/, khusus berita). */
export type MediaTarget = "assets" | "local";

/** Daftar gambar pada folder tertentu. */
export async function listMedia(target: MediaTarget, folder: string): Promise<MediaItem[]> {
  const entries =
    target === "local"
      ? await listContentDir(`public/${folder}`)
      : await listAssetDir(folder);

  const files = entries.filter(
    (e) => e.type === "file" && /\.(png|jpe?g|webp|gif|svg|avif)$/i.test(e.name)
  );

  return files
    .map((file) => ({
      path: target === "local" ? file.path.replace(/^public/, "") : file.path,
      name: file.name,
      size: file.size,
      sha: file.sha,
      url:
        target === "local"
          ? `/${file.path.replace(/^public\//, "")}`
          : `${ADMIN.cdnBase}/${file.path}`,
    }))
    .sort((a, b) => b.name.localeCompare(a.name));
}

export interface UploadInput {
  target: MediaTarget;
  /** Folder tujuan relatif, mis. "wisata/batu-asahan" (aset) atau "berita/slug" (lokal). */
  folder: string;
  fileName: string;
  base64: string;
  username: string;
}

export interface UploadResult {
  path: string;
  url: string;
  /** Nilai yang disimpan di JSON konten. */
  contentPath: string;
}

/**
 * Unggah gambar dengan nama berkas baru (immutable).
 *
 * jsDelivr menyimpan berkas selamanya untuk nama yang sama, jadi mengganti isi
 * berkas lama TIDAK akan terlihat di situs. Karena itu setiap unggahan memakai
 * nama unik ber-timestamp, dan JSON konten menunjuk nama baru tersebut.
 */
export async function uploadMedia(input: UploadInput): Promise<UploadResult> {
  const folder = input.folder.replace(/^\/+|\/+$/g, "");
  if (!folder || folder.includes("..")) {
    throw new ApiError("Folder tujuan tidak valid.", 400);
  }
  if (!/^[a-zA-Z0-9/_-]+$/.test(folder)) {
    throw new ApiError("Folder hanya boleh berisi huruf, angka, garis miring, dan tanda hubung.", 400);
  }

  const safeName = slugify(input.fileName.replace(/\.[^.]+$/, "")) || "gambar";
  const ext = (input.fileName.match(/\.([a-zA-Z0-9]+)$/)?.[1] ?? "jpg").toLowerCase();
  if (!["png", "jpg", "jpeg", "webp", "gif", "svg", "avif"].includes(ext)) {
    throw new ApiError("Format berkas tidak didukung. Gunakan JPG, PNG, atau WebP.", 422);
  }

  const buffer = Buffer.from(input.base64, "base64");
  if (!buffer.length) throw new ApiError("Berkas kosong.", 422);
  if (buffer.length > 3_500_000) {
    throw new ApiError("Ukuran gambar melebihi 3,5 MB setelah dikompresi.", 413);
  }

  const stamp = new Date().toISOString().replace(/[-:T.]/g, "").slice(0, 14);
  const finalName = `${safeName}-${stamp}.${ext === "jpeg" ? "jpg" : ext}`;

  if (input.target === "local") {
    const repoPath = `public/${folder}/${finalName}`;
    await commitContentFiles(
      [{ path: repoPath, base64: input.base64 }],
      `media: unggah ${repoPath} oleh ${input.username}`
    );
    return {
      path: repoPath,
      url: `/${folder}/${finalName}`,
      contentPath: `/${folder}/${finalName}`,
    };
  }

  const path = `${folder}/${finalName}`;
  await commitAssetFiles(
    [{ path, base64: input.base64 }],
    `media: unggah ${path} oleh ${input.username}`
  );

  return {
    path,
    url: `${ADMIN.cdnBase}/${path}`,
    contentPath: path,
  };
}

export async function deleteMedia(
  target: MediaTarget,
  path: string,
  username: string
): Promise<{ commitUrl: string }> {
  const clean = path.replace(/^\/+/, "");
  if (!clean || clean.includes("..")) throw new ApiError("Path tidak valid.", 400);

  if (target === "local") {
    const result = await commitContentFiles(
      [{ path: `public/${clean}`, remove: true }],
      `media: hapus public/${clean} oleh ${username}`
    );
    return { commitUrl: result.url };
  }

  const result = await commitAssetFiles(
    [{ path: clean, remove: true }],
    `media: hapus ${clean} oleh ${username}`
  );
  return { commitUrl: result.url };
}
