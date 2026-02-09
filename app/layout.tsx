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
    openGraph: {
      title: seo.defaultTitle,
      description: seo.defaultDescription,
      images: [
        {
          url: seo.ogImage,
        },
      ],
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
