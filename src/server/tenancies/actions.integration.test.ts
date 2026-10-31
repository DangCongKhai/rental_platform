import { afterEach, describe, expect, it, vi } from "vitest";
import { randomUUID } from "node:crypto";
import { prisma } from "../db";
import {
  insertAccountProfile,
  deleteAccountProfile,
} from "../account-test-fixtures";
import {
  publishedListing,
  cleanupPublicListings,
} from "../listings/public-listing-fixture";
const { actor, storage, failures } = vi.hoisted(() => ({
  failures: { notification: false },
  actor: { profileId: "" },
  storage: { sign: vi.fn(async () => "https://private.test/signed") },
}));
vi.mock("../auth", () => ({
  requireUser: vi.fn(async () => ({ ...actor })),
  requireParty: vi.fn(async (id: string) => {
    const { prisma: db } = await import("../db");
    const t = await db.tenancy.findUnique({ where: { id } });
    if (!t || ![t.ownerId, t.tenantId].includes(actor.profileId)) {
      const { ActionError } = await import("../action");
      throw new ActionError("NOT_FOUND", "Không tìm thấy dữ liệu.");
    }
    return { ...actor };
  }),
}));
vi.mock("../contracts/storage", () => ({
  uploadContract: vi.fn(async () => ({
    path: `tests/${randomUUID()}.pdf`,
    sha256: "a".repeat(64),
  })),
  signContractDownload: storage.sign,
}));
vi.mock("../notifications", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../notifications")>();
  return {
    ...actual,
    createNotification: vi.fn(
      async (...args: Parameters<typeof actual.createNotification>) => {
        const row = await actual.createNotification(...args);
        if (failures.notification)
          throw new Error("injected notification failure");
        return row;
      },
    ),
  };
});
import {
  proposeTenancy,
  confirmContract,
  declineContract,
  reviseContract,
  recordMoveIn,
} from "./actions";
import { getContractDownloadUrl, getTenancy } from "./read";
const users: string[] = [];
const tenantIds: string[] = [];
const terms = {
  startDate: "2090-11-01",
  endDate: "2091-02-01",
  monthlyRent: 4000000,
  depositAmount: 2000000,
};
const pdf = () =>
  new File(["%PDF-1.4 test"], "contract.pdf", { type: "application/pdf" });
