"use server";

import { revalidatePath } from "next/cache";
import z from "zod";
import type { Prisma } from "../../../../generated/prisma/client";
import { normalizeUnitLabel } from "@/domain/units";
import { validateAmenities } from "@/domain/amenities";
import { validateUnitPolicyOverrides } from "@/domain/policies";
import { ActionError, runAction } from "@/server/action";
import { requireOwner, requireUser } from "@/server/auth";
import { prisma } from "@/server/db";
import type { ActionResult } from "@/server/validation";

const createUnitRowSchema = z.object({
    label: z.string().trim().min(1).max(80),
    unitKind: z.string().trim().min(1).max(40),
    areaM2: z.number().positive().nullable(),
    bedrooms: z.number().int().min(0),
    bathrooms: z.number().min(0),
    bathroomArrangement: z.string().trim().min(1).max(40),
    advertisedMonthlyRent: z.number().positive(),
    deposit: z.number().min(0),
    minimumRentalMonths: z.number().int().min(3),
    maxOccupants: z.number().int().positive().nullable(),
}).strict();

const createUnitsSchema = z.array(createUnitRowSchema).min(1).max(50);

function invalidRows(errors: Record<string, string>): ActionResult<never> {
    return {
        ok: false,
        error: "Dữ liệu căn/phòng không hợp lệ.",
        fieldErrors: errors
    };
}

export async function getUnits(propertyId: string) {
    const parsedId = z.string().uuid().safeParse(propertyId);
    if (!parsedId.success)
        throw new ActionError("NOT_FOUND", "Không tìm thấy dữ liệu.");

    const user = await requireOwner(propertyId);

    return prisma.unit.findMany({
        where: {
            propertyId,
            property: { ownerId: user.profileId},
            archivedAt: null
        },
        orderBy: [{ createdAt: "asc" }, { id: "asc" }]
    });
}

export async function createUnits(propertyId: string, input: unknown): Promise<ActionResult<{ ids: string[] }>> {
    const auth = await runAction(() => requireOwner(propertyId));
    if (!auth.ok)
        return auth;

    const parsed = createUnitsSchema.safeParse(input);
    if (!parsed.success) {
        const errors: Record<string, string> = {};
        for (const issue of parsed.error.issues) {
            const row = issue.path[0];
            const field = issue.path.slice(1).join(".");
            if (typeof row === 'number') {
                errors[`rows.${row}.${field || "label"}`] ??= issue.message;
            }
        }
        return invalidRows(errors);
    }

    const normalizedLabels = parsed.data.map((row) => normalizeUnitLabel(row.label));
    const seenLabels = new Set<string>();
    const duplicateErrors: Record<string, string> = {};

    normalizedLabels.forEach((label, index) => {
        if (seenLabels.has(label))
            duplicateErrors[`rows.${index}.label`] = "Tên căn/phòng bị trùng";
        seenLabels.add(label);
    });

    if (Object.keys(duplicateErrors).length > 0)
        return invalidRows(duplicateErrors);

    return runAction(async () => {
        const ids = await prisma.$transaction(async (tx) => {
            const properties = await tx.$queryRaw<Array<{rentalArrangement: string; archiveAt: Date | null}>>`
                SELECT rental_arrangement AS "rentalArrangement", archived_at AS "archiveAt"
                FROM properties
                WHERE id = ${propertyId}::uuid
                    AND owner_id = ${auth.data?.profileId}::uuid
                FOR UPDATE`;

            const property = properties[0];
            if (!property || property.archiveAt)
                throw new ActionError("NOT_FOUND", "Không tìm thấy dữ liệu.");
            if (property.rentalArrangement !== "SEPARATE_UNITS")
                throw new ActionError("FORBIDDEN", "Bất động sản cho thuê toàn bộ không thể tạo thêm căn.");

            const existing = await tx.unit.findMany({
                where: {propertyId, archivedAt: null},
                select: {normalizedLabel: true}
            });
            const existingLabels = new Set(existing.map((unit) => unit.normalizedLabel));
            const conflicts: Record<string, string> = {};

            normalizedLabels.forEach((label, index) => {
                if (existingLabels.has(label))
                    conflicts[`rows.${index}.label`] = "Tên căn/phòng đã tồn tại.";
            });

            if (Object.keys(conflicts).length > 0)
                throw new ActionError(
                    "CONFLICT",
                    "Một số tên căn/phòng đã tồn tại.",
                    conflicts,
                );

            const created = await Promise.all(
                parsed.data.map((row, index) => tx.unit.create({
                    data: {
                        propertyId,
                        label: row.label.trim(),
                        normalizedLabel: normalizedLabels[index],
                        unitKind: row.unitKind,
                        areaM2: row.areaM2,
                        bedrooms: row.bedrooms,
                        bathrooms: row.bathrooms,
                        bathroomArrangement: row.bathroomArrangement,
                        advertisedMonthlyRent: row.advertisedMonthlyRent,
                        deposit: row.deposit,
                        minimumRentalMonths: row.minimumRentalMonths,
                        maxOccupants: row.maxOccupants,
                        amenities: {
                            schema_version: 1,
                            standard: {},
                            custom: []
                        } as Prisma.InputJsonValue,
                        policyOverrides: {
                            schema_version: 1,
                            overrides: {},
                            additional_rules: []
                        } as Prisma.InputJsonValue
                    },
                    select: {id: true}
                }))
            );

            await tx.property.update({
                where: { id: propertyId },
                data: { contentRevision: { increment: 1 } }
            });

            return created.map((unit) => unit.id);
        });

        revalidatePath(`/owner/properties/${propertyId}`);
        return { ids };
    })
}

