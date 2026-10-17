"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { useChat, type ChatCard, type ChatMessageItem } from "@/app/components/chat/useChat";
import { assetUrl } from "@/lib/asset";

/**
 * Widget pemandu digital.
 *
 * Aturan tampilan yang dijaga:
 * - Tidak dirender di rute /admin (dasbor punya konteks sendiri).
 * - Mengambang di kanan bawah, di atas konten, tetapi tidak menutupi tombol
 *   penting: posisinya menghindari area CTA bawah dengan jarak aman.
 * - Sepenuhnya dapat dioperasikan papan ketik: Esc menutup, fokus kembali ke
 *   tombol pemicu, dan jawaban dibacakan lewat aria-live.
 */

interface Props {
    /** Nomor WhatsApp pengelola untuk tombol cepat. */
    whatsappUrl: string;
    whatsappDisplay: string;
    /** true = tampilkan tombol pil di hero beranda. */
    showHeroTrigger?: boolean;
}

const QUICK_QUESTIONS = [
    "Destinasi wisata apa saja yang ada?",
    "Berapa tiket Curug Cipeuteuy?",
    "Ada homestay untuk keluarga?",
    "Tanaman herbal untuk imun apa?",
];

/** Penanda "badge sudah dilihat". localStorage, bukan bagian isi percakapan. */
const BADGE_KEY = "bantaragung-chat-badge-seen";

