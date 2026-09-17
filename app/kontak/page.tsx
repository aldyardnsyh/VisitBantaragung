import Breadcrumb from "@/app/components/ui/Breadcrumb";
import ContactSection from "./ContactSection";

const MAPS_URL =
  "https://maps.google.com/?q=Desa+Bantaragung+Sindangwangi+Majalengka+Jawa+Barat";
const MAPS_EMBED =
  "https://maps.google.com/maps?q=Desa%20Bantaragung%20Sindangwangi%20Majalengka&t=&z=13&ie=UTF8&iwloc=&output=embed";

export default function KontakPage() {
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
          <ContactSection />
        </div>
      </section>

      {/* PETA */}
      <section className="pb-20 md:pb-24">
        <div className="max-w-7xl mx-auto px-6">
          <div className="rounded-2xl overflow-hidden border border-forest-200/60 shadow-sm">
            <iframe
              src={MAPS_EMBED}
              title="Lokasi Desa Bantaragung di Google Maps"
              className="w-full h-[400px] border-0"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              allowFullScreen
            />
          </div>
          <p className="text-center mt-4">
            <a
              href={MAPS_URL}
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
