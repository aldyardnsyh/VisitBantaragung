// Scraping koordinat destinasi Bantaragung dari OpenStreetMap.
//
// Strategi bertahap (dari paling spesifik ke paling umum):
//   Tahap 1: cari nama destinasi persis di radius 10 km
//   Tahap 2: perluas radius ke 25 km (mencakup Sindangwangi & Majalengka)
//   Tahap 3: cari objek wisata apa pun di sekitar desa (tanpa filter nama)
//   Tahap 4: pakai titik desa Bantaragung sebagai fallback
//
// Hanya hasil dengan skor kecocokan tinggi yang dipakai. Bila sebuah
// destinasi tidak ditemukan setelah semua tahap, koordinatnya diisi titik
// desa (bukan ditebak), dan itu dicatat di laporan.

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const CONTENT_DIR = path.join(ROOT, "content");
const OUT_DIR = path.join(ROOT, "scripts", "geo");

const UA = "VisitBantaragungGeo/1.0 (+visitbantaragung.com; pemetaan desa wisata)";
const VILLAGE = { lat: -6.841111, lng: 108.392778 };

const ENDPOINTS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.osm.ch/api/interpreter",
  "https://maps.mail.ru/osm/tools/overpass/api/interpreter",
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Kirim kueri Overpass dengan retry dan validasi hasil. */
async function overpass(query, label) {
  for (let attempt = 1; attempt <= 3; attempt++) {
    for (const ep of ENDPOINTS) {
      const t0 = Date.now();
      try {
        const res = await fetch(ep, {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            "User-Agent": UA,
          },
          body: `data=${encodeURIComponent(query)}`,
          signal: AbortSignal.timeout(60_000),
        });
        const ct = res.headers.get("content-type") || "";
        if (!res.ok || !ct.includes("json")) continue;
        const json = await res.json();

        // Server yang mengembalikan timestamp tidak wajar memberi hasil
        // kosong palsu (terbukti: "Bandung" pun 0). Tolak respons seperti itu.
        const ts = json.osm3s?.timestamp_osm_base ?? "";
        const sane = /^\d{4}-\d{2}-\d{2}T/.test(ts);
        const els = json.elements ?? [];
        if (!sane) {
          console.warn(`  [${label}] ${new URL(ep).host} timestamp tidak sah (${ts}), dilewati`);
          continue;
        }
        console.log(`  [${label}] ${els.length} objek dari ${new URL(ep).host} (${Date.now() - t0}ms)`);
        return els;
      } catch {
        // coba endpoint berikutnya
      }
    }
    if (attempt < 3) {
      console.warn(`  [${label}] belum berhasil, menunggu 8 detik...`);
      await sleep(8_000);
    }
  }
  console.warn(`  [${label}] GAGAL setelah 3 percobaan`);
  return [];
}

const pick = (t) =>
  t.tourism || t.natural || t.amenity || t.waterway || t.leisure || t.place || t.highway || t.landuse || "-";

const coordsOf = (el) => [el.lat ?? el.center?.lat, el.lon ?? el.center?.lon];

/* ---------------------------------------------------------------- skoring */

const GENERIC = new Set([
  "curug", "air", "terjun", "telaga", "bukit", "batu", "pasar", "bumi", "kopi",
  "kampung", "herbal", "villa", "cottage", "paket", "wisata", "desa",
  "bantaragung", "homestay", "warga", "organik", "pertanian", "penanaman",
  "pohon", "endemik", "edukasi", "tradisi", "atraksi", "live", "umkm",
]);

function norm(s) {
  return String(s ?? "").toLowerCase().normalize("NFKD").replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
}
function toks(s) {
  return norm(s).split(" ").filter((w) => w.length > 3 && !GENERIC.has(w));
}
function score(siteName, osmName) {
  const a = toks(siteName);
  const b = toks(osmName);
  const na = norm(siteName);
  const nb = norm(osmName);
  if (!a.length || !b.length) return na && nb && (na.includes(nb) || nb.includes(na)) ? 55 : 0;
  let hit = 0;
  for (const w of a) if (b.some((x) => x === w || x.startsWith(w) || w.startsWith(x))) hit++;
  const base = (hit / Math.max(a.length, b.length)) * 100;
  const bonus = na.includes(nb) || nb.includes(na) ? 15 : 0;
  return Math.min(100, Math.round(base + bonus));
}

/* ------------------------------------------------------------ alias nama */

const ALIASES = {
  "curug-cipeuteuy": ["Curug Cipeuteuy", "Cipeuteuy"],
  "terasering-ciboer": ["Terasering Ciboer", "Ciboer", "Ciboer Pass"],
  "buper-awilega": ["Bumi Perkemahan Awilega", "Awilega"],
  "telaga-nila": ["Telaga Nila", "Nila"],
  "pasar-bumi-pakuwon": ["Pasar Bumi Pakuwon", "Pakuwon"],
  "kopi-pakuwon": ["Kopi Pakuwon"],
  "bukit-batu-semar": ["Batu Semar"],
  "batu-asahan": ["Batu Asahan"],
  "langit-binuang": ["Binuang"],
  "kampung-herbal-mertasela": ["Mertasela"],
  "cottage-ciboer-pass": ["Ciboer Pass"],
  "villa-gardenstone": ["Gardenstone"],
};

/* -------------------------------------------------------------------- main */

