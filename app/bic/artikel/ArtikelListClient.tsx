"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { assetUrl } from "@/lib/asset";

interface Article {
    slug: string;
    title: string;
    excerpt: string;
    cover: string;
    date: string;
    author?: string;
    category?: string;
}

interface ArtikelListClientProps {
    articles: Article[];
}

export default function ArtikelListClient({ articles }: ArtikelListClientProps) {
    // State for filters
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedAuthor, setSelectedAuthor] = useState("");
    const [selectedCategory, setSelectedCategory] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const perPage = 9;

    // Get unique authors and categories
    const authors = useMemo(() => {
        const uniqueAuthors = [...new Set(articles.map((a) => a.author).filter(Boolean))];
        return uniqueAuthors.sort();
    }, [articles]);

    const categories = useMemo(() => {
        const uniqueCategories = [...new Set(articles.map((a) => a.category).filter(Boolean))];
        return uniqueCategories.sort();
    }, [articles]);

    // Filter and sort articles
    const filteredArticles = useMemo(() => {
        let filtered = [...articles];

        // Search filter
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter((a) =>
                a.title?.toLowerCase().includes(query) ||
                a.excerpt?.toLowerCase().includes(query)
            );
        }

        // Author filter
        if (selectedAuthor) {
            filtered = filtered.filter((a) => a.author === selectedAuthor);
        }

        // Category filter
        if (selectedCategory) {
            filtered = filtered.filter((a) => a.category === selectedCategory);
        }

        // Sort by date (newest first)
        filtered.sort((a, b) => {
            const dateA = new Date(a.date || "2000-01-01");
            const dateB = new Date(b.date || "2000-01-01");
            return dateB.getTime() - dateA.getTime();
        });

        return filtered;
    }, [articles, searchQuery, selectedAuthor, selectedCategory]);

    // Pagination
    const totalPages = Math.max(1, Math.ceil(filteredArticles.length / perPage));
    const safePage = Math.min(currentPage, totalPages);
    const pagedArticles = filteredArticles.slice((safePage - 1) * perPage, safePage * perPage);

    // Reset to page 1 when filters change
    const handleFilterChange = () => {
        setCurrentPage(1);
    };

    // Clear all filters
    const clearFilters = () => {
        setSearchQuery("");
        setSelectedAuthor("");
        setSelectedCategory("");
        setCurrentPage(1);
    };

    const hasActiveFilters = searchQuery || selectedAuthor || selectedCategory;

    return (
        <div className="space-y-12">
            {/* Search and Filters */}
            <section className="bg-white rounded-3xl p-6 shadow-sm border border-[#e7c277]/20 space-y-4">
                {/* Search Bar */}
                <div className="relative">
                    <input
                        type="text"
                        placeholder="Cari artikel berdasarkan judul atau deskripsi..."
                        value={searchQuery}
                        onChange={(e) => {
                            setSearchQuery(e.target.value);
                            handleFilterChange();
                        }}
                        className="w-full px-4 py-3 pr-12 rounded-full border border-slate-300 focus:border-[#e7c277] focus:ring-2 focus:ring-[#e7c277]/20 outline-none transition"
                    />
                    <svg
                        className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                </div>

                {/* Filters */}
                <div className="flex flex-wrap gap-4">
                    {/* Author Filter */}
                    <select
                        value={selectedAuthor}
                        onChange={(e) => {
                            setSelectedAuthor(e.target.value);
                            handleFilterChange();
                        }}
                        className="px-4 py-2 rounded-full border border-slate-300 focus:border-[#e7c277] focus:ring-2 focus:ring-[#e7c277]/20 outline-none transition bg-white"
                    >
                        <option value="">Semua Penulis</option>
                        {authors.map((author) => (
                            <option key={author} value={author}>
                                {author}
                            </option>
                        ))}
                    </select>

                    {/* Category Filter */}
                    <select
                        value={selectedCategory}
                        onChange={(e) => {
                            setSelectedCategory(e.target.value);
                            handleFilterChange();
                        }}
                        className="px-4 py-2 rounded-full border border-slate-300 focus:border-[#e7c277] focus:ring-2 focus:ring-[#e7c277]/20 outline-none transition bg-white"
                    >
                        <option value="">Semua Kategori</option>
                        {categories.map((category) => (
                            <option key={category} value={category}>
                                {(category as string).charAt(0).toUpperCase() + (category as string).slice(1)}
                            </option>
                        ))}
                    </select>

                    {/* Clear Filters */}
                    {hasActiveFilters && (
                        <button
                            onClick={clearFilters}
                            className="px-4 py-2 rounded-full bg-slate-100 text-slate-700 hover:bg-slate-200 transition text-sm font-medium"
                        >
                            Hapus Filter
                        </button>
                    )}
                </div>

                {/* Results Count */}
                <div className="text-sm text-slate-600">
                    Menampilkan {filteredArticles.length} artikel
                    {hasActiveFilters && ` dari ${articles.length} total artikel`}
                </div>
            </section>

            {/* Grid Artikel */}
            {pagedArticles.length > 0 ? (
                <section className="grid md:grid-cols-3 gap-8">
                    {pagedArticles.map((a) => (
                        <Link key={a.slug} href={`/bic/artikel/${a.slug}`}>
                            <article className="group bg-white rounded-3xl overflow-hidden shadow-sm hover:shadow-xl transition border border-[#e7c277]/40">
                                <div className="relative">
                                    <img
                                        src={assetUrl(a.cover)}
                                        alt={a.title}
                                        className="h-48 w-full object-cover group-hover:scale-105 transition duration-300"
                                    />
                                    <div className="absolute top-3 left-3 rounded-full bg-white/90 px-3 py-1 text-xs text-slate-700 shadow">
                                        {a.date}
                                    </div>
                                </div>

                                <div className="p-5 space-y-3">
                                    <h3 className="font-semibold leading-snug line-clamp-2">{a.title}</h3>
                                    <p className="text-sm text-gray-600 line-clamp-2">{a.excerpt}</p>

                                    {a.author && (
                                        <p className="text-xs text-slate-500">
                                            Oleh: {a.author}
                                        </p>
                                    )}

                                    <span className="inline-flex items-center gap-1 text-[#e7c277] text-sm font-medium">
                                        Baca artikel
                                        <span aria-hidden>→</span>
                                    </span>
                                </div>
                            </article>
                        </Link>
                    ))}
                </section>
            ) : (
                <div className="text-center py-16 bg-slate-50 rounded-3xl">
                    <p className="text-slate-600 text-lg">Tidak ada artikel yang sesuai dengan filter Anda.</p>
                    <button
                        onClick={clearFilters}
                        className="mt-4 px-6 py-2 bg-[#102440] text-white rounded-full hover:bg-[#0b1a2f] transition"
                    >
                        Hapus Semua Filter
                    </button>
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
        </div>
    );
}
