"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Logika percakapan widget chat.
 *
 * Riwayat disimpan di sessionStorage: hilang ketika tab ditutup, dan pengunjung
 * bisa menghapusnya sendiri. Tidak ada isi percakapan yang disimpan di server.
 */

export interface ChatSource {
    n: number;
    title: string;
    href: string;
}

/** Kartu pratinjau entitas yang ditampilkan di dalam gelembung jawaban. */
export interface ChatCard {
    title: string;
    href: string;
    cover?: string;
    summary: string;
    highlight?: string;
    kind?: string;
}

export interface ChatMessageItem {
    id: string;
    role: "user" | "assistant";
    text: string;
    sources?: ChatSource[];
    /** Kartu pratinjau (gambar + judul + satu fakta). */
    cards?: ChatCard[];
    /** Penanda internal untuk menampilkan hasil non-LLM secara jujur. */
    degraded?: boolean;
    pending?: boolean;
}

const STORAGE_KEY = "bantaragung-chat-v1";
const MAX_HISTORY = 12;

function newId(): string {
    return Math.random().toString(36).slice(2, 10);
}

function loadStored(): ChatMessageItem[] {
    if (typeof window === "undefined") return [];
    try {
        const raw = sessionStorage.getItem(STORAGE_KEY);
        if (!raw) return [];
        const parsed = JSON.parse(raw) as ChatMessageItem[];
        if (!Array.isArray(parsed)) return [];
        return parsed.filter((m) => m && typeof m.text === "string").slice(-MAX_HISTORY);
    } catch {
        return [];
    }
}

export function useChat() {
    const [messages, setMessages] = useState<ChatMessageItem[]>([]);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const hydrated = useRef(false);

    // Muat riwayat sekali di klien (tidak di server, agar tidak ada mismatch).
    useEffect(() => {
        if (hydrated.current) return;
        hydrated.current = true;
        setMessages(loadStored());
    }, []);

    useEffect(() => {
        if (!hydrated.current) return;
        try {
            sessionStorage.setItem(STORAGE_KEY, JSON.stringify(messages.slice(-MAX_HISTORY)));
        } catch {
            // Penyimpanan penuh atau dimatikan: percakapan tetap jalan di memori.
        }
    }, [messages]);

    const clear = useCallback(() => {
        setMessages([]);
        setError(null);
        try {
            sessionStorage.removeItem(STORAGE_KEY);
        } catch {
            /* abaikan */
        }
    }, []);

    const send = useCallback(
        async (raw: string) => {
            const text = raw.trim();
            if (!text || busy) return;

            const userMsg: ChatMessageItem = { id: newId(), role: "user", text };
            const pendingMsg: ChatMessageItem = {
                id: newId(),
                role: "assistant",
                text: "",
                pending: true,
            };

            setError(null);
            setBusy(true);
            setMessages((prev) => [...prev, userMsg, pendingMsg]);

            // Riwayat yang dikirim dibatasi agar setiap request tetap murah.
            const history = [...messages, userMsg]
                .filter((m) => !m.pending)
                .slice(-6)
                .map((m) => ({ role: m.role, content: m.text }));

            try {
                const res = await fetch("/api/chat", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ message: text, history }),
                });

                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                const data = (await res.json()) as {
                    answer: string;
                    sources?: ChatSource[];
                    cards?: ChatCard[];
                    reason?: string | null;
                };

                const degraded =
                    data.reason === "all_models_failed" ||
                    data.reason === "no_api_key" ||
                    data.reason === "disabled" ||
                    data.reason === "daily_limit";

                setMessages((prev) =>
                    prev.map((m) =>
                        m.id === pendingMsg.id
                            ? {
                                  ...m,
                                  pending: false,
                                  text: data.answer ?? "Maaf, terjadi kesalahan.",
                                  sources: data.sources ?? [],
                                  cards: data.cards ?? [],
                                  degraded,
                              }
                            : m
                    )
                );
            } catch {
                setMessages((prev) =>
                    prev.map((m) =>
                        m.id === pendingMsg.id
                            ? {
                                  ...m,
                                  pending: false,
                                  degraded: true,
                                  text:
                                      "Maaf, koneksi ke pemandu digital terputus. " +
                                      "Silakan coba lagi sebentar lagi, atau hubungi pengelola lewat halaman Kontak.",
                              }
                            : m
                    )
                );
                setError("Koneksi terputus");
            } finally {
                setBusy(false);
            }
        },
        [busy, messages]
    );

    return { messages, busy, error, send, clear };
}
