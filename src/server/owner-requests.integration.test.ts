import "dotenv/config";
import { afterEach, describe, expect, it, vi } from "vitest";

const testAuth = vi.hoisted(() => ({
  currentUser: null as null | {
    profileId: string;
    userId: string;
    email: string;
    fullName: string;
    isAdmin: boolean;
  },
}));

vi.mock("@/server/auth", () => ({
  requireUser: async () => {
    if (!testAuth.currentUser) throw new Error("No test user set");
    return testAuth.currentUser;
  },
}));
vi.mock("next/server", () => ({ connection: async () => {} }));

import { getOwnerRequest, getOwnerRequests } from "@/server/owner-requests";
import { prisma } from "./db";
import { cleanupPublicListings, publishedListing } from "./listings/public-listing-fixture";

const databaseUrl = process.env.DATABASE_URL;

describe.skipIf(!databaseUrl)("RENT-013 owner request inbox", { timeout: 30_000 }, () => {
  afterEach(async () => {
    testAuth.currentUser = null;
    await cleanupPublicListings();
  });

  it("only returns requests for the signed-in owner's properties and detail lookup hides another owner's request", async () => {
    const ownListing = await publishedListing();
    const otherListing = await publishedListing();
    testAuth.currentUser = {
      ...ownListing.owner,
      email: "rent013-owner@rentos.test",
      isAdmin: false,
    };

    const requestData = {
      tenantId: ownListing.owner.profileId,
      desiredMoveInDate: new Date("2027-01-01T00:00:00.000Z"),
      desiredEndDate: new Date("2027-07-01T00:00:00.000Z"),
      message: "Tôi muốn trao đổi thêm về căn hộ.",
      contactName: "Người thuê thử nghiệm",
      contactPhone: "0900000000",
      preferredUnitId: ownListing.unitIds[0],
    };
    const ownRequest = await prisma.rentalRequest.create({
      data: {
        ...requestData,
        listingId: ownListing.listingId,
        preferredUnitId: ownListing.unitIds[0],
      },
    });
    const otherRequest = await prisma.rentalRequest.create({
      data: {
        ...requestData,
        listingId: otherListing.listingId,
        preferredUnitId: otherListing.unitIds[0],
      },
    });

    const inbox = await getOwnerRequests();
    expect(inbox.requests.map(({ id }) => id)).toContain(ownRequest.id);
    expect(inbox.requests.map(({ id }) => id)).not.toContain(otherRequest.id);
    await expect(getOwnerRequest(ownRequest.id)).resolves.toMatchObject({
      id: ownRequest.id,
      contactName: "Người thuê thử nghiệm",
      contactPhone: "0900000000",
      status: "PENDING",
    });
    await expect(getOwnerRequest(otherRequest.id)).resolves.toBeNull();

    await expect(prisma.rentalRequest.findUniqueOrThrow({ where: { id: ownRequest.id } }))
      .resolves.toMatchObject({ status: "PENDING" });
  });
});
