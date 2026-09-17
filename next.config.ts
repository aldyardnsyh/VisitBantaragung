import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
    ];
  },
};

export default nextConfig;
