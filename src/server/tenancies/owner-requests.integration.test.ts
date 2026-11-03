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
vi.mock("../contracts/storage", () => ({
  signContractDownload: vi.fn(async () => "https://private.test/signed"),
  uploadContract: vi.fn(),
}));

import { getOwnerRequests } from "./read";

const users: string[] = [];

afterEach(async () => {
  if (!process.env.DATABASE_URL) return;
  await cleanupPublicListings();
  for (const id of users.splice(0)) await deleteAccountProfile(id);
});

describe.skipIf(!process.env.DATABASE_URL)("owner request inbox", () => {
  it("returns only the signed-in owner's requests", async () => {
    const listing = await publishedListing();
    const tenant = await insertAccountProfile();
    const other = await insertAccountProfile();
    users.push(tenant.userId, other.userId);
    await prisma.rentalRequest.create({
      data: {
        listingId: listing.listingId,
        tenantId: tenant.id,
        preferredUnitId: listing.unitIds[0],
        contactName: "Mai",
        contactPhone: "0901000001",
        desiredMoveInDate: new Date("2090-11-01"),
        desiredEndDate: new Date("2091-02-01"),
        message: "Inbox scope",
      },
    });

    actor.profileId = listing.owner.profileId;
    const own = await getOwnerRequests({ tab: "pending", page: 1 });
    expect(own.requests).toHaveLength(1);
    expect(own.pendingCount).toBe(1);
    expect(own.requests[0]?.listing.title).toBeTruthy();
    expect(own.requests[0]?.preferredUnit?.label).toBeTruthy();
    expect(own.requests[0]?.contactName).toBe("Mai");

    actor.profileId = other.id;
    const foreign = await getOwnerRequests({ tab: "pending", page: 1 });
    expect(foreign.requests).toHaveLength(0);
    expect(foreign.pendingCount).toBe(0);
  });
});
