import { createClient } from "@supabase/supabase-js";
import { PROPERTY_MEDIA_BUCKET } from "./media-validation";

function storageClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secret = process.env.SUPABASE_SECRET_KEY;
  if (!url || !secret) throw new Error("Supabase Storage is not configured.");

  return createClient(url, secret, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
  });
}

export async function uploadMediaObject(path: string, bytes: Uint8Array, mimeType: string) {
  const { error } = await storageClient().storage.from(PROPERTY_MEDIA_BUCKET).upload(path, bytes, {
    contentType: mimeType,
    cacheControl: "3600",
    upsert: false,
  });
  if (error) throw error;
}

export async function removeMediaObject(path: string) {
  const { error } = await storageClient().storage.from(PROPERTY_MEDIA_BUCKET).remove([path]);
  if (error) throw error;
}

export async function createMediaSignedUrls(paths: string[], expiresIn = 3600) {
  if (paths.length === 0) return [];
  const { data, error } = await storageClient().storage.from(PROPERTY_MEDIA_BUCKET).createSignedUrls(paths, expiresIn);
  if (error) throw error;

  const signedByPath = new Map(data.map((item) => [item.path, item.signedUrl ?? null]));
  return paths.map((path) => signedByPath.get(path) ?? null);
}
