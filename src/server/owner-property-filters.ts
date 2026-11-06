import type { Prisma } from "../../generated/prisma/client";
import type {
  OwnerListingStatusFilter,
  OwnerOccupancyFilter,
} from "@/lib/owner-types";

function coversToday(today: Date): Prisma.TenancyWhereInput {
  const start = { lte: today };
  const end = { gte: today };
  return {
    OR: [
      { confirmedStartDate: start, confirmedEndDate: end },
      {
        confirmedStartDate: start,
        confirmedEndDate: null,
        blockedEndDate: end,
      },
      {
        confirmedStartDate: null,
        blockedStartDate: start,
        confirmedEndDate: end,
      },
      {
        confirmedStartDate: null,
        confirmedEndDate: null,
        blockedStartDate: start,
        blockedEndDate: end,
      },
    ],
  };
}

function startsAfter(today: Date): Prisma.TenancyWhereInput {
  const after = { gt: today };
  const hasEnd = {
    OR: [
      { confirmedEndDate: { not: null } },
      { blockedEndDate: { not: null } },
    ],
  };
  return {
    OR: [
      { confirmedStartDate: after, ...hasEnd },
      {
        confirmedStartDate: null,
        blockedStartDate: after,
        ...hasEnd,
      },
    ],
  };
}

function confirmationOpen(now: Date): Prisma.TenancyWhereInput {
  return {
    OR: [
      { confirmationExpiresAt: null },
      { confirmationExpiresAt: { gt: now } },
    ],
  };
}

function activeHold(today: Date): Prisma.TenancyWhereInput {
  return { status: "ACTIVE", AND: [coversToday(today)] };
}

function pendingHold(today: Date, now: Date): Prisma.TenancyWhereInput {
  return {
    status: { in: ["PENDING_CONFIRMATION", "AWAITING_REVISION"] },
    AND: [
      { OR: [coversToday(today), startsAfter(today)] },
      confirmationOpen(now),
    ],
  };
}

function confirmedHold(today: Date): Prisma.TenancyWhereInput {
  return {
    status: "CONFIRMED",
    OR: [coversToday(today), startsAfter(today)],
  };
}

function unitWhere(
  filter: Exclude<OwnerOccupancyFilter, "all">,
  today: Date,
  now: Date,
): Prisma.UnitWhereInput {
  const rentable = {
    archivedAt: null,
    operationalStatus: { not: "RETIRED" },
  };
  if (filter === "OCCUPIED") {
    return { ...rentable, tenancies: { some: activeHold(today) } };
  }
  if (filter === "MAINTENANCE") {
    return { archivedAt: null, operationalStatus: "MAINTENANCE" };
  }
  if (filter === "VACANT") {
    return {
      archivedAt: null,
      operationalStatus: "READY",
      tenancies: {
        none: {
          OR: [
            activeHold(today),
            pendingHold(today, now),
            confirmedHold(today),
          ],
        },
      },
    };
  }
  if (filter === "PENDING_CONFIRMATION") {
    return {
      ...rentable,
      tenancies: { some: pendingHold(today, now) },
      NOT: { tenancies: { some: activeHold(today) } },
    };
  }
  return {
    ...rentable,
    tenancies: { some: confirmedHold(today) },
    NOT: {
      OR: [
        { tenancies: { some: activeHold(today) } },
        { tenancies: { some: pendingHold(today, now) } },
      ],
    },
  };
}

export function occupancyPropertyWhere(
  filter: OwnerOccupancyFilter,
  today: Date,
  now: Date,
): Prisma.PropertyWhereInput | undefined {
  if (filter === "all") return undefined;
  return {
    units: { some: unitWhere(filter, today, now) },
  };
}

function listingSome(
  where: Prisma.ListingWhereInput,
): Prisma.PropertyWhereInput {
  return { listings: { some: { archivedAt: null, ...where } } };
}

const notOnDisplay = {
  adminSuspendedAt: null,
  publicationStatus: { notIn: ["PUBLISHED", "HIDDEN"] },
} satisfies Prisma.ListingWhereInput;

export function listingStatusPropertyWhere(
  filter: OwnerListingStatusFilter,
): Prisma.PropertyWhereInput | undefined {
  if (filter === "all") return undefined;
  if (filter === "none") {
    return { listings: { none: { archivedAt: null } } };
  }
  if (filter === "suspended") {
    return listingSome({ adminSuspendedAt: { not: null } });
  }
  if (filter === "published") {
    return listingSome({
      publicationStatus: "PUBLISHED",
      adminSuspendedAt: null,
    });
  }
  if (filter === "hidden") {
    return listingSome({
      publicationStatus: "HIDDEN",
      adminSuspendedAt: null,
    });
  }
  if (filter === "pending") {
    return listingSome({
      ...notOnDisplay,
      moderationStatus: "PENDING",
    });
  }
  if (filter === "rejected") {
    return listingSome({
      ...notOnDisplay,
      moderationStatus: "REJECTED",
    });
  }
  if (filter === "approved") {
    return listingSome({
      ...notOnDisplay,
      moderationStatus: "APPROVED",
    });
  }
  return listingSome({
    ...notOnDisplay,
    moderationStatus: {
      notIn: ["PENDING", "REJECTED", "APPROVED"],
    },
  });
}
