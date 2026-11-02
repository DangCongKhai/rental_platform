"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { runAction } from "@/server/action";
import { requireAdmin } from "@/server/auth";
import { decideListing } from "./review";

// PostgreSQL accepts any hexadecimal UUID bit pattern. Some seeded UUIDv7 IDs
// have non-RFC variant bits, so validate the database format instead of RFC variant bits.
const uuid = z.string().regex(/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i);

export async function approveListing(listingId: string, expectedRevision: number) {
  const auth = await runAction(() => requireAdmin());
  if (!auth.ok) return auth;
  if (!auth.data) return { ok: false as const, error: "Phiên đăng nhập đã hết hạn." };
  const admin = auth.data;
  const parsed = z.object({ listingId: uuid, expectedRevision: z.number().int().positive() }).safeParse({ listingId, expectedRevision });
  if (!parsed.success) return { ok: false as const, error: "Thông tin duyệt không hợp lệ." };

  const result = await runAction(() => decideListing(admin.profileId, listingId, { kind: "approve", expectedRevision }));
  if (result.ok) {
    revalidatePath("/admin");
    revalidatePath("/admin/reviews");
    revalidatePath(`/admin/reviews/${listingId}`);
    revalidatePath("/owner/listings");
  }
  return result;
}

export async function rejectListing(listingId: string, reason: string) {
  const auth = await runAction(() => requireAdmin());
  if (!auth.ok) return auth;
  if (!auth.data) return { ok: false as const, error: "Phiên đăng nhập đã hết hạn." };
  const admin = auth.data;
  const parsed = z.object({
    listingId: uuid,
    reason: z.string().trim().min(1, "Vui lòng nhập lý do từ chối.").max(1000, "Lý do tối đa 1.000 ký tự."),
  }).safeParse({ listingId, reason });
  if (!parsed.success) {
    return {
      ok: false as const,
      error: "Vui lòng kiểm tra lại thông tin.",
      fieldErrors: { reason: parsed.error.issues[0]?.message ?? "Lý do không hợp lệ." },
    };
  }

  const result = await runAction(() => decideListing(admin.profileId, listingId, { kind: "reject", reason: parsed.data.reason }));
  if (result.ok) {
    revalidatePath("/admin");
    revalidatePath("/admin/reviews");
    revalidatePath(`/admin/reviews/${listingId}`);
    revalidatePath("/owner/listings");
  }
  return result;
}
