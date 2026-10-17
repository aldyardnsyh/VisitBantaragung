// Registry koleksi konten: satu sumber kebenaran untuk dasbor admin.
//
// Setiap koleksi mendeskripsikan folder JSON-nya, field yang boleh diedit,
// dan urutan kunci agar hasil tulis kembali stabil (diff commit rapi).
// Field di luar daftar ini TIDAK dihapus saat menyimpan (lihat mergeRecord),
// sehingga penanda internal crawler (_rewritten, rewriteStatus) tetap utuh.

export type FieldType =
  | "text"
  | "textarea"
  | "paragraphs"
  | "number"
  | "date"
  | "select"
  | "tags"
  | "list"
  | "image"
  | "gallery"
  | "whatsapp"
  | "url"
  | "boolean";

export interface FieldDef {
  key: string;
  label: string;
  type: FieldType;
  required?: boolean;
  help?: string;
  placeholder?: string;
  options?: string[];
  rows?: number;
  maxLength?: number;
  /** Untuk field bertipe number: izinkan desimal (lat/lng). */
  decimal?: boolean;
}

export interface CollectionDef {
  id: string;
  label: string;
  labelSingular: string;
  /** Folder relatif di dalam content/ . */
  dir: string;
  description: string;
  /** Kunci untuk nama berkas & URL. */
  slugKey: string;
  /** Field yang ditampilkan di tabel daftar. */
  titleKey: string;
  subtitleKey?: string;
  dateKey?: string;
  imageKey?: string;
  /** Urutan kunci saat menulis JSON. Kunci lain menyusul setelahnya. */
  order: string[];
  fields: FieldDef[];
  /** true = dikelola crawler otomatis; admin hanya boleh mengedit terbatas. */
  readOnlyCreate?: boolean;
  /** Field yang tidak boleh diubah pada koleksi readOnlyCreate. */
  lockedFields?: string[];
  /** Sumber gambar yang dipakai: repo aset (CDN) atau public/ repo konten. */
  assetTarget: "assets" | "local";
  /** Prefix folder gambar di repo aset, mis. "wisata". */
  assetPrefix: string;
}

const KATEGORI_WISATA = ["alam", "budaya", "edukasi", "akomodasi", "kuliner", "paket"];
const KATEGORI_LOKASI = ["wisata-alam", "akomodasi", "camping", "wisata", "herbal", "umum"];
const KATEGORI_ARTIKEL = [
  "ekonomi",
  "lingkungan",
  "kesehatan",
  "teknologi",
  "wisata",
  "pendidikan",
  "kebencanaan",
  "kreativitas",
  "pertanian",
  "sosial",
  "seni",
  "hukum",
  "dokumentasi",
];
const KATEGORI_BERITA = ["berita desa", "wisata", "kuliner", "event"];

