# Visit Bantaragung

Situs resmi Desa Wisata Bantaragung, Kecamatan Sindangwangi, Kabupaten Majalengka, Jawa Barat.

Bantaragung berada di kaki Gunung Ciremai. Desa ini menawarkan wisata alam, edukasi, dan budaya: terasering, curug, kampung herbal, homestay warga, serta produk UMKM lokal. Situs ini disiapkan sebagai pintu masuk bagi wisatawan yang ingin mengenal desa, menyusun kunjungan, dan menghubungi pengelola.

## Tech Stack Singkat

| Lapisan | Teknologi |
|---|---|
| Frontend & Backend | Next.js 16 (App Router), React 19, TypeScript |
| Styling & Peta | Tailwind CSS 4, Leaflet (OpenStreetMap) |
| Konten | JSON tanpa database (single source of truth), CDN aset |
| Chatbot (RAG + LLM) | Pipeline RAG mandiri: BM25, reranker, guardrail berlapis |
| CMS | Dasbor konten berbasis Git (commit per penyimpanan) |
| Otomasi | GitHub Actions (sync berita terjadwal), Vercel |
| Kualitas | ESLint, TypeScript strict, 9 suite uji chatbot |

## Yang bisa ditemukan di situs

- **Destinasi wisata** — katalog tempat menarik beserta fasilitas, aktivitas, galeri, dan informasi harga.
- **Kampung Herbal (B2H)** — katalog tanaman obat keluarga, khasiat, dan cara pemanfaatannya.
- **Branding Desa (BDB)** — homestay warga dan UMKM lokal, lengkap dengan kontak pemilik.
- **Pusat Informasi (BIC)** — berita desa dan artikel kegiatan dalam satu tempat.
- **Peta Digital (BMC)** — sebaran lokasi wisata dan fasilitas desa.
- **Galeri** — dokumentasi kegiatan dan keseharian desa.
- **Tentang dan Kontak** — profil desa, alamat, jam layanan, dan kanal komunikasi resmi.

## Tangkapan layar

### Halaman publik

| Halaman | Tangkapan |
|---|---|
| Beranda | ![Beranda](docs/snapshots/home.jpeg) |
| Berita (Pusat Informasi) | ![Berita](docs/snapshots/bic.jpeg) |
| Wisata | ![Wisata](docs/snapshots/wisata.jpeg) |
| Kampung Herbal | ![B2H](docs/snapshots/b2h.jpeg) |
| Katalog Tanaman Herbal | ![Katalog Herbal](docs/snapshots/b2h-katalog.jpeg) |
| Branding Desa | ![BDB](docs/snapshots/bdb.jpeg) |
| Homestay (Branding Desa) | ![Homestay](docs/snapshots/homestay.jpeg) |
| Peta Digital | ![BMC](docs/snapshots/bmc.jpeg) |
| Galeri | ![Galeri](docs/snapshots/galeri.jpeg) |
| Tentang | ![Tentang](docs/snapshots/tentang.jpeg) |
| Kontak | ![Kontak](docs/snapshots/kontak.jpeg) |

## Pemandu digital Bantaragung Guide

Bintang proyek ini: asisten percakapan berbasis **RAG (Retrieval-Augmented Generation)** yang di-desain dari nol untuk situs desa — tanpa layanan pihak ketiga, tanpa biaya infrastruktur tambahan, dan dengan kontrol penuh atas kualitas jawabannya.

![Pemandu digital terbuka](docs/snapshots/chatbot-open.jpeg)

Contoh percakapan dan jawaban:

![Jawaban pemandu digital](docs/snapshots/chatbot-answer.jpeg)

### Cara kerja: pipeline RAG end-to-end

