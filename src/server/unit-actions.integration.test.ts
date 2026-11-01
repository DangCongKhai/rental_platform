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
  requireOwner: async (propertyId: string) => {
    if (!testAuth.currentUser) throw new Error("No test user set");

    const { prisma } = await import("@/server/db");
    const property = await prisma.property.findFirst({
      where: {
        id: propertyId,
        ownerId: testAuth.currentUser.profileId,
        archivedAt: null,
      },
      select: { id: true },
    });

    if (!property) {
      const { ActionError } = await import("@/server/action");
      throw new ActionError("NOT_FOUND", "Không tìm thấy dữ liệu.");
    }

    return testAuth.currentUser;
  },
}));

vi.mock("next/cache", () => ({
    revalidatePath: vi.fn(),
}));

vi.mock("next/navigation", () => ({
    unstable_rethrow: vi.fn(),
}));

import { createProperty as createPropertyAction } from "../app/owner/properties/actions";
import { createUnits, updateUnit } from "../app/owner/properties/unit-actions";
import { prisma } from "./db";

const databaseUrl = process.env.DATABASE_URL;
const propertyIds: string[] = [];
const authUserIds: string[] = [];

async function createTestUser() {
    const userId = crypto.randomUUID();
    const email = `rent010-${userId}@rentos.test`;

    await prisma.$executeRaw`
    INSERT INTO auth.users (
      id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
      confirmation_token, recovery_token, email_change_token_new, email_change,
      email_change_token_current, phone_change, phone_change_token,
      reauthentication_token, is_sso_user, is_anonymous
    ) VALUES (
      ${userId}::uuid, 'authenticated', 'authenticated', ${email}, '', now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      jsonb_build_object('full_name', 'RENT-010 test'),
      now(), now(), ${userId}, ${userId + "-r"}, ${userId + "-n"}, '',
      ${userId + "-c"}, '', ${userId + "-p"}, ${userId + "-a"}, false, false
    )`;
  authUserIds.push(userId);

    const profile = await prisma.userProfile.findUniqueOrThrow({
        where: { userId },
    });

    return {
        profileId: profile.id,
        userId,
        email,
        fullName: profile.fullName,
        isAdmin: false,
    };
}

async function createProperty(rentalArrangement: "WHOLE_SPACE" | "SEPARATE_UNITS") {
    const result = await createPropertyAction({
        name: `RENT-010 ${crypto.randomUUID()}`,
        propertyType: "APARTMENT",
        rentalArrangement,
    });

    if (!result.ok || !result.data) {
        throw new Error(result.ok ? "Property creation returned no ID" : result.error);
    }

    propertyIds.push(result.data.id);
    return result.data.id;
}

function unitRow(label: string, overrides: Record<string, unknown> = {}) {
    return {
        label,
        unitKind: "STUDIO",
        areaM2: 24,
        bedrooms: 0,
        bathrooms: 1,
        bathroomArrangement: "PRIVATE",
        advertisedMonthlyRent: 3_800_000,
        deposit: 3_800_000,
        minimumRentalMonths: 3,
        maxOccupants: 2,
        ...overrides,
    };
}

async function cleanUp() {
  try {
    for (const propertyId of propertyIds.splice(0)) {
      await prisma.$executeRaw`
        DELETE FROM tenancies
        WHERE unit_id IN (SELECT id FROM units WHERE property_id = ${propertyId}::uuid)`;
      await prisma.$executeRaw`
        DELETE FROM rental_requests
        WHERE listing_id IN (SELECT id FROM listings WHERE property_id = ${propertyId}::uuid)`;
      await prisma.$executeRaw`
        DELETE FROM listings WHERE property_id = ${propertyId}::uuid`;
      await prisma.$executeRaw`
        DELETE FROM units WHERE property_id = ${propertyId}::uuid`;
      await prisma.$executeRaw`
        DELETE FROM properties WHERE id = ${propertyId}::uuid`;
    }

    for (const userId of authUserIds.splice(0)) {
      await prisma.$executeRaw`
        DELETE FROM auth.users WHERE id = ${userId}::uuid`;
    }
  } finally {
    testAuth.currentUser = null;
    }
}

