"use client";

import { useEffect, useState } from "react";

interface ResponsiveArticleProps {
    cover: string;
    alt: string;
    children: React.ReactNode;
}

// Layout detail berita menyesuaikan RASIO gambar cover (tidak bisa diprediksi admin uploader):
// - portrait  : gambar kiri (sticky), teks di samping kanan
// - landscape : gambar di atas full-width, teks di bawah
type Orient = "landscape" | "portrait";

export default function ResponsiveArticle({
    cover,
    alt,
    children,
}: ResponsiveArticleProps) {
    const [orient, setOrient] = useState<Orient>("landscape");
    const [ready, setReady] = useState(false);

    useEffect(() => {
        const img = new Image();
        img.onload = () => {
            const ratio = img.naturalWidth / img.naturalHeight;
            setOrient(ratio < 0.85 ? "portrait" : "landscape");
            setReady(true);
        };
        img.onerror = () => setReady(true);
        img.src = cover;
    }, [cover]);

    // PORTRAIT: gambar di kiri, konten di kanan
    if (orient === "portrait") {
        return (
            <section className="max-w-7xl mx-auto w-full px-4 sm:px-6 py-10 grid gap-8 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] items-start">
                <div className="order-1 lg:order-none">
                    <div className="rounded-2xl overflow-hidden shadow-md border border-forest-200/70 bg-white">
                        <img
                            src={cover}
                            alt={alt}
                            className="block w-full h-auto max-w-full object-contain"
                        />
                    </div>
                </div>
                <div className="space-y-5 order-2 lg:order-none min-w-0">{children}</div>
            </section>
        );
    }

    // LANDSCAPE/SQUARE: gambar di atas mengikuti rasio asli, konten di bawah
    return (
        <section className="max-w-7xl mx-auto w-full px-4 sm:px-6 py-10">
            <div className="rounded-2xl overflow-hidden shadow-md border border-forest-200/70 bg-white">
                {ready ? (
                    <img
                        src={cover}
                        alt={alt}
                        className="block w-full h-auto max-w-full"
                    />
                ) : (
                    <div className="w-full aspect-[16/9] animate-pulse bg-forest-100" />
                )}
            </div>
            <div className="max-w-3xl mx-auto w-full min-w-0 px-2 sm:px-0 space-y-5 mt-10">{children}</div>
        </section>
    );
}
