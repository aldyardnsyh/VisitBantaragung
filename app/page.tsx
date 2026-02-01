import Image from "next/image";
import { getSiteSettings } from "@/lib/content";

export default function Home() {
  const site = getSiteSettings();

  return (
    <main style={{ padding: 32 }}>
      <h1>{site.siteName}</h1>
      <p>{site.tagline}</p>
      <p>{site.description}</p>
    </main>
  );
}
