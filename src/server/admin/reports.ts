import { randomUUID } from "node:crypto";
import { ActionError } from "@/server/action";
import { requireAdmin } from "@/server/auth";
import { prisma } from "@/server/db";
import { createNotification } from "@/server/notifications";

export const ADMIN_REPORT_PAGE_SIZE = 10;
const reportStatuses = ["OPEN", "REVIEWING", "RESOLVED", "DISMISSED"] as const;

export async function getAdminReports(filters: { page?: number; q?: string; status?: string } = {}) {
  await requireAdmin();
  const page = Number.isInteger(filters.page) && (filters.page ?? 0) > 0 ? filters.page! : 1;
  const search = (filters.q ?? "").trim().slice(0, 120);
  const status = reportStatuses.includes(filters.status as (typeof reportStatuses)[number]) ? filters.status! : "ALL";
  const where = {
    ...(status !== "ALL" ? { status } : {}),
    ...(search ? { OR: [
      { description: { contains: search, mode: "insensitive" as const } },
      { listing: { title: { contains: search, mode: "insensitive" as const } } },
      { listing: { property: { name: { contains: search, mode: "insensitive" as const } } } },
      { reporter: { fullName: { contains: search, mode: "insensitive" as const } } },
    ] } : {}),
  };
  const [rows, total] = await Promise.all([
    prisma.listingReport.findMany({
      where,
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      skip: (page - 1) * ADMIN_REPORT_PAGE_SIZE,
      take: ADMIN_REPORT_PAGE_SIZE,
      select: {
        id: true, reasonCode: true, reasonCodes: true, description: true, status: true, createdAt: true,
        listing: { select: { id: true, title: true, property: { select: { name: true, owner: { select: { fullName: true } } } } } },
        reporter: { select: { fullName: true, email: true } },
      },
    }),
    prisma.listingReport.count({ where }),
  ]);
  return { rows, total, page, pageCount: Math.max(1, Math.ceil(total / ADMIN_REPORT_PAGE_SIZE)), search, status };
}

export async function getAdminReport(reportId: string) {
  await requireAdmin();
  const report = await prisma.listingReport.findUnique({
    where: { id: reportId },
    include: {
      reporter: { select: { id: true, fullName: true, email: true, phone: true } },
      reviewedBy: { select: { fullName: true } },
      listing: {
        include: {
          coverMedia: { select: { id: true, caption: true, storagePath: true } },
          property: {
            include: {
              owner: { select: { id: true, fullName: true, email: true, phone: true } },
              units: { where: { archivedAt: null }, orderBy: [{ createdAt: "asc" }, { id: "asc" }], select: { id: true, label: true, unitKind: true, operationalStatus: true, isMarketed: true, advertisedMonthlyRent: true, maxOccupants: true } },
            },
          },
        },
      },
    },
  });
  if (!report) return null;
  let coverUrl: string | null = null;
  if (report.listing.coverMedia?.storagePath) {
    try {
      const signed = await import("@/server/media-storage").then(({ createMediaSignedUrls }) => createMediaSignedUrls([report.listing.coverMedia!.storagePath]));
      coverUrl = signed[0] ?? null;
    } catch {
      // Preserve the report text if Storage is unavailable.
    }
  }
  const { property } = report.listing;
  return {
    ...report,
    listing: {
      id: report.listing.id,
      title: report.listing.title,
      description: report.listing.description,
      moderationStatus: report.listing.moderationStatus,
      publicationStatus: report.listing.publicationStatus,
      adminSuspendedAt: report.listing.adminSuspendedAt,
      suspensionReason: report.listing.suspensionReason,
      cover: report.listing.coverMedia ? { id: report.listing.coverMedia.id, caption: report.listing.coverMedia.caption, url: coverUrl } : null,
      property: {
        id: property.id, name: property.name, propertyType: property.propertyType,
        rentalArrangement: property.rentalArrangement, addressLine: property.addressLine,
        ward: property.ward, city: property.city, description: property.description,
        owner: property.owner,
        units: property.units.map((unit) => ({ ...unit, advertisedMonthlyRent: unit.advertisedMonthlyRent === null ? null : Number(unit.advertisedMonthlyRent) })),
      },
    },
  };
}

