import type { Metadata } from "next";
import Link from "next/link";
import Breadcrumb from "@/app/components/ui/Breadcrumb";
import SectionHeading from "@/app/components/ui/SectionHeading";
import Reveal from "@/app/components/ui/Reveal";
import { loadJSON, getSiteSettings } from "@/lib/content";

interface ProfileContent {
  overview: string;
  priorityPrograms: string[];
  potensiFisik: string[];
  potensiNonFisik: string[];
  kearifanLokal: string[];
  prestasi: string[];
  fasilitasUmum: string[];
  videos: { title: string; url: string }[];
}

const pillars = [
  { title: "Wisata Alam", desc: "Lima objek wisata utama: air terjun, terasering, bukit, perkemahan, hingga trekking di kaki Gunung Ciremai." },
  { title: "Edukasi", desc: "Paket wisata edukasi seperti Balik Kalembur dan Ngendong di Leuweng yang mengajarkan aktivitas desa dan hutan." },
  { title: "Budaya", desc: "Tradisi Nyura, Safar, Seba, suguhan pencak silat dan jaipong, hingga festival panen durian." },
  { title: "Kampung Herbal", desc: "Budidaya tanaman obat warga yang dikemas menjadi destinasi edukasi dan produk ekonomi kreatif." },
];

export const metadata: Metadata = {
  title: "Tentang Desa Bantaragung",
  description:
    "Profil Desa Wisata Bantaragung di kaki Gunung Ciremai, Majalengka: sejarah, potensi, kearifan lokal, prestasi, dan program pengembangan desa wisata.",
};

export default function TentangPage() {
  const profile = loadJSON<ProfileContent>("settings/profile.json");
  const site = getSiteSettings();

  const mapsUrl =
    site.contact.googleMapsUrl ||
    "https://maps.google.com/?q=Desa+Bantaragung+Sindangwangi+Majalengka+Jawa+Barat";

  return (
    <main>
      {/* HERO */}
      <section className="relative bg-gradient-to-br from-forest-950 via-forest-900 to-forest-800 text-white overflow-hidden">
        <div className="max-w-7xl mx-auto px-6 py-16 md:py-20 animate-fade-up">
          <Breadcrumb items={[{ label: "Tentang" }]} variant="dark" />
          <h1
            className="font-display font-bold text-white leading-tight mt-2"
            style={{ fontSize: "clamp(2rem, 4.5vw, 3.5rem)" }}
          >
            Tentang Desa Bantaragung
          </h1>
          <p className="text-white/85 max-w-2xl mt-4 text-lg">
            {profile.overview}
          </p>
        </div>
      </section>

      {/* PROFIL */}
      <section className="py-20 md:py-24">
        <div className="max-w-7xl mx-auto px-6">
          <Reveal>
            <SectionHeading
              eyebrow="Profil"
              title="Desa Wisata yang Melibatkan Semua Warga"
              subtitle="Program prioritas pengembangan desa wisata."
            />
          </Reveal>
          <div className="max-w-3xl mx-auto space-y-4" data-stagger>
            {profile.priorityPrograms.map((item, i) => (
              <div
                key={i}
                className="flex items-start gap-4 rounded-2xl bg-white/70 border border-forest-200/60 shadow-sm p-5"
              >
                <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-clay-500 text-white text-sm font-bold">
                  {i + 1}
                </span>
                <p className="text-slate-700 font-medium pt-1">{item}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* POTENSI */}
      <section className="py-20 md:py-24 bg-white/50">
        <div className="max-w-7xl mx-auto px-6">
          <Reveal>
            <SectionHeading
              eyebrow="Potensi"
              title="Kekuatan Alam dan Masyarakat"
            />
          </Reveal>
          <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto" data-stagger>
            <div className="rounded-2xl bg-white/70 border border-forest-200/60 shadow-sm p-8">
              <h3 className="font-bold text-lg text-forest-800 mb-4">Potensi Fisik</h3>
              <ul className="space-y-3">
                {profile.potensiFisik.map((item) => (
                  <li key={item} className="flex items-start gap-3 text-sm text-slate-600">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-forest-500" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-2xl bg-white/70 border border-forest-200/60 shadow-sm p-8">
              <h3 className="font-bold text-lg text-forest-800 mb-4">Potensi Non-Fisik</h3>
              <ul className="space-y-3">
                {profile.potensiNonFisik.map((item) => (
                  <li key={item} className="flex items-start gap-3 text-sm text-slate-600">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-forest-500" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* KEARIFAN LOKAL */}
      <section className="py-20 md:py-24">
        <div className="max-w-7xl mx-auto px-6">
          <Reveal>
            <SectionHeading
              eyebrow="Kearifan Lokal"
              title="Tradisi yang Hidup di Bantaragung"
            />
          </Reveal>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto" data-stagger>
            {profile.kearifanLokal.map((item) => (
              <div
                key={item}
                className="rounded-2xl bg-white/70 border border-forest-200/60 shadow-sm hover:shadow-md transition p-6"
              >
                <p className="font-medium text-forest-800">{item}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PRESTASI */}
      <section className="py-20 md:py-24 bg-forest-50/50">
        <div className="max-w-7xl mx-auto px-6">
          <Reveal>
            <SectionHeading
              eyebrow="Penghargaan"
              title="Prestasi Desa"
            />
          </Reveal>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto" data-stagger>
            {profile.prestasi.map((p) => {
              const year = p.match(/(19|20)\d{2}/)?.[0] ?? " - ";
              return (
                <div
                  key={p}
                  className="rounded-2xl bg-white/70 border border-forest-200/60 shadow-sm hover:shadow-md transition p-8 text-center"
                >
                  <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-gold-400 text-forest-950 font-bold text-xl mx-auto mb-4">
                    {year}
                  </div>
                  <p className="font-bold text-forest-800 leading-snug">{p}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 4 PILAR */}
      <section className="py-20 md:py-24">
        <div className="max-w-7xl mx-auto px-6">
          <Reveal>
            <SectionHeading
              eyebrow="Fokus Pengembangan"
              title="Empat Pilar Desa Wisata"
              subtitle="Arah pengembangan destinasi Bantaragung."
            />
          </Reveal>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6" data-stagger>
            {pillars.map((p) => (
              <div
                key={p.title}
                className="rounded-2xl bg-white/70 border border-forest-200/60 shadow-sm hover:shadow-md transition p-8"
              >
                <h3 className="font-bold text-lg text-forest-800 mb-2">{p.title}</h3>
                <p className="text-sm text-slate-600">{p.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* LOKASI */}
      <section className="py-20 md:py-24 bg-forest-950 text-white">
        <div className="max-w-7xl mx-auto px-6 text-center space-y-6">
          <h2 className="font-display font-bold text-white text-3xl md:text-4xl">
            Kunjungi Kami
          </h2>
          <p className="text-white/80 max-w-2xl mx-auto">
            Desa Bantaragung, Kecamatan Sindangwangi, Kabupaten Majalengka, Jawa Barat
             -  di kaki Gunung Ciremai pada ketinggian 500 - 800 mdpl.
          </p>
          <Link
            href={mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="group relative inline-flex items-center gap-2 bg-clay-500 hover:bg-clay-600 text-white px-7 py-3.5 rounded-full font-semibold transition-all hover:scale-[1.02] active:scale-[0.98] overflow-hidden"
          >
            <span className="animate-shine" aria-hidden />
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a2 2 0 01-2.828 0l-4.243-4.243a8 8 0 1111.314 0zM15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Lihat di Google Maps
          </Link>
        </div>
      </section>
    </main>
  );
}
