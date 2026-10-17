import "server-only";

import { getPublicContact } from "@/lib/content";
import { buildIndex, type EntityCard } from "@/lib/chat/index";
import type { RetrievalResult } from "@/lib/chat/retrieve";
import { pickKeys } from "@/lib/chat/fallback";

/**
 * Jawaban terstruktur untuk pertanyaan berpola daftar dan harga.
 *
 * Alasan modul ini ada: menyerahkan pertanyaan "destinasi apa saja?" dan
 * "berapa harga penginapan?" kepada LLM menghasilkan masalah yang berulang:
 * daftar terpotong (hanya 3 dari 24 destinasi), data yang tidak diminta ikut
 * tampil (fasilitas saat ditanya harga), sumber yang salah (paket wisata
 * muncul saat ditanya penginapan), dan bahasa berpola template.
 *
 * Karena kelengkapan dan ketepatan angka tidak boleh bergantung pada kepatuhan
 * model, pertanyaan berpola ini dijawab langsung dari indeks. Hasilnya:
 * konsisten, lengkap, hemat kuota, dan tidak mungkin berhalusinasi.
 */

export type StructuredKind =
    | "list_destinasi"
    | "list_homestay"
    | "list_umkm"
    | "list_herbal"
    | "list_paket"
    | "artikel_terbaru"
    | "harga_homestay"
    | "harga_destinasi";

export interface StructuredAnswer {
    kind: StructuredKind;
    answer: string;
    sources: { n: number; title: string; href: string }[];
}

const WISATA_LABEL: Record<string, string> = {
    alam: "Wisata Alam",
    budaya: "Wisata Budaya",
    edukasi: "Wisata Edukasi",
    kuliner: "Kuliner",
    paket: "Paket Wisata",
    akomodasi: "Akomodasi",
};

/** Kelompok pertanyaan daftar. */
function detectListIntent(q: string): StructuredKind | null {
    const asksList = /(apa saja|apa aja|daftar|sebutkan|semua|ada apa|pilihan|list)/i.test(q);

    if (/(artikel|berita|kabar|cerita|kegiatan terbaru|update terbaru)/i.test(q)) {
        if (/(terbaru|baru|terkini|update|terakhir)/i.test(q) || asksList) return "artikel_terbaru";
    }
    if (/(destinasi|wisata|tempat|spot|atraksi)/i.test(q) && asksList) {
        if (/(paket)/i.test(q)) return "list_paket";
        return "list_destinasi";
    }
    if (/(homestay|penginapan|nginap|nginep|inap|losmen|villa|glamping|cottage)/i.test(q) && asksList) {
        return "list_homestay";
    }
    if (/(umkm|warung|toko|usaha|kuliner|makanan)/i.test(q) && asksList) return "list_umkm";
    if (/(tanaman|herbal|obat|toga|jamu)/i.test(q) && asksList) return "list_herbal";
    return null;
}

/**
 * Pertanyaan harga yang tidak menyebut entitas tertentu.
 *
 * Penting membedakan "berapa harga penginapan?" (butuh daftar harga) dari
 * "homestay bu ani muat berapa orang?" (menyebut nama homestay, jadi harus
 * dijawab retrieval biasa). Kata "berapa" saja tidak cukup sebagai penanda.
 */
function detectPriceIntent(q: string): StructuredKind | null {
    const asksPrice = /(harga|tiket|biaya|tarif|berapa|murah|mahal)/i.test(q);
    if (!asksPrice) return null;

    const aboutLodging =
        /(homestay|penginapan|nginap|nginep|inap|kamar|villa|glamping|cottage|menginap)/i.test(q);
    if (!aboutLodging) return null;

    // Bila menyebut nama penginapan tertentu, serahkan ke retrieval.
    const index = buildIndex();
    const mentionsEntity = index.cards
        .filter((c) => c.kind === "homestay")
        .some((c) => {
            // Bandingkan kata bermakna dari nama dengan kata di pertanyaan.
            const nameWords = c.title
                .toLowerCase()
                .split(/\s+/)
                .filter((w) => w.length > 3 && !/^homestay$/.test(w));
            return nameWords.some((w) => new RegExp(`\\b${w}\\b`, "i").test(q));
        });
    if (mentionsEntity) return null;

    // Kata yang menanyakan jumlah/kapasitas bukan pertanyaan harga.
    if (/(berapa\s+(orang|tamu|kapasitas)|muat\s+berapa)/i.test(q)) return null;

    return "harga_homestay";
}

