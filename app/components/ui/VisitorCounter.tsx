"use client";

import { useEffect, useState } from "react";

interface CounterData {
    todayVisitors: number;
    threeDayVisitors: number;
    sevenDayVisitors: number;
}

export default function VisitorCounter() {
    const [stats, setStats] = useState<CounterData | null>(null);

    useEffect(() => {
        let active = true;
        fetch("/api/visitors", { cache: "no-store" })
            .then((res) => (res.ok ? res.json() : null))
            .then((data) => {
                if (active && data) setStats(data);
            })
            .catch(() => {});
        return () => {
            active = false;
        };
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