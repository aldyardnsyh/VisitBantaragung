import "server-only";

// Konfigurasi dasbor admin. Semua nilai sensitif diambil dari environment
// Vercel / .env.local dan tidak pernah dikirim ke browser.

function env(name: string, fallback = ""): string {
  return (process.env[name] ?? fallback).trim();
}

export const ADMIN = {
  /** Repo berisi konten JSON (content/**) dan kode situs. */
  contentRepo: env("ADMIN_CONTENT_REPO", "aldyardnsyh/VisitBantaragung"),
  /** Repo aset gambar yang disajikan lewat jsDelivr. */
  assetsRepo: env("ADMIN_ASSETS_REPO", "aldyardnsyh/VisitBantaragung-Assets"),
  /** Branch tujuan commit di repo konten. Push ke branch ini memicu build Vercel. */
  branch: env("ADMIN_BRANCH", "main"),
  /**
   * Branch repo aset. Dipisah dari branch konten karena kedua repo adalah
   * repositori yang berbeda dan bisa punya branch berbeda. Bawaannya `main`,
   * bukan mengikuti ADMIN_BRANCH, supaya mengganti branch konten (misalnya
   * untuk uji coba) tidak membuat unggahan gambar gagal 404 di repo aset.
   */
  assetsBranch: env("ADMIN_ASSETS_BRANCH", "main"),
  /** Fine-grained PAT dengan akses Contents (baca/tulis) ke kedua repo. */
  token: env("ADMIN_GITHUB_TOKEN") || env("GITHUB_TOKEN"),

  username: env("ADMIN_USERNAME", "admin"),
  /** Format: scrypt$N$r$p$salt$hash (dibuat oleh scripts/admin-password.mjs). */
  passwordHash: env("ADMIN_PASSWORD_HASH"),
  /** Cadangan sederhana bila hash belum dibuat. Kurang aman, hanya untuk awal. */
  passwordPlain: env("ADMIN_PASSWORD"),
  /** Kunci HMAC untuk cookie sesi. Wajib acak dan rahasia. */
  sessionSecret: env("ADMIN_SESSION_SECRET"),
  sessionTtlSeconds: Number(env("ADMIN_SESSION_TTL", "28800")) || 28800,

  /** Identitas commit. Bila email kosong, GitHub memakai pemilik token. */
  commitName: env("ADMIN_COMMIT_NAME", "Visit Bantaragung CMS"),
  commitEmail: env("ADMIN_COMMIT_EMAIL"),

  /** Workflow crawler berita untuk tombol "Sinkronkan berita". */
  syncWorkflow: env("ADMIN_SYNC_WORKFLOW", "sync.yml"),

  cdnBase: env(
    "NEXT_PUBLIC_ASSET_BASE_URL",
    "https://cdn.jsdelivr.net/gh/aldyardnsyh/VisitBantaragung-Assets@main"
  ).replace(/\/+$/, ""),
};

export interface ConfigStatus {
  token: boolean;
  auth: boolean;
  hashedPassword: boolean;
  plainPassword: boolean;
  contentRepo: string;
  assetsRepo: string;
  branch: string;
}

export function configStatus(): ConfigStatus {
  return {
    token: Boolean(ADMIN.token),
    auth: Boolean(ADMIN.sessionSecret && (ADMIN.passwordHash || ADMIN.passwordPlain)),
    hashedPassword: Boolean(ADMIN.passwordHash),
    plainPassword: Boolean(ADMIN.passwordPlain),
    contentRepo: ADMIN.contentRepo,
    assetsRepo: ADMIN.assetsRepo,
    branch: ADMIN.branch,
  };
}

/** Folder yang boleh menerima unggahan gambar di repo aset. */
export const MEDIA_FOLDERS = ["wisata", "b2h", "bdb", "bic", "bmc", "galeri", "berita", "_brand"] as const;
export type MediaFolder = (typeof MEDIA_FOLDERS)[number];

export function isMediaFolder(value: string): value is MediaFolder {
  return (MEDIA_FOLDERS as readonly string[]).includes(value);
}