export function detectStructuredIntent(question: string): StructuredKind | null {
    return detectPriceIntent(question) ?? detectListIntent(question);
}

/** Ubah "Rp 200,000" -> "Rp 200.000". */
function normalizeRupiah(v: string): string {
    return v.replace(/(\d),(\d{3})/g, "$1.$2");
}

function priceOf(card: EntityCard): string {
    const raw = card.facts["Harga mulai"] || card.facts["Harga"] || "";
    return raw ? normalizeRupiah(raw) : "";
}

function bullet(_n: number, title: string, detail: string): string {
    // Butir polos: tanpa nomor dan tanpa bold. Penomoran + bold + pemisah
    // sekaligus terlihat seperti keluaran template, dan nomor tidak berguna
    // bagi pembaca chat. Nomor urut tetap tersedia lewat daftar Sumber.
    return detail ? `- ${title}: ${detail}` : `- ${title}`;
}

/** Latar belakang branding, dipakai sebagai penutup yang tidak berulang. */
function closing(extra?: string): string {
    const base = "Mau saya bantu susun rencana kunjungan atau cek satu per satu?";
    return extra ? `${extra} ${base}` : base;
}

function contactTail(): string {
    const c = getPublicContact();
    return `Kalau butuh kepastian atau pemesanan, pengelola bisa dihubungi di WhatsApp ${c.whatsappDisplay}.`;
}

// ---------------------------------------------------------------------------
// Penyusun tiap jenis jawaban
// ---------------------------------------------------------------------------

/** "Rp 15.000 per orang" -> "Rp 15.000" (satuan ditambahkan pemanggil). */
function priceValue(card: EntityCard): string {
    const raw = priceOf(card);
    return raw.replace(/\s*per\s+orang\s*$/i, "").trim();
}

/** Harga + satuan, tanpa pengulangan "per orang per orang". */
function priceWithUnit(card: EntityCard, unit = "per orang"): string {
    const v = priceValue(card);
    return v ? `mulai dari ${v} ${unit}` : "";
}

function listDestinasi(): StructuredAnswer {
    const index = buildIndex();
    const wisata = index.cards.filter((c) => c.kind === "wisata");

    // Paket dan akomodasi dipisahkan: keduanya bukan "destinasi" dalam arti
    // tempat yang dikunjungi, dan mencampurnya membuat daftar membingungkan.
    //
    // Urutan pemeriksaan penting: `paket-campervan` berkategori "akomodasi"
    // tetapi judulnya diawali "Paket", sehingga dulu muncul di dua kelompok
    // sekaligus. Paket diperiksa lebih dulu agar hanya masuk satu kelompok.
    const isPaket = (c: EntityCard) =>
        /^paket\b/i.test(c.title) || /paket/i.test(c.facts["Kategori"] ?? "");
    const isAkomodasi = (c: EntityCard) =>
        !isPaket(c) && /akomodasi/i.test(c.facts["Kategori"] ?? "");

    const atraksi = wisata.filter((c) => !isPaket(c) && !isAkomodasi(c));
    const akomodasi = wisata.filter(isAkomodasi);
    const paket = wisata.filter(isPaket);

    // Kelompokkan menurut kategori. Sebelumnya kunci peta memakai nama
    // kategori yang sudah di-lowercase sementara daftar urutan memakai nama
    // berkapital, sehingga satu kategori bisa tampil dua kali.
    const groups = new Map<string, EntityCard[]>();
    for (const c of atraksi) {
        const raw = (c.facts["Kategori"] ?? "lainnya").toLowerCase();
        const key = raw.replace(/^wisata\s+/, "");
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key)!.push(c);
    }

    const ORDER = ["alam", "budaya", "edukasi", "kuliner"];
    const sources: { n: number; title: string; href: string }[] = [];
    let n = 0;

    const parts: string[] = [];
    parts.push(
        `Bantaragung punya ${atraksi.length} destinasi dan atraksi yang bisa dikunjungi:`
    );

    for (const key of [...ORDER, ...[...groups.keys()].filter((k) => !ORDER.includes(k))]) {
        const items = groups.get(key);
        if (!items?.length) continue;
        parts.push(`\n${WISATA_LABEL[key] ?? key}`);
        const lines = items.map((c) => {
            n++;
            sources.push({ n, title: c.title, href: c.href });
            return bullet(n, c.title, priceWithUnit(c));
        });
        parts.push(lines.join("\n"));
    }

    if (akomodasi.length) {
        parts.push(`\nMenginap di Dalam Kawasan`);
        const lines = akomodasi.map((c) => {
            n++;
            sources.push({ n, title: c.title, href: c.href });
            return bullet(n, c.title, priceWithUnit(c, "per malam"));
        });
        parts.push(lines.join("\n"));
    }

    if (paket.length) {
        parts.push(`\nPaket Wisata`);
        const lines = paket.map((c) => {
            n++;
            sources.push({ n, title: c.title, href: c.href });
            return bullet(n, c.title, priceWithUnit(c, "per orang"));
        });
        parts.push(lines.join("\n"));
    }

    parts.push(
        `\nDetail fasilitas dan aktivitas tiap destinasi ada di halaman Wisata. ` +
            `Mau saya bantu pilih yang cocok untuk kunjungan Anda?`
    );

    return { kind: "list_destinasi", answer: parts.join("\n"), sources };
}

