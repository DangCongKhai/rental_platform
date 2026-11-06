import { connection } from "next/server";
import type { Prisma } from "../../generated/prisma/client";
import { requireUser } from "./auth";
import { prisma } from "./db";

const PAGE_SIZE = 10;

export type OwnerListingFilter = "all" | "action" | "published" | "draft";

export async function getMyProperties(
  page = 1,
  listingFilter: OwnerListingFilter = "all",
  includeArchived = false,
) {
  await connection();
  const user = await requireUser();
  const safePage =
    Number.isInteger(page) && page > 0 && page <= 100000 ? page : 1;
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
  const where: Prisma.PropertyWhereInput = {
    ownerId: user.profileId,
    ...(includeArchived ? {} : { archivedAt: null }),
    ...(listingFilter === "draft" || listingFilter === "action"
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
        : {}),
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
