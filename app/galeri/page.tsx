"use client";

import { useState } from "react";
import { assetUrl } from "@/lib/asset";
import Link from "next/link";
import ImageWithSkeleton from "@/app/components/ui/ImageWithSkeleton";
import BackgroundPattern from "@/app/components/ui/BackgroundPattern";

// Sample gallery data - using placeholders
const galleryItems = [
    { id: 1, title: "Keberangkatan KKN", image: "galeri/keberangkatan.png", size: "large" },
    { id: 2, title: "Penyambutan di Desa", image: "galeri/penyambutan.png", size: "medium" },
    { id: 3, title: "Main ke Curug Cipeuteuy", image: "galeri/curug-cipeuteuy.png", size: "medium" },
    { id: 4, title: "Penanaman Tanaman Herbal", image: "galeri/penanaman-herbal.png", size: "large" },
    { id: 5, title: "Edukasi Anak Sekolah", image: "galeri/edukasi-sekolah.png", size: "small" },
    { id: 6, title: "Workshop Pembuatan Jamu", image: "galeri/workshop-jamu.png", size: "medium" },
    { id: 7, title: "Kunjungan ke Terasering", image: "galeri/terasering.png", size: "small" },
    { id: 8, title: "Pelatihan UMKM", image: "galeri/pelatihan-umkm.png", size: "large" },
    { id: 9, title: "Gotong Royong Desa", image: "galeri/gotong-royong.png", size: "medium" },
    { id: 10, title: "Festival Budaya Lokal", image: "galeri/festival-budaya.png", size: "small" },
    { id: 11, title: "Panen Bersama Petani", image: "galeri/panen-bersama.png", size: "medium" },
    { id: 12, title: "Penutupan KKN", image: "galeri/penutupan.png", size: "large" },
];

