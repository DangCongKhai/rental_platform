import { createNotification } from "../notifications";
import { prisma } from "../db";
import { releaseExpiredHolds } from "../tenancies/expiry";
import {
  REQUEST_AUTO_REJECT_AFTER_MS,
  requestIsDue,
} from "@/domain/requests/auto-reject";

/** Lazily evaluates old pending requests whenever either party opens an inbox. */
export async function evaluateDueRentalRequests(scope: {
  tenantId?: string;
  ownerId?: string;
}) {
  const cutoff = new Date(Date.now() - REQUEST_AUTO_REJECT_AFTER_MS);
  const candidates = await prisma.rentalRequest.findMany({
    where: {
      status: "PENDING",
      createdAt: { lte: cutoff },
      ...(scope.tenantId ? { tenantId: scope.tenantId } : {}),
      ...(scope.ownerId
        ? { listing: { property: { ownerId: scope.ownerId } } }
        : {}),
    },
    select: { id: true, listing: { select: { propertyId: true } } },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    take: 50,
  });

  const byProperty = new Map<string, string[]>();
  for (const candidate of candidates) {
    const propertyId = candidate.listing.propertyId;
    byProperty.set(propertyId, [
      ...(byProperty.get(propertyId) ?? []),
      candidate.id,
    ]);
  }

  for (const [propertyId, requestIds] of byProperty) {
    await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM properties WHERE id = ${propertyId}::uuid FOR UPDATE`;
      const units = await tx.unit.findMany({
        where: {
          propertyId,
        },
        select: { id: true },
        orderBy: { id: "asc" },
      });
      for (const unit of units) {
        await tx.$queryRaw`SELECT id FROM units WHERE id = ${unit.id}::uuid FOR UPDATE`;
      }
      await releaseExpiredHolds(
        tx,
        units.map((unit) => unit.id),
        new Date(),
      );
      for (const id of requestIds) {
        // Lock/re-read after inventory locks so a concurrent proposal or withdrawal wins cleanly.
        await tx.$queryRaw`SELECT id FROM rental_requests WHERE id = ${id}::uuid FOR UPDATE`;
        const current = await tx.rentalRequest.findUnique({ where: { id } });
        if (
          !current ||
          current.status !== "PENDING" ||
          !requestIsDue(current.createdAt, new Date())
        )
          continue;
        const now = new Date();
        const eligible = await tx.unit.findMany({
          where: {
            id: { in: units.map((unit) => unit.id) },
            archivedAt: null,
            operationalStatus: "READY",
            isMarketed: true,
            property: { archivedAt: null },
            tenancies: {
              none: {
                blockedStartDate: { lte: current.desiredEndDate },
                blockedEndDate: { gte: current.desiredMoveInDate },
                status: { notIn: ["CANCELLED", "ENDED", "EXPIRED"] },
              },
            },
          },
          select: { id: true },
          take: 1,
        });
        if (eligible.length) {
          await tx.rentalRequest.update({
            where: { id },
            data: { availabilityCheckedAt: now },
          });
          continue;
        }
        await tx.rentalRequest.update({
          where: { id },
          data: {
            status: "REJECTED",
            outcomeReason: "NO_AVAILABLE_UNIT",
            availabilityCheckedAt: now,
            closedAt: now,
          },
        });
        await createNotification(tx, {
          recipientId: current.tenantId,
          audience: "TENANT",
          eventKey: `rental_request.no_availability:${id}`,
          title: "Yêu cầu thuê đã đóng",
          body: "Không còn căn phù hợp trong khoảng thời gian bạn yêu cầu.",
          link: { resourceType: "rental_request", resourceId: id },
        });
      }
    });
  }
}
