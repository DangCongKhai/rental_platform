import { randomUUID } from "node:crypto";
import { createMediaSignedUrls } from "@/server/media-storage";
import { ActionError } from "@/server/action";
import { requireAdmin } from "@/server/auth";
import { prisma } from "@/server/db";

export const ADMIN_REVIEW_PAGE_SIZE = 10;

export async function getAdminDashboard() {
  await requireAdmin();
  const [
    pendingListings,
    openReports,
    suspendedListings,
    activeAccounts,
    oldest,
    recent,
  ] = await Promise.all([
    prisma.listing.count({
      where: { moderationStatus: "PENDING", archivedAt: null },
    }),
    prisma.listingReport.count({
      where: { status: { in: ["OPEN", "REVIEWING"] } },
    }),
    prisma.listing.count({
      where: { adminSuspendedAt: { not: null }, archivedAt: null },
    }),
    prisma.userProfile.count({ where: { accountStatus: "ACTIVE" } }),
    prisma.listing.findMany({
      where: { moderationStatus: "PENDING", archivedAt: null },
      orderBy: [{ submittedAt: "asc" }, { id: "asc" }],
      take: 4,
      select: {
        id: true,
        title: true,
        submittedAt: true,
        property: {
          select: { name: true, owner: { select: { fullName: true } } },
        },
      },
    }),
    prisma.listing.findMany({
      where: { reviewedById: { not: null }, reviewedAt: { not: null } },
      orderBy: [{ reviewedAt: "desc" }, { id: "desc" }],
      take: 5,
      select: {
        id: true,
        title: true,
        moderationStatus: true,
        reviewedAt: true,
        reviewedBy: { select: { fullName: true } },
      },
    }),
  ]);
  return {
    counts: { pendingListings, openReports, suspendedListings, activeAccounts },
    oldest,
    recent,
  };
}

