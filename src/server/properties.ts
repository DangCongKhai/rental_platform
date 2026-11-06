import { connection } from "next/server";
import { z } from "zod";
import type { Prisma } from "../../generated/prisma/client";
import { todayInVietnam } from "@/domain/discovery/unit-availability";
import {
  classifyUnit,
  historyStatus,
  occupancyCounts,
  operationalStatusLabel,
  rentalStatusLabel,
} from "@/domain/tenancies/occupancy";
import { currentTerms } from "@/domain/tenancies/current-terms";
import {
  propertyTypeLabel,
  rentalArrangementLabel,
} from "@/domain/properties/labels";
import type {
  OwnerListingStatusFilter,
  OwnerOccupancyFilter,
  OwnerPropertyRental,
  OwnerUnitHistory,
} from "@/lib/owner-types";
import { requireUser } from "./auth";
import { prisma } from "./db";
import { createMediaSignedUrls } from "./media-storage";
import {
  listingStatusPropertyWhere,
  occupancyPropertyWhere,
} from "./owner-property-filters";
import {
  currentHoldStatuses,
  dateOnly,
  toHoldTenancy,
} from "./tenancies/hold";

const PAGE_SIZE = 10;

const currentHolds = {
  where: { status: { in: currentHoldStatuses } },
  select: {
    id: true,
    status: true,
    confirmedStartDate: true,
    confirmedEndDate: true,
    blockedStartDate: true,
    blockedEndDate: true,
    confirmationExpiresAt: true,
    tenant: { select: { fullName: true } },
  },
};

export type OwnerListingFilter = "all" | "action" | "published" | "draft";

