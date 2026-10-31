"use server";
import { z } from "zod";
import { requireParty, requireUser } from "../auth";
import { prisma } from "../db";
import { withTransaction } from "../transaction";
import { releaseExpiredHolds } from "./expiry";
import { currentTerms } from "@/domain/tenancies/current-terms";
import { signContractDownload } from "../contracts/storage";
import { ActionError, runAction } from "../action";

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