export const COLLECTIONS: CollectionDef[] = [
  {
    id: "wisata",
    label: "Destinasi Wisata",
    labelSingular: "Destinasi",
    dir: "wisata",
    description: "Daftar destinasi yang tampil di halaman Wisata dan halaman utama.",
    slugKey: "slug",
    titleKey: "title",
    subtitleKey: "excerpt",
    imageKey: "cover",
    order: [
      "slug",
      "kategori",
      "title",
      "excerpt",
      "description",
      "cover",
      "gallery",
      "location",
      "facilities",
      "activities",
    ],
    assetTarget: "assets",
    assetPrefix: "wisata",
    fields: [
      { key: "title", label: "Nama destinasi", type: "text", required: true, placeholder: "Curug Cipeuteuy" },
      { key: "slug", label: "Slug", type: "text", required: true, help: "Alamat halaman: /wisata/<slug>. Huruf kecil, angka, dan tanda hubung." },
      { key: "kategori", label: "Kategori", type: "select", required: true, options: KATEGORI_WISATA },
      { key: "excerpt", label: "Ringkasan", type: "textarea", required: true, rows: 2, maxLength: 280, help: "Muncul di kartu daftar destinasi. Maksimal 280 karakter." },
      { key: "description", label: "Deskripsi lengkap", type: "textarea", required: true, rows: 8 },
      { key: "cover", label: "Gambar sampul", type: "image", required: true },
      { key: "gallery", label: "Galeri foto", type: "gallery", help: "Foto tambahan di halaman detail." },
      { key: "lat", label: "Lintang (lat)", type: "number", required: true, decimal: true, placeholder: "-6.841111" },
      { key: "lng", label: "Bujur (lng)", type: "number", required: true, decimal: true, placeholder: "108.392778" },
      { key: "facilities", label: "Fasilitas", type: "list", help: "Satu fasilitas per baris." },
      { key: "activities", label: "Aktivitas", type: "list", help: "Satu aktivitas per baris." },
    ],
  },
  {
    id: "herbal",
    label: "Katalog Tanaman Herbal",
    labelSingular: "Tanaman",
    dir: "b2h/katalog-tanaman",
    description: "Katalog tanaman obat Kampung Herbal Mertasela.",
    slugKey: "slug",
    titleKey: "name",
    subtitleKey: "excerpt",
    imageKey: "cover",
    order: ["slug", "name", "latin", "excerpt", "description", "cover", "gallery", "benefits", "usage"],
    assetTarget: "assets",
    assetPrefix: "b2h/katalog-tanaman",
    fields: [
      { key: "name", label: "Nama tanaman", type: "text", required: true, placeholder: "Jahe" },
      { key: "slug", label: "Slug", type: "text", required: true, help: "Alamat halaman: /b2h/katalog/<slug>." },
      { key: "latin", label: "Nama latin", type: "text", required: true, placeholder: "Zingiber officinale" },
      { key: "excerpt", label: "Ringkasan", type: "textarea", required: true, rows: 2, maxLength: 280 },
      { key: "description", label: "Deskripsi", type: "textarea", required: true, rows: 6 },
      { key: "cover", label: "Gambar sampul", type: "image", required: true },
      { key: "gallery", label: "Galeri foto", type: "gallery" },
      { key: "benefits", label: "Khasiat", type: "list", help: "Satu khasiat per baris." },
      { key: "usage", label: "Cara pemanfaatan", type: "list", help: "Satu cara per baris." },
    ],
  },
  {
    id: "homestay",
    label: "Homestay",
    labelSingular: "Homestay",
    dir: "bdb/homestay",
    description: "Penginapan warga yang tampil di halaman Bisnis Desa.",
    slugKey: "slug",
    titleKey: "name",
    subtitleKey: "excerpt",
    imageKey: "cover",
    order: [
      "slug",
      "name",
      "excerpt",
      "description",
      "cover",
      "gallery",
      "capacity",
      "facilities",
      "price",
      "address",
      "contact",
    ],
    assetTarget: "assets",
    assetPrefix: "bdb/homestay",
    fields: [
      { key: "name", label: "Nama homestay", type: "text", required: true, placeholder: "Homestay Bu Ani" },
      { key: "slug", label: "Slug", type: "text", required: true },
      { key: "excerpt", label: "Ringkasan", type: "textarea", required: true, rows: 2, maxLength: 280 },
      { key: "description", label: "Deskripsi", type: "textarea", required: true, rows: 6 },
      { key: "cover", label: "Gambar sampul", type: "image", required: true },
      { key: "gallery", label: "Galeri foto", type: "gallery" },
      { key: "capacity", label: "Kapasitas", type: "text", placeholder: "4 orang", help: "Tulis lengkap dengan satuannya, mis. \"6 orang\"." },
      { key: "facilities", label: "Fasilitas", type: "list" },
      { key: "price", label: "Harga mulai", type: "text", placeholder: "Rp 200.000", help: "Kosongkan bila harga belum ditetapkan." },
      { key: "address", label: "Alamat", type: "text" },
      { key: "whatsapp", label: "Nomor WhatsApp", type: "whatsapp", required: true, help: "Format internasional tanpa tanda plus, mis. 6281234567890." },
      { key: "email", label: "Email (opsional)", type: "text" },
    ],
  },
  {
    id: "umkm",
    label: "UMKM",
    labelSingular: "UMKM",
    dir: "bdb/umkm",
    description: "Usaha warga yang tampil di halaman Digital Branding.",
    slugKey: "slug",
    titleKey: "name",
    subtitleKey: "excerpt",
    imageKey: "cover",
    order: ["slug", "name", "excerpt", "description", "cover", "gallery", "contact"],
    assetTarget: "assets",
    assetPrefix: "bdb/umkm",
    fields: [
      { key: "name", label: "Nama usaha", type: "text", required: true },
      { key: "slug", label: "Slug", type: "text", required: true },
      { key: "excerpt", label: "Ringkasan", type: "textarea", required: true, rows: 2, maxLength: 280 },
      { key: "description", label: "Deskripsi", type: "textarea", required: true, rows: 6 },
      { key: "cover", label: "Gambar sampul", type: "image", required: true },
      { key: "gallery", label: "Galeri foto", type: "gallery" },
      { key: "whatsapp", label: "Nomor WhatsApp", type: "whatsapp", required: true },
    ],
  },
  {
    id: "artikel",
    label: "Artikel KKN",
    labelSingular: "Artikel",
    dir: "bic/artikel",
    description: "Artikel program KKN-PPM UGM di Bantaragung.",
    slugKey: "slug",
    titleKey: "title",
    subtitleKey: "excerpt",
    dateKey: "date",
    imageKey: "cover",
    order: [
      "slug",
      "title",
      "excerpt",
      "date",
      "category",
      "author",
      "cover",
      "gallery",
      "content",
      "tags",
      "origin",
      "updatedAt",
    ],
    assetTarget: "assets",
    assetPrefix: "bic/artikel",
    fields: [
      { key: "title", label: "Judul", type: "text", required: true },
      { key: "slug", label: "Slug", type: "text", required: true, help: "Alamat halaman: /bic/artikel/<slug>." },
      { key: "excerpt", label: "Ringkasan", type: "textarea", required: true, rows: 3, maxLength: 280 },
      { key: "date", label: "Tanggal", type: "date", required: true },
      { key: "category", label: "Kategori", type: "select", required: true, options: KATEGORI_ARTIKEL },
      { key: "author", label: "Penulis", type: "text" },
      { key: "cover", label: "Gambar sampul", type: "image", required: true },
      { key: "gallery", label: "Galeri foto", type: "gallery" },
      { key: "content", label: "Isi artikel", type: "paragraphs", required: true, help: "Tulis satu paragraf per blok." },
      { key: "tags", label: "Tag", type: "tags", help: "Tekan Enter untuk menambahkan tag." },
    ],
  },
  {
    id: "berita",
    label: "Berita",
    labelSingular: "Berita",
    dir: "bic/berita",
    description:
      "Berita hasil sinkronisasi otomatis dari bantaragung.com. Boleh disunting, tetapi jangan dihapus agar tidak terunduh ulang.",
    slugKey: "slug",
    titleKey: "title",
    subtitleKey: "excerpt",
    dateKey: "date",
    imageKey: "cover",
    readOnlyCreate: true,
    lockedFields: ["slug"],
    order: [
      "slug",
      "title",
      "excerpt",
      "date",
      "category",
      "author",
      "cover",
      "gallery",
      "content",
      "origin",
      "tags",
      "sourceUrl",
      "sourcePublishedAt",
      "updatedAt",
      "rewriteStatus",
    ],
    assetTarget: "local",
    assetPrefix: "berita",
    fields: [
      { key: "title", label: "Judul", type: "text", required: true },
      { key: "excerpt", label: "Ringkasan", type: "textarea", required: true, rows: 3, maxLength: 280 },
      { key: "date", label: "Tanggal", type: "date", required: true },
      { key: "category", label: "Kategori", type: "select", required: true, options: KATEGORI_BERITA },
      { key: "cover", label: "Gambar sampul", type: "image", required: true },
      { key: "content", label: "Isi berita", type: "paragraphs", required: true },
      { key: "tags", label: "Tag", type: "tags" },
    ],
  },
  {
    id: "lokasi",
    label: "Lokasi Peta",
    labelSingular: "Lokasi",
    dir: "bmc/lokasi",
    description: "Titik lokasi yang tampil di Peta Digital.",
    slugKey: "slug",
    titleKey: "name",
    subtitleKey: "excerpt",
    imageKey: "cover",
    order: ["slug", "name", "category", "lat", "lng", "excerpt", "cover"],
    assetTarget: "assets",
    assetPrefix: "bmc/lokasi",
    fields: [
      { key: "name", label: "Nama lokasi", type: "text", required: true },
      { key: "slug", label: "Slug", type: "text", required: true, help: "Alamat halaman: /bmc/lokasi/<slug>." },
      { key: "category", label: "Kategori", type: "select", required: true, options: KATEGORI_LOKASI },
      { key: "excerpt", label: "Ringkasan", type: "textarea", required: true, rows: 2, maxLength: 280 },
      { key: "lat", label: "Lintang (lat)", type: "number", required: true, decimal: true, placeholder: "-6.841111" },
      { key: "lng", label: "Bujur (lng)", type: "number", required: true, decimal: true, placeholder: "108.392778" },
      { key: "cover", label: "Gambar", type: "image", required: true },
    ],
  },
];

