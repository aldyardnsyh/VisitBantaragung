import "server-only";
import { commitContentFiles, getContentFile } from "./github";
import { ApiError } from "./guard";
import { ADMIN } from "./config";

// Pengaturan situs adalah berkas tunggal (bukan koleksi), jadi punya jalur
// simpan sendiri. Hanya dua berkas yang boleh disentuh: site.json dan seo.json.
// profile.json sengaja belum dibuka di versi ini karena strukturnya berupa
// daftar naratif yang lebih mudah disunting langsung di repositori.

export const SETTINGS_FILES = {
  site: "content/settings/site.json",
  seo: "content/settings/seo.json",
} as const;

export type SettingsKey = keyof typeof SETTINGS_FILES;

export function isSettingsKey(value: string): value is SettingsKey {
  return value === "site" || value === "seo";
}

export async function readSettings(key: SettingsKey): Promise<Record<string, unknown>> {
  const file = await getContentFile(SETTINGS_FILES[key]);
  if (!file) throw new ApiError(`Berkas pengaturan ${key}.json tidak ditemukan.`, 404);
  try {
    return JSON.parse(file.content) as Record<string, unknown>;
  } catch {
    throw new ApiError(`Berkas ${key}.json tidak dapat dibaca (JSON tidak valid).`, 500);
  }
}

export async function readSettingsWithSha(
  key: SettingsKey
): Promise<{ data: Record<string, unknown>; sha: string }> {
  const file = await getContentFile(SETTINGS_FILES[key]);
  if (!file) throw new ApiError(`Berkas pengaturan ${key}.json tidak ditemukan.`, 404);
  try {
    return { data: JSON.parse(file.content) as Record<string, unknown>, sha: file.sha };
  } catch {
    throw new ApiError(`Berkas ${key}.json tidak dapat dibaca (JSON tidak valid).`, 500);
  }
}

export async function saveSettings(
  key: SettingsKey,
  values: Record<string, unknown>,
  username: string
): Promise<{ commitUrl: string }> {
  if (key === "site") validateSite(values);
  if (key === "seo") validateSeo(values);

  // Gabungkan dengan berkas lama agar kunci yang belum tersedia di form tetap
  // dipertahankan apa adanya.
  const { data: current } = await readSettingsWithSha(key);
  const merged = deepMerge(current, values);

  const serialized = `${JSON.stringify(merged, null, 4)}\n`;
  if (serialized.length > 200_000) {
    throw new ApiError("Isi pengaturan terlalu besar.", 422);
  }

  const result = await commitContentFiles(
    [{ path: SETTINGS_FILES[key], content: serialized }],
    `pengaturan: perbarui ${key}.json oleh ${username}`
  );
  return { commitUrl: result.url };
}

function validateSite(values: Record<string, unknown>): void {
  const siteName = String(values.siteName ?? "").trim();
  const tagline = String(values.tagline ?? "").trim();
  const description = String(values.description ?? "").trim();

  if (!siteName) throw new ApiError("Nama situs wajib diisi.", 422);
  if (!tagline) throw new ApiError("Tagline wajib diisi.", 422);
  if (!description) throw new ApiError("Deskripsi situs wajib diisi.", 422);

  const location = values.location as Record<string, unknown> | undefined;
  if (location) {
    const lat = Number(location.latitude);
    const lng = Number(location.longitude);
    if (Number.isFinite(lat) && (lat < -90 || lat > 90)) {
      throw new ApiError("Lintang harus antara -90 dan 90.", 422);
    }
    if (Number.isFinite(lng) && (lng < -180 || lng > 180)) {
      throw new ApiError("Bujur harus antara -180 dan 180.", 422);
    }
  }

  const contact = values.contact as Record<string, unknown> | undefined;
  if (contact?.whatsapp) {
    const digits = String(contact.whatsapp).replace(/[^0-9]/g, "");
    if (digits && !/^62\d{8,14}$/.test(digits)) {
      throw new ApiError(
        "Nomor WhatsApp kantor gunakan format 62 diikuti nomor, mis. 6281234567890.",
        422
      );
    }
  }
}

function validateSeo(values: Record<string, unknown>): void {
  if (!String(values.defaultTitle ?? "").trim()) {
    throw new ApiError("Judul default wajib diisi.", 422);
  }
  if (!String(values.defaultDescription ?? "").trim()) {
    throw new ApiError("Deskripsi default wajib diisi.", 422);
  }
  const template = String(values.titleTemplate ?? "");
  if (template && !template.includes("%s")) {
    throw new ApiError('Pola judul harus memuat penanda "%s" untuk judul halaman.', 422);
  }
}

function deepMerge(
  base: Record<string, unknown>,
  patch: Record<string, unknown>
): Record<string, unknown> {
  const result: Record<string, unknown> = { ...base };
  for (const [key, value] of Object.entries(patch)) {
    const existing = base[key];
    if (
      value &&
      typeof value === "object" &&
      !Array.isArray(value) &&
      existing &&
      typeof existing === "object" &&
      !Array.isArray(existing)
    ) {
      result[key] = deepMerge(
        existing as Record<string, unknown>,
        value as Record<string, unknown>
      );
    } else {
      result[key] = value;
    }
  }
  return result;
}

/** Alamat publik situs, ditampilkan sebagai tautan "Lihat Situs". */
export function publicSiteUrl(): string {
  return process.env.NEXT_PUBLIC_SITE_URL || "https://visitbantaragung.com";
}

export const ADMIN_INFO = {
  contentRepo: ADMIN.contentRepo,
  assetsRepo: ADMIN.assetsRepo,
  branch: ADMIN.branch,
  cdnBase: ADMIN.cdnBase,
};
