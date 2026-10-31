"use server";

import { z } from "zod";
import { Prisma } from "../../../generated/prisma/client";
import { requireUser } from "../auth";
import { prisma } from "../db";

const closed = ["EXPIRED", "CANCELLED", "ENDED"];
const openWhere: Prisma.RentalRequestWhereInput = {
  OR: [
    { status: "PENDING" },
    {
      status: "ACCEPTED",
      OR: [{ tenancy: null }, { tenancy: { status: { notIn: closed } } }],
    },
  ],
};
const tenancySelect = {
  id: true,
  status: true,
  confirmationExpiresAt: true,
  pendingContract: {
    select: {
      id: true,
      versionNumber: true,
      monthlyRent: true,
      tenantConfirmedAt: true,
      tenantRejectedAt: true,
    },
  },
} satisfies Prisma.TenancySelect;
const requestSelect = {
  id: true,
  status: true,
  createdAt: true,
  desiredMoveInDate: true,
  desiredEndDate: true,
  contactName: true,
  contactPhone: true,
  message: true,
  outcomeReason: true,
  preferredUnit: { select: { label: true } },
  listing: {
    select: {
      title: true,
      property: {
        select: {
          name: true,
          ward: true,
          city: true,
          media: {
            where: { deletedAt: null, purgedAt: null, unitId: null },
            orderBy: { sortOrder: "asc" },
            take: 1,
            select: { storagePath: true },
          },
        },
      },
    },
  },
  tenancy: { select: tenancySelect },
} satisfies Prisma.RentalRequestSelect;

export async function getMyRentalRequests(
  options: { tab?: "open" | "closed"; page?: number } = {},
) {
  const user = await requireUser();
  const { tab, page } = z
    .object({
      tab: z.enum(["open", "closed"]).default("open"),
      page: z.number().int().min(1).max(100000).default(1),
    })
    .strict()
    .parse(options);
  const where: Prisma.RentalRequestWhereInput = {
    tenantId: user.profileId,
    ...(tab === "open" ? openWhere : { NOT: openWhere }),
  };
  const [requests, total] = await Promise.all([
    prisma.rentalRequest.findMany({
      where,
      select: requestSelect,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      skip: (page - 1) * 20,
      take: 20,
    }),
    prisma.rentalRequest.count({ where }),
  ]);
  return { requests, total, page, pageSize: 20, tab };
}

export async function getMyRentalRequest(id: string) {
  const user = await requireUser();
  if (!z.guid().safeParse(id).success) return null;
  return prisma.rentalRequest.findFirst({
    where: { id, tenantId: user.profileId },
    select: requestSelect,
  });
}

const unitCardSelect = {
  label: true,
  bedrooms: true,
  areaM2: true,
  advertisedMonthlyRent: true,
  property: {
    select: {
      name: true,
      ward: true,
      media: {
        where: { deletedAt: null, purgedAt: null, unitId: null },
        orderBy: { sortOrder: "asc" as const },
        take: 1,
        select: { storagePath: true },
      },
    },
  },
} satisfies Prisma.UnitSelect;

export async function getMyRecentRequests() {
  const user = await requireUser();
  return prisma.rentalRequest.findMany({
    where: { tenantId: user.profileId },
    select: requestSelect,
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: 3,
  });
}

export async function getMyTenancies() {
  const user = await requireUser();
  return prisma.tenancy.findMany({
    where: { tenantId: user.profileId },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    select: {
      ...tenancySelect,
      confirmedStartDate: true,
      confirmedEndDate: true,
      latestConfirmedContract: {
        select: { monthlyRent: true, versionNumber: true },
      },
      unit: { select: unitCardSelect },
    },
  });
}
