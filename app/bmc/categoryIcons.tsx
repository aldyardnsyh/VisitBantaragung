// Ikon kategori BMC: satu set SVG stroke agar selaras dengan ikon inline situs.
// Alasan per ikon (R-04): rw = peta lipat (wilayah administratif), wisata = gunung
// (andalan wisata alam), longsor = segitiga peringatan (mitigasi), homestay = rumah,
// umkm = etalase toko, imap = jalan (infrastruktur), dusun = pin lokasi (wilayah),
// informasi = papan info. Fallback: pin.
const PATHS: Record<string, React.ReactNode> = {
    rw: (
        <>
            <path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2z" />
            <path d="M9 4v14M15 6v14" />
        </>
    ),
    wisata: (
        <>
            <path d="M3 20 9 8l4 7 3-4 5 9H3z" />
            <circle cx="17" cy="6" r="2" />
        </>
    ),
    longsor: (
        <>
            <path d="M12 3 2 21h20L12 3z" />
            <path d="M12 10v5M12 18.5h.01" />
        </>
    ),
    homestay: (
        <>
            <path d="M3 11l9-8 9 8" />
            <path d="M5 10v10h5v-6h4v6h5V10" />
        </>
    ),
    umkm: (
        <>
            <path d="M4 8l1 12h14l1-12" />
            <path d="M3 8h18M9 20v-5h6v5" />
            <path d="M5 8 6.5 3h11L19 8" />
        </>
    ),
    imap: (
        <>
            <path d="M4 20 10 4M20 20 14 4" />
            <path d="M12 6v2M12 11v2M12 16v2" />
        </>
    ),
    dusun: (
        <>
            <path d="M12 21s-7-5.5-7-11a7 7 0 0 1 14 0c0 5.5-7 11-7 11z" />
            <circle cx="12" cy="10" r="2.5" />
        </>
    ),
    informasi: (
        <>
            <circle cx="12" cy="12" r="9" />
            <path d="M12 11v5M12 8h.01" />
        </>
    ),
    pin: (
        <>
            <path d="M12 21s-7-5.5-7-11a7 7 0 0 1 14 0c0 5.5-7 11-7 11z" />
            <circle cx="12" cy="10" r="2.5" />
        </>
    ),
};

export default function CategoryIcon({
    id,
    className = "w-6 h-6",
}: {
    id: string;
    className?: string;
}) {
    return (
        <svg
            className={className}
            fill="none"
            stroke="currentColor"
            strokeWidth={1.8}
            strokeLinecap="round"
            strokeLinejoin="round"
            viewBox="0 0 24 24"
            aria-hidden="true"
        >
            {PATHS[id] ?? PATHS.pin}
        </svg>
    );
}
