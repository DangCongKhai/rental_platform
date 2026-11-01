import { connection } from "next/server";
import { requireUser } from "./auth";
import { prisma } from "./db";

const PAGE_SIZE = 10;

export async function getMyProperties(archived = false, page = 1) {
  await connection();
  const user = await requireUser();
  const safePage =
    Number.isInteger(page) && page > 0 && page <= 100000 ? page : 1;
  const where = {
    ownerId: user.profileId,
    archivedAt: archived ? { not: null } : null,
  };

  const [properties, total] = await Promise.all([
    prisma.property.findMany({
      where,
      orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
      skip: (safePage - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: {
        _count: {
          select: { units: true },
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