export async function getMyProperties(
  page = 1,
  listingFilter: OwnerListingFilter = "all",
  includeArchived = false,
  occupancy: OwnerOccupancyFilter = "all",
  listingStatus: OwnerListingStatusFilter = "all",
) {
  await connection();
  const user = await requireUser();
  const safePage =
    Number.isInteger(page) && page > 0 && page <= 100000 ? page : 1;
  const now = new Date();
  const today = new Date(`${todayInVietnam(now)}T00:00:00.000Z`);
  const listingWhere: Prisma.ListingWhereInput | undefined =
    listingFilter === "published"
      ? { publicationStatus: "PUBLISHED", adminSuspendedAt: null }
      : listingFilter === "draft"
        ? { moderationStatus: "DRAFT" }
        : listingFilter === "action"
          ? {
              OR: [
                { moderationStatus: "PENDING" },
                { moderationStatus: "REJECTED" },
                { adminSuspendedAt: { not: null } },
              ],
            }
          : undefined;
  const listingGroup: Prisma.PropertyWhereInput | undefined =
    listingFilter === "draft" || listingFilter === "action"
      ? {
          OR: [
            { listings: { none: { archivedAt: null } } },
            {
              listings: {
                some: {
                  archivedAt: null,
                  ...listingWhere,
                },
              },
            },
          ],
        }
      : listingWhere
        ? {
            listings: {
              some: { archivedAt: null, ...listingWhere },
            },
          }
        : undefined;
  const where: Prisma.PropertyWhereInput = {
    ownerId: user.profileId,
    ...(includeArchived ? {} : { archivedAt: null }),
    AND: [
      listingGroup ?? {},
      occupancyPropertyWhere(occupancy, today, now) ?? {},
      listingStatusPropertyWhere(listingStatus) ?? {},
    ],
  };

  const [properties, total] = await Promise.all([
    prisma.property.findMany({
      where,
      orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
      skip: (safePage - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: {
        _count: {
          select: { units: { where: { archivedAt: null } } },
        },
        units: {
          where: { archivedAt: null },
          select: {
            id: true,
            isMarketed: true,
            operationalStatus: true,
            tenancies: currentHolds,
          },
        },
        listings: {
          where: { archivedAt: null },
          orderBy: { updatedAt: "desc" },
          take: 1,
          select: {
            id: true,
            title: true,
            description: true,
            coverMediaId: true,
            moderationStatus: true,
            publicationStatus: true,
            reviewReason: true,
            adminSuspendedAt: true,
            suspensionReason: true,
          },
        },
      },
    }),
    prisma.property.count({ where }),
  ]);
  return { properties, total, page: safePage, pageSize: PAGE_SIZE };
}

export async function getMyProperty(id: string) {
  await connection();
  const user = await requireUser();

  return prisma.property.findFirst({
    where: {
      id,
      ownerId: user.profileId,
      archivedAt: null,
    },
    include: {
      units: {
        where: { archivedAt: null },
        orderBy: [{ createdAt: "asc" }, { id: "asc" }],
        include: { tenancies: currentHolds },
      },
      listings: {
        where: { archivedAt: null },
        orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
        take: 1,
        select: { id: true, moderationStatus: true, publicationStatus: true },
      },
    },
  });
}

function addressOf(property: {
  addressLine: string | null;
  ward: string | null;
  city: string | null;
}) {
  return (
    [property.addressLine, property.ward, property.city]
      .filter(Boolean)
      .join(", ") || "Chưa nhập địa chỉ"
  );
}

export async function getPropertyRental(
  id: string,
): Promise<OwnerPropertyRental | null> {
  if (!z.guid().safeParse(id).success) return null;
  const property = await getMyProperty(id);
  if (!property) return null;

  const today = todayInVietnam();
  const classified = property.units.map((unit) => ({
    unit,
    occupancy: classifyUnit(
      {
        operationalStatus: unit.operationalStatus,
        tenancies: unit.tenancies.map(toHoldTenancy),
      },
      today,
    ),
  }));
  const counts = occupancyCounts(
    classified.map((item) => item.occupancy),
  );

  return {
    id: property.id,
    name: property.name,
    address: addressOf(property),
    property_type_label: propertyTypeLabel(property.propertyType),
    rental_arrangement: property.rentalArrangement,
    rental_arrangement_label: rentalArrangementLabel(
      property.rentalArrangement,
    ),
    counts: {
      total: counts.total,
      occupied: counts.occupied,
      vacant: counts.vacant,
      maintenance: counts.maintenance,
    },
    units: classified.map(({ unit, occupancy }) => ({
      id: unit.id,
      label: unit.label,
      operational: occupancy.operational,
      operational_label: operationalStatusLabel(occupancy.operational),
      rental: occupancy.rental,
      rental_label: rentalStatusLabel(occupancy.rental),
      tenant_name: occupancy.tenantName,
      start_date: occupancy.startDate,
      end_date: occupancy.endDate,
    })),
  };
}

async function firstUnitPhoto(propertyId: string, unitId: string) {
  const media = await prisma.propertyMedia.findFirst({
    where: {
      propertyId,
      deletedAt: null,
      purgedAt: null,
      OR: [{ unitId }, { unitAssignments: { some: { unitId } } }],
    },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    select: { storagePath: true },
  });
  if (!media) return null;
  try {
    const [url] = await createMediaSignedUrls([media.storagePath]);
    return url ?? null;
  } catch {
    return null;
  }
}

function historyRent(tenancy: {
  contracts: Array<{
    versionNumber: number;
    monthlyRent: { toString(): string };
    ownerConfirmedAt: Date | null;
    tenantConfirmedAt: Date | null;
    tenantRejectedAt: Date | null;
  }>;
  pendingContract: { monthlyRent: { toString(): string } } | null;
}) {
  const terms = currentTerms(tenancy.contracts);
  const amount = terms?.monthlyRent ?? tenancy.pendingContract?.monthlyRent;
  return amount ? amount.toString() : null;
}

export async function getMyUnitHistory(
  propertyId: string,
  unitId: string,
): Promise<OwnerUnitHistory | null> {
  if (!z.guid().safeParse(propertyId).success) return null;
  if (!z.guid().safeParse(unitId).success) return null;
  await connection();
  const user = await requireUser();
  const unit = await prisma.unit.findFirst({
    where: {
      id: unitId,
      propertyId,
      archivedAt: null,
      property: { ownerId: user.profileId, archivedAt: null },
    },
    select: {
      id: true,
      label: true,
      areaM2: true,
      floor: true,
      operationalStatus: true,
      property: {
        select: { id: true, name: true, rentalArrangement: true },
      },
      tenancies: {
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        select: {
          id: true,
          status: true,
          createdAt: true,
          confirmedStartDate: true,
          confirmedEndDate: true,
          blockedStartDate: true,
          blockedEndDate: true,
          tenant: { select: { fullName: true } },
          pendingContract: {
            select: {
              monthlyRent: true,
              startDate: true,
              endDate: true,
            },
          },
          contracts: {
            select: {
              versionNumber: true,
              monthlyRent: true,
              startDate: true,
              endDate: true,
              ownerConfirmedAt: true,
              tenantConfirmedAt: true,
              tenantRejectedAt: true,
            },
          },
        },
      },
    },
  });
  if (!unit) return null;

  const operational =
    unit.operationalStatus === "MAINTENANCE" ||
    unit.operationalStatus === "RETIRED"
      ? unit.operationalStatus
      : "READY";
  const facts = [
    operationalStatusLabel(operational),
    unit.areaM2 == null ? null : `${unit.areaM2.toString()} m²`,
    unit.floor ? `Tầng ${unit.floor}` : null,
  ].filter((item): item is string => Boolean(item));

  const tenancies = unit.tenancies
    .map((tenancy) => {
      const terms = currentTerms(tenancy.contracts);
      const start =
        dateOnly(tenancy.confirmedStartDate) ??
        dateOnly(tenancy.blockedStartDate) ??
        dateOnly(terms?.startDate) ??
        dateOnly(tenancy.pendingContract?.startDate);
      const end =
        dateOnly(tenancy.confirmedEndDate) ??
        dateOnly(tenancy.blockedEndDate) ??
        dateOnly(terms?.endDate) ??
        dateOnly(tenancy.pendingContract?.endDate);
      const status = historyStatus(tenancy.status);
      return {
        id: tenancy.id,
        tenant_name: tenancy.tenant.fullName,
        start_date: start,
        end_date: end,
        monthly_rent: historyRent(tenancy),
        status_label: status.label,
        status_tone: status.tone,
        created_at: tenancy.createdAt.toISOString(),
      };
    })
    .sort((left, right) => {
      const byStart = (right.start_date ?? "").localeCompare(
        left.start_date ?? "",
      );
      if (byStart !== 0) return byStart;
      return right.created_at.localeCompare(left.created_at);
    })
    .map(({ created_at: _createdAt, ...entry }) => entry);

  return {
    property_id: unit.property.id,
    property_name: unit.property.name,
    unit_id: unit.id,
    label: unit.label,
    rental_arrangement: unit.property.rentalArrangement,
    facts: facts.join(" · "),
    photo_url: await firstUnitPhoto(propertyId, unitId),
    tenancies,
  };
}

export async function ownerUnitArrangement(
  propertyId: string,
  unitId: string,
) {
  if (!z.guid().safeParse(propertyId).success) return null;
  if (!z.guid().safeParse(unitId).success) return null;
  await connection();
  const user = await requireUser();
  const unit = await prisma.unit.findFirst({
    where: {
      id: unitId,
      propertyId,
      property: { ownerId: user.profileId, archivedAt: null },
    },
    select: { property: { select: { rentalArrangement: true } } },
  });
  return unit?.property.rentalArrangement ?? null;
}
