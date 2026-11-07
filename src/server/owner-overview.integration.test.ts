import "dotenv/config";
import { afterEach, describe, expect, it, vi } from "vitest";

const testAuth = vi.hoisted(() => ({
  actor: null as null | {
    profileId: string;
    userId: string;
    email: string;
    fullName: string;
    isAdmin: boolean;
  },
}));

vi.mock("@/server/auth", () => ({
  requireUser: async () => {
    if (!testAuth.actor) throw new Error("No test user set");
    return testAuth.actor;
  },
}));

vi.mock("next/server", () => ({
  connection: async () => {},
}));

import { getOwnerOverview } from "./owner-overview";
import {
  cleanupPublicListings,
  publishedListing,
} from "./listings/public-listing-fixture";
import {
  insertAccountProfile,
  deleteAccountProfile,
} from "./account-test-fixtures";
import { prisma } from "./db";

const databaseUrl = process.env.DATABASE_URL;
const testUserIds: string[] = [];

describe.skipIf(!databaseUrl)(
  "RENT-022 owner overview",
  { timeout: 30_000 },
  () => {
    afterEach(async () => {
      if (!databaseUrl) return;

      await cleanupPublicListings();

      for (const userId of testUserIds.splice(0)) {
        await deleteAccountProfile(userId);
      }

      testAuth.actor = null;
    });

    it("returns counts and recent items only for the signed-in owner", async () => {
      const ownerListing = await publishedListing({
        adminSuspended: true,
        units: [{ operationalStatus: "MAINTENANCE" }],
      });
      await publishedListing();

      const tenant = await insertAccountProfile();
      testUserIds.push(tenant.userId);

      const request = await prisma.rentalRequest.create({
        data: {
          listingId: ownerListing.listingId,
          tenantId: tenant.id,
          desiredMoveInDate: new Date("2027-01-01T00:00:00.000Z"),
          desiredEndDate: new Date("2027-04-01T00:00:00.000Z"),
          message: "Yêu cầu kiểm thử bảng tổng quan.",
          contactName: "Khách kiểm thử",
          contactPhone: "0900000000",
        },
      });

      testAuth.actor = {
        profileId: ownerListing.owner.profileId,
        userId: ownerListing.owner.userId,
        email: "owner@rentos.test",
        fullName: ownerListing.owner.fullName,
        isAdmin: false,
      };

      const overview = await getOwnerOverview();

      expect(overview.propertyCount).toBe(1);
      expect(overview.requests.pending).toBe(1);
      expect(overview.units.maintenance).toBe(1);
      expect(overview.listings).toContainEqual(
        expect.objectContaining({
          moderationStatus: "APPROVED",
          publicationStatus: "PUBLISHED",
          suspended: true,
          count: 1,
        }),
      );
      expect(overview.recentRequests.map((item) => item.id)).toEqual([
        request.id,
      ]);
      expect(overview.recentProperties.map((item) => item.id)).toEqual([
        ownerListing.propertyId,
      ]);
      expect(overview.recentProperties[0].listing?.suspended).toBe(true);
    });
  },
);
