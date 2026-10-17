import "server-only";

/**
 * Pembatas jumlah permintaan.
 *
 * Penyedia FREE hanya memberi 50 request/hari, 6/menit, dan 1 bersamaan.
 * Tanpa pembatas, beberapa pengunjung bisa menghabiskan kuota dalam semenit
 * dan situs kehilangan fitur ini untuk sisa hari.
 *
 * Catatan kejujuran teknis: penghitung ini hidup di memori proses. Di Vercel
 * ada beberapa instance function, jadi batas sebenarnya bisa terlampaui
 * (kasar, bukan presisi). Karena itu batas harian diisi lebih rendah dari
 * kuota asli (40 dari 50) sebagai bantalan. Bila situs mulai ramai, ganti ke
 * penyimpanan bersama (Vercel KV / Upstash) tanpa mengubah pemanggil.
 */

const DAILY_LIMIT = Number(process.env.CHAT_DAILY_LIMIT ?? 40) || 40;
const PER_IP_PER_MINUTE = Number(process.env.CHAT_IP_PER_MINUTE ?? 4) || 4;
const MAX_CONCURRENT = Number(process.env.CHAT_MAX_CONCURRENT ?? 2) || 2;

interface Bucket {
    count: number;
    resetAt: number;
}

const ipBuckets = new Map<string, Bucket>();
let dailyCount = 0;
let dailyResetAt = nextMidnightJakarta();
let active = 0;

/** Tengah malam WIB (UTC+7) berikutnya, dalam epoch ms. */
function nextMidnightJakarta(): number {
    const now = new Date();
    const wib = new Date(now.getTime() + 7 * 3600_000);
    const midnightWib = Date.UTC(
        wib.getUTCFullYear(),
        wib.getUTCMonth(),
        wib.getUTCDate() + 1,
        0,
        0,
        0
    );
    return midnightWib - 7 * 3600_000;
}

function rolloverIfNeeded(): void {
    const now = Date.now();
    if (now >= dailyResetAt) {
        dailyCount = 0;
        dailyResetAt = nextMidnightJakarta();
        ipBuckets.clear();
    }
    // Bersihkan bucket per-IP yang kedaluwarsa agar peta tidak tumbuh terus.
    if (ipBuckets.size > 5_000) {
        for (const [k, v] of ipBuckets) if (v.resetAt <= now) ipBuckets.delete(k);
    }
}

export interface LimitDecision {
    allowed: boolean;
    /** Pesan untuk pengguna bila ditolak. */
    reason?: "ip_limit" | "daily_limit" | "busy";
    retryAfterSeconds: number;
}

export function takeSlot(ip: string): LimitDecision {
    rolloverIfNeeded();
    const now = Date.now();

    if (dailyCount >= DAILY_LIMIT) {
        return {
            allowed: false,
            reason: "daily_limit",
            retryAfterSeconds: Math.ceil((dailyResetAt - now) / 1000),
        };
    }

    if (active >= MAX_CONCURRENT) {
        return { allowed: false, reason: "busy", retryAfterSeconds: 5 };
    }

    let bucket = ipBuckets.get(ip);
    if (!bucket || bucket.resetAt <= now) {
        bucket = { count: 0, resetAt: now + 60_000 };
        ipBuckets.set(ip, bucket);
    }
    if (bucket.count >= PER_IP_PER_MINUTE) {
        return {
            allowed: false,
            reason: "ip_limit",
            retryAfterSeconds: Math.ceil((bucket.resetAt - now) / 1000),
        };
    }

    bucket.count++;
    dailyCount++;
    active++;
    return { allowed: true, retryAfterSeconds: 0 };
}

/** Wajib dipanggil pada blok finally setelah takeSlot berhasil. */
export function releaseSlot(): void {
    active = Math.max(0, active - 1);
}

export interface LimitStatus {
    dailyUsed: number;
    dailyLimit: number;
    dailyResetsAt: string;
    active: number;
    maxConcurrent: number;
    perIpPerMinute: number;
}

export function getLimitStatus(): LimitStatus {
    rolloverIfNeeded();
    return {
        dailyUsed: dailyCount,
        dailyLimit: DAILY_LIMIT,
        dailyResetsAt: new Date(dailyResetAt).toISOString(),
        active,
        maxConcurrent: MAX_CONCURRENT,
        perIpPerMinute: PER_IP_PER_MINUTE,
    };
}

/** Kunci per pengunjung. Vercel mengisi x-forwarded-for dengan IP asli. */
export function clientKey(req: Request): string {
    const h = req.headers;
    const fwd = h.get("x-forwarded-for");
    if (fwd) return fwd.split(",")[0].trim();
    return h.get("x-real-ip") ?? "unknown";
}

/** Hanya untuk pengujian. */
export function resetLimitsForTests(): void {
    dailyCount = 0;
    active = 0;
    ipBuckets.clear();
    dailyResetAt = nextMidnightJakarta();
}