```text
Pertanyaan pengunjung
  |  sanitasi input + deteksi jailbreak (deterministik, pra-LLM)
  |  penjaga cakupan: topik desa vs di luar desa vs daerah lain
  v
Retrieval
  |  chunking artikel/berita: potongan ~900 karakter + overlap 200
  |  pengenalan entitas toleran salah ketik (edit distance): "curug cipeteuy" -> Curug Cipeuteuy
  |  query expansion: kamus padanan bahasa Indonesia + Inggris-Indonesia (~190 entri)
  |  BM25 dengan bobot judul, bonus cakupan judul penuh, dan bonus kesegaran artikel
  v
Reranking
  |  skor gabungan kartu entitas + potongan teks
  |  dedup per artikel (maks 2 potongan, penalti duplikat)
  |  konteks akhir ~6.000 token, setiap fakta utuh dengan konteksnya
  v
Generation (LLM)
  |  rantai model fallback berlapis (utama -> cadangan -> probation otomatis)
  |  health tracking per model: cooldown, latensi, error tercatat
  v
Output Guard (lapisan terakhir sebelum tampil)
  |  deteksi kebocoran identitas model & isi konteks
  |  validasi angka: harga/jumlah wajib berasal dari konteks (anti-halusinasi)
  |  deteksi entitas halusinasi, aksara asing, mojibake, repetisi degeneratif
  |  bila ditolak: jawaban diturunkan ke penyusun deterministik dari data yang sama
```

### Detail mekanisme penting

**Chunking & indexing.** Isi artikel dan berita dipotong pada batas paragraf (±900 karakter) dengan **overlap 200 karakter** antar-potongan sehingga kalimat yang terbelah tetap ditemukan. Setiap potongan isi diberi prefiks judul artikel agar sinyal topik terkuat ikut terskor. Indeks dibangun ulang otomatis setiap 5 menit, sehingga berita baru dari sync ikut terjawab tanpa deploy ulang.

**Hybrid retrieval: entitas + BM25.** Dua jalur digabung: pencocokan entitas yang toleran salah ketik (jarak edit dengan pemotongan, fuzzy hanya untuk kata >= 5 huruf) dan BM25 penuh (k1=1.5, b=0.75) atas judul, isi, dan tag. Bonus khusus untuk artikel yang judulnya mencakup seluruh istilah inti pertanyaan — pola yang terbukti mengalahkan artikel promosi yang kebetulan memuat kata basa-basi.

**Query expansion.** Kamus padanan dua arah: ragam percakapan Indonesia ("nginep", "kemah", "ngapain") dan bahasa Inggris ("waterfall" -> curug, "entrance fee" -> tiket masuk, "swimming" -> berenang) dipetakan ke kosakata yang ada di data. Kata tanya dan basa-basi dikeluarkan dari skoring agar judul yang kebetulan memuat "ngapain" tidak mengalahkan artikel yang benar.

**Reranker.** Skor BM25 murni digabung dengan kecocokan kartu entitas, lalu dideduplikasi per artikel — satu artikel maksimal dua potongan dengan penalti duplikat, sehingga konteks yang dikirim ke model beragam sumbernya dan setiap token berguna.

**Anti-halusinasi (guardrail keluaran).** Setiap jawaban LLM diverifikasi sebelum tampil: angka harga/jumlah wajib ada di konteks yang dikirim; nama entitas yang disebut jawaban dicek keberadaannya di konteks (>= 2 nama asing = halusinasi, jawaban ditolak); kebocoran identitas model, isi konteks sistem, aksara asing, dan repetisi degeneratif semuanya tertangkap. Jawaban yang ditolak tidak dibuang begitu saja — diganti penyusun jawaban deterministik dari data yang sama, sehingga pengunjung selalu menerima jawaban yang benar.

**Anti-jailbreak (guardrail masukan).** Pola serangan ditolak deterministik sebelum menyentuh LLM: pembelokan peran dalam bahasa Indonesia, Inggris, dan bahasa Jawa ("mbok ya ojo jadi pemandu digital..."), mode palsu (developer/god mode), pencurian kredensial (api key, env), eksfiltrasi konfigurasi (daftar model/endpoint), payload terenkode (base64/hex), dan tag injeksi `<konteks>`. Pertanyaan di luar cakupan ditolak sopan: topik lain, tokoh publik, daerah lain (Bali, Jogja, dst.), dan harga pasar harian — tanpa membakar kuota model.

