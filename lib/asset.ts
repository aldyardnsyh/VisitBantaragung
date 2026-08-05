// Asset version for cache busting
// This timestamp ensures images are ALWAYS fresh when updated in CDN
// Format: YYYYMMDDHHMMSS (e.g., 20260210023000 = Feb 10, 2026, 02:30:00)
// UPDATE THIS TIMESTAMP EVERY TIME YOU UPLOAD NEW IMAGES TO CDN!
const ASSET_VERSION = '20260210024130';

export function assetUrl(path: string) {
  // Path lokal (mulai dengan "/") langsung dipakai, tanpa CDN & cache-busting
  if (path.startsWith("/")) return path;

  const base = process.env.NEXT_PUBLIC_ASSET_BASE_URL;
  if (!base) return path;

  const url = `${base}/${path}`.replace(/([^:])\/\//g, "$1/");

  // Add cache busting with static timestamp
  // This forces CDN and browser to reload images when version changes
  // Using static version to avoid hydration mismatch between server and client
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}v=${ASSET_VERSION}`;
}
