import { connection } from "next/server";
import { z } from "zod";
import { requireUser } from "@/server/auth";
import { prisma } from "@/server/db";

export const OWNER_REQUEST_STATUSES = [
  "PENDING",
  "ACCEPTED",
  "REJECTED",
  "WITHDRAWN",
] as const;

export type OwnerRequestStatus = (typeof OWNER_REQUEST_STATUSES)[number];

export type OwnerRequestFilters = {
  status?: OwnerRequestStatus;
  propertyId?: string;
};

function isOwnerRequestStatus(value: string | undefined): value is OwnerRequestStatus {
  return OWNER_REQUEST_STATUSES.some((status) => status === value);
}

const requestSelection = {
  id: true,
  status: true,
  contactName: true,
  contactPhone: true,
  desiredMoveInDate: true,
  desiredEndDate: true,
  message: true,
  outcomeReason: true,
  createdAt: true,
  closedAt: true,
  listing: {
    select: {
      id: true,
      title: true,
      property: {
        select: { id: true, name: true, ward: true, city: true },
      },
    },
  },
  preferredUnit: { select: { id: true, label: true } },
  tenant: { select: { fullName: true } },
} as const;

const uuid = z.string().uuid();

export async function getOwnerRequests(filters: OwnerRequestFilters = {}) {
  await connection();
  const user = await requireUser();
  const status = isOwnerRequestStatus(filters.status) ? filters.status : undefined;
  const propertyId = filters.propertyId && uuid.safeParse(filters.propertyId).success
    ? filters.propertyId
    : undefined;

  const ownerScope = {
    listing: {
      property: {
        ownerId: user.profileId,
        ...(propertyId ? { id: propertyId } : {}),
      },
    },
  };

  const [properties, requests, groupedCounts] = await Promise.all([
    prisma.property.findMany({
      where: { ownerId: user.profileId },
      orderBy: [{ name: "asc" }, { id: "asc" }],
      select: { id: true, name: true },
    }),
    prisma.rentalRequest.findMany({
      where: {
        ...(status ? { status } : {}),
        ...ownerScope,
      },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      select: requestSelection,
    }),
    prisma.rentalRequest.groupBy({
      by: ["status"],
      where: ownerScope,
      _count: { _all: true },
    }),
  ]);

  const counts = Object.fromEntries(
    OWNER_REQUEST_STATUSES.map((requestStatus) => [requestStatus, 0]),
  ) as Record<OwnerRequestStatus, number>;
  for (const row of groupedCounts) {
    if (isOwnerRequestStatus(row.status)) counts[row.status] = row._count._all;
  }

  return {
    ownerName: user.fullName,
    properties,
    requests: requests.map((request) => ({
      ...request,
      daysWaiting: Math.max(0, Math.floor((Date.now() - request.createdAt.getTime()) / 86_400_000)),
    })),
    filters: { status, propertyId },
    counts,
  };
}

export async function getOwnerRequest(requestId: string) {
  await connection();
  const user = await requireUser();
  if (!uuid.safeParse(requestId).success) return null;

  const request = await prisma.rentalRequest.findFirst({
    where: {
      id: requestId,
      listing: {
        property: { ownerId: user.profileId },
      },
    },
    select: requestSelection,
  });
  return request
    ? {
        ...request,
        daysWaiting: Math.max(0, Math.floor((Date.now() - request.createdAt.getTime()) / 86_400_000)),
      }
    : null;
}