export default function GaleriPage() {
    const [selectedImage, setSelectedImage] = useState<number | null>(null);

    const openLightbox = (index: number) => {
        setSelectedImage(index);
    };

    const closeLightbox = () => {
        setSelectedImage(null);
    };

    const goToPrevious = () => {
        if (selectedImage !== null && selectedImage > 0) {
            setSelectedImage(selectedImage - 1);
        }
    };

    const goToNext = () => {
        if (selectedImage !== null && selectedImage < galleryItems.length - 1) {
            setSelectedImage(selectedImage + 1);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Escape") closeLightbox();
        if (e.key === "ArrowLeft") goToPrevious();
        if (e.key === "ArrowRight") goToNext();
    };

    return (
        <main className="min-h-screen">
            {/* HERO with Background Image */}
            <section className="relative overflow-hidden min-h-[500px] flex items-center">
                {/* Background Image - Penerjunan.png */}
                <div className="absolute inset-0">
                    <img
                        src={assetUrl("galeri/Penerjunan.png")}
                        alt="Penerjunan KKN"
                        className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/60 to-black/40" />
                </div>

                <div className="relative max-w-6xl mx-auto px-6 text-white space-y-6 py-20">
                    <div className="inline-flex items-center gap-2 rounded-full badge-dark backdrop-blur-sm px-4 py-1 text-xs uppercase tracking-widest">
                        KKN-PPM UGM Periode IV 2025
                    </div>
                    <h1 className="text-4xl md:text-5xl font-bold">
                        Galeri Kegiatan KKN
                    </h1>
                    <p className="text-lg opacity-90 max-w-3xl">
                        Simfoni Sindangwangi
                    </p>
                </div>
            </section>

            {/* PROGRAM INFO */}
            <section className="max-w-6xl mx-auto px-6 py-16 space-y-8">
                <div className="relative bg-gradient-to-br from-[#102440]/5 to-[#e7c277]/5 rounded-3xl p-8 md:p-12 border border-[#e7c277]/20">
                    <BackgroundPattern variant="subtle" opacity={0.02} className="text-[#102440]" />
                    <div className="relative space-y-6">
                        <div>
                            <h2 className="text-2xl md:text-3xl font-bold mb-4">Tema Program KKN</h2>
                            <p className="text-lg text-slate-700 leading-relaxed">
                                Optimalisasi Potensi Lokal untuk Peningkatan Ekonomi melalui
                                Ketahanan dan Kemandirian Pangan di Desa Bantaragung dan Desa
                                Sindangwangi, Kecamatan Sindangwangi, Kabupaten Majalengka
                            </p>
                        </div>

                        <div className="grid md:grid-cols-2 gap-6 pt-4">
                            <div className="flex items-start gap-3">
                                <div className="flex-shrink-0 h-10 w-10 rounded-full bg-[#102440] text-white flex items-center justify-center">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                    </svg>
                                </div>
                                <div>
                                    <h3 className="font-semibold text-lg mb-1">Lokasi</h3>
                                    <p className="text-slate-600">
                                        Desa Bantaragung dan Desa Sindangwangi<br />
                                        Kecamatan Sindangwangi, Kabupaten Majalengka
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-start gap-3">
                                <div className="flex-shrink-0 h-10 w-10 rounded-full bg-[#102440] text-white flex items-center justify-center">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                    </svg>
                                </div>
                                <div>
                                    <h3 className="font-semibold text-lg mb-1">Tim</h3>
                                    <p className="text-slate-600">
                                        KKN-PPM UGM Simfoni Sindangwangi<br />
                                        Periode IV 2025
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* GALLERY */}
            <section className="max-w-7xl mx-auto px-6 py-16">
                <div className="text-center mb-12">
                    <h2 className="text-3xl md:text-4xl font-bold mb-4">Dokumentasi Kegiatan</h2>
                    <p className="text-slate-600 max-w-2xl mx-auto">
                        Momen-momen berharga selama pelaksanaan KKN di Desa Bantaragung dan Desa Sindangwangi
                    </p>
                </div>

                {/* Masonry Grid */}
                <div className="columns-1 md:columns-2 lg:columns-3 gap-4 space-y-4">
                    {galleryItems.map((item, index) => (
                        <div
                            key={item.id}
                            className="break-inside-avoid mb-4 group cursor-pointer"
                            onClick={() => openLightbox(index)}
                        >
                            <div className="relative overflow-hidden rounded-2xl shadow-md hover:shadow-xl transition-all duration-300">
                                <ImageWithSkeleton
                                    src={assetUrl(item.image)}
                                    alt={item.title}
                                    className={`w-full object-cover group-hover:scale-105 transition-transform duration-300 ${item.size === "large"
                                        ? "h-80"
                                        : item.size === "medium"
                                            ? "h-64"
                                            : "h-48"
                                        }`}
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                    <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
                                        <h3 className="font-semibold text-lg">{item.title}</h3>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            {/* LIGHTBOX MODAL */}
            {selectedImage !== null && (
                <div
                    className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center"
                    onClick={closeLightbox}
                    onKeyDown={handleKeyDown}
                    tabIndex={0}
                >
                    <button
                        onClick={closeLightbox}
                        className="absolute top-4 right-4 text-white hover:text-[#e7c277] transition z-10"
                    >
                        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>

                    {selectedImage > 0 && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                goToPrevious();
                            }}
                            className="absolute left-4 text-white hover:text-[#e7c277] transition z-10"
                        >
                            <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                            </svg>
                        </button>
                    )}

                    <div
                        className="max-w-5xl max-h-[90vh] mx-4"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <img
                            src={assetUrl(galleryItems[selectedImage].image)}
                            alt={galleryItems[selectedImage].title}
                            className="max-w-full max-h-[80vh] object-contain rounded-lg"
                        />
                        <div className="text-center mt-4 text-white">
                            <h3 className="text-xl font-semibold">{galleryItems[selectedImage].title}</h3>
                            <p className="text-sm text-gray-400 mt-1">
                                {selectedImage + 1} / {galleryItems.length}
                            </p>
                        </div>
                    </div>

                    {selectedImage < galleryItems.length - 1 && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                goToNext();
                            }}
                            className="absolute right-4 text-white hover:text-[#e7c277] transition z-10"
                        >
                            <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                        </button>
                    )}
                </div>
            )}

            {/* TEAM LOGOS SECTION */}
            <section className="bg-gradient-to-br from-slate-50 to-white py-16">
                <div className="max-w-6xl mx-auto px-6">
                    <div className="text-center mb-12">
                        <h2 className="text-2xl md:text-3xl font-bold mb-2">
                            KKN-PPM UGM Simfoni Sindangwangi
                        </h2>
                        <p className="text-slate-600">Periode IV 2025</p>
                    </div>

                    <div className="flex flex-wrap justify-center items-center gap-12 md:gap-16">
                        <div className="flex flex-col items-center gap-3">
                            <img
                                src={assetUrl("_brand/logo/LogoAlmamaterUgm.png")}
                                alt="Logo UGM"
                                loading="lazy"
                                decoding="async"
                                className="h-24 w-auto object-contain"
                            />
                            <p className="text-sm text-slate-600 font-medium">Universitas Gadjah Mada</p>
                        </div>

                        <div className="flex flex-col items-center gap-3">
                            <img
                                src={assetUrl("_brand/logo/LogoKknPpmUgm.png")}
                                alt="Logo KKN-PPM UGM"
                                loading="lazy"
                                decoding="async"
                                className="h-24 w-auto object-contain"
                            />
                            <p className="text-sm text-slate-600 font-medium">KKN-PPM UGM</p>
                        </div>

                        <div className="flex flex-col items-center gap-3">
                            <img
                                src={assetUrl("_brand/logo/LogoSimfoniSindangwangi.png")}
                                alt="Logo Simfoni Sindangwangi"
                                loading="lazy"
                                decoding="async"
                                className="h-24 w-auto object-contain"
                            />
                            <p className="text-sm text-slate-600 font-medium">Simfoni Sindangwangi</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* SPONSOR SECTION */}
            <section className="bg-white py-16 border-t border-slate-200">
                <div className="max-w-6xl mx-auto px-6">
                    <div className="text-center mb-12">
                        <div className="inline-flex items-center gap-2 rounded-full bg-[#102440]/10 px-4 py-1 text-xs uppercase tracking-widest text-[#e7c277] mb-4">
                            Special Thanks
                        </div>
                        <h2 className="text-2xl md:text-3xl font-bold mb-2">
                            Sponsor &amp; Mitra
                        </h2>
                        <p className="text-slate-600">Terima kasih atas dukungan dan kerjasama yang telah diberikan</p>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
                        <div className="flex flex-col items-center gap-4 p-6 rounded-2xl bg-slate-50 hover:bg-slate-100 hover:shadow-md transition-all duration-300">
                            <div className="h-24 w-full flex items-center justify-center">
                                <img
                                    src={assetUrl("_brand/logo/LogoCimbNiaga.png")}
                                    alt="Logo CIMB Niaga"
                                    loading="lazy"
                                    decoding="async"
                                    className="max-h-20 max-w-full object-contain"
                                />
                            </div>
                            <p className="text-sm font-semibold text-[#102440] text-center">CIMB Niaga</p>
                        </div>

                        <div className="flex flex-col items-center gap-4 p-6 rounded-2xl bg-slate-50 hover:bg-slate-100 hover:shadow-md transition-all duration-300">
                            <div className="h-24 w-full flex items-center justify-center">
                                <img
                                    src={assetUrl("_brand/logo/LogoPupukKaltim.png")}
                                    alt="Logo Pupuk Kaltim"
                                    loading="lazy"
                                    decoding="async"
                                    className="max-h-20 max-w-full object-contain"
                                />
                            </div>
                            <p className="text-sm font-semibold text-[#102440] text-center">Pupuk Kaltim</p>
                        </div>

                        <div className="flex flex-col items-center gap-4 p-6 rounded-2xl bg-slate-50 hover:bg-slate-100 hover:shadow-md transition-all duration-300">
                            <div className="h-24 w-full flex items-center justify-center">
                                <img
                                    src={assetUrl("_brand/logo/LogoKaltimMethanolIndustri.png")}
                                    alt="Logo Kaltim Methanol Industri"
                                    loading="lazy"
                                    decoding="async"
                                    className="max-h-20 max-w-full object-contain"
                                />
                            </div>
                            <p className="text-sm font-semibold text-[#102440] text-center">Kaltim Methanol Industri</p>
                        </div>

                        <div className="flex flex-col items-center gap-4 p-6 rounded-2xl bg-slate-50 hover:bg-slate-100 hover:shadow-md transition-all duration-300">
                            <div className="h-24 w-full flex items-center justify-center">
                                <img
                                    src={assetUrl("_brand/logo/LogoSpesialSambal.png")}
                                    alt="Logo Spesial Sambal SS"
                                    loading="lazy"
                                    decoding="async"
                                    className="max-h-20 max-w-full object-contain"
                                />
                            </div>
                            <p className="text-sm font-semibold text-[#102440] text-center">Spesial Sambal SS</p>
                        </div>
                    </div>
                </div>
            </section>
        </main>
    );
}
