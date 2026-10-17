import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /*
   * Source map produksi dimatikan.
   *
   * Setiap deployment menyimpan berkas .map untuk seluruh chunk server dan
   * klien. Berkas itu tidak dipakai saat runtime; fungsinya hanya untuk
   * memetakan stack trace ke kode sumber. Pada proyek ini ukurannya sekitar
   * 4 MB per deployment, dan karena Vercel menyimpan setiap deployment,
   * pengaruhnya menumpuk pada kuota Deployment Storage.
   *
   * Bila suatu saat perlu menelusuri galat produksi, aktifkan sementara lalu
   * matikan lagi setelah selesai.
   */
  productionBrowserSourceMaps: false,

  // Header keamanan: nol biaya runtime, tanpa memengaruhi render.
  // Tanpa CSP (berisiko merusak embed Maps dan skrip inline tanpa tuning khusus).
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
      {
        // Dasbor admin tidak boleh masuk indeks mesin pencari.
        //
        // robots.txt saja tidak cukup: berkas itu hanya mencegah perayapan,
        // bukan mencegah URL muncul di hasil pencarian bila ditemukan dari
        // sumber lain (misalnya tautan di tempat lain). Header X-Robots-Tag
        // bekerja pada tingkat respons HTTP sehingga berlaku untuk halaman
        // maupun berkas apa pun di bawah /admin.
        source: "/admin/:path*",
        headers: [
          { key: "X-Robots-Tag", value: "noindex, nofollow, noarchive, nosnippet" },
          // Dasbor tidak perlu dirujuk sebagai sumber saat pengguna berpindah.
          { key: "Referrer-Policy", value: "no-referrer" },
        ],
      },
      {
        // API internal admin juga tidak boleh diindeks atau diarsipkan.
        source: "/api/admin/:path*",
        headers: [
          { key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" },
          { key: "Cache-Control", value: "no-store, max-age=0" },
        ],
      },
    ];
  },
};

export default nextConfig;
