"use server";
import { z } from "zod";
import { requestInput } from "@/domain/requests/request-input";
import { requireUser } from "../auth";
import { ActionError, runAction } from "../action";
import { prisma } from "../db";
import { withTransaction } from "../transaction";
import { createNotification } from "../notifications";
import type { ActionResult } from "../validation";

export async function createRentalRequest(
  listingId: string,
  input: unknown,
): Promise<ActionResult<{ requestId: string }>> {
  return runAction(async (): Promise<ActionResult<{ requestId: string }>> => {
    const user = await requireUser();
    const parsed = requestInput.safeParse(input);
    if (!parsed.success)
      return {
        ok: false,
        error: "Dữ liệu không hợp lệ.",
        fieldErrors: Object.fromEntries(
          parsed.error.issues.map((issue) => [
            String(issue.path[0] ?? "form"),
            issue.path.length ? issue.message : "Dữ liệu không hợp lệ.",
          ]),
        ),
      };
    if (!z.guid().safeParse(listingId).success)
      throw new ActionError("NOT_FOUND", "Tin đăng không khả dụng.");
    const data = parsed.data;
    const create = (): Promise<ActionResult<{ requestId: string }>> =>
      withTransaction(
        async (tx): Promise<ActionResult<{ requestId: string }>> => {
          const listing = await tx.listing.findFirst({
            where: {
              id: listingId,
              publicationStatus: "PUBLISHED",
              moderationStatus: "APPROVED",
              archivedAt: null,
              adminSuspendedAt: null,
              property: { archivedAt: null },
            },
            select: {
              propertyId: true,
              property: { select: { ownerId: true } },
            },
          });
          if (!listing)
            throw new ActionError("NOT_FOUND", "Tin đăng không khả dụng.");
          if (listing.property.ownerId === user.profileId)
            return {
              ok: false as const,
              error: "Bạn không thể gửi yêu cầu thuê tin đăng của mình.",
              fieldErrors: {
                listingId: "Bạn không thể gửi yêu cầu thuê tin đăng của mình.",
              },
            };
          if (
            data.preferredUnitId &&
            !(await tx.unit.findFirst({
              where: {
                id: data.preferredUnitId,
                propertyId: listing.propertyId,
                archivedAt: null,
              },
              select: { id: true },
            }))
          )
            return {
              ok: false as const,
              error: "Căn ưu tiên không thuộc nhà này.",
              fieldErrors: {
                preferredUnitId: "Căn ưu tiên không thuộc nhà này.",
              },
            };
          const existing = await tx.rentalRequest.findFirst({
            where: { listingId, tenantId: user.profileId, status: "PENDING" },
            select: { id: true },
          });
          if (existing)
            return { ok: true as const, data: { requestId: existing.id } };
          const request = await tx.rentalRequest.create({
            data: {
              ...data,
              listingId,
              tenantId: user.profileId,
              desiredMoveInDate: new Date(data.desiredMoveInDate),
              desiredEndDate: new Date(data.desiredEndDate),
              status: "PENDING",
            },
            select: { id: true },
          });
          await createNotification(tx, {
            recipientId: listing.property.ownerId,
            audience: "OWNER",
            eventKey: `rental_request.created:${request.id}`,
            title: "Yêu cầu thuê mới",
            body: `${data.contactName} đã gửi yêu cầu thuê.`,
            link: { resourceType: "rental_request", resourceId: request.id },
          });
          return { ok: true as const, data: { requestId: request.id } };
        },
      );
    try {
      return await create();
    } catch (error) {
      // A concurrent insert can win the partial unique index. Recover only when
      // that tenant/listing pair now has a pending request; all other errors escape.
      if (
        typeof error === "object" &&
        error &&
        "code" in error &&
        error.code === "P2002"
      ) {
        const existing = await prisma.rentalRequest.findFirst({
          where: { listingId, tenantId: user.profileId, status: "PENDING" },
          select: { id: true },
        });
        if (existing)
          return { ok: true as const, data: { requestId: existing.id } };
      }
      throw error;
    }
  }).then((result) => (result.ok ? result.data! : result));
}
