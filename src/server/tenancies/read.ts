"use server";
import { z } from "zod";
import { requireParty, requireUser } from "../auth";
import { prisma } from "../db";
import { withTransaction } from "../transaction";
import { releaseExpiredHolds } from "./expiry";
import { currentTerms } from "@/domain/tenancies/current-terms";
import { agreedRulesView } from "@/components/tenancies/agreed-rules";
import { signContractDownload } from "../contracts/storage";
import { ActionError, runAction } from "../action";
import { Prisma } from "../../../generated/prisma/client";

export async function getTenancy(id: string) {
  if (!z.guid().safeParse(id).success) return null;
  const user = await requireUser();
  const hint = await prisma.tenancy.findFirst({
    where: {
      id,
      OR: [{ ownerId: user.profileId }, { tenantId: user.profileId }],
    },
    select: { unitId: true },
  });
  if (!hint) return null;
  await withTransaction((tx) =>
    releaseExpiredHolds(tx, [hint.unitId], new Date()),
  );
  const t = await prisma.tenancy.findFirst({
    where: {
      id,
      OR: [{ tenantId: user.profileId }, { ownerId: user.profileId }],
    },
    include: {
      unit: { include: { property: true } },
      tenant: { select: { fullName: true } },
      rentalRequest: {
        select: { contactName: true, contactPhone: true, listingId: true },
      },
      contracts: { orderBy: { versionNumber: "desc" } },
    },
  });
  if (!t) return null;
  const contracts = t.contracts.map((c) => ({
    id: c.id,
    versionNumber: c.versionNumber,
    type: c.type,
    startDate: c.startDate,
    endDate: c.endDate,
    monthlyRent: c.monthlyRent.toString(),
    depositAmount: c.depositAmount.toString(),
    policiesSnapshot: c.policiesSnapshot,
    documentSha256: c.documentSha256,
    ownerConfirmedAt: c.ownerConfirmedAt,
    tenantConfirmedAt: c.tenantConfirmedAt,
    tenantRejectedAt: c.tenantRejectedAt,
    tenantRejectionReason: c.tenantRejectionReason,
    supersedesContractId: c.supersedesContractId,
  }));
  return {
    id: t.id,
    rentalRequestId: t.rentalRequestId,
    status: t.status,
    isOwner: user.profileId === t.ownerId,
    pendingContractId: t.pendingContractId,
    confirmationExpiresAt: t.confirmationExpiresAt,
    confirmedStartDate: t.confirmedStartDate,
    confirmedEndDate: t.confirmedEndDate,
    movedInAt: t.movedInAt,
    unitId: t.unitId,
    unitLabel: t.unit.label,
    propertyName: t.unit.property.name,
    address: [
      t.unit.property.addressLine,
      t.unit.property.ward,
      t.unit.property.city,
    ]
      .filter(Boolean)
      .join(", "),
    contactName: t.rentalRequest.contactName,
    contactPhone: t.rentalRequest.contactPhone,
    listingId: t.rentalRequest.listingId,
    contracts,
    currentTerms: currentTerms(contracts),
    pendingContract:
      contracts.find((c) => c.id === t.pendingContractId) ?? null,
  };
}
export async function getOwnerRentalRequest(id: string) {
  const user = await requireUser();
  if (!z.guid().safeParse(id).success) return null;
  const r = await prisma.rentalRequest.findFirst({
    where: { id, listing: { property: { ownerId: user.profileId } } },
    include: {
      tenancy: { select: { id: true } },
      preferredUnit: { select: { label: true } },
      listing: {
        include: {
          property: {
            include: {
              units: { where: { archivedAt: null }, orderBy: { label: "asc" } },
            },
          },
        },
      },
    },
  });
  if (!r) return null;
  return {
    id: r.id,
    status: r.status,
    contactName: r.contactName,
    contactPhone: r.contactPhone,
    desiredMoveInDate: r.desiredMoveInDate,
    desiredEndDate: r.desiredEndDate,
    message: r.message,
    createdAt: r.createdAt,
    title: r.listing.title,
    preferredUnitId: r.preferredUnitId,
    preferredUnitLabel: r.preferredUnit?.label ?? null,
    tenancyId: r.tenancy?.id ?? null,
    units: r.listing.property.units.map((u) => ({
      id: u.id,
      label: u.label,
      operationalStatus: u.operationalStatus,
      monthlyRent: u.advertisedMonthlyRent?.toString() ?? "",
      depositAmount: u.deposit?.toString() ?? "0",
    })),
    rulesByUnitId: Object.fromEntries(
      r.listing.property.units.map((u) => [
        u.id,
        agreedRulesView(r.listing.property.policies, u.policyOverrides),
      ]),
    ),
  };
}
const PAGE_SIZE = 20;

