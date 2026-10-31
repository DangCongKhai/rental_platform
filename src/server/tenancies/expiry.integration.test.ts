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
import { withTransaction } from "../transaction";
const { actor } = vi.hoisted(() => ({ actor: { profileId: "" } }));
vi.mock("../auth", () => ({ requireUser: vi.fn(async () => ({ ...actor })) }));
vi.mock("../contracts/storage", () => ({
  uploadContract: vi.fn(async () => ({
    path: `expiry/${randomUUID()}.pdf`,
    sha256: "e".repeat(64),
  })),
}));
import { proposeTenancy, confirmContract } from "./actions";
import { getTenancy } from "./read";
import { releaseExpiredHolds, isHoldExpired } from "./expiry";
import { POST } from "@/app/api/cron/expire-holds/route";
const users: string[] = [];
const tenantIds: string[] = [];
const start = new Date("2030-01-01T12:00:00Z");
const deadline = new Date("2030-01-03T12:00:00Z");
const terms = {
  startDate: "2030-02-01",
  endDate: "2030-05-01",
  monthlyRent: 4000000,
  depositAmount: 2000000,
};
afterEach(async () => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
  if (!process.env.DATABASE_URL) return;
  await prisma.$transaction(async (tx) => {
    await tx.$executeRawUnsafe("SET LOCAL session_replication_role = replica");
    const ts = await tx.tenancy.findMany({
      where: { tenantId: { in: tenantIds } },
      select: { id: true },
    });
    const ids = ts.map((t) => t.id);
    await tx.tenancyContract.deleteMany({ where: { tenancyId: { in: ids } } });
    await tx.tenancyRenewalRequest.deleteMany({
      where: { tenancyId: { in: ids } },
    });
    await tx.tenancy.deleteMany({ where: { id: { in: ids } } });
    await tx.rentalRequest.deleteMany({
      where: { tenantId: { in: tenantIds } },
    });
  });
  await cleanupPublicListings();
  for (const id of users.splice(0)) await deleteAccountProfile(id);
  tenantIds.splice(0);
});
async function fixture() {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(start);
  vi.stubEnv("CONFIRMATION_HOLD_HOURS", "48");
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
        message: "expiry",
      },
    });
  }
  const r = await request(a.id);
  actor.profileId = listing.owner.profileId;
  const input = { ...terms, unitId: listing.unitIds[0] };
  const result = await proposeTenancy(
    r.id,
    input,
    new File(["%PDF-test"], "test.pdf", { type: "application/pdf" }),
  );
  if (!result.ok || !result.data) throw new Error("fixture proposal failed");
  const t = await prisma.tenancy.findUniqueOrThrow({
    where: { id: result.data.tenancyId },
    include: { pendingContract: true },
  });
  return { listing, a, b, r, t, c: t.pendingContract!, input, request };
}
describe.skipIf(!process.env.DATABASE_URL)(
  "lazy hold expiry with fixed server time",
  () => {
    it("refuses confirmation exactly at deadline and commits release, retaining ACCEPTED request", async () => {
      const f = await fixture();
      expect(f.t.confirmationExpiresAt).toEqual(deadline);
      expect(isHoldExpired(f.t, new Date(deadline.getTime() - 1))).toBe(false);
      expect(isHoldExpired(f.t, deadline)).toBe(true);
      expect(isHoldExpired({ confirmationExpiresAt: null }, deadline)).toBe(
        false,
      );
      actor.profileId = f.a.id;
      vi.setSystemTime(deadline);
      expect((await confirmContract(f.c.id, f.c.documentSha256)).ok).toBe(
        false,
      );
      expect(
        await prisma.tenancy.findUnique({ where: { id: f.t.id } }),
      ).toMatchObject({
        status: "EXPIRED",
        pendingContractId: null,
        confirmationExpiresAt: null,
        blockedStartDate: null,
        blockedEndDate: null,
      });
      expect(
        (
          await prisma.rentalRequest.findUniqueOrThrow({
            where: { id: f.r.id },
          })
        ).status,
      ).toBe("ACCEPTED");
      expect(
        (
          await prisma.tenancyContract.findUniqueOrThrow({
            where: { id: f.c.id },
          })
        ).tenantConfirmedAt,
      ).toBeNull();
      expect((await getTenancy(f.t.id))?.status).toBe("EXPIRED");
    });
    it("new proposal reuses expired dates without waiting for cron or the previous party to visit", async () => {
      const f = await fixture();
      const next = await f.request(f.b.id);
      vi.setSystemTime(deadline);
      expect(
        (
          await proposeTenancy(
            next.id,
            f.input,
            new File(["%PDF-test"], "test.pdf", { type: "application/pdf" }),
          )
        ).ok,
      ).toBe(true);
      expect(
        (await prisma.tenancy.findUniqueOrThrow({ where: { id: f.t.id } }))
          .status,
      ).toBe("EXPIRED");
      expect(
        await prisma.tenancy.count({
          where: { unitId: f.input.unitId, status: "PENDING_CONFIRMATION" },
        }),
      ).toBe(1);
    });
    it.each(["CONFIRMED", "ACTIVE"])(
      "expiry of a renewal on %s preserves the confirmed span and rent",
      async (status) => {
        const f = await fixture();
        actor.profileId = f.a.id;
        expect((await confirmContract(f.c.id, f.c.documentSha256)).ok).toBe(
          true,
        );
        const renewalEnd = new Date("2030-08-01");
        await prisma.$transaction(async (tx) => {
          const renewal = await tx.tenancyRenewalRequest.create({
            data: {
              tenancyId: f.t.id,
              requestedEndDate: renewalEnd,
              proposedMonthlyRent: 5000000,
              status: "ACCEPTED",
              reviewedById: f.listing.owner.profileId,
              reviewedAt: start,
            },
          });
          const contract = await tx.tenancyContract.create({
            data: {
              tenancyId: f.t.id,
              versionNumber: 2,
              type: "RENEWAL",
              renewalRequestId: renewal.id,
              basisContractId: f.c.id,
              startDate: new Date("2030-05-02"),
              endDate: renewalEnd,
              monthlyRent: 5000000,
              depositAmount: 3000000,
              policiesSnapshot: {},
              documentPath: `renewal/${randomUUID()}.pdf`,
              documentSha256: "d".repeat(64),
              createdById: f.listing.owner.profileId,
              ownerConfirmedAt: start,
            },
          });
          await tx.tenancy.update({
            where: { id: f.t.id },
            data: {
              status,
              movedInAt: status === "ACTIVE" ? start : null,
              blockedEndDate: renewalEnd,
              pendingContractId: contract.id,
              confirmationExpiresAt: deadline,
            },
          });
        });
        vi.setSystemTime(new Date(deadline.getTime() - 1));
        await withTransaction((tx) =>
          releaseExpiredHolds(tx, [f.input.unitId], new Date()),
        );
        expect(
          (await prisma.tenancy.findUniqueOrThrow({ where: { id: f.t.id } }))
            .pendingContractId,
        ).not.toBeNull();
        vi.setSystemTime(deadline);
        await withTransaction((tx) =>
          releaseExpiredHolds(tx, [f.input.unitId], deadline),
        );
        const restored = await prisma.tenancy.findUniqueOrThrow({
          where: { id: f.t.id },
        });
        expect(restored).toMatchObject({
          status,
          pendingContractId: null,
          confirmationExpiresAt: null,
          latestConfirmedContractId: f.c.id,
          blockedStartDate: new Date(terms.startDate),
          blockedEndDate: new Date(terms.endDate),
          confirmedStartDate: new Date(terms.startDate),
          confirmedEndDate: new Date(terms.endDate),
        });
        expect((await getTenancy(f.t.id))?.currentTerms?.monthlyRent).toBe(
          "4000000",
        );
        await withTransaction((tx) =>
          releaseExpiredHolds(tx, [f.input.unitId], deadline),
        ); // repeat-safe
        expect(
          (await prisma.tenancy.findUniqueOrThrow({ where: { id: f.t.id } }))
            .latestConfirmedContractId,
        ).toBe(f.c.id);
      },
    );
    it("cron refuses absent/wrong credentials and releases due holds with the server secret", async () => {
      const f = await fixture();
      vi.setSystemTime(deadline);
      vi.stubEnv("CRON_SECRET", "local-test-secret");
      expect(
        (
          await POST(
            new Request("http://localhost/api/cron/expire-holds", {
              method: "POST",
            }),
          )
        ).status,
      ).toBe(401);
      expect(
        (
          await POST(
            new Request("http://localhost/api/cron/expire-holds", {
              method: "POST",
              headers: { authorization: "Bearer wrong" },
            }),
          )
        ).status,
      ).toBe(401);
      expect(
        (await prisma.tenancy.findUniqueOrThrow({ where: { id: f.t.id } }))
          .status,
      ).toBe("PENDING_CONFIRMATION");
      const response = await POST(
        new Request("http://localhost/api/cron/expire-holds", {
          method: "POST",
          headers: { authorization: "Bearer local-test-secret" },
        }),
      );
      expect(response.status).toBe(200);
      expect(await response.json()).toMatchObject({
        processedUnits: expect.any(Number),
      });
      expect(
        (await prisma.tenancy.findUniqueOrThrow({ where: { id: f.t.id } }))
          .status,
      ).toBe("EXPIRED");
    });
  },
);
