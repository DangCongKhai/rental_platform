export function publicMediaUrl(storagePath: string): string | null {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
  const bucket = (
    process.env.SUPABASE_STORAGE_BUCKET ?? "property-media"
  ).trim();
  if (!base || !bucket) return null;

  const path = storagePath.replace(/\\/g, "/").replace(/^\/+/, "");
  const encodedPath = path
    .split("/")
    .map((part) => encodeURIComponent(part))
    .join("/");
  return `${base}/storage/v1/object/public/${encodeURIComponent(bucket)}/${encodedPath}`;
}
