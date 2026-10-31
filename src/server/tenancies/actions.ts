"use server";
import { z } from "zod";
import type { Prisma } from "../../../generated/prisma/client";
import { meetsMinimumTerm } from "@/domain/tenancies/calendar-months";
import { requireUser } from "../auth";
import { ActionError, runAction } from "../action";
import { prisma } from "../db";
import { withTransaction } from "../transaction";
import { createNotification } from "../notifications";
import { uploadContract } from "../contracts/storage";
import { releaseExpiredHolds } from "./expiry";

const termsSchema = z
  .object({
    unitId: z.guid().optional(),
    startDate: z.iso.date(),
    endDate: z.iso.date(),
    monthlyRent: z.coerce.number().int().positive().max(99999999999999),
    depositAmount: z.coerce.number().int().nonnegative().max(99999999999999),
  })
  .strict()
  .refine(
    (v) => meetsMinimumTerm(new Date(v.startDate), new Date(v.endDate)),
    "Thời hạn thuê tối thiểu 3 tháng.",
  );
function conflict(
  message = "Đề xuất đã thay đổi. Tải lại rồi thử lại.",
): never {
  throw new ActionError("CONFLICT", message);
}
function missing(): never {
  throw new ActionError("NOT_FOUND", "Không tìm thấy dữ liệu.");
}
function parseTerms(input: unknown) {
  const result = termsSchema.safeParse(input);
  if (!result.success)
    conflict(
      "Kiểm tra ngày thuê, giá thuê và tiền cọc. Thời hạn tối thiểu 3 tháng.",
    );
  return result.data;
}
function deadline(now: Date) {
  const configured = Number(process.env.CONFIRMATION_HOLD_HOURS ?? 48);
  return new Date(
    now.getTime() +
      (Number.isFinite(configured) && configured > 0 ? configured : 48) *
        3600000,
  );
}
async function lockUnit(tx: Prisma.TransactionClient, id: string) {
  await tx.$queryRaw`SELECT id FROM units WHERE id = ${id}::uuid FOR UPDATE`;
}
async function lockTenancy(tx: Prisma.TransactionClient, id: string) {
  const hint = await tx.tenancy.findUnique({
    where: { id },
    select: { unitId: true, rentalRequestId: true },
  });
  if (!hint) missing();
  await lockUnit(tx, hint.unitId);
  await releaseExpiredHolds(tx, [hint.unitId], new Date());
  await tx.$queryRaw`SELECT id FROM rental_requests WHERE id = ${hint.rentalRequestId}::uuid FOR UPDATE`;
  await tx.$queryRaw`SELECT id FROM tenancies WHERE id = ${id}::uuid FOR UPDATE`;
  return tx.tenancy.findUniqueOrThrow({
    where: { id },
    include: {
      pendingContract: true,
      contracts: { orderBy: { versionNumber: "desc" } },
    },
  });
}
function overlap(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  if (
    String(error).includes("tenancies_no_overlapping_holds") ||
    String(error).includes("23P01")
  )
    return true;
  return (
    ("cause" in error && overlap(error.cause)) ||
    ("meta" in error && JSON.stringify(error.meta).includes("23P01"))
  );
}
async function withOverlap<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    if (overlap(error)) conflict("Căn đã được giữ cho khoảng thời gian này");
    throw error;
  }
}
async function notify(
  tx: Prisma.TransactionClient,
  t: { id: string; tenantId: string; ownerId: string },
  audience: "TENANT" | "OWNER",
  event: string,
  title: string,
) {
  await createNotification(tx, {
    recipientId: audience === "TENANT" ? t.tenantId : t.ownerId,
    audience,
    eventKey: `${event}:${t.id}`,
    title,
    body: title,
    link: { resourceType: "tenancy", resourceId: t.id },
  });
}

