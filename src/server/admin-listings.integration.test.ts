import "dotenv/config";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ActionError } from "@/server/action";

const testAuth = vi.hoisted(() => ({
  actor: null as null | {
    profileId: string;
    userId: string;
    email: string;
    fullName: string;
    isAdmin: boolean;
  },
  error: null as Error | null,
}));
vi.mock("@/server/auth", () => ({
  requireAdmin: async () => {
    if (testAuth.error) throw testAuth.error;
    if (!testAuth.actor) throw new Error("No admin actor set");
    return testAuth.actor;
  },
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({ unstable_rethrow: vi.fn() }));

import { restoreListing, suspendListing } from "@/app/admin/listings/actions";
import {
  cleanupPublicListings,
  publishedListing,
} from "@/server/listings/public-listing-fixture";
import { prisma } from "@/server/db";

const databaseUrl = process.env.DATABASE_URL;

describe.skipIf(!databaseUrl)(
  "RENT-015 admin listing suspension",
  { timeout: 30_000 },
  () => {
    afterEach(async () => {
      await cleanupPublicListings();
      testAuth.actor = null;
      testAuth.error = null;
    });

    it("suspends a listing, notifies the owner, then restores it without changing publication choice", async () => {
      const fixture = await publishedListing({
        publicationStatus: "PUBLISHED",
      });
      await prisma.userProfile.update({
        where: { id: fixture.owner.profileId },
        data: { isAdmin: true },
      });
      testAuth.actor = {
        ...fixture.owner,
        email: "admin@rentos.test",
        isAdmin: true,
      };

      const suspended = await suspendListing(
        fixture.listingId,
        "Nội dung có dấu hiệu sai lệch.",
      );
      expect(suspended.ok).toBe(true);
      expect(
        await prisma.listing.findUniqueOrThrow({
          where: { id: fixture.listingId },
        }),
      ).toMatchObject({
        publicationStatus: "PUBLISHED",
        adminSuspendedById: fixture.owner.profileId,
        suspensionReason: "Nội dung có dấu hiệu sai lệch.",
      });
      expect(
        await prisma.notification.findFirst({
          where: {
            recipientId: fixture.owner.profileId,
            resourceId: fixture.listingId,
            audience: "OWNER",
          },
        }),
      ).not.toBeNull();

      const restored = await restoreListing(
        fixture.listingId,
        "Đã xác minh thông tin.",
      );
      expect(restored.ok).toBe(true);
      expect(
        await prisma.listing.findUniqueOrThrow({
          where: { id: fixture.listingId },
        }),
      ).toMatchObject({
        publicationStatus: "PUBLISHED",
        adminSuspendedAt: null,
        adminSuspendedById: null,
        suspensionReason: null,
      });
    });

    it("requires a reason and rejects a caller without admin access", async () => {
      const fixture = await publishedListing();
      testAuth.actor = {
        ...fixture.owner,
        email: "admin@rentos.test",
        isAdmin: true,
      };
      expect(await suspendListing(fixture.listingId, "  ")).toMatchObject({
        ok: false,
      });
      expect(
        (
          await prisma.listing.findUniqueOrThrow({
            where: { id: fixture.listingId },
          })
        ).adminSuspendedAt,
      ).toBeNull();
      testAuth.actor = null;
      testAuth.error = new ActionError(
        "FORBIDDEN",
        "Bạn không có quyền thực hiện thao tác này.",
      );
      expect(await suspendListing(fixture.listingId, "Reason")).toMatchObject({
        ok: false,
        error: "Bạn không có quyền thực hiện thao tác này.",
      });
    });

    it("restoring a hidden listing keeps it hidden", async () => {
      const fixture = await publishedListing({
        publicationStatus: "HIDDEN",
        adminSuspended: true,
      });
      await prisma.userProfile.update({
        where: { id: fixture.owner.profileId },
        data: { isAdmin: true },
      });
      testAuth.actor = {
        ...fixture.owner,
        email: "admin@rentos.test",
        isAdmin: true,
      };
      expect((await restoreListing(fixture.listingId, "Đã kiểm tra.")).ok).toBe(
        true,
      );
      expect(
        (
          await prisma.listing.findUniqueOrThrow({
            where: { id: fixture.listingId },
          })
        ).publicationStatus,
      ).toBe("HIDDEN");
    });
  },
);
