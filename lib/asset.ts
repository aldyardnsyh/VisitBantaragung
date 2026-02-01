export function assetUrl(path: string) {
  const base = process.env.NEXT_PUBLIC_ASSET_BASE_URL;
  if (!base) return path; // fallback
  return `${base}/${path}`.replace(/([^:]\/)\/+/g, "$1");
}
