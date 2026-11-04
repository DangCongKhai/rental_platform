"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { runAction } from "@/server/action";
import { requireAdmin } from "@/server/auth";
import { databaseUuidSchema } from "@/server/admin/id-schema";
import {
  dismissListingReport,
  resolveListingReport,
  startReportReview,
} from "@/server/admin/reports";

const reason = z
  .string()
  .trim()
  .min(1, "Vui lòng nhập nội dung xử lý.")
  .max(1000, "Nội dung tối đa 1.000 ký tự.");

async function authorizedAdmin() {
  const auth = await runAction(() => requireAdmin());
  if (!auth.ok) return { error: auth.error };
  if (!auth.data) return { error: "Phiên đăng nhập đã hết hạn." };
  return { admin: auth.data };
}

function refreshReports(reportId: string, listingId?: string) {
  revalidatePath("/admin");
  revalidatePath("/admin/reports");
  revalidatePath(`/admin/reports/${reportId}`);
  if (listingId) {
    revalidatePath("/admin/listings");
    revalidatePath("/owner/listings");
    revalidatePath("/listings");
    revalidatePath(`/listings/${listingId}`);
  }
}

export async function startReview(reportId: string) {
  const auth = await authorizedAdmin();
  if (!auth.admin)
    return {
      ok: false as const,
      error: auth.error ?? "Phiên đăng nhập đã hết hạn.",
    };
  const parsedId = databaseUuidSchema.safeParse(reportId);
  if (!parsedId.success)
    return { ok: false as const, error: "Báo cáo không hợp lệ." };
  const result = await runAction(() =>
    startReportReview(auth.admin.profileId, reportId),
  );
  if (result.ok) refreshReports(reportId);
  return result;
}

export async function resolveReport(
  reportId: string,
  input: { summary: string; suspend: boolean },
) {
  const auth = await authorizedAdmin();
  if (!auth.admin)
    return {
      ok: false as const,
      error: auth.error ?? "Phiên đăng nhập đã hết hạn.",
    };
  const parsed = z
    .object({
      reportId: databaseUuidSchema,
      summary: reason,
      suspend: z.boolean(),
    })
    .safeParse({ reportId, ...input });
  if (!parsed.success)
    return {
      ok: false as const,
      error: parsed.error.issues[0]?.message ?? "Thông tin xử lý không hợp lệ.",
    };
  const result = await runAction(() =>
    resolveListingReport(
      auth.admin.profileId,
      reportId,
      parsed.data.summary,
      parsed.data.suspend,
    ),
  );
  if (result.ok && result.data) refreshReports(reportId, result.data.listingId);
  return result;
}

export async function dismissReport(reportId: string, dismissalReason: string) {
  const auth = await authorizedAdmin();
  if (!auth.admin)
    return {
      ok: false as const,
      error: auth.error ?? "Phiên đăng nhập đã hết hạn.",
    };
  const parsed = z
    .object({ reportId: databaseUuidSchema, reason })
    .safeParse({ reportId, reason: dismissalReason });
  if (!parsed.success)
    return {
      ok: false as const,
      error: parsed.error.issues[0]?.message ?? "Thông tin xử lý không hợp lệ.",
    };
  const result = await runAction(() =>
    dismissListingReport(auth.admin.profileId, reportId, parsed.data.reason),
  );
  if (result.ok) refreshReports(reportId);
  return result;
}
