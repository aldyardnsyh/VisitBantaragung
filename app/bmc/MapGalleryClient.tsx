"use client";

import { useState, useMemo } from "react";
import { assetUrl } from "@/lib/asset";
import MapLightbox from "./MapLightbox";
import type { MapsConfig, MapItem } from "@/lib/content";

interface MapGalleryClientProps {
    mapsConfig: MapsConfig;
}

export default function MapGalleryClient({ mapsConfig }: MapGalleryClientProps) {
    const [selectedCategory, setSelectedCategory] = useState("all");
    const [lightboxOpen, setLightboxOpen] = useState(false);
    const [selectedMapIndex, setSelectedMapIndex] = useState(0);
    const [currentPage, setCurrentPage] = useState(1);
    const perPage = 9; // 9 maps per page (3x3 grid)

    // Flatten all maps for "all" view
    const allMaps = useMemo(() => {
        const maps: (MapItem & { categoryName: string; categoryIcon: string })[] = [];
        mapsConfig.categories.forEach((category) => {
            category.maps.forEach((map) => {
                maps.push({
                    ...map,
                    categoryName: category.name,
                    categoryIcon: category.icon,
                });
            });
        });
        return maps;
    }, [mapsConfig]);

    // Filter maps based on selected category
    const filteredMaps = useMemo(() => {
        if (selectedCategory === "all") {
            return allMaps;
        }
        const category = mapsConfig.categories.find((c) => c.id === selectedCategory);
        return category
            ? category.maps.map((map) => ({
                ...map,
                categoryName: category.name,
                categoryIcon: category.icon,
            }))
            : [];
    }, [selectedCategory, mapsConfig, allMaps]);

    // Pagination
    const totalPages = Math.max(1, Math.ceil(filteredMaps.length / perPage));
    const safePage = Math.min(currentPage, totalPages);
    const pagedMaps = filteredMaps.slice((safePage - 1) * perPage, safePage * perPage);

    // Reset to page 1 when category changes
    const handleCategoryChange = (categoryId: string) => {
        setSelectedCategory(categoryId);
        setCurrentPage(1);
    };

    const openLightbox = (index: number) => {
        // Calculate the actual index in the full filtered list
        const actualIndex = (safePage - 1) * perPage + index;
        setSelectedMapIndex(actualIndex);
        setLightboxOpen(true);
    };

    const navigateMap = (index: number) => {
        setSelectedMapIndex(index);
    };

    return (
        <div className="space-y-8">
            {/* Filter Dropdown */}
            <div className="flex items-center gap-4">
                <label htmlFor="category-filter" className="text-sm font-medium text-slate-700">
                    Filter Kategori:
                </label>
                <select
                    id="category-filter"
                    value={selectedCategory}
                    onChange={(e) => handleCategoryChange(e.target.value)}
                    className="px-4 py-2 rounded-full border border-[#e7c277]/40 focus:border-[#e7c277] focus:ring-2 focus:ring-[#e7c277]/20 outline-none transition bg-white text-slate-700 font-medium"
                >
                    <option value="all">Semua Peta ({allMaps.length})</option>
                    {mapsConfig.categories.map((category) => (
                        <option key={category.id} value={category.id}>
                            {category.name} ({category.maps.length})
                        </option>
                    ))}
                </select>
            </div>

            {/* Category Description */}
            {selectedCategory !== "all" && (
                <div className="bg-slate-50 rounded-2xl p-4 border border-[#e7c277]/20">
                    <p className="text-slate-600 text-sm">
                        {mapsConfig.categories.find((c) => c.id === selectedCategory)?.description}
                    </p>
                </div>
            )}

            {/* Results Count */}
            <div className="text-sm text-slate-600">
                Menampilkan {pagedMaps.length} dari {filteredMaps.length} peta
                {totalPages > 1 && ` (Halaman ${safePage} dari ${totalPages})`}
            </div>

            {/* Maps Grid */}
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {pagedMaps.map((map, index) => (
                    <button
                        key={map.id}
                        onClick={() => openLightbox(index)}
                        className="group bg-white rounded-3xl overflow-hidden shadow-sm hover:shadow-xl transition border border-[#e7c277]/40 text-left"
                    >
                        <div className="relative bg-slate-100">
                            <img
                                src={assetUrl(map.image)}
                                alt={map.title}
                                loading="lazy"
                                decoding="async"
                                className="w-full h-auto object-contain group-hover:scale-105 transition duration-300"
                            />
                            <div className="absolute top-3 left-3 rounded-full bg-white/90 px-3 py-1 text-xs text-slate-700 shadow flex items-center gap-1">
                                <span>{map.categoryIcon}</span>
                                <span>{map.categoryName}</span>
                            </div>
                            <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition flex items-end justify-center pb-4">
                                <span className="text-white text-sm font-medium flex items-center gap-2">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                                    </svg>
                                    Lihat Detail
                                </span>
                            </div>
                        </div>

                        <div className="p-4 space-y-2">
                            <h3 className="font-semibold text-lg">{map.title}</h3>
                            <p className="text-sm text-gray-600 line-clamp-2">{map.description}</p>
                        </div>
                    </button>
                ))}
            </div>

            {/* Empty State */}
            {pagedMaps.length === 0 && (
                <div className="text-center py-16 bg-slate-50 rounded-3xl">
                    <p className="text-slate-600 text-lg">Tidak ada peta dalam kategori ini.</p>
                </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
                <nav className="flex flex-wrap items-center justify-center gap-2 text-sm">
                    <button
                        onClick={() => setCurrentPage(Math.max(1, safePage - 1))}
                        disabled={safePage === 1}
                        className={`px-4 py-2 rounded-full border border-[#e7c277]/40 ${safePage === 1
                            ? "pointer-events-none text-slate-400"
                            : "text-[#102440] hover:bg-[#102440]/10"
                            }`}
                    >
                        ← Sebelumnya
                    </button>

                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                        <button
                            key={page}
                            onClick={() => setCurrentPage(page)}
                            className={`px-4 py-2 rounded-full border border-[#e7c277]/40 ${page === safePage
                                ? "bg-[#102440] text-white"
                                : "text-[#102440] hover:bg-[#102440]/10"
                                }`}
                        >
                            {page}
                        </button>
                    ))}

                    <button
                        onClick={() => setCurrentPage(Math.min(totalPages, safePage + 1))}
                        disabled={safePage === totalPages}
                        className={`px-4 py-2 rounded-full border border-[#e7c277]/40 ${safePage === totalPages
                            ? "pointer-events-none text-slate-400"
                            : "text-[#102440] hover:bg-[#102440]/10"
                            }`}
                    >
                        Berikutnya →
                    </button>
                </nav>
            )}

            {/* Lightbox */}
            <MapLightbox
                isOpen={lightboxOpen}
                onClose={() => setLightboxOpen(false)}
                mapImage={filteredMaps[selectedMapIndex]?.image || ""}
                mapTitle={filteredMaps[selectedMapIndex]?.title || ""}
                mapDescription={filteredMaps[selectedMapIndex]?.description || ""}
                allMaps={filteredMaps}
                currentIndex={selectedMapIndex}
                onNavigate={navigateMap}
            />
        </div>
    );
}