**Kesinambungan percakapan.** Follow-up multi-giliran dijangkarkan ke topik yang sedang berjalan ("terus yang paling seru yang mana?" tetap pada konteks sebelumnya), baris sumber selalu dipertahankan di riwayat agar bot tidak "melupa" artikel yang baru saja ia kutip, dan pergantian topik terdeteksi otomatis agar konteks lama tidak menyeret jawaban baru.

**Degradasi yang jujur.** Saat seluruh model gagal (kuota habis, provider down), chatbot TETAP menjawab dari jalur retrieval deterministik: daftar destinasi dengan harga, rekomendasi berbasis kebutuhan ("tempat buat mandi", "yang ramah keluarga"), dan jawaban terstruktur (daftar/harga/artikel terbaru). Pengunjung tidak pernah melihat layar kosong.

### Uji regresi (9 suite, tanpa kuota LLM)

| Suite | Cakupan |
|---|---|
| `chat:test:guard` | guard masukan & keluaran |
| `chat:test:guardrails` | anti-halusinasi, kebocoran, cakupan, pola jailbreak |
| `chat:test:retrieval` | 22 kasus pencarian, termasuk toleransi salah ketik |
| `chat:test:degraded` | jalur cadangan saat model gagal |
| `chat:test:slop` | pembersihan teks generik |
| `chat:test:typography` | normalisasi tipografi |
| `chat:test:cases` | kasus percakapan |
| `chat:test:e2e` / `chat:test:llm` | end-to-end dengan LLM |

## CMS (Content Management System)

Dasbor konten berbasis Git: setiap penyimpanan membuat satu commit dan memicu build ulang otomatis. Tanpa database — konten JSON menjadi satu sumber kebenaran yang dibaca situs publik, chatbot, dan dasbor secara bersamaan.

| Komponen | Teknologi & mekanisme |
|---|---|
| Autentikasi | Kata sandi tersimpan sebagai hash, sesi cookie aman, verifikasi ulang di setiap route API |
| Koleksi konten | Definisi koleksi terpusat (berita, artikel, wisata, herbal, homestay, UMKM, lokasi, galeri, pengaturan) dengan validasi skema |
| Penyimpanan | Satu commit GitHub per perubahan; deteksi konflik bila konten berubah sejak halaman dibuka |
| Pustaka gambar | Unggah dengan kompresi di peramban, penamaan permanen untuk cache CDN, laporan pemakaian & aset tak terpakai |
| Sync berita | Crawler terjadwal + rewrite AI dengan stage gate: model dicek dulu (GATE 0), sumber wajib sah (GATE 1), artikel gagal rewrite tidak diterbitkan mentah (GATE 2), rollover 4 model otomatis saat kuota habis/model dicabut |

| Tangkapan |
|---|
| ![Masuk](docs/snapshots/cms-login.jpeg) |
| ![Ringkasan](docs/snapshots/cms-dashboard.jpeg) |
| ![Daftar berita](docs/snapshots/cms-berita.jpeg) |
| ![Pustaka gambar](docs/snapshots/cms-media.jpeg) |
| ![Pengaturan situs](docs/snapshots/cms-pengaturan.jpeg) |

## Kontak

- **Alamat** — Desa Bantaragung, Kecamatan Sindangwangi, Kabupaten Majalengka, Jawa Barat
- **WhatsApp** — +62 813-2442-7327
- **Email** — desawisatabantaragung@gmail.com
- **Jam layanan** — Senin sampai Minggu, 08.00–17.00 WIB

## Kredit

Dikembangkan untuk Desa Wisata Bantaragung bersama KKN-PPM UGM Simfoni Sindangwangi.
