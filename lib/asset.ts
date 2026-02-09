// Asset version for cache busting
// Increment this version number whenever you update images in CDN
// Example: '1.0.0' -> '1.0.1' -> '1.1.0' etc.
const ASSET_VERSION = '1.0.1';

export function assetUrl(path: string) {
  const base = process.env.NEXT_PUBLIC_ASSET_BASE_URL;
  if (!base) return path;

  const url = `${base}/${path}`.replace(/([^:])\/+/g, "$1/");

  // Add cache busting for CDN images
  // This forces browser to reload images when version changes
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}v=${ASSET_VERSION}`;
}
