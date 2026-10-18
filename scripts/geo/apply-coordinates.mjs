/**
 * Terapkan koordinat hasil pencarian ke berkas konten.
 *
 * Aturan yang dipegang:
 *
 *   1. Koordinat dari OSM hanya dipakai bila skor kecocokan tinggi DAN
 *      kategorinya masuk akal (bukan perumahan bernama mirip).
 *   2. Bila tidak ditemukan, isi dengan titik Desa Wisata Bantaragung
 *      (-6.841111, 108.392778) yang sudah diverifikasi Nominatim sebagai
 *      "Bantar Agung, Majalengka". Ini bukan tebakan: itu memang lokasi desa.
 *   3. Jangan pernah memasang koordinat objek lain yang letaknya jauh.
 *      Lebih baik semua pin di titik desa daripada satu pin menunjuk
 *      gunung yang salah.
 *
 * Pemakaian:
 *   node scripts/geo/apply-coordinates.mjs           (pratinjau)
 *   node scripts/geo/apply-coordinates.mjs --write   (tulis)
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const REPORT = path.join(ROOT, "scripts", "geo", "coordinate-report.json");
const WRITE = process.argv.includes("--write");

/** Titik Desa Wisata Bantaragung, terverifikasi lewat Nominatim. */
const VILLAGE = { lat: -6.841111, lng: 108.392778 };

/**
 * Kategori OSM yang boleh dianggap destinasi. Perumahan, jalan, dan toko
 * TIDAK termasuk: "The Gardens" (perumahan) sempat mendapat skor 100 untuk
 * "Villa Gardenstone" semata-mata karena kata "garden" — itu kecocokan palsu.
 */
const ALLOWED_TYPES = new Set([
  "attraction",
  "viewpoint",
  "camp_site",
  "picnic_site",
  "waterfall",
  "spring",
  "park",
  "zoo",
  "museum",
  "theme_park",
  "hotel",
  "guest_house",
  "chalet",
  "apartment",
  "wilderness_hut",
]);

const MIN_SCORE = 70;

if (!fs.existsSync(REPORT)) {
  console.error("Laporan belum ada. Jalankan dulu: node scripts/geo/find-coordinates.mjs");
  process.exit(1);
}

const report = JSON.parse(fs.readFileSync(REPORT, "utf-8"));

/**
 * Sebagian entitas bukan "tempat", melainkan paket/atraksi/aktivitas
 * (mis. "Paket Campervan", "Pencak Silat", "Nyura"). Untuk itu titik desa
 * memang jawaban yang benar, karena kegiatannya berlangsung di kawasan desa.
 */
const NON_PLACE = /^(paket|nyura|pencak|domba|atraksi|edukasi|penanaman|live-in|homestay-warga|pertanian)/i;

const rows = [];
let written = 0;

for (const item of report.items) {
  const file = path.join(ROOT, item.file);
  if (!fs.existsSync(file)) continue;

  const data = JSON.parse(fs.readFileSync(file, "utf-8"));
  const match = item.match;

  const usable =
    match &&
    match.score >= MIN_SCORE &&
    ALLOWED_TYPES.has(String(match.type)) &&
    !NON_PLACE.test(item.slug);

  let target;
  let reason;

  if (usable) {
    target = { lat: Number(match.lat.toFixed(6)), lng: Number(match.lng.toFixed(6)) };
    reason = `OSM: ${match.name} (${match.type}, skor ${match.score})`;
  } else {
    target = { ...VILLAGE };
    reason = match
      ? `titik desa (kandidat "${match.name}" ditolak: skor ${match.score}, tipe ${match.type})`
      : "titik desa (tidak ditemukan di OSM)";
  }

  // Tulis location untuk wisata, atau lat/lng untuk lokasi peta.
  const isLokasi = item.kind === "lokasi";
  const unchanged = isLokasi
    ? data.lat === target.lat && data.lng === target.lng
    : data.location?.lat === target.lat && data.location?.lng === target.lng;

  if (!unchanged) {
    if (isLokasi) {
      data.lat = target.lat;
      data.lng = target.lng;
    } else {
      data.location = target;
    }
    if (WRITE) fs.writeFileSync(file, `${JSON.stringify(data, null, 4)}\n`);
    written++;
  }

  rows.push({ slug: item.slug, kind: item.kind, target, reason, changed: !unchanged });
}

console.log(`\n${WRITE ? "MENULIS" : "PRATINJAU"} koordinat untuk ${rows.length} entitas\n`);
for (const r of rows) {
  console.log(`  ${r.changed ? "*" : " "} ${r.slug.padEnd(30)} ${r.target.lat}, ${r.target.lng}`);
  console.log(`      ${r.reason}`);
}
console.log(`\n${written} berkas ${WRITE ? "diperbarui" : "akan diperbarui"}.`);
if (!WRITE) console.log("\nJalankan dengan --write untuk menerapkan.");
