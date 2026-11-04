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
    if (!testAuth.actor)
      throw new ActionError(
        "FORBIDDEN",
        "Bạn không có quyền thực hiện thao tác này.",
      );
    return testAuth.actor;
  },
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({ unstable_rethrow: vi.fn() }));

import {
  dismissReport,
  resolveReport,
  startReview,
} from "@/app/admin/reports/actions";
import {
  cleanupPublicListings,
  publishedListing,
} from "@/server/listings/public-listing-fixture";
import { prisma } from "@/server/db";

const databaseUrl = process.env.DATABASE_URL;
const reportIds: string[] = [];

async function reportFixture(
  publicationStatus: "PUBLISHED" | "HIDDEN" = "PUBLISHED",
) {
  const fixture = await publishedListing({ publicationStatus });
  const admin = await prisma.userProfile.update({
    where: { id: fixture.owner.profileId },
    data: { isAdmin: true },
  });
  testAuth.actor = {
    ...fixture.owner,
    email: "admin@rentos.test",
    isAdmin: true,
  };
  const now = new Date();
  const report = await prisma.listingReport.create({
    data: {
      id: crypto.randomUUID(),
      listingId: fixture.listingId,
      reporterId: fixture.owner.profileId,
      reasonCode: "FRAUD",
      reasonCodes: ["FRAUD"],
      description: "Báo cáo thử nghiệm RENT-016.",
      status: "OPEN",
      resolutionSummary: null,
      internalNotes: null,
      reviewedById: null,
      reviewedAt: null,
      createdAt: now,
      updatedAt: now,
    },
  });
  reportIds.push(report.id);
  return { fixture, admin, report };
}

describe.skipIf(!databaseUrl)(
  "RENT-016 admin report investigation",
  { timeout: 30_000 },
  () => {
    afterEach(async () => {
      if (reportIds.length) {
        await prisma.notification.deleteMany({
          where: {
            resourceType: "listing_report",
            resourceId: { in: reportIds },
          },
        });
        await prisma.listingReport.deleteMany({
          where: { id: { in: reportIds } },
        });
      }
      reportIds.length = 0;
      await cleanupPublicListings();
      testAuth.actor = null;
      testAuth.error = null;
    });

    it("marks a report reviewing, then resolves and suspends the listing in one transaction", async () => {
      const { fixture, admin, report } = await reportFixture();
      expect((await startReview(report.id)).ok).toBe(true);
      expect(
        (
          await prisma.listingReport.findUniqueOrThrow({
            where: { id: report.id },
          })
        ).status,
      ).toBe("REVIEWING");

      const result = await resolveReport(report.id, {
        summary: "Đã xác minh thông tin gian lận.",
        suspend: true,
      });
      expect(result.ok).toBe(true);
      expect(
        await prisma.listingReport.findUniqueOrThrow({
          where: { id: report.id },
        }),
      ).toMatchObject({
        status: "RESOLVED",
        resolutionSummary: "Đã xác minh thông tin gian lận.",
        reviewedById: admin.id,
      });
      expect(
        await prisma.listing.findUniqueOrThrow({
          where: { id: fixture.listingId },
        }),
      ).toMatchObject({
        publicationStatus: "PUBLISHED",
        adminSuspendedById: admin.id,
        suspensionReason: "Đã xác minh thông tin gian lận.",
      });
      expect(
        await prisma.notification.count({
          where: { resourceType: "listing_report", resourceId: report.id },
        }),
      ).toBe(2);
    });

    it("requires reasons and does not allow a closed report to be decided again", async () => {
      const { report } = await reportFixture();
      expect(
        await resolveReport(report.id, { summary: " ", suspend: false }),
      ).toMatchObject({ ok: false });
      expect(
        await dismissReport(report.id, "Thông tin không đủ căn cứ."),
      ).toMatchObject({ ok: true });
      expect(
        await resolveReport(report.id, {
          summary: "Thử xử lý lần nữa.",
          suspend: true,
        }),
      ).toMatchObject({ ok: false, error: "Báo cáo này đã được xử lý." });
      expect(
        (
          await prisma.listingReport.findUniqueOrThrow({
            where: { id: report.id },
          })
        ).status,
      ).toBe("DISMISSED");
    });

    it("notifies the reporter when dismissing and leaves a hidden listing hidden", async () => {
      const { fixture, report } = await reportFixture("HIDDEN");
      expect(
        (
          await dismissReport(
            report.id,
            "Đã kiểm tra, báo cáo không đủ căn cứ.",
          )
        ).ok,
      ).toBe(true);
      expect(
        (
          await prisma.listing.findUniqueOrThrow({
            where: { id: fixture.listingId },
          })
        ).publicationStatus,
      ).toBe("HIDDEN");
      expect(
        await prisma.notification.findFirst({
          where: {
            resourceType: "listing_report",
            resourceId: report.id,
            audience: "TENANT",
          },
        }),
      ).not.toBeNull();
    });

    it("blocks actions when the admin guard rejects the caller", async () => {
      const { report } = await reportFixture();
      testAuth.error = new ActionError(
        "FORBIDDEN",
        "Bạn không có quyền thực hiện thao tác này.",
      );
      expect(await startReview(report.id)).toMatchObject({
        ok: false,
        error: "Bạn không có quyền thực hiện thao tác này.",
      });
      expect(
        (
          await prisma.listingReport.findUniqueOrThrow({
            where: { id: report.id },
          })
        ).status,
      ).toBe("OPEN");
    });
  },
);