/** validates unit details, advertised terms, amenities, policy overrides,
 * status, and marketing state.
 *
 * only updates the unit and property revision;
 * does not modify tenancy or contract records.
 */
const updateUnitSchema = z.object({
    label: z.string().trim().min(1).max(80).optional(),
    unitKind: z.string().trim().min(1).max(40).optional(),
    description: z.string().trim().max(2000).nullable().optional(),
    floor: z.string().trim().max(40).nullable().optional(),
    areaM2: z.number().positive().nullable().optional(),
    bedrooms: z.number().int().min(0).optional(),
    bathrooms: z.number().min(0).optional(),
    bathroomArrangement: z.string().trim().min(1).max(40).optional(),
    advertisedMonthlyRent: z.number().positive().nullable().optional(),
    deposit: z.number().min(0).nullable().optional(),
    minimumRentalMonths: z.number().int().min(3).optional(),
    maxOccupants: z.number().int().positive().nullable().optional(),
    operationalStatus: z.enum(["READY", "MAINTENANCE", "RETIRED"]).optional(),
    isMarketed: z.boolean().optional(),
    amenities: z.unknown().optional(),
    policyOverrides: z.unknown().optional(),
}).strict().refine((value) => Object.keys(value).length > 0);

export async function updateUnit(unitId: string, input: unknown): Promise<ActionResult<{contentRevision: number}>> {
    const parsedId = z.string().uuid().safeParse(unitId);
    if (!parsedId.success)
        return {
            ok: false,
            error: "Mã căn/phòng không hợp lệ."
        };

    const auth = await runAction(() => requireUser());
    if (!auth.ok)
        return auth;
    const user = auth.data;
    if (!user)
        return {
        ok: false,
        error: "Vui lòng đăng nhập lại."
    };

    const parsed = updateUnitSchema.safeParse(input);
    if (!parsed.success) {
        const fieldErrors: Record<string, string> = {};
        for (const issue of parsed.error.issues) {
            const field = issue.path[0];
            fieldErrors[typeof field === "string" ? field: "form"] ??= issue.message;
        }
        return {
            ok: false,
            error: "Dữ liệu căn/phòng không hợp lệ.",
            fieldErrors
        };
    }

    const current = await prisma.unit.findFirst({
        where: {
            id: unitId,
            archivedAt: null,
            property: {
                ownerId: user.profileId,
                archivedAt: null
            }
        },
        select: { propertyId: true }
    });
    if (!current)
        return {
            ok: false,
            error: "Không tìm thấy dữ liệu."
        };

        const fields = parsed.data;
        const amenities = fields.amenities === undefined
            ? undefined
            : validateAmenities(fields.amenities, "UNIT");
        if (amenities && !amenities.success)
            return {
                ok: false,
                error: "Tiện ích không hợp lệ.",
                fieldErrors: {amenities: "Kiểm tra lại tiện ích."}
            };

        const policies = fields.policyOverrides === undefined
            ? undefined
            : validateUnitPolicyOverrides(fields.policyOverrides);
        if (policies && !policies.success)
            return {
                ok: false,
                error: "Quy định không hợp lệ.",
                fieldErrors: {policyOverrides: "Kiểm tra lại quy định"}
            };

        return runAction(async () => {
            const contentRevision = await prisma.$transaction(async (tx) => {
                await tx.$queryRaw`
                    SELECT id FROM properties
                    WHERE id = ${current.propertyId}::uuid
                        AND owner_id = ${user.profileId}::uuid
                        AND archived_at IS NULL
                    FOR UPDATE`;

                const normalizedLabel = fields.label === undefined
                    ? undefined
                    : normalizeUnitLabel(fields.label);

                if (normalizedLabel != undefined) {
                    const duplicate = await tx.unit.findFirst({
                        where: {
                            propertyId: current.propertyId,
                            id: { not: unitId },
                            archivedAt: null,
                            normalizedLabel
                        },
                        select: {id: true}
                    });
                    if (duplicate)
                        throw new ActionError(
                            "CONFLICT",
                            "Tên căn/phòng đã tồn tại.",
                            { label: "Tên căn/phòng đã tồn tại." },
                        );
                }

                const data: Prisma.UnitUpdateInput = {
                    ...(fields.label !== undefined && {
                        label: fields.label,
                        normalizedLabel}),
                    ...(fields.unitKind !== undefined && {
                        unitKind: fields.unitKind}),
                    ...(fields.description !== undefined && {
                        description: fields.description}),
                    ...(fields.floor !== undefined && {
                        floor: fields.floor}),
                    ...(fields.areaM2 !== undefined && {
                        areaM2: fields.areaM2}),
                    ...(fields.bedrooms !== undefined && {
                        bedrooms: fields.bedrooms}),
                    ...(fields.bathrooms !== undefined && {
                        bathrooms: fields.bathrooms}),
                    ...(fields.bathroomArrangement !== undefined && {
                        bathroomArrangement: fields.bathroomArrangement}),
                    ...(fields.advertisedMonthlyRent !== undefined && {
                        advertisedMonthlyRent: fields.advertisedMonthlyRent}),
                    ...(fields.deposit !== undefined && {
                        deposit: fields.deposit}),
                    ...(fields.minimumRentalMonths !== undefined && {
                        minimumRentalMonths: fields.minimumRentalMonths,}),
                    ...(fields.maxOccupants !== undefined && {
                        maxOccupants: fields.maxOccupants}),
                    ...(fields.operationalStatus !== undefined && {
                        operationalStatus: fields.operationalStatus}),
                    ...(fields.isMarketed !== undefined && {
                        isMarketed: fields.isMarketed}),
                    ...(amenities?.success && {
                        amenities: amenities.data as Prisma.InputJsonValue}),
                    ...(policies?.success && {
                        policyOverrides: policies.data as Prisma.InputJsonValue}),
                };

                await tx.unit.updateMany({
                    where: {
                        id: unitId,
                        propertyId: current.propertyId,
                        archivedAt: null
                    },
                    data
                });

                const property = await tx.property.update({
                    where: { id: current.propertyId },
                    data: { contentRevision: { increment: 1 } },
                    select: { contentRevision: true }
                });

                return property.contentRevision;
            });

            revalidatePath(`/owner/properties/${current.propertyId}`);
            revalidatePath(`/owner/properties/${current.propertyId}/units/${unitId}`);
            return { contentRevision };
        }
    );
}