function listHomestay(): StructuredAnswer {
    const index = buildIndex();
    const items = index.cards.filter((c) => c.kind === "homestay");
    const sources: { n: number; title: string; href: string }[] = [];
    const lines: string[] = [];

    items.forEach((c, i) => {
        const n = i + 1;
        sources.push({ n, title: c.title, href: c.href });
        const cap = c.facts["Kapasitas"] ?? "";
        const detail = [cap ? `kapasitas ${cap}` : "", priceWithUnit(c, "per malam")]
            .filter(Boolean)
            .join(", ");
        lines.push(bullet(n, c.title, detail));
    });

    const withPrice = items.filter((c) => priceOf(c)).length;
    let note = "";
    if (withPrice < items.length) {
        note =
            `\nCatatan: harga menginap baru tercantum untuk ${withPrice} dari ${items.length} penginapan. ` +
            `Untuk sisanya, silakan tanya langsung ke pengelola.`;
    }

    return {
        kind: "list_homestay",
        answer:
            `Ada ${items.length} pilihan penginapan warga di Bantaragung:\n\n` +
            `${lines.join("\n")}${note}\n\n${closing()}`,
        sources,
    };
}

function listUmkm(): StructuredAnswer {
    const index = buildIndex();
    const items = index.cards.filter((c) => c.kind === "umkm");
    const sources: { n: number; title: string; href: string }[] = [];
    const lines = items.map((c, i) => {
        sources.push({ n: i + 1, title: c.title, href: c.href });
        return bullet(i + 1, c.title, c.summary.split(".")[0]);
    });

    return {
        kind: "list_umkm",
        answer:
            `Ada ${items.length} UMKM warga yang terdata di situs:\n\n${lines.join("\n")}\n\n${closing()}`,
        sources,
    };
}

function listHerbal(): StructuredAnswer {
    const index = buildIndex();
    const items = index.cards.filter((c) => c.kind === "herbal");
    const sources: { n: number; title: string; href: string }[] = [];
    const lines = items.map((c, i) => {
        sources.push({ n: i + 1, title: c.title, href: c.href });
        const khasiat = (c.facts["Khasiat"] ?? "").split(",")[0].trim();
        return bullet(i + 1, c.title, khasiat);
    });

    return {
        kind: "list_herbal",
        answer:
            `Kampung Herbal Mertasela membudidayakan ${items.length} jenis tanaman obat:\n\n` +
            `${lines.join("\n")}\n\n` +
            `Katalog lengkap dengan khasiat dan cara pemanfaatan ada di halaman Kampung Herbal. ` +
            `Kalau ingin tahu khasiat tanaman tertentu, sebutkan namanya.`,
        sources,
    };
}