export const COLLECTION_MAP = new Map(COLLECTIONS.map((c) => [c.id, c]));

export function getCollection(id: string): CollectionDef | null {
  return COLLECTION_MAP.get(id) ?? null;
}

/** Ubah teks menjadi slug aman: huruf kecil, angka, tanda hubung. */
export function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export function isValidSlug(value: string): boolean {
  return /^[a-z0-9][a-z0-9-]{0,78}[a-z0-9]$/.test(value) || /^[a-z0-9]$/.test(value);
}

/**
 * Susun objek JSON akhir: kunci sesuai urutan definisi, sisanya (penanda
 * internal) dipertahankan apa adanya, dan field opsional kosong dibuang.
 */
export function buildRecord(
  collection: CollectionDef,
  values: Record<string, unknown>,
  extra: Record<string, unknown> = {}
): Record<string, unknown> {
  const merged: Record<string, unknown> = { ...extra, ...values };
  const result: Record<string, unknown> = {};

  for (const key of collection.order) {
    const value = merged[key];
    if (value === undefined) continue;
    if (value === "" && !isRequiredKey(collection, key)) continue;
    result[key] = value;
  }

  // Kunci di luar definisi (mis. _rewritten, rewriteStatus) tetap dibawa.
  for (const [key, value] of Object.entries(merged)) {
    if (key in result) continue;
    if (collection.order.includes(key)) continue;
    result[key] = value;
  }

  return result;
}

function isRequiredKey(collection: CollectionDef, key: string): boolean {
  return collection.fields.some((f) => f.key === key && f.required);
}

export function serializeRecord(record: Record<string, unknown>): string {
  return `${JSON.stringify(record, null, 4)}\n`;
}
