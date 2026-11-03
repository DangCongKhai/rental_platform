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
import { createRentalRequest } from "./create-rental-request";
const users: string[] = [];
const ownerIds: string[] = [];
async function account() {
  const profile = await insertAccountProfile();
  users.push(profile.userId);
  actor.profileId = profile.id;
  return profile;
}
async function listing() {
  const row = await publishedListing();
  ownerIds.push(row.owner.profileId);
  return row;
}
const input = {
  contactName: " Mai ",
  contactPhone: " +84901234567 ",
  desiredMoveInDate: "2026-11-01",
  desiredEndDate: "2027-02-01",
  message: "Xin thuê",
};
afterEach(async () => {
  if (!process.env.DATABASE_URL) return;
  await prisma.notification.deleteMany({
    where: { recipientId: { in: ownerIds.splice(0) } },
  });
  await cleanupPublicListings();
  for (const id of users.splice(0)) await deleteAccountProfile(id);
});
describe.skipIf(!process.env.DATABASE_URL)("create rental request", () => {
  it("creates once concurrently, snapshots contact and notifies the owner once", async () => {
    const tenant = await account();
    const row = await listing();
    const results = await Promise.all([
      createRentalRequest(row.listingId, {
        ...input,
        preferredUnitId: row.unitIds[0],
      }),
      createRentalRequest(row.listingId, {
        ...input,
        preferredUnitId: row.unitIds[0],
      }),
    ]);
    expect(results.every((result) => result.ok)).toBe(true);
    expect(results[0]).toEqual(results[1]);
    await prisma.userProfile.update({
      where: { id: tenant.id },
      data: { phone: "0909999999" },
    });
    const requests = await prisma.rentalRequest.findMany({
      where: { listingId: row.listingId, tenantId: tenant.id },
    });
    expect(requests).toHaveLength(1);
    expect(requests[0]).toMatchObject({
      status: "PENDING",
      contactName: "Mai",
      contactPhone: "+84901234567",
      preferredUnitId: row.unitIds[0],
    });
    expect(
      await prisma.notification.findMany({
        where: { recipientId: row.owner.profileId },
      }),
    ).toMatchObject([
      {
        audience: "OWNER",
        resourceType: "rental_request",
        resourceId: requests[0].id,
      },
    ]);
  });
  it("rejects own listings, foreign units, hidden listings and invalid fields", async () => {
    const tenant = await account();
    const row = await listing();
    const other = await listing();
    expect(
      await createRentalRequest(row.listingId, {
        ...input,
        preferredUnitId: other.unitIds[0],
      }),
    ).toMatchObject({
      ok: false,
      fieldErrors: { preferredUnitId: expect.any(String) },
    });
    actor.profileId = row.owner.profileId;
    expect(await createRentalRequest(row.listingId, input)).toMatchObject({
      ok: false,
      fieldErrors: { listingId: expect.any(String) },
    });
    actor.profileId = tenant.id;
    expect(
      await createRentalRequest(row.listingId, {
        ...input,
        contactPhone: "bad",
        desiredEndDate: "2026-12-01",
      }),
    ).toMatchObject({
      ok: false,
      fieldErrors: {
        contactPhone: expect.any(String),
        desiredEndDate: expect.any(String),
      },
    });
    await prisma.listing.update({
      where: { id: row.listingId },
      data: { publicationStatus: "HIDDEN" },
    });
    expect(await createRentalRequest(row.listingId, input)).toMatchObject({
      ok: false,
    });
    expect(
      await prisma.rentalRequest.count({ where: { tenantId: tenant.id } }),
    ).toBe(0);
  });
});