afterEach(async () => {
  if (!process.env.DATABASE_URL) return;
  // Contract deletion is forbidden in the application; isolated fixture cleanup
  // disables triggers only for rows owned by this test's profiles.
  await prisma.$transaction(async (tx) => {
    await tx.$executeRawUnsafe("SET LOCAL session_replication_role = replica");
    const ts = await tx.tenancy.findMany({
      where: { tenantId: { in: tenantIds } },
      select: { id: true },
    });
    await tx.tenancyContract.deleteMany({
      where: { tenancyId: { in: ts.map((t) => t.id) } },
    });
    await tx.tenancy.deleteMany({ where: { id: { in: ts.map((t) => t.id) } } });
    await tx.rentalRequest.deleteMany({
      where: { tenantId: { in: tenantIds } },
    });
  });
  await cleanupPublicListings();
  for (const id of users.splice(0)) await deleteAccountProfile(id);
  tenantIds.splice(0);
  storage.sign.mockClear();
  failures.notification = false;
});
async function setup() {
  const listing = await publishedListing();
  const a = await insertAccountProfile();
  const b = await insertAccountProfile();
  users.push(a.userId, b.userId);
  tenantIds.push(a.id, b.id);
  async function request(tenantId: string) {
    return prisma.rentalRequest.create({
      data: {
        listingId: listing.listingId,
        tenantId,
        contactName: "Snapshot",
        contactPhone: "0901234567",
        desiredMoveInDate: new Date(terms.startDate),
        desiredEndDate: new Date(terms.endDate),
        message: "test",
      },
    });
  }
  const r = await request(a.id);
  actor.profileId = listing.owner.profileId;
  return {
    listing,
    a,
    b,
    r,
    request,
    input: { ...terms, unitId: listing.unitIds[0] },
  };
}
async function proposal() {
  const f = await setup();
  const result = await proposeTenancy(f.r.id, f.input, pdf());
  expect(result.ok).toBe(true);
  if (!result.ok || !result.data) throw new Error("proposal failed");
  const t = await prisma.tenancy.findUniqueOrThrow({
    where: { id: result.data.tenancyId },
    include: { pendingContract: true },
  });
  return { ...f, t, c: t.pendingContract! };
}
describe.skipIf(!process.env.DATABASE_URL)(
  "contract flow commits and constraints",
  () => {
    it("atomically proposes, stores a private version, accepts request and notifies", async () => {
      const { t, c, r, a } = await proposal();
      expect(t.status).toBe("PENDING_CONFIRMATION");
      expect(c.versionNumber).toBe(1);
      expect(c.ownerConfirmedAt).toBeTruthy();
      expect(c.tenantConfirmedAt).toBeNull();
      expect(
        (await prisma.rentalRequest.findUniqueOrThrow({ where: { id: r.id } }))
          .status,
      ).toBe("ACCEPTED");
      expect(
        await prisma.notification.count({
          where: { recipientId: a.id, resourceId: t.id, audience: "TENANT" },
        }),
      ).toBe(1);
      actor.profileId = a.id;
      expect((await getTenancy(t.id))?.currentTerms).toBeNull();
    });
    it("rolls back every database write when overlapping and serializes concurrent proposals", async () => {
      const f = await setup();
      const second = await f.request(f.b.id);
      const results = await Promise.all([
        proposeTenancy(f.r.id, f.input, pdf()),
        proposeTenancy(second.id, f.input, pdf()),
      ]);
      expect(results.filter((r) => r.ok)).toHaveLength(1);
      expect(results.find((r) => !r.ok)).toMatchObject({
        error: "Căn đã được giữ cho khoảng thời gian này",
      });
      expect(
        await prisma.tenancy.count({ where: { unitId: f.input.unitId } }),
      ).toBe(1);
      expect(
        await prisma.tenancyContract.count({
          where: { tenancy: { unitId: f.input.unitId } },
        }),
      ).toBe(1);
      expect(
        await prisma.rentalRequest.count({
          where: { id: { in: [f.r.id, second.id] }, status: "PENDING" },
        }),
      ).toBe(1);
      expect(
        await prisma.notification.count({
          where: { recipientId: { in: [f.a.id, f.b.id] }, audience: "TENANT" },
        }),
      ).toBe(1);
    });
    it("rolls back the hold, immutable version, accepted request and notification together", async () => {
      const f = await setup();
      failures.notification = true;
      await expect(proposeTenancy(f.r.id, f.input, pdf())).rejects.toThrow(
        "injected notification failure",
      );
      expect(
        await prisma.tenancy.count({ where: { unitId: f.input.unitId } }),
      ).toBe(0);
      expect(
        await prisma.tenancyContract.count({
          where: { createdById: f.listing.owner.profileId },
        }),
      ).toBe(0);
      expect(
        (
          await prisma.rentalRequest.findUniqueOrThrow({
            where: { id: f.r.id },
          })
        ).status,
      ).toBe("PENDING");
      expect(
        await prisma.notification.count({ where: { recipientId: f.a.id } }),
      ).toBe(0);
    });
    it("rejects wrong hash/old version; decline clears hold, revision appends version 2, mutual confirmation locks terms", async () => {
      const { t, c, a, listing, input } = await proposal();
      actor.profileId = a.id;
      expect((await confirmContract(c.id, "wrong")).ok).toBe(false);
      expect((await declineContract(c.id, " ")).ok).toBe(false);
      expect((await declineContract(c.id, "Giá cao")).ok).toBe(true);
      expect(
        await prisma.tenancy.findUnique({ where: { id: t.id } }),
      ).toMatchObject({
        status: "AWAITING_REVISION",
        pendingContractId: null,
        blockedStartDate: null,
      });
      actor.profileId = listing.owner.profileId;
      expect(
        (await reviseContract(t.id, { ...input, monthlyRent: 3500000 }, pdf()))
          .ok,
      ).toBe(true);
      const v2 = await prisma.tenancyContract.findFirstOrThrow({
        where: { tenancyId: t.id, versionNumber: 2 },
      });
      expect(v2.supersedesContractId).toBe(c.id);
      expect(v2.tenantConfirmedAt).toBeNull();
      actor.profileId = a.id;
      expect((await confirmContract(c.id, c.documentSha256)).ok).toBe(false);
      expect((await confirmContract(v2.id, v2.documentSha256)).ok).toBe(true);
      expect((await getTenancy(t.id))?.currentTerms?.monthlyRent).toBe(
        "3500000",
      );
      actor.profileId = listing.owner.profileId;
      expect((await reviseContract(t.id, input, pdf())).ok).toBe(false);
      expect((await recordMoveIn(t.id)).ok).toBe(false);
      // Real trigger protection, not a mock or an always-rolled-back assertion.
      await expect(
        prisma.tenancyContract.update({
          where: { id: v2.id },
          data: { monthlyRent: 1 },
        }),
      ).rejects.toThrow();
    });
    it("authorizes private download before signing and hides unrelated tenancy", async () => {
      const { t, c, a, b } = await proposal();
      actor.profileId = b.id;
      expect((await getContractDownloadUrl(c.id)).ok).toBe(false);
      expect(storage.sign).not.toHaveBeenCalled();
      expect(await getTenancy(t.id)).toBeNull();
      actor.profileId = a.id;
      expect(await getContractDownloadUrl(c.id)).toMatchObject({
        ok: true,
        data: { url: "https://private.test/signed" },
      });
    });
    it("persists expiry on confirm refusal instead of rolling expiry back", async () => {
      const { t, c, a } = await proposal();
      await prisma.tenancy.update({
        where: { id: t.id },
        data: { confirmationExpiresAt: new Date("2000-01-01") },
      });
      actor.profileId = a.id;
      expect((await confirmContract(c.id, c.documentSha256)).ok).toBe(false);
      expect(
        await prisma.tenancy.findUnique({ where: { id: t.id } }),
      ).toMatchObject({
        status: "EXPIRED",
        blockedStartDate: null,
        pendingContractId: null,
      });
    });
    it("records move-in only for the owner after mutually confirmed start", async () => {
      const { t, c, a, listing } = await proposal();
      // Keep real timers for the database driver; only Date.now/new Date use a fixed future clock.
      vi.useFakeTimers({ toFake: ["Date"] });
      vi.setSystemTime(new Date("2090-10-31T12:00:00Z"));
      try {
        await prisma.tenancy.update({
          where: { id: t.id },
          data: { confirmationExpiresAt: new Date("2090-11-02") },
        });
        actor.profileId = a.id;
        expect((await confirmContract(c.id, c.documentSha256)).ok).toBe(true);
        expect((await recordMoveIn(t.id)).ok).toBe(false);
        actor.profileId = listing.owner.profileId;
        expect((await recordMoveIn(t.id)).ok).toBe(false);
        vi.setSystemTime(new Date("2090-11-01T00:00:00Z"));
        expect((await recordMoveIn(t.id)).ok).toBe(true);
        expect(
          (await prisma.tenancy.findUniqueOrThrow({ where: { id: t.id } }))
            .status,
        ).toBe("ACTIVE");
      } finally {
        vi.useRealTimers();
      }
    });
  },
);