describe.skipIf(!databaseUrl)("RENT-010 unit actions integration", () => {
    afterEach(async () => {
        await cleanUp();
    });

    it("creates five units and rejects invalid or duplicate batches without partial saves", async () => {
        testAuth.currentUser = await createTestUser();
        const propertyId = await createProperty("SEPARATE_UNITS");

        const invalid = await createUnits(propertyId, [unitRow("S201"), unitRow("S202", { minimumRentalMonths: 2 })]);
        expect(invalid.ok).toBe(false);
        expect(await prisma.unit.count({ where: { propertyId } })).toBe(0);

        const duplicate = await createUnits(propertyId, [unitRow("S201"), unitRow(" s201 ")]);
        expect(duplicate.ok).toBe(false);
        expect(await prisma.unit.count({ where: { propertyId } })).toBe(0);

        const rows = ["S201", "S202", "S203", "S204", "S205"].map((label) => unitRow(label));
        const created = await createUnits(propertyId, rows);
        expect(created.ok).toBe(true);

        const conflict = await createUnits(propertyId, [unitRow("S205"), unitRow("S206")]);
        expect(conflict.ok).toBe(false);

        const stored = await prisma.unit.findMany({
            where: { propertyId },
            orderBy: { normalizedLabel: "asc" },
            select: { label: true },
        });
        expect(stored.map((unit) => unit.label)).toEqual(["S201", "S202", "S203", "S204", "S205"]);
    });

    it("does not allow a second unit on a whole-space property", async () => {
        testAuth.currentUser = await createTestUser();
        const propertyId = await createProperty("WHOLE_SPACE");

        const result = await createUnits(propertyId, [unitRow("Extra")]);

        expect(result.ok).toBe(false);
        expect(await prisma.unit.count({ where: { propertyId } })).toBe(1);
    });

    it("updates unit details without changing tenancy or contract records", async () => {
        const owner = await createTestUser();
        testAuth.currentUser = owner;
        const tenant = await createTestUser();
        const propertyId = await createProperty("SEPARATE_UNITS");

        const created = await createUnits(
            propertyId,
            ["S201", "S202", "S203", "S204", "S205"].map((label) => unitRow(label)),
        );
        expect(created.ok).toBe(true);

        const unit = await prisma.unit.findFirstOrThrow({ where: { propertyId, label: "S205" } });
        const listing = await prisma.listing.create({
            data: {
                propertyId,
                title: "RENT-010 integration listing",
                description: "Integration test listing",
            },
        });

        const tenancy = await prisma.$transaction(async (tx) => {
            const request = await tx.rentalRequest.create({
                data: {
                    listingId: listing.id,
                    tenantId: tenant.profileId,
                    desiredMoveInDate: new Date("2031-01-01"),
                    desiredEndDate: new Date("2031-06-30"),
                    message: "Integration test request",
                    contactName: tenant.fullName,
                    contactPhone: "0900000000",
                },
            });

            await tx.rentalRequest.update({
                where: { id: request.id },
                data: { status: "ACCEPTED" },
            });

            return tx.tenancy.create({
                data: {
                    unitId: unit.id,
                    tenantId: tenant.profileId,
                    ownerId: owner.profileId,
                    rentalRequestId: request.id,
                    status: "ENDED",
                    actualEndedAt: new Date("2031-07-01"),
                    endReason: "RENT-010 integration test",
                },
            });
        });

        const tenancyBefore = await prisma.tenancy.findUniqueOrThrow({
            where: { id: tenancy.id },
            select: { status: true, actualEndedAt: true, endReason: true },
        });
        const contractsBefore = await prisma.tenancyContract.findMany({
            where: { tenancyId: tenancy.id },
            select: { versionNumber: true, monthlyRent: true, depositAmount: true, policiesSnapshot: true },
        });
        const revisionBefore = await prisma.property.findUniqueOrThrow({
            where: { id: propertyId },
            select: { contentRevision: true },
        });

        const result = await updateUnit(unit.id, {
            advertisedMonthlyRent: 4_200_000,
            deposit: 4_200_000,
            minimumRentalMonths: 6,
            maxOccupants: 3,
            operationalStatus: "MAINTENANCE",
            isMarketed: false,
            amenities: {
                schema_version: 1,
                standard: { air_conditioning: { enabled: true } },
                custom: [],
            },
            policyOverrides: {
                schema_version: 1,
                overrides: { pets: "ASK_OWNER" },
                additional_rules: ["Giữ yên tĩnh sau 22:00"],
            },
        });

        expect(result.ok).toBe(true);
        await expect(
            prisma.property.findUniqueOrThrow({
                where: { id: propertyId },
                select: { contentRevision: true },
            }),
        ).resolves.toEqual({ contentRevision: revisionBefore.contentRevision + 1 });
        const updatedUnit = await prisma.unit.findUniqueOrThrow({ where: { id: unit.id } });
        expect({
            advertisedMonthlyRent: Number(updatedUnit.advertisedMonthlyRent),
            deposit: Number(updatedUnit.deposit),
            minimumRentalMonths: updatedUnit.minimumRentalMonths,
            maxOccupants: updatedUnit.maxOccupants,
            operationalStatus: updatedUnit.operationalStatus,
            isMarketed: updatedUnit.isMarketed,
        }).toEqual({
            advertisedMonthlyRent: 4_200_000,
            deposit: 4_200_000,
            minimumRentalMonths: 6,
            maxOccupants: 3,
            operationalStatus: "MAINTENANCE",
            isMarketed: false,
        });

        await expect(
            prisma.tenancy.findUniqueOrThrow({
                where: { id: tenancy.id },
                select: { status: true, actualEndedAt: true, endReason: true },
            }),
        ).resolves.toEqual(tenancyBefore);
        await expect(
            prisma.tenancyContract.findMany({
                where: { tenancyId: tenancy.id },
                select: { versionNumber: true, monthlyRent: true, depositAmount: true, policiesSnapshot: true },
            }),
        ).resolves.toEqual(contractsBefore);

        const invalidOverride = await updateUnit(unit.id, {
            policyOverrides: {
                schema_version: 1,
                overrides: {},
                additional_rules: [],
                shared_rules: ["This cannot replace property rules"],
            },
        });
        expect(invalidOverride.ok).toBe(false);
        const unitAfterInvalidOverride = await prisma.unit.findUniqueOrThrow({
            where: { id: unit.id },
            select: { policyOverrides: true },
        });
        expect(unitAfterInvalidOverride.policyOverrides).toEqual(updatedUnit.policyOverrides);
    });

    it("does not let another owner edit a unit", async () => {
        const owner = await createTestUser();
        testAuth.currentUser = owner;
        const propertyId = await createProperty("SEPARATE_UNITS");
        const created = await createUnits(propertyId, [unitRow("S201")]);
        expect(created.ok).toBe(true);

        const unit = await prisma.unit.findFirstOrThrow({ where: { propertyId } });
        testAuth.currentUser = await createTestUser();

        const result = await updateUnit(unit.id, { advertisedMonthlyRent: 5_000_000 });

        expect(result).toMatchObject({ ok: false });
        const unchangedUnit = await prisma.unit.findUniqueOrThrow({ where: { id: unit.id } });
        expect(Number(unchangedUnit.advertisedMonthlyRent)).toBe(3_800_000);
    });
});
