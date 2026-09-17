"use client";

import { useState, useEffect, useCallback } from "react";
import Reveal from "@/app/components/ui/Reveal";

// Judul per foto (slug nama file -> judul).
const CAPTIONS: Record<string, string> = {
    "curug-cipeuteuy": "Curug Cipeuteuy",
    "edukasi-sekolah": "Edukasi Sekolah",
    "festival-budaya": "Festival Budaya",
    "gotong-royong": "Gotong Royong",
    "keberangkatan": "Keberangkatan",
    "panen-bersama": "Panen Bersama",
    "pelatihan-umkm": "Pelatihan UMKM",
    "penanaman-herbal": "Penanaman Herbal",
    "penerjunan": "Penerjunan",
    "penutupan": "Penutupan",
    "penyambutan": "Penyambutan",
    "terasering": "Terasering",
    "workshop-jamu": "Workshop Jamu",
};

// Narasi kenangan per momen: cerita, bukan deskripsi. Ditulis dari konteks nyata
// program KKN-PPM UGM Simfoni Sindangwangi Periode IV 2025 di Bantaragung dan
// Sindangwangi, tanpa tanggal, angka, atau nama yang tak terverifikasi.
const CERITA: Record<string, string> = {
    "keberangkatan":
        "Perjalanan selalu dimulai dengan degup yang sama, antara antusias dan gugup. Ransel penuh, daftar rencana penuh, dan satu pertanyaan yang dibawa semua orang, akan seperti apa desa yang menanti. Ternyata jawabannya jauh lebih hangat dari bayangan.",
    "penyambutan":
        "Belum sempat melepas lelah, senyum warga sudah lebih dulu menyambut di depan. Ada teh hangat, ada tawa perkenalan, ada rasa canggung yang mencair dalam hitungan menit. Hari pertama itu mengajarkan satu hal, di desa ini tidak ada orang asing, yang ada hanya keluarga yang belum sempat berkenalan.",
    "penerjunan":
        "Momen resmi ketika tanggung jawab diserahkan dan pundak terasa sedikit lebih berat. Di balik seremonialnya, penerjunan adalah janji yang diucapkan dalam hati, untuk hadir sepenuhnya, bekerja sungguh-sungguh, dan pulang sebagai pribadi yang berbeda.",
    "edukasi-sekolah":
        "Ruang kelashan paling jujur ada di sini, tempat puluhan pasang mata kecil menatap penuh rasa ingin tahu. Kami datang berniat mengajar, pulang membawa pelajaran yang lebih besar tentang ketulusan, keberanian bertanya, dan tawa yang tidak dibuat-buat.",
    "workshop-jamu":
        "Aroma jahe, kunyit, dan sereh memenuhi udara saat tangan-tangan belajar meracik warisan leluhur. Dari menakar bahan hingga menyeruput hasil racikan sendiri, workshop ini mengingatkan bahwa kesehatan alami tumbuh dari kebun dan kesabaran.",
    "penanaman-herbal":
        "Setiap lubang yang digali dan setiap bibit yang ditanam adalah tabungan untuk masa depan kampung. Tanah Mertasela hari itu menjadi saksi bahwa merawat alam tidak butuh hal besar, cukup dimulai, dilakukan bersama, dan dirawat terus.",
    "pelatihan-umkm":
        "Di dapur-dapur produksi dan meja-meja kemasan, para pelaku usaha belajar bahwa produk bagus saja tidak cukup. Tentang merek, harga, dan cara bercerita, pelatihan ini adalah ikhtiar kecil agar ekonomi desa naik kelas dengan kakinya sendiri.",
    "panen-bersama":
        "Lumpur di kaki, sabit di tangan, dan hamparan padi menguning sejauh mata memandang. Panen bersama mengajarkan ritme paling purba tentang kehidupan, bahwa setiap butir nasi adalah hasil kesabaran berbulan-bulan dan kerja banyak tangan.",
    "gotong-royong":
        "Tidak ada undangan resmi, tidak ada daftar hadir, namun semua datang membawa cangkul, sapu, dan tenaga. Gotong royong di desa ini bukan acara, melainkan cara hidup, dan kami beruntung pernah menjadi bagiannya walau sebentar.",
    "festival-budaya":
        "Saat kendang genjring ditabuh dan langkah pencak silat dibuka, seluruh desa berkumpul dalam satu detak. Festival ini bukan sekadar tontonan, melainkan panggung tempat warga menunjukkan siapa mereka dan apa yang mereka banggakan.",
    "curug-cipeuteuy":
        "Setelah menuruni anak tangga dan melintasi jembatan di tengah hutan pinus, suara gemericik berubah menjadi gemuruh yang melegakan. Dinginnya air Curug Cipeuteuy seakan membasuh seluruh lelah, dan momen inilah yang paling sering diceritakan ulang setelah pulang.",
    "terasering":
        "Berjalan di pematang sawah Ciboer saat cahaya sore memantul di genangan air adalah kemewahan yang tidak dijual di kota. Di sini waktu melambat, percakapan mengalir, dan kamera hampir tidak pernah berhenti bekerja.",
    "penutupan":
        "Acara paling berat bukanlah yang paling melelahkan, melainkan yang menandai akhir. Air mata, pelukan, dan janji untuk kembali mengiringi penutupan program. Kami datang sebagai tamu dan pulang sebagai keluarga, membawa Bantaragung selamanya di dalam ingatan.",
};