export async function proposeTenancy(
  requestId: string,
  input: unknown,
  file: File,
) {
  return runAction(async () => {
    const user = await requireUser();
    if (!z.guid().safeParse(requestId).success) missing();
    const terms = parseTerms(input);
    if (!terms.unitId) conflict("Chọn căn thuê.");
    // Check authorization before performing external storage I/O; recheck under locks.
    const initial = await prisma.rentalRequest.findFirst({
      where: {
        id: requestId,
        listing: { property: { ownerId: user.profileId } },
      },
      select: { id: true },
    });
    if (!initial) missing();
    const document = await uploadContract(file, user.profileId);
    return withOverlap(() =>
      withTransaction(async (tx) => {
        await lockUnit(tx, terms.unitId!);
        const now = new Date();
        await releaseExpiredHolds(tx, [terms.unitId!], now);
        await tx.$queryRaw`SELECT id FROM rental_requests WHERE id = ${requestId}::uuid FOR UPDATE`;
        const request = await tx.rentalRequest.findUnique({
          where: { id: requestId },
          include: { listing: { include: { property: true } } },
        });
        if (!request || request.listing.property.ownerId !== user.profileId)
          missing();
        if (request.status !== "PENDING")
          conflict("Yêu cầu không còn chờ xử lý.");
        const unit = await tx.unit.findFirst({
          where: {
            id: terms.unitId,
            propertyId: request.listing.propertyId,
            operationalStatus: "READY",
            archivedAt: null,
          },
        });
        if (!unit)
          conflict("Căn thuê không sẵn sàng hoặc không thuộc nhà này.");
        const tenancy = await tx.tenancy.create({
          data: {
            unitId: unit.id,
            tenantId: request.tenantId,
            ownerId: user.profileId,
            rentalRequestId: request.id,
            status: "PENDING_CONFIRMATION",
            blockedStartDate: new Date(terms.startDate),
            blockedEndDate: new Date(terms.endDate),
            confirmationExpiresAt: deadline(now),
          },
        });
        const contract = await tx.tenancyContract.create({
          data: {
            tenancyId: tenancy.id,
            versionNumber: 1,
            type: "ORIGINAL",
            startDate: new Date(terms.startDate),
            endDate: new Date(terms.endDate),
            monthlyRent: terms.monthlyRent,
            depositAmount: terms.depositAmount,
            policiesSnapshot: {
              property: request.listing.property.policies,
              unit: unit.policyOverrides,
            },
            documentPath: document.path,
            documentSha256: document.sha256,
            createdById: user.profileId,
            ownerConfirmedAt: now,
          },
        });
        await tx.tenancy.update({
          where: { id: tenancy.id },
          data: { pendingContractId: contract.id },
        });
        await tx.rentalRequest.update({
          where: { id: request.id },
          data: { status: "ACCEPTED" },
        });
        await notify(
          tx,
          tenancy,
          "TENANT",
          "tenancy.proposed",
          "Bạn có đề xuất hợp đồng mới",
        );
        return { tenancyId: tenancy.id };
      }),
    );
  });
}

export async function confirmContract(contractId: string, sha256: string) {
  return runAction(async () => {
    const user = await requireUser();
    if (!z.guid().safeParse(contractId).success) missing();
    const hint = await prisma.tenancyContract.findUnique({
      where: { id: contractId },
      select: { tenancyId: true },
    });
    if (!hint) missing();
    const result = await withTransaction(async (tx) => {
      const t = await lockTenancy(tx, hint.tenancyId);
      if (t.tenantId !== user.profileId) missing();
      const now = new Date();
      // A refusal is returned and thrown only after commit, preserving lazy expiry.
      if (
        !t.pendingContract ||
        t.pendingContractId !== contractId ||
        !t.confirmationExpiresAt ||
        now >= t.confirmationExpiresAt
      ) {
        await releaseExpiredHolds(tx, [t.unitId], now);
        return { refused: true as const };
      }
      const c = t.pendingContract;
      if (
        c.documentSha256 !== sha256 ||
        c.tenantConfirmedAt ||
        c.tenantRejectedAt
      )
        conflict();
      await tx.tenancyContract.update({
        where: { id: c.id },
        data: { tenantConfirmedAt: now },
      });
      await tx.tenancy.update({
        where: { id: t.id },
        data: {
          status: t.status === "ACTIVE" ? "ACTIVE" : "CONFIRMED",
          confirmedStartDate: t.confirmedStartDate ?? c.startDate,
          confirmedEndDate: c.endDate,
          blockedStartDate: t.confirmedStartDate ?? c.startDate,
          blockedEndDate: c.endDate,
          latestConfirmedContractId: c.id,
          pendingContractId: null,
          confirmationExpiresAt: null,
        },
      });
      await notify(
        tx,
        t,
        "OWNER",
        `contract.confirmed:${c.id}`,
        "Người thuê đã xác nhận hợp đồng",
      );
      return { refused: false as const };
    });
    if (result.refused)
      conflict("Hợp đồng đã hết hạn hoặc không còn là phiên bản chờ xác nhận.");
    return { tenancyId: hint.tenancyId };
  });
}