export async function startReportReview(adminId: string, reportId: string) {
  return prisma.$transaction(async (tx) => {
    const rows = await tx.$queryRaw<Array<{ id: string; status: string }>>`SELECT id, status FROM listing_reports WHERE id = ${reportId}::uuid FOR UPDATE`;
    const report = rows[0];
    if (!report) throw new ActionError("NOT_FOUND", "Không tìm thấy báo cáo.");
    if (report.status !== "OPEN") throw new ActionError("CONFLICT", "Báo cáo này đã được tiếp nhận hoặc đã xử lý.");
    await tx.listingReport.update({ where: { id: reportId }, data: { status: "REVIEWING", reviewedById: adminId, reviewedAt: new Date() } });
    return { reportId };
  });
}

export async function resolveListingReport(adminId: string, reportId: string, summary: string, suspend: boolean) {
  return prisma.$transaction(async (tx) => {
    const rows = await tx.$queryRaw<Array<{ id: string; status: string; listingId: string; ownerId: string; reporterId: string; title: string }>>`
      SELECT r.id, r.status, r.listing_id AS "listingId", p.owner_id AS "ownerId",
             r.reporter_id AS "reporterId", l.title
      FROM listing_reports r
      JOIN listings l ON l.id = r.listing_id
      JOIN properties p ON p.id = l.property_id
      WHERE r.id = ${reportId}::uuid
      FOR UPDATE OF r, l`;
    const report = rows[0];
    if (!report) throw new ActionError("NOT_FOUND", "Không tìm thấy báo cáo.");
    if (report.status !== "OPEN" && report.status !== "REVIEWING") throw new ActionError("CONFLICT", "Báo cáo này đã được xử lý.");
    const now = new Date();
    await tx.listingReport.update({ where: { id: reportId }, data: { status: "RESOLVED", resolutionSummary: summary, reviewedById: adminId, reviewedAt: now } });
    if (suspend) {
      const listing = await tx.listing.findUniqueOrThrow({ where: { id: report.listingId }, select: { adminSuspendedAt: true } });
      if (listing.adminSuspendedAt) throw new ActionError("CONFLICT", "Tin đăng đã bị đình chỉ. Hãy xử lý báo cáo mà không đình chỉ lần nữa.");
      await tx.listing.update({ where: { id: report.listingId }, data: { adminSuspendedAt: now, adminSuspendedById: adminId, suspensionReason: summary } });
    }
    const event = `report-resolved:${reportId}:${randomUUID()}`;
    await createNotification(tx, { recipientId: report.reporterId, audience: "TENANT", eventKey: `${event}:reporter`, title: "Báo cáo đã được xử lý", body: `Báo cáo tin “${report.title || "Chưa đặt tiêu đề"}” đã được xử lý. Kết quả: ${summary}`, link: { resourceType: "listing_report", resourceId: reportId } });
    await createNotification(tx, { recipientId: report.ownerId, audience: "OWNER", eventKey: `${event}:owner`, title: suspend ? "Tin đăng bị đình chỉ sau khi xem xét báo cáo" : "Báo cáo về tin đăng đã được xem xét", body: suspend ? `Tin “${report.title || "Chưa đặt tiêu đề"}” đã bị đình chỉ. Lý do: ${summary}` : `Báo cáo về tin “${report.title || "Chưa đặt tiêu đề"}” đã được xem xét.`, link: { resourceType: "listing_report", resourceId: reportId } });
    return { reportId, listingId: report.listingId };
  });
}

export async function dismissListingReport(adminId: string, reportId: string, reason: string) {
  return prisma.$transaction(async (tx) => {
    const rows = await tx.$queryRaw<Array<{ id: string; status: string; reporterId: string; title: string }>>`
      SELECT r.id, r.status, r.reporter_id AS "reporterId", l.title
      FROM listing_reports r JOIN listings l ON l.id = r.listing_id
      WHERE r.id = ${reportId}::uuid FOR UPDATE OF r`;
    const report = rows[0];
    if (!report) throw new ActionError("NOT_FOUND", "Không tìm thấy báo cáo.");
    if (report.status !== "OPEN" && report.status !== "REVIEWING") throw new ActionError("CONFLICT", "Báo cáo này đã được xử lý.");
    await tx.listingReport.update({ where: { id: reportId }, data: { status: "DISMISSED", resolutionSummary: reason, reviewedById: adminId, reviewedAt: new Date() } });
    await createNotification(tx, { recipientId: report.reporterId, audience: "TENANT", eventKey: `report-dismissed:${reportId}:${randomUUID()}`, title: "Báo cáo đã được xem xét", body: `Báo cáo tin “${report.title || "Chưa đặt tiêu đề"}” đã được đóng. Kết quả: ${reason}`, link: { resourceType: "listing_report", resourceId: reportId } });
    return { reportId };
  });
}
