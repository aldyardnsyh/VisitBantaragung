"use client";

import { useEffect, useRef, useState } from "react";
import "leaflet/dist/leaflet.css";

export interface MapPoint {
    lat: number;
    lng: number;
    label: string;
}

interface LeafletMapProps {
    points: MapPoint[];
    zoom?: number;
    className?: string;
    /** Label untuk pembaca layar, mis. "Peta lokasi Curug Cipeuteuy". */
    ariaLabel: string;
}

/**
 * Peta interaktif Leaflet + tile OpenStreetMap (open-source, tanpa API key).
 *
 * Leaflet membutuhkan `window`, jadi modulnya di-import dinamis di dalam
 * effect: server hanya merender wadah kosong dan bundel peta baru dimuat di
 * klien. Kelas `isolate` membuat stacking context sendiri supaya pane
 * Leaflet (z-index sampai 1000) tidak menutupi navbar yang lengket.
 */
export default function LeafletMap({
    points,
    zoom = 14,
    className = "h-[420px]",
    ariaLabel,
}: LeafletMapProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [failed, setFailed] = useState(false);

    useEffect(() => {
        let disposed = false;
        let map: import("leaflet").Map | null = null;

        import("leaflet")
            .then(({ default: L }) => {
                if (disposed || !containerRef.current) return;

                const instance = L.map(containerRef.current, {
                    // Roda mouse tetap menggulir halaman; zoom lewat tombol +/- atau cubit.
                    scrollWheelZoom: false,
                });
                map = instance;

                L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
                    maxZoom: 19,
                    attribution:
                        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
                }).addTo(instance);

                // Pin digambar sendiri (aksen clay situs) agar konsisten dengan
                // identitas halaman, menggantikan ikon marker bawaan Leaflet.
                const pin = L.divIcon({
                    className: "vb-map-pin",
                    html: '<svg viewBox="0 0 24 24" width="30" height="40" aria-hidden="true"><path d="M12 1C7.03 1 3 5.03 3 10c0 6.2 7.4 14 8.4 15a1 1 0 0 0 1.2 0c1-1 8.4-8.8 8.4-15 0-4.97-4.03-9-9-9Z" fill="var(--color-clay-500, #c96f4a)" stroke="#fff" stroke-width="1.5"/><circle cx="12" cy="10" r="3.5" fill="#fff"/></svg>',
                    iconSize: [30, 40],
                    iconAnchor: [15, 39],
                    popupAnchor: [0, -34],
                });

                const latLngs = points.map((p) => L.latLng(p.lat, p.lng));
                if (!latLngs.length) return;

                latLngs.forEach((latLng, i) => {
                    L.marker(latLng, {
                        icon: pin,
                        title: points[i].label,
                        alt: points[i].label,
                    })
                        .addTo(instance)
                        .bindPopup(escapeHtml(points[i].label));
                });

                if (latLngs.length > 1) {
                    instance.fitBounds(L.latLngBounds(latLngs).pad(0.3));
                } else {
                    instance.setView(latLngs[0], zoom);
                }
            })
            .catch(() => {
                if (!disposed) setFailed(true);
            });

        return () => {
            disposed = true;
            map?.remove();
        };
    }, [points, zoom]);

    return (
        <div
            ref={containerRef}
            role="region"
            aria-label={ariaLabel}
            className={`vb-map relative isolate z-0 ${className}`}
        >
            {failed && (
                <p className="flex h-full items-center justify-center px-6 text-center text-sm text-slate-600">
                    Peta gagal dimuat. Coba muat ulang halaman.
                </p>
            )}
        </div>
    );
}

function escapeHtml(value: string): string {
    return value
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}
