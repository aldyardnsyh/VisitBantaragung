/**
 * Titik pusat Desa Bantaragung.
 *
 * Satu sumber untuk peta (peta wisata, lokasi, kontak) dan chatbot supaya
 * keduanya mengarah ke titik yang sama. Koordinat berasal dari pencarian
 * OpenStreetMap/Nominatim desa (lihat scripts/geo/ untuk hasilnya).
 */
export const VILLAGE_CENTER = { lat: -6.841111, lng: 108.392778 } as const;

/**
 * True bila koordinat masih menunjuk titik desa (hasil fallback pencarian).
 *
 * Dipakai untuk memutuskan: memakai pin titik desa vs koordinat asli,
 * dan apakah pengunjung perlu diberi catatan "titik peta berada di pusat desa".
 */
export function isVillageCenter(lat: number, lng: number): boolean {
    return (
        Math.abs(lat - VILLAGE_CENTER.lat) < 0.0005 &&
        Math.abs(lng - VILLAGE_CENTER.lng) < 0.0005
    );
}
