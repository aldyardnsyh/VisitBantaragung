import "./globals.css";
import Navbar from "@/app/components/layout/Navbar";
import { getSeoSettings } from "@/lib/content";
import type { Metadata } from "next";

export const metadata: Metadata = (() => {
  const seo = getSeoSettings();

  return {
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
      </body>
    </html>
  );
}