export default function ChatWidget({ whatsappUrl, whatsappDisplay }: Props) {
    const pathname = usePathname();
    const [open, setOpen] = useState(false);
    const [input, setInput] = useState("");
    // Konfirmasi sebelum menghapus. Menghapus seluruh percakapan tidak bisa
    // dibatalkan, jadi tombol langsung-hapus terlalu berisiko (mudah tersenggol
    // di layar sentuh).
    const [confirmClear, setConfirmClear] = useState(false);
    // Badge notifikasi. Disimpan di localStorage (bukan sessionStorage) karena
    // tujuannya menandai "sudah pernah dibuka", bukan menyimpan isi percakapan.
    const [showBadge, setShowBadge] = useState(false);
    const { messages, busy, send, clear } = useChat();

    const panelRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);
    const triggerRef = useRef<HTMLButtonElement>(null);
    const scrollRef = useRef<HTMLDivElement>(null);

    // Badge notifikasi muncul sampai pengguna membuka chat pertama kali.
    //
    // Status awal `null` = belum diketahui (server & render pertama). Nilai
    // dibaca setelah mount supaya markup server dan klien tidak berbeda.
    // Penulisan localStorage dilakukan di handler buka, bukan di efek, agar
    // tidak memicu render berantai.
    useEffect(() => {
        let seen = false;
        try {
            seen = Boolean(localStorage.getItem(BADGE_KEY));
        } catch {
            seen = false;
        }
        // Jadwalkan lewat microtask: menjaga efek tidak setState sinkron.
        void Promise.resolve().then(() => setShowBadge(!seen));
    }, []);

    // Fokus otomatis saat panel dibuka.
    useEffect(() => {
        if (open) inputRef.current?.focus();
    }, [open]);

    /** Buka/tutup panel; membuka panel menandai badge sudah dilihat. */
    const toggleOpen = () => {
        setOpen((v) => {
            const next = !v;
            if (next) {
                setShowBadge(false);
                try {
                    localStorage.setItem(BADGE_KEY, "1");
                } catch {
                    /* localStorage diblokir: badge tetap hilang untuk sesi ini */
                }
            }
            return next;
        });
    };

    // Gulir ke pesan terbaru.
    useEffect(() => {
        const el = scrollRef.current;
        if (el) el.scrollTop = el.scrollHeight;
    }, [messages, open]);

    // Esc menutup panel dan mengembalikan fokus ke tombol pemicu.
    useEffect(() => {
        if (!open) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") {
                setOpen(false);
                triggerRef.current?.focus();
            }
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [open]);

    const submit = (text: string) => {
        setInput("");
        void send(text);
    };

    // Dasbor admin punya antarmuka sendiri.
    if (pathname?.startsWith("/admin")) return null;

    return (
        <>
            {/* Panel */}
            {open && (
                <div
                    ref={panelRef}
                    role="dialog"
                    aria-modal="false"
                    aria-label="Pemandu digital Desa Wisata Bantaragung"
                    className="fixed bottom-0 right-0 relative z-[60] flex h-[85vh] w-full flex-col overflow-hidden rounded-t-3xl border border-forest-200 bg-white shadow-2xl sm:bottom-24 sm:right-6 sm:h-[600px] sm:max-h-[80vh] sm:w-[400px] sm:rounded-3xl"
                >
                    {/* Kepala */}
                    <header className="flex items-center gap-3 bg-forest-900 px-4 py-3 text-white">
                        <span
                            aria-hidden
                            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gold-400 text-forest-950"
                        >
                            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
                                />
                            </svg>
                        </span>
                        <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold">Bantaragung Guide</p>
                            <p className="truncate text-xs text-white/70">
                                Pemandu digital desa wisata
                            </p>
                        </div>
                        {messages.length > 0 && (
                            <button
                                type="button"
                                onClick={() => setConfirmClear(true)}
                                aria-label="Hapus seluruh percakapan"
                                title="Hapus seluruh percakapan"
                                className="flex shrink-0 items-center gap-1.5 rounded-lg border border-white/25 bg-white/10 px-2.5 py-1.5 text-xs font-medium text-white transition hover:border-red-300/60 hover:bg-red-500/20 hover:text-white active:scale-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-400"
                            >
                                <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M9 7V4a1 1 0 011-1h4a1 1 0 011 1v3M4 7h16" />
                                </svg>
                                <span className="hidden sm:inline">Hapus percakapan</span>
                                <span className="sm:hidden">Hapus</span>
                            </button>
                        )}
                        <button
                            type="button"
                            onClick={() => {
                                setOpen(false);
                                triggerRef.current?.focus();
                            }}
                            aria-label="Tutup pemandu digital"
                            className="rounded-lg p-1.5 transition hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold-400"
                        >
                            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </header>

                    {/* Isi percakapan */}
                    <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto bg-forest-50/40 px-3 py-4">
                        {messages.length === 0 && (
                            <div className="space-y-3">
                                <div className="rounded-2xl bg-white p-3 text-sm text-slate-700 shadow-sm">
                                    <p className="font-medium text-forest-800">
                                        Sampurasun! Saya pemandu digital Bantaragung.
                                    </p>
                                    <p className="mt-1 text-slate-600">
                                        Tanyakan soal destinasi, tiket, kampung herbal, homestay, atau
                                        cara menghubungi pengelola.
                                    </p>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {QUICK_QUESTIONS.map((q) => (
                                        <button
                                            key={q}
                                            type="button"
                                            onClick={() => submit(q)}
                                            className="rounded-full border border-forest-200 bg-white px-3 py-1.5 text-left text-xs text-forest-700 transition hover:border-forest-400 hover:bg-forest-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-forest-500"
                                        >
                                            {q}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {messages.map((m) => (
                            <Bubble key={m.id} message={m} />
                        ))}

                        <div aria-live="polite" className="sr-only">
                            {busy ? "Pemandu sedang mengetik" : ""}
                        </div>
                    </div>

                    {/* Tombol WhatsApp selalu tersedia sebagai jalan keluar */}
                    <div className="border-t border-forest-100 bg-white px-3 pt-2">
                        <a
                            href={whatsappUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center justify-center gap-2 rounded-xl bg-forest-50 px-3 py-2 text-xs font-medium text-forest-700 transition hover:bg-forest-100"
                        >
                            <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
                                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.347-.347.52-.52.174-.174.232-.298.347-.497.116-.198.058-.372-.03-.52-.086-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
                                <path d="M20.52 3.449C18.24 1.245 15.24 0 12.045 0 5.463 0 .104 5.359.101 11.943c0 2.096.547 4.142 1.588 5.945L0 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.585 0 11.946-5.359 11.949-11.943a11.87 11.87 0 00-3.422-8.402zM12 21.785h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.981.999-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.002-5.45 4.437-9.884 9.889-9.884a9.82 9.82 0 016.988 2.898 9.825 9.825 0 012.892 6.993c-.003 5.45-4.437 9.886-9.886 9.886z" />
                            </svg>
                            Chat pengelola via WhatsApp {whatsappDisplay}
                        </a>
                    </div>

                    {/* Konfirmasi hapus. Ditampilkan sebagai lapisan di atas
                        isi percakapan, bukan dialog peramban, agar gayanya
                        konsisten dan tetap terbaca di layar kecil. */}
                    {confirmClear && (
                        <div
                            role="alertdialog"
                            aria-modal="true"
                            aria-labelledby="hapus-judul"
                            aria-describedby="hapus-desc"
                            className="absolute inset-0 z-10 flex items-center justify-center bg-forest-950/50 p-4 backdrop-blur-sm"
                        >
                            <div className="w-full max-w-xs rounded-2xl bg-white p-5 shadow-2xl">
                                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-red-50 text-red-600">
                                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                                    </svg>
                                </div>
                                <h3 id="hapus-judul" className="text-base font-semibold text-forest-800">
                                    Hapus seluruh percakapan?
                                </h3>
                                <p id="hapus-desc" className="mt-1 text-sm text-slate-600">
                                    Semua pesan di layar ini akan dihapus dan tidak bisa dikembalikan.
                                </p>
                                <div className="mt-4 flex gap-2">
                                    <button
                                        type="button"
                                        autoFocus
                                        onClick={() => setConfirmClear(false)}
                                        className="flex-1 rounded-xl border border-forest-200 bg-white px-3 py-2.5 text-sm font-medium text-forest-700 transition hover:bg-forest-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest-500"
                                    >
                                        Batal
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            clear();
                                            setConfirmClear(false);
                                            inputRef.current?.focus();
                                        }}
                                        className="flex-1 rounded-xl bg-red-600 px-3 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700 active:scale-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-500"
                                    >
                                        Ya, hapus
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Kolom tulis */}
                    <form
                        onSubmit={(e) => {
                            e.preventDefault();
                            submit(input);
                        }}
                        className="flex items-end gap-2 bg-white px-3 pb-3 pt-2"
                    >
                        <textarea
                            ref={inputRef}
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === "Enter" && !e.shiftKey) {
                                    e.preventDefault();
                                    submit(input);
                                }
                            }}
                            rows={1}
                            maxLength={600}
                            placeholder="Tulis pertanyaan Anda..."
                            aria-label="Pertanyaan untuk pemandu digital"
                            className="max-h-24 flex-1 resize-none rounded-xl border border-forest-200 bg-white px-3 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-forest-500"
                        />
                        <button
                            type="submit"
                            disabled={busy || !input.trim()}
                            aria-label="Kirim pertanyaan"
                            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-clay-500 text-white transition hover:bg-clay-600 disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-clay-400"
                        >
                            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                            </svg>
                        </button>
                    </form>
                </div>
            )}

            {/* Tombol mengambang */}
            <button
                ref={triggerRef}
                type="button"
                onClick={toggleOpen}
                aria-expanded={open}
                aria-label={
                    open
                        ? "Tutup pemandu digital"
                        : `Buka pemandu digital${showBadge ? " (belum pernah dibuka)" : ""}`
                }
                className="fixed bottom-5 right-5 z-[60] flex items-center gap-2 rounded-full bg-forest-700 px-4 py-3.5 text-sm font-semibold text-white shadow-xl transition hover:bg-forest-800 hover:shadow-2xl active:scale-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-400"
            >
                <span className="relative flex">
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
                        />
                    </svg>

                    {/* Titik notifikasi: memberi tahu ada yang bisa ditanyakan,
                        tanpa menghalangi ikon. Hilang setelah chat pertama kali
                        dibuka dan tidak muncul lagi (disimpan di localStorage),
                        supaya tidak terasa mengganggu pada kunjungan berikutnya. */}
                    {showBadge && !open && (
                        <span className="pointer-events-none absolute -right-1.5 -top-1.5 flex h-3 w-3">
                            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
                            <span className="relative inline-flex h-3 w-3 rounded-full border border-white bg-red-500" />
                        </span>
                    )}
                </span>
                <span className="hidden sm:inline">Tanya Bantaragung</span>
            </button>
        </>
    );
}

/**
 * Kartu pratinjau satu entitas: gambar kecil, judul, satu fakta utama.
 *
 * Tujuan: jawaban tidak hanya teks dan tautan, tetapi memperlihatkan bahwa
 * yang dibicarakan memang punya halaman dan gambar di situs. Klik kartu =
 * membuka halaman detailnya.
 *
 * Bila gambar gagal dimuat (CDN bermasalah atau berkas hilang), blok gambar
 * dilepas dan kartu menyusut rapi tanpa kotak kosong.
 */
function SourceCard({ card }: { card: ChatCard }) {
    const [imgFailed, setImgFailed] = useState(false);
    const showImage = Boolean(card.cover) && !imgFailed;

    return (
        <Link
            href={card.href}
            className="group flex items-start gap-2.5 rounded-xl border border-forest-200/70 bg-forest-50/50 p-2 transition hover:border-forest-400 hover:bg-forest-50 hover:shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest-500"
        >
            {showImage && (
                <span className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-forest-100">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                        src={assetUrl(card.cover as string)}
                        alt=""
                        loading="lazy"
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                        onError={() => setImgFailed(true)}
                    />
                </span>
            )}

            <span className="min-w-0 flex-1">
                <span className="block truncate text-[13px] font-semibold text-forest-800">
                    {card.title}
                </span>
                {card.highlight ? (
                    <span className="mt-0.5 block truncate text-[11px] font-medium text-clay-600">
                        {card.highlight}
                    </span>
                ) : null}
                <span className="mt-0.5 line-clamp-2 block text-[11px] leading-snug text-slate-500">
                    {card.summary}
                </span>
            </span>

            <svg
                className="mt-1 h-3.5 w-3.5 shrink-0 text-forest-400 transition-transform group-hover:translate-x-0.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden
            >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
        </Link>
    );
}
function Bubble({ message }: { message: ChatMessageItem }) {
    if (message.role === "user") {
        return (
            <div className="flex justify-end">
                <p className="max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-br-sm bg-forest-700 px-3.5 py-2.5 text-sm text-white">
                    {message.text}
                </p>
            </div>
        );
    }

    if (message.pending) {
        return (
            <div className="flex justify-start">
                <div className="flex items-center gap-1.5 rounded-2xl rounded-bl-sm bg-white px-4 py-3 shadow-sm">
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-forest-400 [animation-delay:-0.3s]" />
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-forest-400 [animation-delay:-0.15s]" />
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-forest-400" />
                </div>
            </div>
        );
    }

    return (
        <div className="flex justify-start">
            <div className="max-w-[90%] space-y-2 rounded-2xl rounded-bl-sm bg-white px-3.5 py-2.5 text-sm text-slate-800 shadow-sm">
                <RichText text={message.text} />

                {/* Kartu pratinjau entitas yang dibicarakan. Gambar dimuat
                    malas (lazy) supaya tidak memperlambat panel, dan
                    disembunyikan bila gagal dimuat agar tidak menyisakan
                    kotak kosong. */}
                {message.cards && message.cards.length > 0 && (
                    <div className="space-y-2 border-t border-forest-100 pt-2">
                        {message.cards.map((c) => (
                            <SourceCard key={`${c.href}-${c.title}`} card={c} />
                        ))}
                    </div>
                )}

                {message.sources && message.sources.length > 0 && (
                    <div className="border-t border-forest-100 pt-2">
                        <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
                            Sumber
                        </p>
                        <ul className="mt-1 space-y-0.5">
                            {message.sources.slice(0, 8).map((s) => (
                                <li key={s.n}>
                                    <Link
                                        href={s.href}
                                        className="text-xs text-forest-600 underline-offset-2 hover:text-clay-600 hover:underline"
                                    >
                                        [{s.n}] {s.title}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                        {message.sources.length > 8 && (
                            <p className="mt-1 text-[11px] text-slate-400">
                                +{message.sources.length - 8} sumber lain
                            </p>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

/**
 * Penampil teks sederhana untuk balasan.
 *
 * Balasan berisi penanda ringan: **tebal** dan baris berawalan angka
 * ("1. ...") atau tanda hubung. Tanpa ini, tanda bintang tampil apa adanya
 * sehingga jawaban terlihat seperti kode mentah. Tidak memakai markdown
 * penuh agar tidak ada ketergantungan baru dan tidak ada risiko HTML.
 */
function RichText({ text }: { text: string }) {
    const blocks = text.split(/\n{2,}/);

    const renderInline = (line: string, key: number) => {
        const parts = line.split(/(\*\*[^*]+\*\*)/g);
        return (
            <span key={key}>
                {parts.map((p, i) =>
                    p.startsWith("**") && p.endsWith("**") ? (
                        <strong key={i} className="font-semibold text-forest-800">
                            {p.slice(2, -2)}
                        </strong>
                    ) : (
                        <span key={i}>{p}</span>
                    )
                )}
            </span>
        );
    };

    return (
        <div className="space-y-2">
            {blocks.map((block, bi) => {
                const lines = block.split("\n").filter((l) => l.trim());

                // Blok berisi penomoran atau butir: tampilkan sebagai daftar.
                const isList = lines.length > 0 && lines.every((l) => /^\s*(\d+\.|[-**])\s/.test(l));
                if (isList) {
                    const ordered = /^\s*\d+\./.test(lines[0]);
                    const Tag = ordered ? "ol" : "ul";
                    return (
                        <Tag
                            key={bi}
                            className={`space-y-1 pl-1 ${ordered ? "list-none" : "list-none"}`}
                        >
                            {lines.map((line, li) => {
                                const m = line.match(/^\s*(\d+\.|[-**])\s+(.*)$/);
                                const marker = m?.[1] ?? "*";
                                const body = m?.[2] ?? line;
                                return (
                                    <div key={li} className="flex gap-2">
                                        <span className="shrink-0 text-forest-500 tabular-nums">
                                            {marker}
                                        </span>
                                        <span className="min-w-0 flex-1 whitespace-pre-wrap">
                                            {renderInline(body, li)}
                                        </span>
                                    </div>
                                );
                            })}
                        </Tag>
                    );
                }

                return (
                    <p key={bi} className="whitespace-pre-wrap">
                        {block.split("\n").map((line, li) =>
                            li === 0 ? (
                                renderInline(line, li)
                            ) : (
                                <span key={li}>
                                    <br />
                                    {renderInline(line, li)}
                                </span>
                            )
                        )}
                    </p>
                );
            })}
        </div>
    );
}
