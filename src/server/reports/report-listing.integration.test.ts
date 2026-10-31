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
import * as notifications from "../notifications";
import { listingReportSeedSql } from "../../../prisma/seed-data/listing-reports";
import { requireUser } from "../auth";
import { getMyReports, reportListing } from "./report-listing";
const users: string[] = [];
const reporterIds: string[] = [];
const reportIds: string[] = [];
async function account() {
  const profile = await insertAccountProfile();
  users.push(profile.userId);
  reporterIds.push(profile.id);
  actor.profileId = profile.id;
  return profile;
}
const input = {
  reasonCodes: ["MISLEADING", "FRAUD"],
  description: "Ảnh và giá không đúng.",
};
afterEach(async () => {
  if (!process.env.DATABASE_URL) return;
  const rows = await prisma.listingReport.findMany({
    where: { reporterId: { in: reporterIds } },
    select: { id: true },
  });
  await prisma.notification.deleteMany({
    where: {
      resourceType: "listing_report",
      resourceId: { in: [...reportIds, ...rows.map((row) => row.id)] },
    },
  });
  await prisma.listingReport.deleteMany({
    where: { reporterId: { in: reporterIds.splice(0) } },
  });
  reportIds.splice(0);
  await cleanupPublicListings();
  for (const id of users.splice(0)) await deleteAccountProfile(id);
  vi.restoreAllMocks();
});
describe.skipIf(!process.env.DATABASE_URL)("report listing", () => {
  it("stores multiple reasons, keeps first legacy code, notifies admins atomically and prevents concurrent duplicates", async () => {
    const reporter = await account();
    const admin = await account();
    await prisma.userProfile.update({
      where: { id: admin.id },
      data: { isAdmin: true },
    });
    actor.profileId = reporter.id;
    const row = await publishedListing();
    const results = await Promise.all([
      reportListing(row.listingId, input),
      reportListing(row.listingId, input),
    ]);
    expect(results.filter((r) => r.ok)).toHaveLength(1);
    expect(results.find((r) => !r.ok)).toMatchObject({
      ok: false,
      error: "Bạn đã báo cáo tin này.",
    });
    const reports = await prisma.listingReport.findMany({
      where: { reporterId: reporter.id },
    });
    expect(reports).toHaveLength(1);
    expect(reports[0]).toMatchObject({
      reasonCodes: input.reasonCodes,
      reasonCode: "MISLEADING",
      status: "OPEN",
    });
    expect(
      await prisma.notification.findMany({ where: { recipientId: admin.id } }),
    ).toMatchObject([
      {
        audience: "ADMIN",
        resourceType: "listing_report",
        resourceId: reports[0].id,
      },
    ]);
    expect(
      await prisma.listing.findUnique({
        where: { id: row.listingId },
        select: { publicationStatus: true },
      }),
    ).toEqual({ publicationStatus: "PUBLISHED" });
  });
  it("rolls back the report when admin notification creation fails", async () => {
    const reporter = await account();
    const admin = await account();
    await prisma.userProfile.update({
      where: { id: admin.id },
      data: { isAdmin: true },
    });
    actor.profileId = reporter.id;
    const row = await publishedListing();
    vi.spyOn(notifications, "createNotification").mockRejectedValueOnce(
      new Error("Injected notification failure"),
    );
    await expect(reportListing(row.listingId, input)).rejects.toThrow(
      "Injected notification failure",
    );
    expect(
      await prisma.listingReport.count({ where: { reporterId: reporter.id } }),
    ).toBe(0);
    expect(
      await prisma.notification.count({ where: { recipientId: admin.id } }),
    ).toBe(0);
  });
  it("executes the actual raw seed report insert with matching explicit reason arrays", async () => {
    const first = await account();
    const second = await account();
    const third = await account();
    const row = await publishedListing();
    const hidden = await publishedListing({ publicationStatus: "HIDDEN" });
    const ids = Array.from({ length: 4 }, () => crypto.randomUUID());
    await prisma.$executeRawUnsafe(
      listingReportSeedSql,
      ...ids,
      row.listingId,
      first.id,
      second.id,
      third.id,
      third.id,
      hidden.listingId,
    );
    const rows = await prisma.listingReport.findMany({
      where: { id: { in: ids } },
      select: { id: true, reasonCode: true, reasonCodes: true, status: true },
    });
    expect(rows).toHaveLength(4);
    expect(rows.find((report) => report.id === ids[0])).toMatchObject({
      reasonCode: "MISLEADING",
      reasonCodes: ["MISLEADING"],
      status: "OPEN",
    });
    for (const id of ids.slice(1))
      expect(rows.find((report) => report.id === id)).toMatchObject({
        reasonCode: "OTHER",
        reasonCodes: ["OTHER"],
      });
  });
  it("caps the sixth report, including concurrent requests", async () => {
    await account();
    const row = await publishedListing();
    for (let n = 0; n < 4; n++)
      await prisma.listingReport.create({
        data: {
          listingId: row.listingId,
          reporterId: actor.profileId,
          reasonCode: "OTHER",
          reasonCodes: ["OTHER"],
          description: "Earlier",
          status: "DISMISSED",
          resolutionSummary: "Đã xem xét",
          reviewedById: actor.profileId,
          reviewedAt: new Date(),
        },
      });
    const second = await publishedListing();
    const results = await Promise.all([
      reportListing(row.listingId, input),
      reportListing(second.listingId, input),
    ]);
    expect(results.filter((r) => r.ok)).toHaveLength(1);
    expect(results.find((r) => !r.ok)).toMatchObject({
      error: expect.stringContaining("5 báo cáo"),
    });
  });
  it("rejects hidden listings and empty fields; guests cannot create reports", async () => {
    await account();
    const row = await publishedListing();
    expect(
      await reportListing(row.listingId, { reasonCodes: [], description: " " }),
    ).toMatchObject({
      ok: false,
      fieldErrors: {
        reasonCodes: expect.any(String),
        description: expect.any(String),
      },
    });
    await prisma.listing.update({
      where: { id: row.listingId },
      data: { publicationStatus: "HIDDEN" },
    });
    expect(await reportListing(row.listingId, input)).toMatchObject({
      ok: false,
      error: "Tin đăng không khả dụng.",
    });
    vi.mocked(requireUser).mockRejectedValueOnce(new Error("NEXT_REDIRECT"));
    await expect(reportListing(row.listingId, input)).rejects.toThrow(
      "NEXT_REDIRECT",
    );
    expect(
      await prisma.listingReport.count({
        where: { reporterId: actor.profileId },
      }),
    ).toBe(0);
  });
  it("reads only this reporter's public outcome fields and never selects internalNotes", async () => {
    const first = await account();
    const row = await publishedListing();
    const result = await reportListing(row.listingId, input);
    expect(result.ok).toBe(true);
    const stored = await prisma.listingReport.findFirstOrThrow({
      where: { reporterId: first.id },
    });
    await prisma.listingReport.update({
      where: { id: stored.id },
      data: {
        internalNotes: "SECRET",
        resolutionSummary: "Đã xử lý",
        status: "RESOLVED",
        reviewedById: first.id,
        reviewedAt: new Date(),
      },
    });
    const spy = vi.spyOn(prisma.listingReport, "findMany");
    const own = await getMyReports();
    expect(own).toMatchObject([
      {
        reasonCodes: input.reasonCodes,
        resolutionSummary: "Đã xử lý",
        status: "RESOLVED",
      },
    ]);
    expect(own[0]).not.toHaveProperty("internalNotes");
    expect(spy.mock.calls[0][0]).toMatchObject({
      where: { reporterId: first.id },
      select: { status: true, reasonCodes: true, resolutionSummary: true },
    });
    expect(spy.mock.calls[0][0]?.select).not.toHaveProperty("internalNotes");
    await account();
    expect(await getMyReports()).toEqual([]);
  });
});
