import fs from "fs";
import path from "path";

const CONTENT_DIR = path.join(process.cwd(), "content");

export function loadJSON<T>(relativePath: string): T {
    const fullPath = path.join(CONTENT_DIR, relativePath);
    const raw = fs.readFileSync(fullPath, "utf-8");
    return JSON.parse(raw);
}

export interface SiteSettings {
    siteName: string;
    tagline: string;
    description: string;
    location: {
        village: string;
        district: string;
        regency: string;
        province: string;
        country: string;
        latitude: number;
        longitude: number;
    };
    contact: {
        address: string;
        whatsapp: string;
        email: string;
        googleMapsUrl: string;
    };
    socials: {
        instagram: string;
        facebook: string;
        youtube: string;
        tiktok: string;
    };
    modules: {
        wisata: boolean;
        b2h: boolean;
        bmc: boolean;
        bic: boolean;
        bdb: boolean;
    };
}

export function getSiteSettings(): SiteSettings {
    return loadJSON<SiteSettings>("settings/site.json");
}

export function getSeoSettings() {
    return loadJSON("settings/seo.json");
}