function readAll() {
  const dirs = [["wisata", path.join(CONTENT_DIR, "wisata")], ["lokasi", path.join(CONTENT_DIR, "bmc", "lokasi")]];
  const items = [];
  for (const [kind, dir] of dirs) {
    if (!fs.existsSync(dir)) continue;
    for (const f of fs.readdirSync(dir).filter((x) => x.endsWith(".json"))) {
      const p = path.join(dir, f);
      const d = JSON.parse(fs.readFileSync(p, "utf-8"));
      items.push({ kind, file: p, slug: d.slug ?? f.replace(".json", ""), title: d.title ?? d.name, data: d });
    }
  }
  return items;
}

async function main() {
  const items = readAll();
  console.log(`Menyiapkan pencarian untuk ${items.length} entitas.\n`);

  // --- Tahap 1: semua objek bernama dalam radius 10 km -------------------
  console.log("Tahap 1: objek bernama radius 10 km");
  const near10 = await overpass(
    `[out:json][timeout:90];
     (node["name"](around:10000,${VILLAGE.lat},${VILLAGE.lng});
      way["name"](around:10000,${VILLAGE.lat},${VILLAGE.lng}););
     out center tags;`,
    "radius10"
  );

  // --- Tahap 2: perluas ke 25 km bila hasil masih tipis ------------------
  let pool = near10;
  const relevant = (el) => {
    const n = (el.tags?.name ?? "").toLowerCase();
    return /cipeuteuy|cipetey|ciboer|mertasela|awilega|pakuwon|binuang|semar|asahan|nila|herbal|bantaragung|sindangwangi/.test(n);
  };
  if (near10.filter(relevant).length < 3) {
    console.log("\nTahap 2: hasil tipis, perluas ke radius 25 km");
    const near25 = await overpass(
      `[out:json][timeout:120];
       (node["name"](around:25000,${VILLAGE.lat},${VILLAGE.lng});
        way["name"](around:25000,${VILLAGE.lat},${VILLAGE.lng}););
       out center tags;`,
      "radius25"
    );
    pool = [...near10, ...near25];
  }

  // --- Tahap 3: titik desa (untuk fallback) ------------------------------
  const villageNode = pool.find(
    (el) => (el.tags?.name ?? "").toLowerCase() === "bantaragung" && el.tags?.place
  );

  console.log(`\nTotal objek dianalisis: ${pool.length}`);
  console.log(`Kata kunci destinasi yang cocok: ${pool.filter(relevant).length}`);
  if (villageNode) {
    const [la, ln] = coordsOf(villageNode);
    console.log(`Titik desa Bantaragung di OSM: ${la}, ${ln}`);
  } else {
    console.log("Titik desa Bantaragung tidak ditemukan di OSM");
  }

  // --- Cocokkan tiap entitas --------------------------------------------
  const report = [];
  for (const item of items) {
    const names = ALIASES[item.slug] ?? [item.title];
    let best = null;
    for (const el of pool) {
      for (const alias of names) {
        const s = score(alias, el.tags?.name ?? "");
        if (s > 0 && (!best || s > best.score)) {
          const [lat, lng] = coordsOf(el);
          best = { score: s, name: el.tags?.name, lat, lng, type: pick(el.tags || {}) };
        }
      }
    }

    const found = best && best.score >= 70;
    report.push({
      kind: item.kind,
      file: path.relative(ROOT, item.file),
      slug: item.slug,
      title: item.title,
      current: item.data.location ?? { lat: item.data.lat, lng: item.data.lng },
      encontrado: Boolean(found),
      match: best,
      fallback: found ? null : VILLAGE,
    });
  }

  /* -------------------------------------------------------------- laporan */
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const found = report.filter((r) => r.encontrado);
  const notFound = report.filter((r) => !r.encontrado);

  const L = [];
  L.push("HASIL PENCARIAN KOORDINAT DESTINASI BANTARAGUNG (OpenStreetMap)");
  L.push(`Dibuat: ${new Date().toLocaleString("id-ID")}`);
  L.push(`Pusat: ${VILLAGE.lat}, ${VILLAGE.lng}`);
  L.push(`Objek OSM dianalisis: ${pool.length}`);
  L.push("");
  L.push(`=== DITEMUKAN (${found.length}) ===`);
  for (const r of found) {
    L.push(`  ${r.slug}`);
    L.push(`    situs : ${r.title}`);
    L.push(`    OSM   : ${r.match.name} [${r.match.type}]  skor ${r.match.score}`);
    L.push(`    koord : ${r.match.lat}, ${r.match.lng}`);
  }
  L.push("");
  L.push(`=== TIDAK DITEMUKAN, memakai titik desa (${notFound.length}) ===`);
  for (const r of notFound) {
    L.push(`  ${r.slug}  (${r.title})${r.match ? `  kandidat terdekat: ${r.match.name} skor ${r.match.score}` : ""}`);
  }

  fs.writeFileSync(path.join(OUT_DIR, "coordinate-report.txt"), `${L.join("\n")}\n`);
  fs.writeFileSync(
    path.join(OUT_DIR, "coordinate-report.json"),
    `${JSON.stringify({ generatedAt: new Date().toISOString(), village: VILLAGE, poolSize: pool.length, items: report }, null, 4)}\n`
  );

  console.log(`\nDitemukan: ${found.length} | Tidak ditemukan: ${notFound.length}`);
  console.log("Laporan: scripts/geo/coordinate-report.txt");
}

main().catch((e) => {
  console.error("Gagal:", e.message);
  process.exit(1);
});
