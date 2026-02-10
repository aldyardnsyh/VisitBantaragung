"use client";

import { useEffect, useState } from "react";

// Seed-based pseudo-random number generator for consistent numbers per day
function seededRandom(seed: number) {
    const x = Math.sin(seed) * 10000;
    return x - Math.floor(x);
}

function getVisitorStats() {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const daysSinceEpoch = Math.floor(today.getTime() / 86400000);

    // Base visitors per day (grows slowly over time from a launch date)
    // Launch date: Feb 10, 2025
    const launchDay = Math.floor(new Date(2025, 1, 10).getTime() / 86400000);
    const daysLive = Math.max(1, daysSinceEpoch - launchDay);

    // Generate consistent daily visitor counts using seeded random
    let todayVisitors = 0;
    let threeDayVisitors = 0;
    let sevenDayVisitors = 0;

    for (let i = 0; i < 7; i++) {
        const daySeed = daysSinceEpoch - i;
        // Base: 30-80 visitors/day, growing slightly over time
        const baseMin = Math.min(30 + Math.floor(daysLive * 0.15), 80);
        const baseMax = Math.min(60 + Math.floor(daysLive * 0.25), 150);
        const dailyCount = Math.floor(
            baseMin + seededRandom(daySeed * 7 + 3) * (baseMax - baseMin)
        );

        if (i === 0) todayVisitors = dailyCount;
        if (i < 3) threeDayVisitors += dailyCount;
        sevenDayVisitors += dailyCount;
    }

    // Add current user's own visits from localStorage
    const storageKey = "vb_visits";
    let userVisits = 0;
    try {
        const stored = localStorage.getItem(storageKey);
        if (stored) {
            const data = JSON.parse(stored);
            // Reset if stored date is different from today
            if (data.date === today.toISOString().slice(0, 10)) {
                userVisits = data.count || 0;
            }
        }
        // Increment and save
        userVisits++;
        localStorage.setItem(
            storageKey,
            JSON.stringify({
                date: today.toISOString().slice(0, 10),
                count: userVisits,
            })
        );
    } catch {
        // localStorage not available
    }

    // Add user's visits to today count
    todayVisitors += userVisits;
    threeDayVisitors += userVisits;
    sevenDayVisitors += userVisits;

    return { todayVisitors, threeDayVisitors, sevenDayVisitors };
}

export default function VisitorCounter() {
    const [stats, setStats] = useState<{
        todayVisitors: number;
        threeDayVisitors: number;
        sevenDayVisitors: number;
    } | null>(null);

    useEffect(() => {
        setStats(getVisitorStats());
    }, []);

    if (!stats) return null;

    return (
        <div className="inline-flex flex-col sm:flex-row items-start sm:items-center gap-3 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/20 px-5 py-3 text-sm text-white/90">
            <div className="flex items-center gap-2 font-medium text-white">
                <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-green-400" />
                </span>
                Kunjungan Pengunjung
            </div>
            <span className="hidden sm:block h-4 w-px bg-white/20" />
            <div className="flex items-center gap-4">
                <div className="flex flex-col items-center">
                    <span className="font-bold text-lg text-white leading-tight">{stats.todayVisitors.toLocaleString("id-ID")}</span>
                    <span className="text-[10px] text-white/50 uppercase tracking-wider">Hari Ini</span>
                </div>
                <span className="h-6 w-px bg-white/20" />
                <div className="flex flex-col items-center">
                    <span className="font-bold text-lg text-white leading-tight">{stats.threeDayVisitors.toLocaleString("id-ID")}</span>
                    <span className="text-[10px] text-white/50 uppercase tracking-wider">3 Hari Terakhir</span>
                </div>
                <span className="h-6 w-px bg-white/20" />
                <div className="flex flex-col items-center">
                    <span className="font-bold text-lg text-white leading-tight">{stats.sevenDayVisitors.toLocaleString("id-ID")}</span>
                    <span className="text-[10px] text-white/50 uppercase tracking-wider">7 Hari Terakhir</span>
                </div>
            </div>
        </div>
    );
}
