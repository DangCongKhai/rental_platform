"use server";
import { z } from "zod";
import type { Prisma } from "../../../generated/prisma/client";
import { requireUser } from "../auth";
import { ActionError, runAction } from "../action";
import { createNotification } from "../notifications";
import { uploadContract } from "../contracts/storage";
import { prisma } from "../db";
import { withTransaction } from "../transaction";
import { releaseExpiredHolds } from "./expiry";

const fail = (message: string): never => {
  throw new ActionError("CONFLICT", message);
};
const missing = (): never => {
  throw new ActionError("NOT_FOUND", "Không tìm thấy dữ liệu.");
};
async function lockTenancyForRenewal(tx: Prisma.TransactionClient, id: string) {
  const hint = await tx.tenancy.findUnique({ where: { id }, select: { unitId: true, rentalRequestId: true } });
  if (!hint) missing();
  await tx.$queryRaw`SELECT id FROM units WHERE id = ${hint!.unitId}::uuid FOR UPDATE`;
  await releaseExpiredHolds(tx, [hint!.unitId], new Date());
  await tx.$queryRaw`SELECT id FROM rental_requests WHERE id = ${hint!.rentalRequestId}::uuid FOR UPDATE`;
  await tx.$queryRaw`SELECT id FROM tenancies WHERE id = ${id}::uuid FOR UPDATE`;
  return tx.tenancy.findUniqueOrThrow({ where: { id }, include: { unit: { include: { property: true } }, pendingContract: true, contracts: { orderBy: { versionNumber: "desc" } }, latestConfirmedContract: true } });
}
async function notifyRenewal(
  tx: Prisma.TransactionClient,
  args: {
    recipientId: string;
    audience: "OWNER" | "TENANT";
    key: string;
    title: string;
    body: string;
    id: string;
    tenancyId: string;
  },
) {
  await createNotification(tx, {
    recipientId: args.recipientId,
    audience: args.audience,
    eventKey: `${args.key}:${args.id}`,
    title: args.title,
    body: args.body,
    link: { resourceType: "tenancy", resourceId: args.tenancyId },
  });
}

const renewalInput = z.object({ requestedEndDate: z.iso.date(), proposedMonthlyRent: z.coerce.number().int().positive().max(99999999999999), message: z.string().trim().max(2000).optional() }).strict();

export async function requestRenewal(tenancyId: string, input: unknown) {
  return runAction(async () => {
    const user = await requireUser();
    if (!z.guid().safeParse(tenancyId).success) missing();
    const parsed = renewalInput.safeParse(input);
    if (!parsed.success) fail("Nhập ngày kết thúc mới và giá thuê hợp lệ.");
    await withTransaction(async (tx) => {
      const t = await lockTenancyForRenewal(tx, tenancyId);
      if (t.tenantId !== user.profileId) missing();
      if (!["CONFIRMED", "ACTIVE"].includes(t.status) || !t.confirmedEndDate || !t.latestConfirmedContractId) fail("Chỉ có thể yêu cầu gia hạn kỳ thuê đã xác nhận hoặc đang thuê.");
      if (t.pendingContractId) fail("Đang có phiên bản hợp đồng chờ xử lý.");
      const data = parsed.data!;
      const end = new Date(`${data.requestedEndDate}T00:00:00.000Z`);
      const firstRenewalDay = new Date(t.confirmedEndDate!.getTime() + 24 * 60 * 60 * 1000);
      if (end <= firstRenewalDay) fail("Ngày kết thúc mới phải sau ngày bắt đầu gia hạn.");
      const outstanding = await tx.tenancyRenewalRequest.findFirst({ where: { tenancyId, status: "PENDING" } });
      if (outstanding) fail("Đã có yêu cầu gia hạn đang chờ xử lý.");
      const futureConfirmed = await tx.tenancyContract.findFirst({ where: { tenancyId, type: "RENEWAL", tenantConfirmedAt: { not: null }, startDate: { gt: new Date() } }, select: { id: true } });
      if (futureConfirmed) fail("Kỳ thuê đã có gia hạn sắp tới.");
      const renewal = await tx.tenancyRenewalRequest.create({ data: { tenancyId, requestedEndDate: end, proposedMonthlyRent: data.proposedMonthlyRent, message: data.message || null } });
      await notifyRenewal(tx, { recipientId: t.ownerId, audience: "OWNER", key: "renewal.requested", title: "Người thuê đề nghị gia hạn", body: `Đề nghị đến ${data.requestedEndDate}.`, id: renewal.id, tenancyId: t.id });
    });
  });
}

