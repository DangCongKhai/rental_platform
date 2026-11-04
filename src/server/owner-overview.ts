
import { connection } from "next/server";

import { requireUser } from "./auth";
import { prisma } from "./db";
import { publicMediaUrl } from "./listings/public-media-url";

function countBy<T extends string>(
  rows: { status: T; _count: { _all: number } }[],
): Record<string, number> {
  return Object.fromEntries(rows.map((row) => [row.status, row._count._all]));
}

export async function getOwnerOverview() {
  await connection();
  const user = await requireUser();

  const ownerId = user.profileId;
  const activeProperty = {
    ownerId,
    archivedAt: null,
  };

  const [
    requests,
    tenancies,
    renewals,
    units,
    listings,
    propertyCount,
    recentRequests,
    recentProperties,
  ] = await Promise.all([
    prisma.rentalRequest.groupBy({
      by: ["status"],
      where: {
        listing: {
          property: activeProperty,
        },
      },
      _count: { _all: true },
    }),

    prisma.tenancy.groupBy({
      by: ["status"],
      where: { ownerId },
      _count: { _all: true },
    }),

    prisma.tenancyRenewalRequest.groupBy({
      by: ["status"],
      where: {
        tenancy: { ownerId },
      },
      _count: { _all: true },
    }),

    prisma.unit.groupBy({
      by: ["operationalStatus"],
      where: {
        archivedAt: null,
        property: activeProperty,
      },
      _count: { _all: true },
    }),

    prisma.listing.groupBy({
      by: ["moderationStatus", "publicationStatus", "adminSuspendedAt"],
      where: {
        archivedAt: null,
        property: activeProperty,
      },
      _count: { _all: true },
    }),

    prisma.property.count({ where: activeProperty }),

    // Recent rental requests
    prisma.rentalRequest.findMany({
      where: {
        listing: {
          property: activeProperty,
        },
      },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: 4,
      select: {
        id: true,
        contactName: true,
        status: true,
        createdAt: true,
        desiredMoveInDate: true,
        desiredEndDate: true,
        preferredUnit: {
          select: {
            label: true,
          },
        },
        listing: {
          select: {
            title: true,
            property: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    }),

    // Recent properties
    prisma.property.findMany({
      where: activeProperty,
      orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
      take: 3,
      select: {
        id: true,
        name: true,
        ward: true,
        city: true,
        _count: {
          select: {
            units: true,
          },
        },
        listings: {
          where: { archivedAt: null },
          orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
          take: 1,
          select: {
            id: true,
            moderationStatus: true,
            publicationStatus: true,
            adminSuspendedAt: true,
            coverMedia: {
              select: {
                storagePath: true,
              },
            },
          },
        },
      },
    }),
  ]);

  const requestCounts = countBy(requests);
  const tenancyCounts = countBy(tenancies);
  const renewalCounts = countBy(renewals);

  const unitCounts = Object.fromEntries(
    units.map((row) => [row.operationalStatus, row._count._all]),
  );

  return {
    propertyCount,

    requests: {
      pending: requestCounts.PENDING ?? 0,
    },

    tenancies: {
      waitingForTenant: tenancyCounts.PENDING_CONFIRMATION ?? 0,
      revisionNeeded: tenancyCounts.AWAITING_REVISION ?? 0,
    },

    renewals: {
      pending: renewalCounts.PENDING ?? 0,
    },

    units: {
      ready: unitCounts.READY ?? 0,
      maintenance: unitCounts.MAINTENANCE ?? 0,
      retired: unitCounts.RETIRED ?? 0,
    },

    listings: listings.map((row) => ({
      moderationStatus: row.moderationStatus,
      publicationStatus: row.publicationStatus,
      suspended: row.adminSuspendedAt !== null,
      count: row._count._all,
    })),

    recentRequests,

    recentProperties: recentProperties.map((property) => {
      const listing = property.listings[0];

      return {
        id: property.id,
        name: property.name,
        address: [property.ward, property.city].filter(Boolean).join(", "),
        unitCount: property._count.units,
        listing: listing
          ? {
              id: listing.id,
              moderationStatus: listing.moderationStatus,
              publicationStatus: listing.publicationStatus,
              suspended: listing.adminSuspendedAt !== null,
              coverUrl: listing.coverMedia
                ? publicMediaUrl(listing.coverMedia.storagePath)
                : null,
            }
          : null,
      };
    }),
  };
}
