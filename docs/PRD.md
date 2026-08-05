# PRD — Visit Bantaragung (Rebuild 2026)

## 1. Ringkasan

Rebuild total platform digital Desa Wisata Bantaragung. Web sebelumnya (Next.js 16, konten JSON statis, 5 modul: Wisata, B2H, BDB, BIC, BMC) dibangun sebagai proker KKN-PPM UGM "Simfoni Sindangwangi" dan mangkrak 6 bulan. Rebuild mempertahankan 100% data KKN lama (artikel, homestay, herbal, UMKM, lokasi, wisata) sambil menambahkan:

- **Desain baru** — modern eco-tourism (hijau pegunungan + krem + aksen terracotta).
- **Berita dinamis** — bot crawl otomatis dari sumber resmi `bantaragung.com` (WordPress) via GitHub Actions cron (1–2x/hari). Konten diadaptasi/ditulis ulang agar murni menjadi konten website sendiri (tanpa tautan balik ke sumber), fakta dipertahankan.
- **SEO kuat** — sitemap dinamis, canonical, JSON-LD, meta lengkap, konten baru otomatis terindeks.

## 2. Tujuan & Metrik

| Tujuan | Metrik |
|---|---|
| Data desa lengkap & akurat | Semua modul lama tetap tampil, 0 data hilang |
| Website selalu up-to-date | Berita terbaru dari bantaragung.com masuk ≤24 jam setelah terbit |
| Terindeks Google | Sitemap dinamis memuat semua halaman; URL stabil; JSON-LD valid |
| Desain modern & mobile-first | Lighthouse performance ≥90, responsive 320–1440px |

## 3. Ruang Lingkup

### 3.1 Halaman
| Rute | Isi |
|---|---|
| `/` | Hero, tentang, destinasi unggulan, kampung herbal, prestasi, berita terbaru (crawl + KKN), CTA |
| `/wisata`, `/wisata/[slug]` | Destinasi + detail (fasilitas, aktivitas, galeri, peta) |
| `/b2h`, `/b2h/katalog`, `/b2h/katalog/[slug]` | Kampung Herbal: katalog tanaman obat + detail manfaat |
| `/bdb`, `/bdb/homestay(+/[slug])`, `/bdb/umkm(+/[slug])` | Bisnis Desa: homestay & UMKM + detail + kontak WA |
| `/bic`, `/bic/artikel`, `/bic/artikel/[slug]` | Pusat informasi: artikel KKN + berita crawl (filter kategori/asal) |
| `/bmc`, `/bmc/lokasi/[slug]` | Peta digital: kategori peta + detail lokasi |
| `/galeri` | Dokumentasi kegiatan |
| `/tentang` | Profil desa, sejarah, struktur, penghargaan (data dari `content/settings/profile.json`) |
| `/kontak` | Info kontak, WA, peta lokasi, form sederhana |
| `/berita` (redirect ke `/bic/artikel?origin=crawl`) | Berita hasil crawl |

### 3.2 Sistem Crawler (berita)
- Sumber: `https://bantaragung.com/wp-json/wp/v2/posts` (+ `/categories`, `/media`).
- Pipeline: fetch → pilih post baru (slug belum ada di `content/bic/berita/`) → bersihkan HTML (hapus emoji berlebih, hashtag, tautan, blok sitasi, em-dash) → **rewrite AI** (SEO copywriter profesional) → tulis `content/bic/berita/<slug>.json` + unduh cover ke `public/berita/<slug>/`. Tanpa API key → fallback rule-based cleaning (tetap layak tayang).
- **LLM lokal (9router)**: aktif bila `LLM_URL` + `LLM_API_KEY` terisi (baca dari `.env.local` — file DI-GITIGNORE, tidak pernah ter-commit, aman dari penyalahgunaan/token abuse).
  - `LLM_MODEL=ds/deepseek-v4-flash` + `LLM_NO_THINKING=1` (disarankan; model `oc/deepseek-v4-flash-free` = reasoning-heavy, sering output kosong/boros token).
  - Prompt: pertahankan 100% fakta, gaya SEO profesional, tanpa hashtag/emoji/link/tanggal palsu/em-dash, judul tanpa sapaan ("Sampurasun", "Halo", dll).
  - Sinkron penuh: `npm run sync` (lokal, pakai 9router). CI GitHub Actions tanpa secret LLM → fallback cleaning aman.
