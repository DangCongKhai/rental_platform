import { afterEach, describe, expect, it, vi } from "vitest";
import { prisma } from "../db";
import {
  insertAccountProfile,
  deleteAccountProfile,
} from "../account-test-fixtures";
import {
  publishedListing,
  cleanupPublicListings,
} from "../listings/public-listing-fixture";
const { actor } = vi.hoisted(() => ({ actor: { profileId: "" } }));
vi.mock("../auth", () => ({ requireUser: vi.fn(async () => actor) }));
import {
  getMyRentalRequests,
  getMyRentalRequest,
  getMyTenancies,
} from "./my-requests";
const users: string[] = [];
afterEach(async () => {
  if (!process.env.DATABASE_URL) return;
  await prisma.tenancy.deleteMany({
    where: { tenant: { userId: { in: users } } },
  });
  await cleanupPublicListings();
  for (const id of users.splice(0)) await deleteAccountProfile(id);
});
describe.skipIf(!process.env.DATABASE_URL)("private tenant reads", () => {
  it("hides another tenant's request and paginates open/closed results", async () => {
    const a = await insertAccountProfile();
    const b = await insertAccountProfile();
    users.push(a.userId, b.userId);
    const listing = await publishedListing();
    const data = {
      listingId: listing.listingId,
      contactName: "Snapshot",
      contactPhone: "0901234567",
      message: "Hello",
      desiredMoveInDate: new Date("2026-11-01"),
      desiredEndDate: new Date("2027-02-01"),
    };
    const foreign = await prisma.rentalRequest.create({
      data: { ...data, tenantId: b.id },
    });
    await prisma.rentalRequest.createMany({
      data: Array.from({ length: 23 }, (_, i) => ({
        ...data,
        tenantId: a.id,
        status: i === 0 ? "PENDING" : "REJECTED",
        outcomeReason: i === 0 ? null : "Unavailable",
      })),
    });
    await prisma.$transaction(async (tx) => {
      for (const status of ["EXPIRED", "AWAITING_REVISION"]) {
        const request = await tx.rentalRequest.create({
          data: { ...data, tenantId: a.id, status: "ACCEPTED" },
        });
        await tx.tenancy.create({
          data: {
            tenantId: a.id,
            ownerId: listing.owner.profileId,
            unitId: listing.unitIds[0],
            rentalRequestId: request.id,
            status,
          },
        });
      }
    });
    actor.profileId = a.id;
    expect(await getMyRentalRequest(foreign.id)).toBeNull();
    expect(await getMyRentalRequest("bad")).toBeNull();
    expect((await getMyRentalRequests()).requests).toHaveLength(2);
    const first = await getMyRentalRequests({ tab: "closed" });
    const second = await getMyRentalRequests({ tab: "closed", page: 2 });
    expect(first.total).toBe(23);
    expect(first.requests).toHaveLength(20);
    expect(second.requests).toHaveLength(3);
    expect(
      new Set([...first.requests, ...second.requests].map((r) => r.id)).size,
    ).toBe(23);
    expect(await getMyTenancies()).toHaveLength(2);
    actor.profileId = b.id;
    expect(await getMyTenancies()).toEqual([]);
    actor.profileId = b.id;
    expect(await getMyRentalRequest(foreign.id)).toMatchObject({
      contactName: "Snapshot",
      contactPhone: "0901234567",
    });
  });
});
