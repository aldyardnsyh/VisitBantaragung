"use client";

import { useState } from "react";
import Link from "next/link";
import { assetUrl } from "@/lib/asset";
import ImageWithSkeleton from "@/app/components/ui/ImageWithSkeleton";
import type { Herbal } from "@/lib/content";

export default function Filter({ items }: { items: Herbal[] }) {
    const [query, setQuery] = useState("");

    const filtered = items.filter((item) =>
        `${item.name} ${item.latin} ${item.excerpt}`
            .toLowerCase()
            .includes(query.toLowerCase())
    );

    return (
        <section className="max-w-7xl mx-auto px-6 py-16">
            <div className="sticky top-0 z-30 bg-sand-100/90 backdrop-blur pb-4 mb-8">
                <label htmlFor="herb-search" className="sr-only">
                    Cari tanaman herbal
                </label>
                <input
                    id="herb-search"
                    type="search"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Cari nama, nama Latin, atau manfaat tanaman…"
                    className="w-full max-w-xl rounded-full border border-forest-200 bg-white px-5 py-3 text-sm text-forest-800 placeholder:text-slate-400 shadow-sm focus:outline-none focus:ring-2 focus:ring-forest-500"
                />
            </div>

            <p className="mb-6 text-sm text-slate-500">
                {filtered.length} dari {items.length} tanaman
            </p>

            {filtered.length === 0 ? (
                <div className="rounded-2xl bg-white border border-forest-200/60 p-10 text-center text-slate-600">
                    Tidak menemukan tanaman yang cocok dengan pencarian.
                </div>
            ) : (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filtered.map((item) => (
                        <Link
                            key={item.slug}
                            href={`/b2h/katalog/${item.slug}`}
                            className="group flex flex-col bg-white rounded-2xl overflow-hidden border border-forest-200/60 shadow-sm hover:shadow-md transition"
                        >
                            <ImageWithSkeleton
                                src={assetUrl(item.cover)}
                                alt={item.name}
                                className="aspect-[4/3] group-hover:scale-105 transition-transform duration-300"
                            />
                            <div className="p-5 flex flex-col gap-2 flex-1">
                                <p className="italic text-sm text-slate-500">{item.latin}</p>
                                <h3 className="font-semibold text-forest-800 leading-snug">
                                    {item.name}
                                </h3>
                                <p className="text-sm text-slate-600 line-clamp-2">
                                    {item.excerpt}
                                </p>
                                <div className="mt-auto flex flex-wrap gap-2 pt-2">
                                    {item.benefits.slice(0, 2).map((b) => (
                                        <span
                                            key={b}
                                            className="bg-forest-100 text-forest-700 rounded-full px-3 py-1 text-xs"
                                        >
                                            {b}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>
            )}
        </section>
    );
}