- Schedule: `cron: 0 6,18 * * *` (2x/hari) di GitHub Actions; manual via `npm run sync`.
- Judul terpotong oleh WP (mis. "...kepada selu") → dibangun ulang dari paragraf pertama.

### 3.3 Skema Konten (v2)
- `Article` ditambah: `origin: "kkn" | "berita"`, `tags: string[]`, `sourceUrl?`, `sourcePublishedAt?`, `updatedAt?`.
- Berita crawl disimpan terpisah di `content/bic/berita/`; KKN tetap di `content/bic/artikel/`.
- Keduanya di-render oleh halaman BIC yang sama, difilter via query `?origin=` dan tab.

### 3.4 Aset
- Asset tetap di repo `visitbantaragung-assets` (CDN `NEXT_PUBLIC_ASSET_BASE_URL`), cache-busting `lib/asset.ts` tetap.
- Logo & favicon baru (SVG lokal di `public/`).
- Cover berita crawl diunduh ke asset repo via workflow.

## 4. Non-Goals (iterasi ini)
- Tidak ada backend/DB; konten tetap file JSON (mudah di-commit, di-index, ringan).
- Tidak ada sistem login/admin CMS.
- Tidak ada tautan balik/sumber langsung di artikel hasil rewrite (sesuai keputusan pemilik).
- Tidak menghapus/mengganti data KKN lama.

## 5. Arsitektur

```
app/                    # Next.js App Router (SSG/ISR)
  page.tsx              # Home
  wisata|b2h|bdb|bic|bmc|galeri|tentang|kontak
  sitemap.ts robots.ts
content/
  settings/             # site, seo, profile, wisata-pricing
  wisata/ b2h/ bdb/ bmc/ galeri/
  bic/artikel/          # KKN (lama, dipertahankan)
  bic/berita/           # hasil crawl (baru)
lib/content.ts          # loader JSON + tipe v2
scripts/sync/           # crawler (Node, zero-dep)
.github/workflows/sync.yml  # cron 2x/hari
public/                 # logo, favicon, aset lokal
```

Build: SSG statis (`next build`) → deploy Vercel. Crawler commit → trigger rebuild otomatis.

## 6. SEO
- `app/sitemap.ts` diperluas: semua rute statis + semua slug (wisata, herbal, homestay, umkm, lokasi, artikel, berita) + `lastModified` dari `date` konten.
- `app/robots.ts`: izinkan semua, sitemap URL.
- JSON-LD: `WebSite`, `Organization`, `TouristDestination` di home; `Article` di detail artikel/berita; `TouristAttraction` di detail wisata; `LocalBusiness` di UMKM/homestay.
- Canonical & meta per halaman via `generateMetadata`.
- Favicon/icon baru; OG image tetap dari CDN.

## 7. Kriteria Terima (Definition of Done)
1. `npm run lint` bersih; `npm run build` sukses.
2. Semua data KKN lama tampil tanpa kehilangan satu pun.
3. Semua halaman baru sesuai design system (docs/DESIGN.md).
4. Crawler: `npm run sync` berhasil menambah minimal 1 berita baru dari sumber; workflow GitHub Actions terkonfigurasi.
5. Uji local di `localhost:3000` — halaman utama + detail + sitemap berfungsi.
6. Disetujui pemilik sebelum push ke GitHub.

## 8. Risiko
| Risiko | Mitigasi |
|---|---|
| WP REST API sumber berubah/offline | Fallback RSS `/feed/`; script idempoten, gagal → skip |
| Build offline (font/CDN) | Font sistem stack; aset lokal fallback |
| Duplikat slug berita | Cek slug + `sourceUrl` sebelum commit |
| Konten rewrite menyimpang dari fakta | Pipeline verifikasi: aturan pembersihan konservatif, tanpa penambahan klaim baru |
