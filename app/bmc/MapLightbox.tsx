"use client";

import { useState, useEffect } from "react";
import { assetUrl } from "@/lib/asset";

interface MapLightboxProps {
    isOpen: boolean;
    onClose: () => void;
    mapImage: string;
    mapTitle: string;
    mapDescription: string;
    allMaps: Array<{ image: string; title: string; description: string }>;
    currentIndex: number;
    onNavigate: (index: number) => void;
}

export default function MapLightbox({
    isOpen,
    onClose,
    mapImage,
    mapTitle,
    mapDescription,
    allMaps,
    currentIndex,
    onNavigate,
}: MapLightboxProps) {
    const [zoom, setZoom] = useState(1);

    // Close on Escape key
    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
        };
        if (isOpen) {
            document.addEventListener("keydown", handleEscape);
            document.body.style.overflow = "hidden";
        }
        return () => {
            document.removeEventListener("keydown", handleEscape);
            document.body.style.overflow = "unset";
        };
    }, [isOpen, onClose]);

    // Navigation with arrow keys
    useEffect(() => {
        const handleArrows = (e: KeyboardEvent) => {
            if (e.key === "ArrowLeft" && currentIndex > 0) {
                onNavigate(currentIndex - 1);
            } else if (e.key === "ArrowRight" && currentIndex < allMaps.length - 1) {
                onNavigate(currentIndex + 1);
            }
        };
        if (isOpen) {
            document.addEventListener("keydown", handleArrows);
        }
        return () => {
            document.removeEventListener("keydown", handleArrows);
        };
    }, [isOpen, currentIndex, allMaps.length, onNavigate]);

    // Reset zoom when map changes
    useEffect(() => {
        setZoom(1);
    }, [mapImage]);

    if (!isOpen) return null;

    const handleDownload = () => {
        const link = document.createElement("a");
        link.href = assetUrl(mapImage);
        link.download = `${mapTitle}.png`;
        link.click();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4">
            {/* Close Button */}
            <button
                onClick={onClose}
                className="absolute top-4 right-4 z-10 flex items-center justify-center w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 transition text-white"
                aria-label="Close"
            >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
            </button>

            {/* Navigation Buttons */}
            {currentIndex > 0 && (
                <button
                    onClick={() => onNavigate(currentIndex - 1)}
                    className="absolute left-4 top-1/2 -translate-y-1/2 z-10 flex items-center justify-center w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 transition text-white"
                    aria-label="Previous"
                >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                </button>
            )}

            {currentIndex < allMaps.length - 1 && (
                <button
                    onClick={() => onNavigate(currentIndex + 1)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 z-10 flex items-center justify-center w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 transition text-white"
                    aria-label="Next"
                >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                </button>
            )}

            {/* Main Content */}
            <div className="max-w-7xl w-full max-h-[90vh] flex flex-col bg-white/5 rounded-2xl overflow-hidden">
                {/* Image Container with Scroll */}
                <div className="flex-1 overflow-auto p-4">
                    <div className="flex items-start justify-center min-h-full">
                        <img
                            src={assetUrl(mapImage)}
                            alt={mapTitle}
                            className="max-w-full h-auto transition-transform duration-300 mx-auto"
                            style={{
                                transform: `scale(${zoom})`,
                                transformOrigin: 'top center'
                            }}
                        />
                    </div>
                </div>

                {/* Controls Bar */}
                <div className="bg-white/10 backdrop-blur-sm p-4 space-y-3 flex-shrink-0">
                    {/* Zoom Controls */}
                    <div className="flex items-center justify-center gap-2">
                        <button
                            onClick={() => setZoom(Math.max(0.5, zoom - 0.25))}
                            className="px-3 py-1 rounded-full bg-white/10 hover:bg-white/20 transition text-white text-sm"
                            disabled={zoom <= 0.5}
                        >
                            −
                        </button>
                        <span className="text-white text-sm min-w-[60px] text-center">
                            {Math.round(zoom * 100)}%
                        </span>
                        <button
                            onClick={() => setZoom(Math.min(3, zoom + 0.25))}
                            className="px-3 py-1 rounded-full bg-white/10 hover:bg-white/20 transition text-white text-sm"
                            disabled={zoom >= 3}
                        >
                            +
                        </button>
                        <button
                            onClick={() => setZoom(1)}
                            className="px-3 py-1 rounded-full bg-white/10 hover:bg-white/20 transition text-white text-sm ml-2"
                        >
                            Reset
                        </button>
                    </div>

                    {/* Map Info & Download */}
                    <div className="flex items-center justify-between gap-4">
                        <div className="flex-1 text-white">
                            <h3 className="font-semibold">{mapTitle}</h3>
                            <p className="text-sm text-white/70">{mapDescription}</p>
                            <p className="text-xs text-white/50 mt-1">
                                {currentIndex + 1} / {allMaps.length}
                            </p>
                        </div>
                        <button
                            onClick={handleDownload}
                            className="flex items-center gap-2 px-4 py-2 rounded-full bg-[#e7c277] hover:bg-[#d4b06a] transition text-[#102440] font-medium flex-shrink-0"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                            </svg>
                            Download
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
