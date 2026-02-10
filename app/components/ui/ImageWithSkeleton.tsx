"use client";

import { useState, useRef, useEffect, useCallback } from "react";

interface ImageWithSkeletonProps {
    src: string;
    alt: string;
    className?: string;
    aspectRatio?: "square" | "video" | "portrait" | "auto";
}

export default function ImageWithSkeleton({
    src,
    alt,
    className = "",
    aspectRatio = "auto",
}: ImageWithSkeletonProps) {
    const [isLoaded, setIsLoaded] = useState(false);
    const [hasError, setHasError] = useState(false);
    const imgRef = useRef<HTMLImageElement>(null);

    const aspectRatioClasses = {
        square: "aspect-square",
        video: "aspect-video",
        portrait: "aspect-[3/4]",
        auto: "",
    };

    // Handle cached images: if the browser already loaded the image
    // before React attached onLoad, we detect it here via img.complete
    useEffect(() => {
        const img = imgRef.current;
        if (img && img.complete && img.naturalWidth > 0) {
            setIsLoaded(true);
        }
    }, [src]);

    // Reset states when src changes
    useEffect(() => {
        setIsLoaded(false);
        setHasError(false);
    }, [src]);

    const handleLoad = useCallback(() => {
        setIsLoaded(true);
    }, []);

    const handleError = useCallback(() => {
        setHasError(true);
    }, []);

    return (
        <div className={`relative overflow-hidden ${className}`}>
            {/* Skeleton Loader */}
            {!isLoaded && !hasError && (
                <div
                    className={`absolute inset-0 bg-gradient-to-r from-slate-200 via-slate-100 to-slate-200 animate-shimmer ${aspectRatioClasses[aspectRatio]}`}
                    style={{
                        backgroundSize: "200% 100%",
                    }}
                />
            )}

            {/* Actual Image */}
            {!hasError && (
                <img
                    ref={imgRef}
                    src={src}
                    alt={alt}
                    loading="lazy"
                    decoding="async"
                    className={`w-full h-full object-cover transition-opacity duration-300 ${isLoaded ? "opacity-100" : "opacity-0"
                        }`}
                    onLoad={handleLoad}
                    onError={handleError}
                />
            )}

            {/* Error State */}
            {hasError && (
                <div className="absolute inset-0 flex items-center justify-center bg-slate-100">
                    <div className="text-center text-slate-400">
                        <svg
                            className="w-12 h-12 mx-auto mb-2"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                            />
                        </svg>
                        <p className="text-sm">Gambar tidak dapat dimuat</p>
                    </div>
                </div>
            )}
        </div>
    );
}