export async function declineContract(contractId: string, reason: string) {
  return runAction(async () => {
    const user = await requireUser();
    if (!z.guid().safeParse(contractId).success) missing();
    const validated = z.string().trim().min(1).max(2000).safeParse(reason);
    if (!validated.success) conflict("Vui lòng nhập lý do từ chối.");
    const hint = await prisma.tenancyContract.findUnique({
      where: { id: contractId },
      select: { tenancyId: true },
    });
    if (!hint) missing();
    const accepted = await withTransaction(async (tx) => {
      const t = await lockTenancy(tx, hint.tenancyId);
      if (t.tenantId !== user.profileId) missing();
      if (!t.pendingContract || t.pendingContractId !== contractId)
        return false;
      const now = new Date();
      if (!t.confirmationExpiresAt || now >= t.confirmationExpiresAt) {
        await releaseExpiredHolds(tx, [t.unitId], now);
        return false;
      }
      await tx.tenancyContract.update({
        where: { id: contractId },
        data: { tenantRejectedAt: now, tenantRejectionReason: validated.data },
      });
      const confirmed = t.latestConfirmedContractId !== null;
      await tx.tenancy.update({
        where: { id: t.id },
        data: {
          status: confirmed ? t.status : "AWAITING_REVISION",
          pendingContractId: null,
          confirmationExpiresAt: null,
          blockedStartDate: confirmed ? t.confirmedStartDate : null,
          blockedEndDate: confirmed ? t.confirmedEndDate : null,
        },
      });
      await notify(
        tx,
        t,
        "OWNER",
        `contract.declined:${contractId}`,
        "Người thuê yêu cầu sửa đổi hợp đồng",
      );
      return true;
    });
    if (!accepted) conflict("Hợp đồng đã hết hạn hoặc không còn chờ xác nhận.");
    return { tenancyId: hint.tenancyId };
  });
}

export async function reviseContract(
  tenancyId: string,
  input: unknown,
  file: File,
) {
  return runAction(async () => {
    const user = await requireUser();
    if (!z.guid().safeParse(tenancyId).success) missing();
    const terms = parseTerms(input);
    const initial = await prisma.tenancy.findFirst({
      where: { id: tenancyId, ownerId: user.profileId },
      select: { id: true },
    });
    if (!initial) missing();
    const document = await uploadContract(file, user.profileId);
    return withOverlap(() =>
      withTransaction(async (tx) => {
        const t = await lockTenancy(tx, tenancyId);
        if (t.ownerId !== user.profileId) missing();
        if (
          t.latestConfirmedContractId ||
          !["PENDING_CONFIRMATION", "AWAITING_REVISION", "EXPIRED"].includes(
            t.status,
          )
        )
          conflict("Hợp đồng đã được hai bên xác nhận, không thể sửa đổi.");
        if (terms.unitId && terms.unitId !== t.unitId)
          conflict("Không thể đổi căn trong phiên bản sửa đổi.");
        const unit = await tx.unit.findUniqueOrThrow({
          where: { id: t.unitId },
          include: { property: true },
        });
        if (
          unit.operationalStatus !== "READY" ||
          unit.archivedAt ||
          unit.property.ownerId !== user.profileId
        )
          conflict("Căn thuê không sẵn sàng.");
        const now = new Date();
        const previous = t.contracts[0];
        const c = await tx.tenancyContract.create({
          data: {
            tenancyId: t.id,
            versionNumber: previous.versionNumber + 1,
            type: "ORIGINAL",
            supersedesContractId: previous.id,
            startDate: new Date(terms.startDate),
            endDate: new Date(terms.endDate),
            monthlyRent: terms.monthlyRent,
            depositAmount: terms.depositAmount,
            policiesSnapshot: {
              property: unit.property.policies,
              unit: unit.policyOverrides,
            },
            documentPath: document.path,
            documentSha256: document.sha256,
            createdById: user.profileId,
            ownerConfirmedAt: now,
          },
        });
        await tx.tenancy.update({
          where: { id: t.id },
          data: {
            status: "PENDING_CONFIRMATION",
            pendingContractId: c.id,
            confirmationExpiresAt: deadline(now),
            blockedStartDate: c.startDate,
            blockedEndDate: c.endDate,
          },
        });
        await notify(
          tx,
          t,
          "TENANT",
          `contract.revised:${c.id}`,
          "Bạn có phiên bản hợp đồng mới",
        );
        return { tenancyId: t.id };
      }),
    );
  });
}

export async function recordMoveIn(tenancyId: string) {
  return runAction(async () => {
    const user = await requireUser();
    if (!z.guid().safeParse(tenancyId).success) missing();
    return withTransaction(async (tx) => {
      const t = await lockTenancy(tx, tenancyId);
      if (t.ownerId !== user.profileId) missing();
      const now = new Date();
      if (
        t.status !== "CONFIRMED" ||
        !t.confirmedStartDate ||
        now < t.confirmedStartDate
      )
        conflict(
          "Chỉ ghi nhận dọn vào khi kỳ thuê đã xác nhận và đến ngày bắt đầu.",
        );
      await tx.tenancy.update({
        where: { id: t.id },
        data: { status: "ACTIVE", movedInAt: now },
      });
      return { tenancyId: t.id };
    });
  });
}
