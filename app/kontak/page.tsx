"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import Breadcrumb from "@/app/components/ui/Breadcrumb";
import Reveal from "@/app/components/ui/Reveal";

const WA_NUMBER = "6281324427327";
const EMAIL = "desawisatabantaragung@gmail.com";
const WHATSAPP_URL = `https://wa.me/${WA_NUMBER}`;
const MAPS_URL =
  "https://maps.google.com/?q=Desa+Bantaragung+Sindangwangi+Majalengka+Jawa+Barat";
const MAPS_EMBED =
  "https://maps.google.com/maps?q=Desa%20Bantaragung%20Sindangwangi%20Majalengka&t=&z=13&ie=UTF8&iwloc=&output=embed";
const BUSINESS_HOURS = "Senin  -  Minggu, 08.00  -  17.00 WIB";

export default function KontakPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const subject = encodeURIComponent(`Pesan dari ${name || "Pengunjung Website"}`);
    const body = encodeURIComponent(`${message}\n\nDikirim dari: ${email || "-"}`);
    window.location.href = `mailto:${EMAIL}?subject=${subject}&body=${body}`;
  };

  const waPrefill = `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(
    `Halo, saya ${name || "pengunjung website"}.\n\n${message}`
  )}`;

  const inputClass =
    "w-full rounded-xl border border-forest-200/60 bg-white px-4 py-3 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-forest-500 focus:border-transparent transition";

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
        <div className="max-w-7xl mx-auto px-6 grid lg:grid-cols-5 gap-10">
          {/* Info */}
          <div className="lg:col-span-2 space-y-6">
            <Reveal delay={0}>
              <div className="rounded-2xl bg-white/70 border border-forest-200/60 shadow-sm p-8 space-y-6">
              <div>
                <h2 className="font-bold text-lg text-forest-800 mb-1">Alamat</h2>
                <p className="text-sm text-slate-600">
                  Desa Bantaragung, Kecamatan Sindangwangi,
                  <br />
                  Kabupaten Majalengka, Jawa Barat
                </p>
              </div>
              <div>
                <h2 className="font-bold text-lg text-forest-800 mb-1">Jam Operasional</h2>
                <p className="text-sm text-slate-600">{BUSINESS_HOURS}</p>
              </div>
              <div>
                <h2 className="font-bold text-lg text-forest-800 mb-1">WhatsApp</h2>
                <a
                  href={WHATSAPP_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-forest-600 hover:text-clay-500 hover:font-semibold transition-colors"
                >
                  +62 {WA_NUMBER.slice(1, 3)} {WA_NUMBER.slice(3)}
                </a>
              </div>
              <div>
                <h2 className="font-bold text-lg text-forest-800 mb-1">Email</h2>
                <a
                  href={`mailto:${EMAIL}`}
                  className="text-sm text-forest-600 hover:text-clay-500 hover:font-semibold transition-colors break-all"
                >
                  {EMAIL}
                </a>
              </div>
              <a
                href={WHATSAPP_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="group relative inline-flex items-center gap-2 bg-clay-500 hover:bg-clay-600 text-white rounded-full px-6 py-3 text-sm font-semibold transition-all hover:scale-[1.02] active:scale-[0.98] overflow-hidden"
              >
                <span className="animate-shine" aria-hidden />
                Chat WhatsApp
              </a>
            </div>
            </Reveal>
          </div>

          {/* Form */}
          <div className="lg:col-span-3">
            <Reveal delay={120}>
              <div className="rounded-2xl bg-white/70 border border-forest-200/60 shadow-sm p-8">
              <h2 className="font-display font-bold text-forest-800 text-2xl mb-1">
                Kirim Pesan
              </h2>
              <p className="text-sm text-slate-600 mb-6">
                Pesan akan diteruskan melalui email tim pengelola desa wisata.
              </p>
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="grid sm:grid-cols-2 gap-5">
                  <div>
                    <label htmlFor="nama" className="block text-sm font-medium text-forest-800 mb-1.5">
                      Nama
                    </label>
                    <input
                      id="nama"
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Nama Anda"
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-forest-800 mb-1.5">
                      Email
                    </label>
                    <input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="email@contoh.com"
                      className={inputClass}
                    />
                  </div>
                </div>
                <div>
                  <label htmlFor="pesan" className="block text-sm font-medium text-forest-800 mb-1.5">
                    Pesan
                  </label>
                  <textarea
                    id="pesan"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Tulis pesan atau pertanyaan Anda..."
                    rows={6}
                    className={`${inputClass} resize-none`}
                  />
                </div>
                <div className="flex flex-wrap gap-3">
                  <button
                    type="submit"
                    className="inline-flex items-center gap-2 bg-clay-500 hover:bg-clay-600 text-white px-7 py-3.5 rounded-full font-semibold transition active:scale-[0.98]"
                  >
                    Kirim via Email
                  </button>
                  <a
                    href={waPrefill}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 border-2 border-forest-600 text-forest-700 hover:bg-forest-100 px-7 py-3.5 rounded-full font-semibold transition-colors"
                  >
                    Kirim via WhatsApp
                  </a>
                </div>
              </form>
            </div>
            </Reveal>
          </div>
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
