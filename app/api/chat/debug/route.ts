import { NextRequest, NextResponse } from "next/server";

import { renderContext, retrieve } from "@/lib/chat/retrieve";
import { buildFallbackAnswer } from "@/lib/chat/fallback";
import { findMentionedEntity } from "@/lib/chat/mention";

/**
 * Endpoint uji retrieval.
 *
 * Tujuannya memverifikasi bahwa pertanyaan pengunjung benar-benar mengambil
 * data yang tepat, TANPA memanggil LLM sama sekali. Ini penting karena penyedia
 * hanya memberi 50 request/hari, jadi pengujian kualitas retrieval tidak boleh
 * mengorbankan kuota.
 *
 * Sengaja tidak aktif di produksi: kalau dibiarkan terbuka, siapa pun bisa
 * memakai endpoint ini untuk melihat isi indeks internal.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
    if (process.env.NODE_ENV === "production" && process.env.CHAT_DEBUG !== "1") {
        return NextResponse.json({ error: "Tidak tersedia." }, { status: 404 });
    }

    const body = (await req.json().catch(() => ({}))) as {
        message?: string;
        history?: { role: string; content: string }[];
    };
    const q = String(body.message ?? "").trim();
    if (!q) return NextResponse.json({ error: "message wajib diisi" }, { status: 400 });

    // Sama seperti jalur produksi: entitas yang disebut pengunjung (toleran
    // salah ketik) dipakai sebagai jangkar retrieval. Tanpa ini, debug bisa
    // memberi hasil yang berbeda dari yang dialami pengunjung.
    const mention = findMentionedEntity(q);
    const result = retrieve(q, body.history ?? [], mention?.card ?? null);
    const { text, sources } = renderContext(result);
    const fallback = buildFallbackAnswer(result, q);

    return NextResponse.json({
        query: q,
        mention: mention ? { title: mention.card.title, strong: mention.strong } : null,
        terms: result.terms,
        cards: result.cards.map((c) => ({
            id: c.card.id,
            kind: c.card.kind,
            title: c.card.title,
            score: Number(c.score.toFixed(2)),
            facts: c.card.facts,
        })),
        chunks: result.chunks.map((c) => ({
            id: c.chunk.id,
            title: c.chunk.title,
            score: Number(c.score.toFixed(2)),
            href: c.chunk.href,
            preview: c.chunk.text.slice(0, 200),
        })),
        contextChars: text.length,
        sources,
        fallbackAnswer: fallback.answer,
        fallbackGrounded: fallback.grounded,
    });
}
