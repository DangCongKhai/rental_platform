"use server";

import { z } from "zod";
import { requireUser } from "../auth";
import { ActionError, runAction } from "../action";
import { prisma } from "../db";
import { withTransaction } from "../transaction";
import { createNotification } from "../notifications";
import type { ActionResult } from "../validation";

const inputSchema = z
  .object({
    reasonCodes: z
      .array(z.enum(["FRAUD", "MISLEADING", "HARMFUL", "OTHER"]))
      .min(1, "Chọn lý do báo cáo."),
    description: z
      .string()
      .trim()
      .min(1, "Nhập mô tả.")
      .max(5000, "Mô tả tối đa 5000 ký tự."),
  })
  .strict();
const duplicateMessage = "Bạn đã báo cáo tin này.";

export async function reportListing(
  listingId: string,
  input: unknown,
): Promise<ActionResult<{ reportId: string }>> {
  return runAction(async (): Promise<ActionResult<{ reportId: string }>> => {
    const user = await requireUser();
    const parsed = inputSchema.safeParse(input);
    if (!parsed.success)
      return {
        ok: false,
        error: "Dữ liệu không hợp lệ.",
        fieldErrors: Object.fromEntries(
          parsed.error.issues.map((issue) => [
            String(issue.path[0] ?? "form"),
            issue.message,
          ]),
        ),
      };
    if (!z.guid().safeParse(listingId).success)
      throw new ActionError("NOT_FOUND", "Tin đăng không khả dụng.");
    return withTransaction(async (tx) => {
      // Serialize submissions per reporter so concurrent requests cannot bypass the hourly cap.
      await tx.$queryRaw`SELECT id FROM user_profiles WHERE id = ${user.profileId}::uuid FOR UPDATE`;
      const listing = await tx.listing.findFirst({
        where: {
          id: listingId,
          publicationStatus: "PUBLISHED",
          moderationStatus: "APPROVED",
          archivedAt: null,
          adminSuspendedAt: null,
          property: { archivedAt: null },
        },
        select: { id: true },
      });
      if (!listing)
        throw new ActionError("NOT_FOUND", "Tin đăng không khả dụng.");
      const existing = await tx.listingReport.findFirst({
        where: {
          reporterId: user.profileId,
          listingId,
          status: { in: ["OPEN", "REVIEWING"] },
        },
        select: { id: true },
      });
      if (existing) return { ok: false as const, error: duplicateMessage };
      const count = await tx.listingReport.count({
        where: {
          reporterId: user.profileId,
          createdAt: { gte: new Date(Date.now() - 60 * 60 * 1000) },
        },
      });
      if (count >= 5)
        return {
          ok: false as const,
          error: "Bạn đã gửi 5 báo cáo trong giờ qua. Vui lòng thử lại sau.",
        };
      const reasonCodes = [...new Set(parsed.data.reasonCodes)];
      const report = await tx.listingReport.create({
        data: {
          reporterId: user.profileId,
          listingId,
          reasonCode: reasonCodes[0],
          reasonCodes,
          description: parsed.data.description,
          status: "OPEN",
        },
        select: { id: true },
      });
      const admins = await tx.userProfile.findMany({
        where: { isAdmin: true, accountStatus: "ACTIVE" },
        select: { id: true },
      });
      for (const admin of admins)
        await createNotification(tx, {
          recipientId: admin.id,
          audience: "ADMIN",
          eventKey: `listing_report.created:${report.id}`,
          title: "Báo cáo tin đăng mới",
          body: "Một tin đăng cần được xem xét.",
          link: { resourceType: "listing_report", resourceId: report.id },
        });
      return { ok: true as const, data: { reportId: report.id } };
    });
  }).then((result) => (result.ok ? result.data! : result));
}

export async function getMyReports() {
  const user = await requireUser();
  return prisma.listingReport.findMany({
    where: { reporterId: user.profileId },
    // Deliberately project only reporter-facing fields. Internal notes never load.
    select: {
      id: true,
      listingId: true,
      createdAt: true,
      status: true,
      reasonCodes: true,
      resolutionSummary: true,
    },
    orderBy: { createdAt: "desc" },
  });
}
