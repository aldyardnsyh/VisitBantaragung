import "./globals.css";
import Navbar from "@/app/components/layout/Navbar";
import { getSeoSettings } from "@/lib/content";
import type { Metadata } from "next";
import Footer from "@/app/components/layout/Footer";


export const metadata: Metadata = (() => {
  const seo = getSeoSettings();

  return {
    metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://visitbantaragung.com'),
    title: {
      default: seo.defaultTitle,
      template: seo.titleTemplate,
    },
    description: seo.defaultDescription,
    keywords: [
      // Branding utama
      'desa wisata bantaragung',
      'desa wisata digital',
      'wisata bantaragung',
      'visit bantaragung',
      'bantaragung',
      // KKN PPM UGM
      'kkn ppm ugm',
      'kkn ugm',
      'kkn ppm ugm 2025',
      'kkn di majalengka',
      'kkn ugm majalengka',
      'simfoni sindangwangi',
      'kkn simfoni sindangwangi',
      'kkn ppm ugm simfoni',
      'kkn ugm periode 4 2025',
      // Lokasi
      'wisata majalengka',
      'desa wisata majalengka',
      'wisata sindangwangi',
      'kecamatan sindangwangi',
      'majalengka jawa barat',
      'wisata alam majalengka',
      'wisata alam jawa barat',
      'wisata gunung ciremai',
      // Destinasi spesifik
      'teras bumi pakuwon',
      'teras bumi pakuwon majalengka',
      'bumi perkemahan awilega',
      'bumi perkemahan awilega majalengka',
      'tradisi apem syafar',
      'tradisi apem syafar majalengka',
      'ciboer pass',
      'curug cipeuteuy',
      'terasering panyaweuyan',
      'panyaweuyan majalengka',
      // Fitur desa
      'kampung herbal bantaragung',
      'kampung herbal mertasela',
      'tanaman herbal bantaragung',
      'homestay bantaragung',
      'homestay desa wisata',
      'umkm bantaragung',
      'umkm majalengka',
      // Penghargaan
      'adwi 2023',
      'anugerah desa wisata indonesia',
      '75 besar adwi 2023',
      // Umum
      'wisata edukasi jawa barat',
      'desa wisata digital',
      'pariwisata majalengka',
      'peta digital desa',
    ],
    alternates: {
      canonical: process.env.NEXT_PUBLIC_SITE_URL || 'https://visitbantaragung.com',
    },
    openGraph: {
      title: seo.defaultTitle,
      description: seo.defaultDescription,
      siteName: 'Desa Wisata Bantaragung - Smart Tourism Digital Platform',
      locale: 'id_ID',
      type: 'website',
      images: [
        {
          url: seo.ogImage,
        },
      ],
    },
    verification: {
      google: 'q5XFEl4u6UQnudUL2FkxQGebBybzBOvBbP92svZtzog',
    },
  };
})();

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id">
      <body>
        <Navbar />
        {children}
        <Footer />
      </body>
    </html>
  );
}
