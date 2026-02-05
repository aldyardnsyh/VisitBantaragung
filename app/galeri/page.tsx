"use client";

import { useState } from "react";
import { assetUrl } from "@/lib/asset";
import Link from "next/link";

// Sample gallery data - will be replaced with actual photos
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

    // Handle keyboard navigation
    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Escape") closeLightbox();
        if (e.key === "ArrowLeft") goToPrevious();
        if (e.key === "ArrowRight") goToNext();
    };

    return (
        <main className="min-h-screen">
            {/* HERO */}
            <section className="relative overflow-hidden bg-gradient-to-br from-[#102440] via-[#1b3b6f] to-[#102440] text-white py-20">
                <div className="absolute inset-0 opacity-10">
                    <div className="absolute top-0 right-0 h-64 w-64 rounded-full bg-white/20 blur-3xl" />
                    <div className="absolute bottom-0 left-0 h-64 w-64 rounded-full bg-[#e7c277]/20 blur-3xl" />
                </div>

                <div className="relative max-w-6xl mx-auto px-6 text-center space-y-6">
                    <div className="inline-flex items-center gap-2 rounded-full bg-white/20 backdrop-blur-sm px-4 py-1 text-xs uppercase tracking-widest">
                        KKN-PPM UGM Periode IV 2025
                    </div>
                    <h1 className="text-4xl md:text-5xl font-bold">
                        Galeri Kegiatan KKN
                    </h1>
                    <p className="text-lg opacity-90 max-w-3xl mx-auto">
                        Simfoni Sindangwangi
                    </p>
                </div>
            </section>

            {/* PROGRAM INFO */}
            <section className="max-w-6xl mx-auto px-6 py-16 space-y-8">
                <div className="bg-gradient-to-br from-[#102440]/5 to-[#e7c277]/5 rounded-3xl p-8 md:p-12 border border-[#e7c277]/20">
                    <div className="space-y-6">
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
                                <div className="flex-shrink-0 h-10 w-10 rounded-full bg-[#102440] text-white flex items-center justify-center text-xl">
                                    📍
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
                                <div className="flex-shrink-0 h-10 w-10 rounded-full bg-[#102440] text-white flex items-center justify-center text-xl">
                                    👥
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
                                <img
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
                    {/* Close Button */}
                    <button
                        onClick={closeLightbox}
                        className="absolute top-4 right-4 text-white hover:text-[#e7c277] transition z-10"
                    >
                        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>

                    {/* Previous Button */}
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

                    {/* Image */}
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

                    {/* Next Button */}
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
                                className="h-24 w-auto object-contain"
                            />
                            <p className="text-sm text-slate-600 font-medium">Universitas Gadjah Mada</p>
                        </div>

                        <div className="flex flex-col items-center gap-3">
                            <img
                                src={assetUrl("_brand/logo/LogoKknPpmUgm.png")}
                                alt="Logo KKN-PPM UGM"
                                className="h-24 w-auto object-contain"
                            />
                            <p className="text-sm text-slate-600 font-medium">KKN-PPM UGM</p>
                        </div>

                        <div className="flex flex-col items-center gap-3">
                            <img
                                src={assetUrl("_brand/logo/LogoSimfoniSindangwangi.png")}
                                alt="Logo Simfoni Sindangwangi"
                                className="h-24 w-auto object-contain"
                            />
                            <p className="text-sm text-slate-600 font-medium">Simfoni Sindangwangi</p>
                        </div>
                    </div>

                    <div className="mt-12 text-center">
                        <Link
                            href="/"
                            className="inline-flex items-center gap-2 text-[#e7c277] font-medium hover:underline"
                        >
                            ← Kembali ke Beranda
                        </Link>
                    </div>
                </div>
            </section>
        </main>
    );
}