async function decideRenewal(renewalId: string, reason: string, mode: "withdraw" | "reject") {
  return runAction(async () => {
    const user = await requireUser();
    if (!z.guid().safeParse(renewalId).success) missing();
    const parsed = z.string().trim().max(1000).refine((v) => mode === "withdraw" || v.length > 0).safeParse(reason);
    if (!parsed.success) fail("Vui lòng nhập lý do từ chối.");
    await withTransaction(async (tx) => {
      const hint = await tx.tenancyRenewalRequest.findUnique({ where: { id: renewalId }, select: { tenancyId: true } });
      if (!hint) missing();
      const t = await lockTenancyForRenewal(tx, hint!.tenancyId);
      await tx.$queryRaw`SELECT id FROM tenancy_renewal_requests WHERE id = ${renewalId}::uuid FOR UPDATE`;
      const renewal = await tx.tenancyRenewalRequest.findUnique({ where: { id: renewalId } });
      if (!renewal || renewal.status !== "PENDING") fail("Yêu cầu gia hạn đã được xử lý.");
      const withdrawing = mode === "withdraw";
      if (withdrawing ? t.tenantId !== user.profileId : t.ownerId !== user.profileId) missing();
      const pending = t.pendingContract?.type === "RENEWAL" && t.pendingContract.renewalRequestId === renewalId;
      if (pending) {
        await tx.tenancy.update({ where: { id: t.id }, data: { pendingContractId: null, confirmationExpiresAt: null, blockedStartDate: t.confirmedStartDate, blockedEndDate: t.confirmedEndDate } });
      }
      const now = new Date();
      const reasonText = parsed.data!;
      await tx.tenancyRenewalRequest.update({ where: { id: renewalId }, data: { status: withdrawing ? "CANCELLED" : "REJECTED", reviewedById: user.profileId, reviewedAt: now, reviewReason: reasonText || null } });
      const recipientId = withdrawing ? t.ownerId : t.tenantId;
      const audience = withdrawing ? "OWNER" as const : "TENANT" as const;
      await notifyRenewal(tx, { recipientId, audience, key: `renewal.${withdrawing ? "withdrawn" : "rejected"}`, title: withdrawing ? "Yêu cầu gia hạn đã được rút" : "Yêu cầu gia hạn đã bị từ chối", body: reasonText || "Người thuê đã rút yêu cầu gia hạn.", id: renewalId, tenancyId: t.id });
    });
  });
}
export async function withdrawRenewal(renewalId: string, reason = "") { return decideRenewal(renewalId, reason, "withdraw"); }
export async function rejectRenewal(renewalId: string, reason: string) { return decideRenewal(renewalId, reason, "reject"); }

const offerSchema = z.object({ renewalRequestId: z.guid(), monthlyRent: z.coerce.number().int().positive().max(99999999999999) }).strict();
export async function proposeRenewal(tenancyId: string, input: unknown, file: File) {
  return runAction(async () => {
    const user = await requireUser();
    if (!z.guid().safeParse(tenancyId).success) missing();
    const parsed = offerSchema.safeParse(input);
    if (!parsed.success) fail("Kiểm tra yêu cầu gia hạn và giá thuê.");
    const auth = await prisma.tenancy.findFirst({ where: { id: tenancyId, ownerId: user.profileId }, select: { id: true } });
    if (!auth) missing();
    const document = await uploadContract(file, user.profileId);
    await withTransaction(async (tx) => {
      const t = await lockTenancyForRenewal(tx, tenancyId);
      if (t.ownerId !== user.profileId) missing();
      const data = parsed.data!;
      await tx.$queryRaw`SELECT id FROM tenancy_renewal_requests WHERE id = ${data.renewalRequestId}::uuid FOR UPDATE`;
      const request = await tx.tenancyRenewalRequest.findFirst({ where: { id: data.renewalRequestId, tenancyId, status: "PENDING" } });
      if (!request) fail("Yêu cầu gia hạn không còn chờ xử lý.");
      if (!["CONFIRMED", "ACTIVE"].includes(t.status) || !t.confirmedEndDate || !t.latestConfirmedContract) fail("Kỳ thuê hiện không đủ điều kiện gia hạn.");
      if (t.pendingContract && (t.pendingContract.type !== "RENEWAL" || t.pendingContract.renewalRequestId !== data.renewalRequestId)) fail("Đang có phiên bản hợp đồng khác chờ xác nhận.");
      const prior = t.contracts[0];
      const startDate = new Date(t.confirmedEndDate!.getTime() + 24 * 60 * 60 * 1000);
      if (request!.requestedEndDate <= startDate) fail("Ngày kết thúc gia hạn phải sau ngày bắt đầu.");
      const now = new Date();
      const supersedesContractId =
        t.pendingContract?.type === "RENEWAL"
          ? t.pendingContract.id
          : prior.type === "RENEWAL" && prior.renewalRequestId === request!.id
            ? prior.id
            : null;
      const contract = await tx.tenancyContract.create({ data: { tenancyId, versionNumber: prior.versionNumber + 1, type: "RENEWAL", renewalRequestId: request!.id, supersedesContractId, basisContractId: t.latestConfirmedContractId, startDate, endDate: request!.requestedEndDate, monthlyRent: data.monthlyRent, depositAmount: t.latestConfirmedContract!.depositAmount, policiesSnapshot: t.latestConfirmedContract!.policiesSnapshot as Prisma.InputJsonValue, documentPath: document.path, documentSha256: document.sha256, createdById: user.profileId, ownerConfirmedAt: now } });
      const configuredHours = Number(process.env.CONFIRMATION_HOLD_HOURS ?? 48);
      const holdHours = Number.isFinite(configuredHours) && configuredHours > 0 ? configuredHours : 48;
      await tx.tenancy.update({ where: { id: tenancyId }, data: { pendingContractId: contract.id, confirmationExpiresAt: new Date(now.getTime() + holdHours * 3600000), blockedStartDate: t.confirmedStartDate, blockedEndDate: request!.requestedEndDate } });
      await notifyRenewal(tx, { recipientId: t.tenantId, audience: "TENANT", key: "renewal.proposed", title: "Chủ nhà đã gửi đề xuất gia hạn", body: `Phiên bản hợp đồng ${contract.versionNumber} đang chờ bạn xác nhận.`, id: contract.id, tenancyId });
    });
  });
}
