import "server-only";
import { createHash, randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { ActionError } from "../action";

function storage() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !secret) throw new Error("Contract storage is not configured");
  return createClient(url, secret, {
    auth: { persistSession: false, autoRefreshToken: false },
  }).storage;
}

/** Server-owned path and digest. The contracts bucket must be private. */
export async function uploadContract(file: File, ownerId: string) {
  if (
    !(file instanceof File) ||
    file.size === 0 ||
    file.size > 10 * 1024 * 1024
  )
    throw new ActionError("CONFLICT", "Chọn tệp PDF không quá 10 MB.");
  const bytes = Buffer.from(await file.arrayBuffer());
  if (
    file.type !== "application/pdf" ||
    bytes.subarray(0, 5).toString() !== "%PDF-"
  )
    throw new ActionError("CONFLICT", "Tài liệu phải là tệp PDF.");
  const sha256 = createHash("sha256").update(bytes).digest("hex");
  const path = `${ownerId}/${randomUUID()}.pdf`;
  const service = storage();
  const { data: bucket, error: bucketError } =
    await service.getBucket("contracts");
  if (bucketError || !bucket || bucket.public)
    throw new Error("A private contracts bucket is required");
  const { error } = await service
    .from("contracts")
    .upload(path, bytes, { contentType: "application/pdf", upsert: false });
  if (error) throw new Error("Contract upload failed", { cause: error });
  return { path, sha256 };
}
export async function signContractDownload(path: string) {
  const service = storage();
  const { data: bucket, error: bucketError } =
    await service.getBucket("contracts");
  if (bucketError || !bucket || bucket.public)
    throw new Error("A private contracts bucket is required");
  const { data, error } = await service
    .from("contracts")
    .createSignedUrl(path, 60);
  if (error) throw new Error("Contract download failed", { cause: error });
  return data.signedUrl;
}