function listPaket(): StructuredAnswer {
    const index = buildIndex();
    const items = index.cards.filter(
        (c) =>
            c.kind === "wisata" &&
            (/^paket\b/i.test(c.title) || /paket/i.test(c.facts["Kategori"] ?? ""))
    );
    const sources: { n: number; title: string; href: string }[] = [];
    const lines = items.map((c, i) => {
        sources.push({ n: i + 1, title: c.title, href: c.href });
        return bullet(i + 1, c.title, priceWithUnit(c));
    });

    return {
        kind: "list_paket",
        answer:
            `Ada ${items.length} paket wisata:\n\n${lines.join("\n")}\n\n${closing()}`,
        sources,
    };
}

/**
 * Artikel terbaru.
 *
 * Chunk kepala artikel tidak disimpan per-artikel di hasil retrieval, jadi
 * daftar ini dibaca langsung dari indeks (indeks sudah memuat seluruh artikel
 * dan berita, termasuk yang isinya belum layak diindeks).
 */
function artikelTerbaru(limit = 5): StructuredAnswer {
    const index = buildIndex();

    // Satu chunk "head" per artikel, urut tanggal terbaru.
    const heads = index.chunks
        .filter((c) => c.id.endsWith(":head"))
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, limit);

    const sources: { n: number; title: string; href: string }[] = [];
    const lines = heads.map((c, i) => {
        sources.push({ n: i + 1, title: c.title, href: c.href });
        const tanggal = new Date(c.date).toLocaleDateString("id-ID", {
            day: "numeric",
            month: "long",
            year: "numeric",
        });
        return bullet(i + 1, c.title, `${tanggal}`);
    });

    return {
        kind: "artikel_terbaru",
        answer:
            `Ini ${heads.length} tulisan terbaru di situs Bantaragung:\n\n${lines.join("\n")}\n\n` +
            `Semua berita dan artikel KKN bisa dibaca di halaman Berita. ${closing()}`,
        sources,
    };
}

/**
 * Harga penginapan.
 *
 * Temuan lapangan: dari 23 homestay di content/bdb/homestay, hanya SATU yang
 * punya field harga. Versi sebelumnya tetap menyajikan tiga homestay tanpa
 * harga ketika ditanya "berapa harga penginapan"  -  jawaban yang menyesatkan
 * karena seolah-olah harga sudah terjawab.
 */
function hargaHomestay(): StructuredAnswer {
    const index = buildIndex();
    const items = index.cards.filter((c) => c.kind === "homestay");
    const withPrice = items.filter((c) => priceOf(c));
    const withoutPrice = items.filter((c) => !priceOf(c));

    const sources: { n: number; title: string; href: string }[] = [];

    if (!withPrice.length) {
        return {
            kind: "harga_homestay",
            answer:
                `Harga menginap di homestay Bantaragung belum dicantumkan di situs ini. ` +
                `Yang tersedia baru kapasitas dan fasilitasnya, untuk ${items.length} penginapan. ` +
                `${contactTail()} Sebutkan tanggal dan jumlah tamu agar bisa dihitungkan langsung.`,
            sources: [],
        };
    }

    const lines = withPrice.map((c, i) => {
        sources.push({ n: i + 1, title: c.title, href: c.href });
        const cap = c.facts["Kapasitas"] ?? "";
        return bullet(i + 1, c.title, [`mulai dari ${priceValue(c)} per malam`, cap ? `kapasitas ${cap}` : ""].filter(Boolean).join(", "));
    });

    const note = withoutPrice.length
        ? `\n\nSementara itu, ${withoutPrice.length} homestay lain belum mencantumkan harga  -  ` +
          `rinciannya bisa ditanyakan langsung ke pengelola.`
        : "";

    return {
        kind: "harga_homestay",
        answer:
            `Untuk penginapan, harga yang tercantum di situs baru:\n\n${lines.join("\n")}${note}\n\n` +
            contactTail(),
        sources,
    };
}