function captionOf(file: string): string {
    const slug = file.replace(/\.[^.]+$/, "").toLowerCase();
    return (
        CAPTIONS[slug] ??
        slug
            .replace(/[-_]+/g, " ")
            .trim()
            .replace(/\b\w/g, (c) => c.toUpperCase())
    );
}

function ceritaOf(file: string): string {
    const slug = file.replace(/\.[^.]+$/, "").toLowerCase();
    return CERITA[slug] ?? "";
}

export default function GaleriClient({ files }: { files: string[] }) {
    const [openIndex, setOpenIndex] = useState<number | null>(null);
    const [zoom, setZoom] = useState(1);

    const close = useCallback(() => {
        setOpenIndex(null);
        setZoom(1);
    }, []);

    const step = useCallback(
        (dir: 1 | -1) => {
            setOpenIndex((i) =>
                i === null ? i : (i + dir + files.length) % files.length
            );
            setZoom(1);
        },
        [files.length]
    );

    useEffect(() => {
        if (openIndex === null) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") close();
            if (e.key === "ArrowRight") step(1);
            if (e.key === "ArrowLeft") step(-1);
        };
        document.addEventListener("keydown", onKey);
        document.body.style.overflow = "hidden";
        return () => {
            document.removeEventListener("keydown", onKey);
            document.body.style.overflow = "unset";
        };
    }, [openIndex, close, step]);

    const active = openIndex !== null ? files[openIndex] : null;

    return (
        <>
            <div className="columns-1 md:columns-2 lg:columns-3 gap-4 space-y-4">
                {files.map((file, i) => {
                    const caption = captionOf(file);
                    const slug = file.replace(/\.[^.]+$/, "").toLowerCase();
                    return (
                        <Reveal
                            key={file}
                            delay={(i % 3) * 100}
                            className="break-inside-avoid"
                        >
                            <button
                                type="button"
                                onClick={() => setOpenIndex(i)}
                                aria-label={`Perbesar foto ${caption}`}
                                className="block w-full text-left overflow-hidden rounded-2xl bg-white border border-forest-200/60 shadow-sm group hover:shadow-lg transition cursor-zoom-in"
                            >
                                <div className="overflow-hidden">
                                    <img
                                        src={`/galeri/${file}`}
                                        alt={caption}
                                        loading="lazy"
                                        decoding="async"
                                        className={`w-full object-cover group-hover:scale-105 transition-transform duration-300 ${
                                            slug === "penerjunan" || slug === "panen-bersama"
                                                ? "h-80"
                                                : "h-56"
                                        }`}
                                    />
                                </div>
                                <span className="block px-4 py-3 text-sm font-medium text-forest-800">
                                    {caption}
                                </span>
                            </button>
                        </Reveal>
                    );
                })}
            </div>

            {active !== null && openIndex !== null && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
                    role="dialog"
                    aria-modal="true"
                    aria-label={`Foto ${captionOf(active)}`}
                    onClick={close}
                >
                    <button
                        type="button"
                        onClick={close}
                        autoFocus
                        aria-label="Tutup"
                        className="absolute top-4 right-4 z-10 flex items-center justify-center w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 transition text-white"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>

                    {openIndex > 0 && (
                        <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                step(-1);
                            }}
                            aria-label="Foto sebelumnya"
                            className="absolute left-4 top-1/2 -translate-y-1/2 z-10 flex items-center justify-center w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 transition text-white"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                            </svg>
                        </button>
                    )}

                    {openIndex < files.length - 1 && (
                        <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                step(1);
                            }}
                            aria-label="Foto berikutnya"
                            className="absolute right-4 top-1/2 -translate-y-1/2 z-10 flex items-center justify-center w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 transition text-white"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                        </button>
                    )}

                    <div
                        className="max-w-4xl w-full max-h-[92vh] flex flex-col"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex-1 overflow-auto flex items-start justify-center min-h-0">
                            <img
                                src={`/galeri/${active}`}
                                alt={captionOf(active)}
                                className="max-w-full h-auto max-h-[52vh] object-contain rounded-t-2xl transition-transform duration-300"
                                style={{ transform: `scale(${zoom})`, transformOrigin: "top center" }}
                            />
                        </div>

                        {/* Panel kaca: satu-satunya elemen glass di laman (R-10),
                            agar foto tetap terlihat di baliknya dan teks tetap kontras. */}
                        <div className="rounded-b-2xl bg-black/55 backdrop-blur-md border border-white/10 border-t-0 px-6 py-5 text-white max-h-[34vh] overflow-y-auto">
                            <div className="flex items-center justify-between gap-4 mb-1">
                                <h3 className="font-display font-bold text-xl md:text-2xl">
                                    {captionOf(active)}
                                </h3>
                                <span className="text-xs text-white/60 whitespace-nowrap">
                                    {openIndex + 1} / {files.length}
                                </span>
                            </div>
                            <p className="text-sm md:text-[15px] leading-relaxed text-white/85">
                                {ceritaOf(active)}
                            </p>
                            <div className="flex flex-wrap items-center gap-2 mt-4">
                                <button
                                    type="button"
                                    onClick={() => setZoom(Math.max(0.5, zoom - 0.25))}
                                    disabled={zoom <= 0.5}
                                    aria-label="Perkecil"
                                    className="min-w-[44px] min-h-[44px] px-3 rounded-full bg-white/10 hover:bg-white/20 transition text-sm disabled:opacity-40"
                                >
                                    −
                                </button>
                                <span className="text-sm min-w-[60px] text-center text-white/80">
                                    {Math.round(zoom * 100)}%
                                </span>
                                <button
                                    type="button"
                                    onClick={() => setZoom(Math.min(3, zoom + 0.25))}
                                    disabled={zoom >= 3}
                                    aria-label="Perbesar"
                                    className="min-w-[44px] min-h-[44px] px-3 rounded-full bg-white/10 hover:bg-white/20 transition text-sm disabled:opacity-40"
                                >
                                    +
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setZoom(1)}
                                    className="min-h-[44px] px-4 rounded-full bg-white/10 hover:bg-white/20 transition text-sm"
                                >
                                    Reset
                                </button>
                                <a
                                    href={`/galeri/${active}`}
                                    download={active}
                                    className="inline-flex items-center gap-2 min-h-[44px] px-4 rounded-full bg-gold-400 hover:brightness-95 transition text-forest-950 text-sm font-semibold"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                    </svg>
                                    Unduh
                                </a>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
