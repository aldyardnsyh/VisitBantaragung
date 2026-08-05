import { getAllHerbal } from "@/lib/content";
import PageHeader from "@/app/components/layout/PageHeader";
import Filter from "@/app/b2h/katalog/Filter";
import Reveal from "@/app/components/ui/Reveal";
import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Katalog Tanaman Herbal",
    description:
        "Daftar lengkap tanaman obat keluarga yang dibudidayakan di Kampung Herbal Bantaragung, Majalengka.",
};

export default function HerbalKatalogPage() {
    const items = getAllHerbal();

    return (
        <main className="min-h-screen">
            <PageHeader
                breadcrumb={[{ label: "Kampung Herbal", href: "/b2h" }, { label: "Katalog" }]}
                eyebrow="Katalog Herbal"
                title="Katalog Tanaman Herbal"
                subtitle={`${items.length} tanaman obat keluarga yang dibudidayakan di Kampung Herbal Bantaragung.`}
            />
            <Reveal>
                <Filter items={items} />
            </Reveal>
        </main>
    );
}