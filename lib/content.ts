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

export interface Wisata {
    slug: string;
    title: string;
    excerpt: string;
    description: string;
    cover: string;
    gallery: string[];
    location: {
        lat: number;
        lng: number;
    };
    facilities: string[];
    activities: string[];
}

export function getAllWisata(): Wisata[] {
    const dir = path.join(CONTENT_DIR, "wisata");
    const files = fs.readdirSync(dir);

    return files.map((file) => {
        const raw = fs.readFileSync(path.join(dir, file), "utf-8");
        return JSON.parse(raw);
    });
}

export function getWisataBySlug(slug: string): Wisata {
    return loadJSON<Wisata>(`wisata/${slug}.json`);
}

export interface Herbal {
    slug: string;
    name: string;
    latin: string;
    excerpt: string;
    description: string;
    cover: string;
    gallery: string[];
    benefits: string[];
    usage: string[];
}

export function getAllHerbal(): Herbal[] {
    const dir = path.join(CONTENT_DIR, "b2h/katalog-tanaman");
    const files = fs.readdirSync(dir);

    return files.map((file) => {
        const raw = fs.readFileSync(path.join(dir, file), "utf-8");
        return JSON.parse(raw);
    });
}

export function getHerbalBySlug(slug: string): Herbal {
    return loadJSON<Herbal>(`b2h/katalog-tanaman/${slug}.json`);
}

export interface Article {
    slug: string;
    title: string;
    excerpt: string;
    date: string;
    category: string;
    cover: string;
    gallery: string[];
    content: string[];
}

export function getAllArticles(): Article[] {
    const dir = path.join(CONTENT_DIR, "bic/artikel");
    const files = fs.readdirSync(dir);

    return files.map((file) => {
        const raw = fs.readFileSync(path.join(dir, file), "utf-8");
        return JSON.parse(raw);
    });
}

export function getArticleBySlug(slug: string): Article | null {
    const dir = path.join(CONTENT_DIR, "bic/artikel");
    const files = fs.readdirSync(dir);

    const file = files.find((f) => {
        const data = JSON.parse(fs.readFileSync(path.join(dir, f), "utf-8"));
        return data.slug === slug;
    });

    if (!file) return null;

    return JSON.parse(fs.readFileSync(path.join(dir, file), "utf-8"));
}
