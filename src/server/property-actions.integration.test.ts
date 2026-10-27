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

vi.mock("next/cache", () => ({
    revalidatePath: vi.fn(),
}));

vi.mock("next/navigation", () => ({
    unstable_rethrow: vi.fn(),
}));

import { archiveProperty, createProperty, updateProperty } from "../app/owner/properties/actions";
import { prisma } from "./db";

const databaseUrl = process.env.DATABASE_URL;
const propertyIds: string[] = [];
const authUserIds: string[] = [];

async function createTestUser() {
    const userId = crypto.randomUUID();
    const email = `rent009-${userId}@rentos.test`;
    authUserIds.push(userId);

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
            jsonb_build_object('full_name', 'RENT-009 test'),
            now(), now(), ${userId}, ${userId + "-r"}, ${userId + "-n"}, '',
            ${userId + "-c"}, '', ${userId + "-p"}, ${userId + "-a"}, false, false
        )`;

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

async function createWholeApartment() {
    const result = await createProperty({
        name: "RENT-009 integration apartment",
        propertyType: "APARTMENT",
        rentalArrangement: "WHOLE_SPACE",
    });

    if (!result.ok || !result.data) {
        throw new Error(result.ok ? "Create returned no property" : result.error);
    }

    propertyIds.push(result.data.id);
    return result.data.id;
}

async function cleanUp() {
    for (const propertyId of propertyIds.splice(0)) {
        await prisma.$executeRaw`
            DELETE FROM tenancies
            WHERE unit_id IN (
                SELECT id FROM units WHERE property_id = ${propertyId}::uuid)`;
        await prisma.$executeRaw`
            DELETE FROM rental_requests
            WHERE listing_id IN (
                SELECT id FROM listings WHERE property_id = ${propertyId}::uuid)`;
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

    testAuth.currentUser = null;
}

describe.skipIf(!databaseUrl)("RENT-009 property actions integration", () => {
    afterEach(async () => {
        await cleanUp();
    });

    it("creates a whole-space property and exactly one unit", async () => {
        testAuth.currentUser = await createTestUser();

        const propertyId = await createWholeApartment();
        const property = await prisma.property.findUniqueOrThrow({
            where: { id: propertyId },
            include: { units: true },
        });

        expect(property.rentalArrangement).toBe("WHOLE_SPACE");
        expect(property.units).toHaveLength(1);
        expect(property.units[0].unitKind).toBe("APARTMENT");
    });

    it("does not let another owner edit the property", async () => {
        const owner = await createTestUser();
        testAuth.currentUser = owner;
        const propertyId = await createWholeApartment();

        testAuth.currentUser = await createTestUser();
        const result = await updateProperty(propertyId, {
            expectedRevision: 1,
            name: "Changed by another owner",
        });

        expect(result).toMatchObject({
            ok: false,
            error: "Không tìm thấy dữ liệu.",
        });

        const stored = await prisma.property.findUniqueOrThrow({
            where: { id: propertyId },
        });
        expect(stored.name).toBe("RENT-009 integration apartment");
    });

    it("rejects a stale revision without overwriting the newer edit", async () => {
        testAuth.currentUser = await createTestUser();
        const propertyId = await createWholeApartment();

        const firstEdit = await updateProperty(propertyId, {
            expectedRevision: 1,
            name: "First edit",
        });
        expect(firstEdit).toMatchObject({
            ok: true,
            data: { contentRevision: 2 },
        });

        const staleEdit = await updateProperty(propertyId, {
            expectedRevision: 1,
            name: "Stale edit",
        });
        expect(staleEdit).toMatchObject({ ok: false });
        if (!staleEdit.ok) {
            expect(staleEdit.error).toContain("tải lại");
        }

        const stored = await prisma.property.findUniqueOrThrow({
            where: { id: propertyId },
        });
        expect(stored.name).toBe("First edit");
        expect(stored.contentRevision).toBe(2);
    });

    it("archives public inventory while preserving units, requests, and tenancies", async () => {
        const owner = await createTestUser();
        testAuth.currentUser = owner;
        const tenant = await createTestUser();
        const propertyId = await createWholeApartment();

        const unit = await prisma.unit.findFirstOrThrow({
            where: { propertyId },
        });
        await prisma.unit.update({
            where: { id: unit.id },
            data: { isMarketed: true },
        });

        const listing = await prisma.listing.create({
            data: {
                propertyId,
                title: "RENT-009 test listing",
                description: "Integration test listing",
            },
        });

        const { request, tenancy } = await prisma.$transaction(async (tx) => {
            const request = await tx.rentalRequest.create({
                data: {
                    listingId: listing.id,
                    tenantId: tenant.profileId,
                    desiredMoveInDate: new Date("2030-01-01"),
                    desiredEndDate: new Date("2030-06-30"),
                    message: "Integration test request",
                    contactName: tenant.fullName,
                    contactPhone: "0900000000",
                },
            });

            await tx.rentalRequest.update({
                where: { id: request.id },
                data: { status: "ACCEPTED" },
            });

            const tenancy = await tx.tenancy.create({
                data: {
                    unitId: unit.id,
                    tenantId: tenant.profileId,
                    ownerId: owner.profileId,
                    rentalRequestId: request.id,
                    status: "ENDED",
                    actualEndedAt: new Date("2030-07-01"),
                    endReason: "Integration test tenancy ended",
                },
            });

            return { request, tenancy };
        });

        const result = await archiveProperty(propertyId);
        expect(result.ok).toBe(true);

        const archived = await prisma.property.findUniqueOrThrow({
            where: { id: propertyId },
            include: { units: true, listings: true },
        });

        expect(archived.archivedAt).not.toBeNull();
        expect(archived.units).toHaveLength(1);
        expect(archived.units[0].isMarketed).toBe(false);
        expect(archived.listings).toHaveLength(1);
        expect(archived.listings[0].archivedAt).not.toBeNull();

        await expect(prisma.rentalRequest.findUniqueOrThrow({ where: { id: request.id } })).resolves.toBeTruthy();
        await expect(prisma.tenancy.findUniqueOrThrow({ where: { id: tenancy.id } })).resolves.toBeTruthy();

        expect(
            await prisma.property.count({
                where: { id: propertyId, archivedAt: null },
            }),
        ).toBe(0);
    });
});