export async function getReviewQueue(page = 1, search = "") {
  await requireAdmin();
  const currentPage = Number.isInteger(page) && page > 0 ? page : 1;
  const term = search.trim().slice(0, 120);
  const where = {
    moderationStatus: "PENDING",
    archivedAt: null,
    ...(term
      ? {
          OR: [
            { title: { contains: term, mode: "insensitive" as const } },
            {
              property: {
                name: { contains: term, mode: "insensitive" as const },
              },
            },
            {
              property: {
                owner: {
                  fullName: { contains: term, mode: "insensitive" as const },
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
      orderBy: [{ submittedAt: "asc" }, { id: "asc" }],
      skip: (currentPage - 1) * ADMIN_REVIEW_PAGE_SIZE,
      take: ADMIN_REVIEW_PAGE_SIZE,
      select: {
        id: true,
        title: true,
        submittedAt: true,
        property: {
          select: {
            name: true,
            rentalArrangement: true,
            owner: { select: { fullName: true } },
            _count: { select: { units: true, media: true } },
          },
        },
      },
    }),
    prisma.listing.count({ where }),
  ]);
  return {
    rows,
    page: currentPage,
    pageCount: Math.max(1, Math.ceil(total / ADMIN_REVIEW_PAGE_SIZE)),
    total,
    search: term,
  };
}

export async function getReviewPackage(listingId: string) {
  await requireAdmin();
  const listing = await prisma.listing.findFirst({
    where: { id: listingId, archivedAt: null },
    include: {
      property: {
        include: {
          owner: {
            select: { id: true, fullName: true, email: true, phone: true },
          },
          units: {
            where: { archivedAt: null },
            orderBy: [{ createdAt: "asc" }, { id: "asc" }],
            include: {
              media: {
                where: {
                  deletedAt: null,
                  purgedAt: null,
                  isSelectedForListing: true,
                },
                select: { id: true, caption: true, storagePath: true },
              },
              mediaAssignments: {
                where: {
                  isSelectedForListing: true,
                  media: { deletedAt: null, purgedAt: null },
                },
                include: {
                  media: {
                    select: { id: true, caption: true, storagePath: true },
                  },
                },
                orderBy: { sortOrder: "asc" },
              },
            },
          },
          media: {
            where: {
              unitId: null,
              deletedAt: null,
              purgedAt: null,
              isSelectedForListing: true,
            },
            orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
            select: { id: true, caption: true, storagePath: true },
          },
        },
      },
    },
  });
  if (!listing) return null;

  const allMedia = [
    ...listing.property.media,
    ...listing.property.units.flatMap((unit) => [
      ...unit.media,
      ...unit.mediaAssignments.map((assignment) => assignment.media),
    ]),
  ];
  const paths = [...new Set(allMedia.map((media) => media.storagePath))];
  let signedUrls: Array<string | null> = paths.map(() => null);
  try {
    signedUrls = await createMediaSignedUrls(paths);
  } catch {
    // Keep the review package readable if Storage is temporarily unavailable.
  }
  const urlByPath = new Map(
    paths.map((path, index) => [path, signedUrls[index]]),
  );
  const image = (media: {
    id: string;
    caption: string | null;
    storagePath: string;
  }) => ({
    id: media.id,
    caption: media.caption,
    url: urlByPath.get(media.storagePath) ?? null,
  });

  return {
    id: listing.id,
    title: listing.title,
    description: listing.description,
    moderationStatus: listing.moderationStatus,
    publicationStatus: listing.publicationStatus,
    submittedAt: listing.submittedAt,
    submittedContentRevision: listing.submittedContentRevision,
    reviewReason: listing.reviewReason,
    coverMediaId: listing.coverMediaId,
    property: {
      id: listing.property.id,
      name: listing.property.name,
      propertyType: listing.property.propertyType,
      rentalArrangement: listing.property.rentalArrangement,
      addressLine: listing.property.addressLine,
      ward: listing.property.ward,
      city: listing.property.city,
      description: listing.property.description,
      contentRevision: listing.property.contentRevision,
      sharedAmenities: listing.property.sharedAmenities,
      policies: listing.property.policies,
      owner: listing.property.owner,
      media: listing.property.media.map(image),
      units: listing.property.units.map((unit) => ({
        id: unit.id,
        label: unit.label,
        unitKind: unit.unitKind,
        description: unit.description,
        floor: unit.floor,
        areaM2: unit.areaM2 === null ? null : Number(unit.areaM2),
        bedrooms: unit.bedrooms,
        bathrooms: Number(unit.bathrooms),
        bathroomArrangement: unit.bathroomArrangement,
        advertisedMonthlyRent:
          unit.advertisedMonthlyRent === null
            ? null
            : Number(unit.advertisedMonthlyRent),
        deposit: unit.deposit === null ? null : Number(unit.deposit),
        minimumRentalMonths: unit.minimumRentalMonths,
        maxOccupants: unit.maxOccupants,
        operationalStatus: unit.operationalStatus,
        isMarketed: unit.isMarketed,
        amenities: unit.amenities,
        policyOverrides: unit.policyOverrides,
        photos: [
          ...unit.media.map(image),
          ...unit.mediaAssignments.map((assignment) => image(assignment.media)),
        ],
      })),
    },
  };
}

export async function decideListing(
  adminId: string,
  listingId: string,
  decision:
    | { kind: "approve"; expectedRevision: number }
    | { kind: "reject"; reason: string },
) {
  return prisma.$transaction(async (tx) => {
    const rows = await tx.$queryRaw<
      Array<{
        listingId: string;
        propertyId: string;
        ownerId: string;
        contentRevision: number;
        submittedContentRevision: number | null;
        moderationStatus: string;
        title: string;
      }>
    >`
      SELECT l.id AS "listingId", p.id AS "propertyId", p.owner_id AS "ownerId",
             p.content_revision AS "contentRevision",
             l.submitted_content_revision AS "submittedContentRevision",
             l.moderation_status AS "moderationStatus", l.title
      FROM listings l
      JOIN properties p ON p.id = l.property_id
      WHERE l.id = ${listingId}::uuid AND l.archived_at IS NULL
      FOR UPDATE OF p, l`;
    const current = rows[0];
    if (!current)
      throw new ActionError("NOT_FOUND", "Không tìm thấy tin đăng cần duyệt.");
    if (current.moderationStatus !== "PENDING") {
      throw new ActionError(
        "CONFLICT",
        "Tin đăng này đã được quản trị viên quyết định.",
      );
    }
    if (
      decision.kind === "approve" &&
      (current.contentRevision !== decision.expectedRevision ||
        current.submittedContentRevision !== decision.expectedRevision)
    ) {
      throw new ActionError(
        "CONFLICT",
        "Nội dung đã thay đổi sau khi bạn mở hồ sơ. Tải lại để xem bản mới nhất.",
      );
    }
    if (
      decision.kind === "reject" &&
      current.contentRevision !== current.submittedContentRevision
    ) {
      throw new ActionError(
        "CONFLICT",
        "Nội dung đã thay đổi sau khi gửi. Tải lại hồ sơ mới nhất trước khi từ chối.",
      );
    }

    const now = new Date();
    await tx.listing.update({
      where: { id: listingId },
      data:
        decision.kind === "approve"
          ? {
              moderationStatus: "APPROVED",
              reviewedById: adminId,
              reviewedAt: now,
              approvedContentRevision: current.contentRevision,
              reviewReason: null,
            }
          : {
              moderationStatus: "REJECTED",
              reviewedById: adminId,
              reviewedAt: now,
              reviewReason: decision.reason,
            },
    });
    await tx.notification.create({
      data: {
        recipientId: current.ownerId,
        audience: "OWNER",
        eventKey: `listing-${decision.kind === "approve" ? "approved" : "rejected"}:${listingId}:${randomUUID()}`,
        title:
          decision.kind === "approve"
            ? "Tin đăng đã được duyệt"
            : "Tin đăng chưa được duyệt",
        body:
          decision.kind === "approve"
            ? `Tin “${current.title || "Chưa đặt tiêu đề"}” đã được duyệt. Bạn có thể tiếp tục bước công khai.`
            : `Tin “${current.title || "Chưa đặt tiêu đề"}” chưa được duyệt. Lý do: ${decision.reason}`,
        resourceType: "listing",
        resourceId: listingId,
      },
    });
    return { listingId, propertyId: current.propertyId };
  });
}
