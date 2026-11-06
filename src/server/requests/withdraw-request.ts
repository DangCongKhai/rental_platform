"use server";
import { z } from "zod";
import { requireUser } from "../auth";
import { ActionError, runAction } from "../action";
import { createNotification } from "../notifications";
import { prisma } from "../db";

export async function withdrawRentalRequest(requestId: string, reason = "") {
  return runAction(async () => {
    const user = await requireUser();
    if (!z.guid().safeParse(requestId).success)
      throw new ActionError("NOT_FOUND", "Không tìm thấy dữ liệu.");
    const parsed = z.string().trim().max(500).safeParse(reason);
    if (!parsed.success)
      throw new ActionError("CONFLICT", "Lý do tối đa 500 ký tự.");
    await prisma.$transaction(async (tx) => {
      const request = await tx.rentalRequest.findFirst({
        where: { id: requestId, tenantId: user.profileId },
        include: {
          listing: {
            select: {
              propertyId: true,
              property: { select: { ownerId: true } },
            },
          },
        },
      });
      if (!request)
        throw new ActionError("NOT_FOUND", "Không tìm thấy dữ liệu.");
      await tx.$queryRaw`SELECT id FROM properties WHERE id = ${request.listing.propertyId}::uuid FOR UPDATE`;
      const units = await tx.unit.findMany({
        where: { propertyId: request.listing.propertyId, archivedAt: null },
        select: { id: true },
        orderBy: { id: "asc" },
      });
      for (const unit of units)
        await tx.$queryRaw`SELECT id FROM units WHERE id = ${unit.id}::uuid FOR UPDATE`;
      await tx.$queryRaw`SELECT id FROM rental_requests WHERE id = ${requestId}::uuid FOR UPDATE`;
      const current = await tx.rentalRequest.findUnique({
        where: { id: requestId },
      });
      if (!current || current.tenantId !== user.profileId)
        throw new ActionError("NOT_FOUND", "Không tìm thấy dữ liệu.");
      if (current.status !== "PENDING")
        throw new ActionError(
          "CONFLICT",
          current.status === "ACCEPTED"
            ? "Yêu cầu đã được chấp nhận, hãy tải lại trang."
            : "Yêu cầu không còn chờ xử lý.",
        );
      const now = new Date();
      await tx.rentalRequest.update({
        where: { id: requestId },
        data: {
          status: "WITHDRAWN",
          outcomeReason: parsed.data || null,
          closedAt: now,
        },
      });
      await createNotification(tx, {
        recipientId: request.listing.property.ownerId,
        audience: "OWNER",
        eventKey: `rental_request.withdrawn:${requestId}`,
        title: "Người thuê đã rút yêu cầu",
        body: parsed.data || "Người thuê đã rút yêu cầu thuê.",
        link: { resourceType: "rental_request", resourceId: requestId },
      });
    });
  });
}