/** Harga per destinasi: hanya tampilkan yang benar-benar punya harga. */
function hargaDestinasi(): StructuredAnswer | null {
    const index = buildIndex();
    const withPrice = index.cards.filter((c) => c.kind === "wisata" && priceOf(c));
    if (!withPrice.length) return null;

    const sources: { n: number; title: string; href: string }[] = [];
    const lines = withPrice.map((c, i) => {
        sources.push({ n: i + 1, title: c.title, href: c.href });
        return bullet(i + 1, c.title, priceWithUnit(c));
    });

    return {
        kind: "harga_destinasi",
        answer:
            `Ini tiket masuk dan harga layanan yang tercantum di situs:\n\n${lines.join("\n")}\n\n` +
            `Harga bisa berbeda di akhir pekan atau hari libur, jadi sebaiknya dikonfirmasi ke pengelola. ${closing()}`,
        sources,
    };
}

// ---------------------------------------------------------------------------
// Titik masuk
// ---------------------------------------------------------------------------

export function buildStructuredAnswer(
    question: string,
    kind: StructuredKind
): StructuredAnswer | null {
    switch (kind) {
        case "artikel_terbaru":
            return artikelTerbaru();
        case "list_destinasi":
            return listDestinasi();
        case "list_paket":
            return listPaket();
        case "list_homestay":
            return listHomestay();
        case "list_umkm":
            return listUmkm();
        case "list_herbal":
            return listHerbal();
        case "harga_homestay":
            return hargaHomestay();
        case "harga_destinasi":
            return hargaDestinasi();
        default:
            return null;
    }
}

/**
 * Penjawab dinamis.
 *
 * Fungsi-fungsi di atas menjawab pertanyaan berpola (daftar, harga, terbaru)
 * dan dipakai LEBIH DULU karena paling akurat. Namun model gratis bisa gagal
 * kapan saja: kena rate limit, kuota harian habis, atau keluarannya ditolak
 * guardrail. Dalam kondisi itu, jawaban naratif tidak boleh jatuh ke format
 * kartu generik yang buruk ("Berikut yang saya temukan di situs Bantaragung"
 * lalu tiga entitas berformat campur).
 *
 * `buildFromRetrieval` menyusun jawaban layak dari hasil retrieval yang SUDAH
 * diambil, dengan memilih bentuk yang paling sesuai isi data:
 *
 *   - menyebut satu entitas + ada harga  -> jawab harga entitas itu
 *   - menyebut satu entitas + ada khasiat -> jawab khasiat
 *   - menyebut satu entitas              -> ringkasan + fakta utama
 *   - beberapa entitas sejenis           -> daftar ringkas
 *   - hanya potongan artikel             -> ringkasan artikel + tautan
 *
 * Semua fakta berasal dari indeks, jadi tidak mungkin berhalusinasi.
 */

/** Kategori isi sebuah kartu, untuk memilih bentuk jawaban. */
function cardKindLabel(card: EntityCard): string {
    switch (card.kind) {
        case "herbal":
            return "tanaman herbal";
        case "homestay":
            return "penginapan";
        case "umkm":
            return "UMKM";
        case "wisata":
            return "destinasi";
        case "lokasi":
            return "lokasi peta";
        default:
            return "informasi";
    }
}

/** Ambil maksimal `n` fakta yang paling relevan dengan pertanyaan. */
function topFacts(card: EntityCard, question: string, n = 3): string[] {
    const keys = pickKeys(question).filter((k) => k !== "Halaman");
    const summary = card.summary.trim();

    const ordered = [
        ...keys.filter((k) => card.facts[k]),
        ...Object.keys(card.facts).filter((k) => !keys.includes(k) && k !== "Halaman" && k !== "Deskripsi"),
    ];

    const out: string[] = [];
    const seen = new Set<string>();
    for (const k of ordered) {
        const v = card.facts[k];
        if (!v || !String(v).trim()) continue;

        // Jangan ulangi ringkasan yang sudah ditampilkan sebagai paragraf
        // pembuka  -  dulu jawaban memuat kalimat yang sama dua kali.
        const val = String(v).trim();
        if (val === summary || summary.startsWith(val.slice(0, 60))) continue;
        if (seen.has(val)) continue;
        seen.add(val);

        const shown = val.length > 180 ? `${val.slice(0, 177)}...` : val;
        out.push(`${k}: ${shown}`);
        if (out.length >= n) break;
    }
    return out;
}

