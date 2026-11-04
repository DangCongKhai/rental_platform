import { randomUUID } from "node:crypto";
import { ActionError } from "@/server/action";
import { requireAdmin } from "@/server/auth";
import { prisma } from "@/server/db";
import { createNotification } from "@/server/notifications";

export const ADMIN_LISTING_PAGE_SIZE = 10;

export async function getAdminListings(
  filters: { page?: number; q?: string; status?: string } = {},
) {
  await requireAdmin();
  const page =
    Number.isInteger(filters.page) && (filters.page ?? 0) > 0
      ? filters.page!
      : 1;
  const search = (filters.q ?? "").trim().slice(0, 120);
  const status = ["PUBLISHED", "HIDDEN", "SUSPENDED", "ARCHIVED"].includes(
    filters.status ?? "",
  )
    ? filters.status
    : "ALL";
  const where = {
    ...(status === "ARCHIVED"
      ? { archivedAt: { not: null } }
      : { archivedAt: null }),
    ...(status === "SUSPENDED" ? { adminSuspendedAt: { not: null } } : {}),
    ...(status === "PUBLISHED"
      ? { adminSuspendedAt: null, publicationStatus: "PUBLISHED" }
      : {}),
    ...(status === "HIDDEN"
      ? { adminSuspendedAt: null, publicationStatus: "HIDDEN" }
      : {}),
    ...(search
      ? {
          OR: [
            { title: { contains: search, mode: "insensitive" as const } },
            {
              property: {
                name: { contains: search, mode: "insensitive" as const },
              },
            },
            {
              property: {
                owner: {
                  fullName: { contains: search, mode: "insensitive" as const },
                },
              },
            },
          ],
        }
      : {}),
  };
  const [rows, total] = await Promise.all([
    prisma.listing.findMany({
      where,
      orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
      skip: (page - 1) * ADMIN_LISTING_PAGE_SIZE,
      take: ADMIN_LISTING_PAGE_SIZE,
      select: {
        id: true,
        title: true,
        moderationStatus: true,
        publicationStatus: true,
        adminSuspendedAt: true,
        suspensionReason: true,
        archivedAt: true,
        updatedAt: true,
        property: {
          select: {
            id: true,
            name: true,
            owner: { select: { fullName: true } },
          },
        },
      },
    }),
    prisma.listing.count({ where }),
  ]);
  return {
    rows,
    page,
    pageCount: Math.max(1, Math.ceil(total / ADMIN_LISTING_PAGE_SIZE)),
    total,
    search,
    status,
  };
}

export async function changeListingSuspension(
  adminId: string,
  listingId: string,
  operation: "suspend" | "restore",
  reason: string,
) {
  return prisma.$transaction(async (tx) => {
    const rows = await tx.$queryRaw<
      Array<{
        id: string;
        propertyId: string;
        ownerId: string;
        title: string;
        adminSuspendedAt: Date | null;
      }>
    >`
      SELECT l.id, l.property_id AS "propertyId", p.owner_id AS "ownerId", l.title,
             l.admin_suspended_at AS "adminSuspendedAt"
      FROM listings l JOIN properties p ON p.id = l.property_id
      WHERE l.id = ${listingId}::uuid AND l.archived_at IS NULL AND p.archived_at IS NULL
      FOR UPDATE OF l`;
    const listing = rows[0];
    if (!listing)
      throw new ActionError("NOT_FOUND", "Không tìm thấy tin đăng.");
    if (operation === "suspend" && listing.adminSuspendedAt)
      throw new ActionError("CONFLICT", "Tin đăng này đã bị đình chỉ.");
    if (operation === "restore" && !listing.adminSuspendedAt)
      throw new ActionError("CONFLICT", "Tin đăng này hiện không bị đình chỉ.");

    await tx.listing.update({
      where: { id: listingId },
      data:
        operation === "suspend"
          ? {
              adminSuspendedAt: new Date(),
              adminSuspendedById: adminId,
              suspensionReason: reason,
            }
          : {
              adminSuspendedAt: null,
              adminSuspendedById: null,
              suspensionReason: null,
            },
    });
    await createNotification(tx, {
      recipientId: listing.ownerId,
      audience: "OWNER",
      eventKey: `listing-${operation}:${listingId}:${randomUUID()}`,
      title:
        operation === "suspend"
          ? "Tin đăng đã bị đình chỉ"
          : "Tin đăng đã được khôi phục",
      body:
        operation === "suspend"
          ? `Tin “${listing.title || "Chưa đặt tiêu đề"}” đã bị đình chỉ. Lý do: ${reason}`
          : `Tin “${listing.title || "Chưa đặt tiêu đề"}” đã được khôi phục. Ghi chú: ${reason}`,
      link: { resourceType: "listing", resourceId: listingId },
    });
    return { listingId, propertyId: listing.propertyId };
  });
}
