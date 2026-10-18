import Breadcrumb from "@/app/components/ui/Breadcrumb";
import ContactSection from "./ContactSection";
import LeafletMap from "@/app/components/map/LeafletMap";
import { getPublicContact, getSiteSettings } from "@/lib/content";

export default function KontakPage() {
  const contact = getPublicContact();
  const site = getSiteSettings();

  return (
    <main>
      {/* HERO */}
      <section className="relative bg-gradient-to-br from-forest-950 via-forest-900 to-forest-800 text-white overflow-hidden">
        <div className="max-w-7xl mx-auto px-6 py-16 md:py-20">
          <Breadcrumb items={[{ label: "Kontak" }]} variant="dark" />
          <h1
            className="font-display font-bold text-white leading-tight mt-2"
            style={{ fontSize: "clamp(2rem, 4.5vw, 3.5rem)" }}
          >
            Hubungi Kami
          </h1>
          <p className="text-white/85 max-w-2xl mt-4 text-lg">
            Rencanakan kunjungan, tanya paket wisata, atau ajak kerja sama  -
            tim Pokdarwis Bantaragung siap membantu.
          </p>
        </div>
      </section>

      {/* KONTAK */}
      <section className="py-20 md:py-24">
        <div className="max-w-7xl mx-auto px-6">
          <ContactSection contact={contact} />
        </div>
      </section>

      {/* PETA */}
      <section className="pb-20 md:pb-24">
        <div className="max-w-7xl mx-auto px-6">
          <div className="rounded-2xl overflow-hidden border border-forest-200/60 shadow-sm">
            <LeafletMap
              points={[
                {
                  lat: site.location.latitude,
                  lng: site.location.longitude,
                  label: `Desa ${site.location.village}`,
                },
              ]}
              zoom={13}
              className="h-[400px]"
              ariaLabel="Peta Desa Bantaragung"
            />
          </div>
          <p className="text-center mt-4">
            <a
              href={contact.googleMapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-forest-600 hover:text-clay-500 hover:font-semibold font-medium transition-colors"
            >
              Buka di Google Maps <span aria-hidden>→</span>
            </a>
          </p>
        </div>
      </section>
    </main>
  );
}
