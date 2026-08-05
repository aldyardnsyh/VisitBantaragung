# Design System — Visit Bantaragung (Rebuild 2026)

Desain: **Modern Eco-Tourism** — identitas desa wisata di kaki Gunung Ciremai: hijau pegunungan, krem hangat, aksen terracotta. Bersih, mobile-first, konten berfokus.

## 1. Warna

| Token | Hex | Penggunaan |
|---|---|---|
| `forest-900` | `#163024` | Teks utama / footer |
| `forest-800` | `#1f3d2e` | Heading, navbar solid |
| `forest-700` | `#2d6a4f` | Primary actions, hover |
| `forest-600` | `#386646` | Buttons, links utama |
| `forest-500` | `#4b8059` | Ikon, border aksen |
| `forest-200` | `#cde0d0` | Border kartu, divider |
| `forest-100` | `#e8f0e6` | Background seksi soft |
| `forest-50` | `#f4f7f2` | Background umum |
| `sand-100` | `#faf6ee` | Body background (cream) |
| `sand-50` | `#fbf8f1` | Kartu di atas cream |
| `clay-500` | `#c96f4a` | Aksen CTA (terracotta) |
| `clay-100` | `#f6e4db` | Badge aksen |
| `gold-400` | `#d4a373` | Dekorasi/penghargaan |
| `ink` | `#1b2a26` | Teks body |

- Background body: `--color-sand-100` (`#faf6ee`).
- Teks: `#1f3d2e` (forest-800) untuk heading, `#4b5563` slate untuk paragraf.
- CTA tunggal: `clay-500` terracotta. Primary: `forest-700`.
- Gradien hero: `forest-900 → forest-700` dengan overlay foto.

## 2. Tipografi

- Body: `ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif` (16px, 1.6).
- Display/heading: `'Georgia', 'Times New Roman', ui-serif, Cambria, serif` — serif elegan untuk hero & judul seksi.
- Skala:
  - H1 hero: `clamp(2.5rem, 6vw, 4.5rem)`, serif, bold, tight.
  - H2 seksi: `clamp(1.75rem, 3.5vw, 2.5rem)`, serif.
  - H3 kartu: 1.125rem, sans, semibold.
  - Body: 1rem; small: 0.875rem; label: 0.75rem uppercase tracking-widest.

## 3. Layout & Spacing

- Container max `max-w-7xl` (1280px), padding `px-6`.
- Spacing vertikal seksi: `py-20 md:py-24`.
- Grid standar: kartu `lg:grid-cols-3`, `gap-6`.
- Card: `rounded-2xl`, `bg-white/70` di atas cream, `border forest-200/60`, `shadow-sm hover:shadow-md transition`.

## 4. Komponen Kunci

### Navbar
- Solid `bg-[#0c1f16]/95 backdrop-blur`, teks krem. Logo kiri, menu tengah, CTA "Jelajah" clay.
- Mobile: hamburger → dropdown panel.
- Active link: underline aksen clay.

### Hero (home)
- Full-width, `min-h-[70vh]`, foto/overlay gradient `from-forest-900/85 via-forest-800/55 to-transparent`.
- Badge kapsul krem, H1 serif krem, CTA clay + outline.

### Card
- Cover `aspect-[4/3]`, overlay label kecil, body pad `p-5`, title + excerpt (`line-clamp-2`) + link "Selengkapnya →" aksen forest-600.

### Footer
- `bg-forest-900 text-forest-100`, 4 kolom (brand, navigasi, modul, kontak), WA + medsos, copyright.

### Breadcrumb
- Link kecil `text-forest-600 hover:text-forest-800`, separator `›`, di atas title halaman.

## 5. Pattern Umum
- Tombol round `rounded-full`.
- Badge kategori: `bg-clay-100 text-clay-500 rounded-full px-3 py-1 text-xs`.
- Tanggal: `text-sm text-slate-500`.
- Image: `Next/Image`-style dengan skeleton (`animate-pulse`) — komponen `ImageWithSkeleton` lama dipertahankan.
- Peta BMC: layout grid kartu + lightbox; marker diberi label kategori.

## 6. Aset
- Logo baru: `public/logo.svg` (gunung + terasering + matahari, palette forest/gold/clay). Dipakai navbar, footer, favicon (`app/icon.svg`).
- OG: tetap `_brand/covers/og-default.*` dari CDN.