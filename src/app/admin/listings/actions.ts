"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { runAction } from "@/server/action";
import { requireAdmin } from "@/server/auth";
import { changeListingSuspension } from "@/server/admin/listings";

const schema = z.object({
  listingId: z.string().uuid(),
  reason: z.string().trim().min(1, "Vui lòng nhập lý do.").max(1000, "Lý do tối đa 1.000 ký tự."),
});

async function updateSuspension(listingId: string, reason: string, operation: "suspend" | "restore") {
  const auth = await runAction(() => requireAdmin());
  if (!auth.ok) return auth;
  if (!auth.data) return { ok: false as const, error: "Phiên đăng nhập đã hết hạn." };
  const parsed = schema.safeParse({ listingId, reason });
  if (!parsed.success) return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Thông tin không hợp lệ." };
  const result = await runAction(() => changeListingSuspension(auth.data!.profileId, listingId, operation, parsed.data.reason));
  if (result.ok && result.data) {
    revalidatePath("/admin");
    revalidatePath("/admin/listings");
    revalidatePath("/owner/listings");
    revalidatePath(`/owner/listings/${listingId}`);
    revalidatePath("/listings");
    revalidatePath(`/listings/${listingId}`);
  }
  return result;
}

export async function suspendListing(listingId: string, reason: string) {
  return updateSuspension(listingId, reason, "suspend");
}

export async function restoreListing(listingId: string, reason: string) {
  return updateSuspension(listingId, reason, "restore");
}