/** Buang judul yang sama dengan entitas utama agar tidak diulang. */
function relatedTitles(cards: EntityCard[], exclude: string, n = 2): string[] {
    const seen = new Set<string>([exclude.toLowerCase()]);
    const out: string[] = [];
    for (const c of cards) {
        const key = c.title.toLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);
        out.push(c.title);
        if (out.length >= n) break;
    }
    return out;
}

export function buildFromRetrieval(
    result: RetrievalResult,
    question: string
): StructuredAnswer | null {
    const contact = getPublicContact();
    const cards = result.cards.map((c) => c.card);

    // --- Hanya potongan artikel (pertanyaan tentang cerita/berita) ---------
    if (!cards.length && result.chunks.length) {
        const sources: { n: number; title: string; href: string }[] = [];
        const lines = result.chunks.slice(0, 4).map(({ chunk }, i) => {
            sources.push({ n: i + 1, title: chunk.title, href: chunk.href });
            const tanggal = chunk.date
                ? new Date(chunk.date).toLocaleDateString("id-ID", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                  })
                : "";
            return bullet(i + 1, chunk.title, tanggal);
        });
        return {
            kind: "artikel_terbaru",
            answer:
                `Ini tulisan yang paling relevan dengan pertanyaan Anda:\n\n${lines.join("\n")}\n\n` +
                `Semuanya bisa dibaca di halaman Berita. Mau saya ringkas salah satunya?`,
            sources,
        };
    }

    if (!cards.length) return null;

    // --- Satu entitas disebut: jawab entitas itu secara utuh ---------------
    if (cards.length === 1) {
        const card = cards[0];
        const facts = topFacts(card, question, 4);
        const body = facts.length ? `\n\n${facts.join("\n")}` : "";
        return {
            kind: "harga_destinasi",
            answer:
                `${card.title} (${cardKindLabel(card)})\n\n${card.summary}${body}\n\n` +
                `Detail lengkapnya ada di halaman terkait. Kalau perlu kepastian, ` +
                `pengelola bisa dihubungi di WhatsApp ${contact.whatsappDisplay}.`,
            sources: [{ n: 1, title: card.title, href: card.href }],
        };
    }

    // --- Beberapa entitas sejenis: sajikan sebagai daftar ringkas ----------
    const sameKind = cards.every((c) => c.kind === cards[0].kind);
    if (sameKind && cards.length > 1) {
        const sourceList: { n: number; title: string; href: string }[] = [];
        const lines = cards.map((c, i) => {
            sourceList.push({ n: i + 1, title: c.title, href: c.href });
            const keys = pickKeys(question).filter((k) => k !== "Halaman");
            const bits: string[] = [];
            for (const k of keys) {
                const v = c.facts[k];
                if (!v || !String(v).trim()) continue;
                const val = String(v).length > 100 ? `${String(v).slice(0, 97)}...` : String(v);
                bits.push(val);
                if (bits.length >= 2) break;
            }
            return bullet(i + 1, c.title, bits.join(" | "));
        });

        return {
            kind: "list_destinasi",
            answer:
                `Ada ${cards.length} ${cardKindLabel(cards[0])} yang berkaitan dengan pertanyaan Anda:\n\n` +
                `${lines.join("\n")}\n\n` +
                `Kalau ingin detail salah satunya, sebutkan namanya  -  saya jelaskan lebih lengkap.`,
            sources: sourceList,
        };
    }

    // --- Campuran jenis: tampilkan entitas teratas saja --------------------
    const card = cards[0];
    const facts = topFacts(card, question, 3);
    const others = relatedTitles(cards.slice(1), card.title, 2).join(", ");
    return {
        kind: "harga_destinasi",
        answer:
            `${card.title}\n\n${card.summary}\n\n` +
            `${facts.join("\n")}` +
            (others ? `\n\nTerkait juga: ${others}.` : "") +
            `\n\nKalau butuh kepastian, pengelola bisa dihubungi di WhatsApp ${contact.whatsappDisplay}.`,
        sources: cards.slice(0, 3).map((c, i) => ({ n: i + 1, title: c.title, href: c.href })),
    };
}
