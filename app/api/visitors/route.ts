import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

function seededRandom(seed: number) {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

// Statistik kunjungan deterministik per hari, mengikuti TANGGAL SERVER (reset otomatis tiap hari)
export async function GET() {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const daysSinceEpoch = Math.floor(today.getTime() / 86400000);

    const launchDay = Math.floor(new Date(2025, 1, 10).getTime() / 86400000);
    const daysLive = Math.max(1, daysSinceEpoch - launchDay);

    let todayVisitors = 0;
    let threeDay = 0;
    let sevenDay = 0;

    for (let i = 0; i < 7; i++) {
        const ds = daysSinceEpoch - i;
        const baseMin = Math.min(30 + Math.floor(daysLive * 0.15), 80);
        const baseMax = Math.min(60 + Math.floor(daysLive * 0.25), 150);
        const daily = Math.floor(
            baseMin + seededRandom(ds * 7 + 3) * (baseMax - baseMin)
        );
        if (i === 0) todayVisitors = daily;
        if (i < 3) threeDay += daily;
        sevenDay += daily;
    }

    return NextResponse.json({
        todayVisitors,
        threeDayVisitors: threeDay,
        sevenDayVisitors: sevenDay,
    });
}