const tenancyListInclude = {
  unit: { select: { label: true, property: { select: { name: true } } } },
  rentalRequest: { select: { contactName: true } },
  pendingContract: {
    select: {
      versionNumber: true,
      startDate: true,
      endDate: true,
      monthlyRent: true,
      depositAmount: true,
    },
  },
  latestConfirmedContract: {
    select: {
      versionNumber: true,
      startDate: true,
      endDate: true,
      monthlyRent: true,
      depositAmount: true,
    },
  },
} as const;

export type OwnerTenancyTab =
  | "all"
  | "waiting-tenant"
  | "revision-needed"
  | "renewal-pending";

const ownerTenancyFilters = {
  all: {},
  "waiting-tenant": { status: "PENDING_CONFIRMATION" },
  "revision-needed": { status: "AWAITING_REVISION" },
  "renewal-pending": {
    renewalRequests: { some: { status: "PENDING" } },
  },
} satisfies Record<OwnerTenancyTab, Prisma.TenancyWhereInput>;

async function listTenancies(
  where: Prisma.TenancyWhereInput,
  page = 1,
) {
  const safePage =
    Number.isInteger(page) && page > 0 && page <= 100000 ? page : 1;
  const [tenancies, total] = await Promise.all([
    prisma.tenancy.findMany({
      where,
      orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
      skip: (safePage - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: tenancyListInclude,
    }),
    prisma.tenancy.count({ where }),
  ]);
  return { tenancies, total, page: safePage, pageSize: PAGE_SIZE };
}

export async function getOwnerTenancies(
  page = 1,
  tab: OwnerTenancyTab = "all",
) {
  const user = await requireUser();

  return listTenancies(
    {
      ownerId: user.profileId,
      ...ownerTenancyFilters[tab],
    },
    page,
  );
}

export async function getTenantTenancies(page = 1) {
  const user = await requireUser();
  return listTenancies({ tenantId: user.profileId }, page);
}

const ownerRequestTabs = {
  pending: "PENDING",
  accepted: "ACCEPTED",
  rejected: "REJECTED",
  withdrawn: "WITHDRAWN",
} as const;

export type OwnerRequestTab = keyof typeof ownerRequestTabs;

export async function getOwnerRequests(
  options: { tab?: OwnerRequestTab; page?: number; propertyId?: string } = {},
) {
  const user = await requireUser();
  const tab =
    options.tab && options.tab in ownerRequestTabs ? options.tab : "pending";
  const page =
    Number.isInteger(options.page) &&
    options.page! > 0 &&
    options.page! <= 100000
      ? options.page!
      : 1;
  const propertyId = z.guid().safeParse(options.propertyId).success
    ? options.propertyId
    : undefined;
  const owner = {
    listing: {
      property: { ownerId: user.profileId },
      ...(propertyId ? { propertyId } : {}),
    },
  };
  const where = { ...owner, status: ownerRequestTabs[tab] };
  const [requests, total, pendingCount, properties] = await Promise.all([
    prisma.rentalRequest.findMany({
      where,
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: {
        preferredUnit: { select: { label: true } },
        listing: { select: { title: true } },
      },
    }),
    prisma.rentalRequest.count({ where }),
    prisma.rentalRequest.count({
      where: {
        status: "PENDING",
        listing: { property: { ownerId: user.profileId } },
      },
    }),
    prisma.property.findMany({
      where: { ownerId: user.profileId },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);
  return {
    requests,
    total,
    page,
    pageSize: PAGE_SIZE,
    tab,
    pendingCount,
    propertyId: propertyId ?? "",
    properties,
  };
}

export async function getContractDownloadUrl(contractId: string) {
  return runAction(async () => {
    if (!z.guid().safeParse(contractId).success)
      throw new ActionError("NOT_FOUND", "Không tìm thấy dữ liệu.");
    const c = await prisma.tenancyContract.findUnique({
      where: { id: contractId },
      select: { tenancyId: true, documentPath: true },
    });
    if (!c) throw new ActionError("NOT_FOUND", "Không tìm thấy dữ liệu.");
    await requireParty(c.tenancyId);
    return { url: await signContractDownload(c.documentPath) };
  });
}
