"use server";

import { z } from "zod";
import { requireUser } from "../auth";
import { ActionError, runAction } from "../action";
import { prisma } from "../db";
import { withTransaction } from "../transaction";
import { createNotification } from "../notifications";

const reasonSchema = z.string().trim().min(1).max(500);

export async function rejectRequest(requestId: string, reason: string) {
  return runAction(async () => {
    const user = await requireUser();
    if (!z.guid().safeParse(requestId).success)
      throw new ActionError("NOT_FOUND", "Không tìm thấy dữ liệu.");
    const parsed = reasonSchema.safeParse(reason);
    if (!parsed.success)
      throw new ActionError("CONFLICT", "Nhập lý do huỷ.", {
        reason: "Nhập lý do huỷ.",
      });
    return withTransaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM rental_requests WHERE id = ${requestId}::uuid FOR UPDATE`;
      const request = await tx.rentalRequest.findFirst({
        where: {
          id: requestId,
          listing: { property: { ownerId: user.profileId } },
        },
        select: { id: true, status: true, tenantId: true },
      });
      if (!request)
        throw new ActionError("NOT_FOUND", "Không tìm thấy dữ liệu.");
      if (request.status !== "PENDING")
        throw new ActionError("CONFLICT", "Yêu cầu không còn chờ xử lý.");
      await tx.rentalRequest.update({
        where: { id: request.id },
        data: {
          status: "REJECTED",
          outcomeReason: parsed.data,
          closedAt: new Date(),
        },
      });
      await createNotification(tx, {
        recipientId: request.tenantId,
        audience: "TENANT",
        eventKey: `rental_request.rejected:${request.id}`,
        title: "Yêu cầu thuê đã bị từ chối",
        body: parsed.data,
        link: { resourceType: "rental_request", resourceId: request.id },
      });
    });
  });
}
