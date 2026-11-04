import { afterEach, describe, expect, it, vi } from "vitest";
import { prisma } from "../db";
import {
  deleteAccountProfile,
  insertAccountProfile,
} from "../account-test-fixtures";
import {
  cleanupPublicListings,
  publishedListing,
} from "../listings/public-listing-fixture";

const { actor } = vi.hoisted(() => ({ actor: { profileId: "" } }));
vi.mock("../auth", () => ({
  requireUser: vi.fn(async () => ({ ...actor })),
}));

import { rejectRequest } from "./reject-request";
import { withdrawRentalRequest } from "./withdraw-request";
import { evaluateDueRentalRequests } from "./evaluate-due-requests";

const users: string[] = [];

afterEach(async () => {
  if (!process.env.DATABASE_URL) return;
  await cleanupPublicListings();
  for (const id of users.splice(0)) await deleteAccountProfile(id);
});

describe.skipIf(!process.env.DATABASE_URL)("owner rejects a request", () => {
  it("rejects a pending request with a reason and writes nothing for a blank reason", async () => {
    const listing = await publishedListing();
    const tenant = await insertAccountProfile();
    users.push(tenant.userId);
    const request = await prisma.rentalRequest.create({
      data: {
        listingId: listing.listingId,
        tenantId: tenant.id,
        contactName: "Mai",
        contactPhone: "0901000001",
        desiredMoveInDate: new Date("2090-11-01"),
        desiredEndDate: new Date("2091-02-01"),
        message: "Reject me",
      },
    });
    actor.profileId = listing.owner.profileId;

    const blank = await rejectRequest(request.id, "  ");
    expect(blank.ok).toBe(false);
    expect(
      (
        await prisma.rentalRequest.findUniqueOrThrow({
          where: { id: request.id },
        })
      ).status,
    ).toBe("PENDING");

    const result = await rejectRequest(request.id, "Đã cho người khác thuê");
    expect(result.ok).toBe(true);
    const saved = await prisma.rentalRequest.findUniqueOrThrow({
      where: { id: request.id },
    });
    expect(saved.status).toBe("REJECTED");
    expect(saved.outcomeReason).toBe("Đã cho người khác thuê");
    expect(
      await prisma.notification.count({
        where: {
          recipientId: tenant.id,
          resourceId: request.id,
          audience: "TENANT",
        },
      }),
    ).toBe(1);
  });

  it("lets the tenant withdraw only a pending request and notifies the owner", async () => {
    const listing = await publishedListing();
    const tenant = await insertAccountProfile();
    users.push(tenant.userId);
    const request = await prisma.rentalRequest.create({
      data: {
        listingId: listing.listingId, tenantId: tenant.id,
        contactName: "Mai", contactPhone: "0901000001",
        desiredMoveInDate: new Date("2090-11-01"), desiredEndDate: new Date("2091-02-01"), message: "Withdraw me",
      },
    });
    actor.profileId = tenant.id;
    const result = await withdrawRentalRequest(request.id, "Đã đổi kế hoạch");
    expect(result.ok).toBe(true);
    expect((await prisma.rentalRequest.findUniqueOrThrow({ where: { id: request.id } })).status).toBe("WITHDRAWN");
    expect(await prisma.notification.count({ where: { recipientId: listing.owner.profileId, resourceId: request.id, audience: "OWNER" } })).toBe(1);
    expect((await withdrawRentalRequest(request.id)).ok).toBe(false);
  });

  it("lazily closes due requests only when no marketed unit can fit the requested dates", async () => {
    const listing = await publishedListing();
    const tenant = await insertAccountProfile();
    users.push(tenant.userId);
    const request = await prisma.rentalRequest.create({
      data: {
        listingId: listing.listingId, tenantId: tenant.id,
        contactName: "Mai", contactPhone: "0901000001",
        desiredMoveInDate: new Date("2090-11-01"), desiredEndDate: new Date("2091-02-01"), message: "Old request",
        createdAt: new Date(Date.now() - 16 * 24 * 60 * 60 * 1000),
      },
    });
    await evaluateDueRentalRequests({ tenantId: tenant.id });
    expect((await prisma.rentalRequest.findUniqueOrThrow({ where: { id: request.id } })).status).toBe("PENDING");
    await prisma.unit.update({ where: { id: listing.unitIds[0] }, data: { operationalStatus: "MAINTENANCE" } });
    await evaluateDueRentalRequests({ tenantId: tenant.id });
    const saved = await prisma.rentalRequest.findUniqueOrThrow({ where: { id: request.id } });
    expect(saved.status).toBe("REJECTED");
    expect(saved.outcomeReason).toBe("NO_AVAILABLE_UNIT");
    expect(await prisma.notification.count({ where: { recipientId: tenant.id, resourceId: request.id, eventKey: `rental_request.no_availability:${request.id}` } })).toBe(1);
  });
});
