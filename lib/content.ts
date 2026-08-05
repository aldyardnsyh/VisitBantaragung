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

export interface SeoSettings {
    defaultTitle: string;
    titleTemplate: string;
    defaultDescription: string;
    ogImage: string;
}

export function getSeoSettings(): SeoSettings {
    return loadJSON<SeoSettings>("settings/seo.json");
}

// BMC Maps Configuration
export interface MapItem {
    id: string;
    title: string;
    image: string;
    description: string;
}

export interface MapCategory {
    id: string;
    name: string;
    description: string;
    icon: string;
    maps: MapItem[];
}

export interface MapsConfig {
    categories: MapCategory[];
}

export function getMapsConfig(): MapsConfig {
    return loadJSON<MapsConfig>("bmc/maps-config.json");
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

export type ArticleOrigin = "kkn" | "berita";

export interface Article {
    slug: string;
    title: string;
    excerpt: string;
    date: string;
    category: string;
    author?: string;
    cover: string;
    gallery: string[];
    content: string[];
    origin: ArticleOrigin;
    tags?: string[];
    sourceUrl?: string;
    sourcePublishedAt?: string;
    updatedAt?: string;
}

function listJSON<T>(dirName: string): T[] {
    const dir = path.join(CONTENT_DIR, dirName);
    if (!fs.existsSync(dir)) return [];
    return fs
        .readdirSync(dir)
        .map((file) => {
            const raw = fs.readFileSync(path.join(dir, file), "utf-8");
            const data = JSON.parse(raw) as T & {
                slug?: string;
                title?: string;
                origin?: ArticleOrigin;
            };
            if (!data || (!data.slug && !data.title)) return null;
            data.origin = data.origin ?? "kkn";
            return data;
        })
        .filter((d): d is NonNullable<T> => d !== null);
}

const ARTICLE_DIRS = ["bic/artikel", "bic/berita"];

export function getAllArticles(): Article[] {
    const all = ARTICLE_DIRS.flatMap((dir) => listJSON<Article>(dir));
    return all.sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
}

export function getAllBerita(): Article[] {
    return listJSON<Article>("bic/berita").sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
}

export function getArticlesByOrigin(origin: ArticleOrigin): Article[] {
    return getAllArticles()
        .filter((a) => a.origin === origin)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export function getRecentArticles(limit: number): Article[] {
    return getAllArticles().slice(0, limit);
}

export function getArticleBySlug(slug: string): Article | null {
    for (const dir of ARTICLE_DIRS) {
        const found = listJSON<Article>(dir).find((d) => d.slug === slug);
        if (found) return found;
    }
    return null;
}

export interface Location {
    slug: string;
    name: string;
    category: string;
    lat: number;
    lng: number;
    excerpt: string;
    cover: string;
}

export function getAllLocations(): Location[] {
    const dir = path.join(CONTENT_DIR, "bmc/lokasi");
    const files = fs.readdirSync(dir);

    return files.map((file) => {
        const raw = fs.readFileSync(path.join(dir, file), "utf-8");
        return JSON.parse(raw);
    });
}

export function getLocationBySlug(slug: string): Location {
    return loadJSON<Location>(`bmc/lokasi/${slug}.json`);
}

export interface UMKM {
    slug: string;
    name: string;
    excerpt: string;
    description: string;
    cover: string;
    gallery: string[];
    contact: {
        whatsapp: string;
    };
}

export function getAllUMKM(): UMKM[] {
    const dir = path.join(CONTENT_DIR, "bdb/umkm");
    const files = fs.readdirSync(dir);

    return files.map((file) => {
        const raw = fs.readFileSync(path.join(dir, file), "utf-8");
        return JSON.parse(raw);
    });
}

export function getUMKMBySlug(slug: string): UMKM {
    return loadJSON<UMKM>(`bdb/umkm/${slug}.json`);
}

export interface Homestay {
    slug: string;
    name: string;
    excerpt: string;
    description: string;
    cover: string;
    gallery: string[];
    capacity: number;
    facilities: string[];
    price?: string;
    address?: string;
    contact: {
        whatsapp: string;
        email?: string;
    };
}

export function getAllHomestay(): Homestay[] {
    const dir = path.join(CONTENT_DIR, "bdb/homestay");
    const files = fs.readdirSync(dir);

    return files.map((file) => {
        const raw = fs.readFileSync(path.join(dir, file), "utf-8");
        return JSON.parse(raw);
    });
}

export function getHomestayBySlug(slug: string): Homestay {
    return loadJSON<Homestay>(`bdb/homestay/${slug}.json`);
}

