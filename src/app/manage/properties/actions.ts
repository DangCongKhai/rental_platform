"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { Prisma } from "../../../../generated/prisma/client";
import { validateAmenities } from "@/domain/amenities";
import { validatePropertyPolicies } from "@/domain/policies";
import { ActionError, runAction } from "@/server/action";
import { requireUser } from "@/server/auth";
import { prisma } from "@/server/db";
import type { ActionResult } from "@/server/validation";

const propertyTypeSchema = z.enum(["HOUSE", "APARTMENT", "APARTMENT_BUILDING"]);

const rentalArrangementSchema = z.enum(["WHOLE_SPACE", "SEPARATE_UNITS"]);

const createPropertySchema = z
    .object({
        name: z.string().trim().min(1).max(120),
        propertyType: propertyTypeSchema,
        rentalArrangement: rentalArrangementSchema,
        addressLine: z.string().trim().max(240).nullable().optional(),
        ward: z.string().trim().max(120).nullable().optional(),
        district: z.string().trim().max(120).nullable().optional(),
        city: z.string().trim().max(120).nullable().optional(),
        description: z.string().trim().max(2000).nullable().optional(),
        sharedAmenities: z.unknown().optional(),
        policies: z.unknown().optional(),
    })
    .strict();

type CreatedProperty = {
    id: string;
    contentRevision: number;
};

const EMPTY_AMENITIES = {
    schema_version: 1,
    standard: {},
    custom: [],
};

const DEFAULT_POLICIES = {
    schema_version: 1,
    defaults: {
        pets: "ASK_OWNER",
        smoking: "NOT_ALLOWED",
    },
    shared_rules: [],
};

function fieldErrors(error: z.ZodError): Record<string, string> {
    const result: Record<string, string> = {};

    for (const issue of error.issues) {
        const firstPathPart = issue.path[0];
        const field = typeof firstPathPart === "string" ? firstPathPart : "form";

        result[field] ??= issue.message;
    }

    return result;
}

function invalidForm(errors: Record<string, string>): ActionResult<CreatedProperty> {
    return {
        ok: false,
        error: "Dữ liệu không hợp lệ.",
        fieldErrors: errors,
    };
}

function nullableText(value: string | null | undefined) {
    if (value == null || value === "") return null;
    return value;
}

export async function createProperty(input: unknown): Promise<ActionResult<CreatedProperty>> {
    const auth = await runAction(() => requireUser());
    if (!auth.ok) 
        return auth;

    const user = auth.data;
    if (!user) {
        return { 
            ok: false, 
            error: "Vui lòng đăng nhập lại."
        };
    }

    const parsed = createPropertySchema.safeParse(input);
    if (!parsed.success) {
        return invalidForm(fieldErrors(parsed.error));
    }

    const inputAmenities = parsed.data.sharedAmenities === undefined ? EMPTY_AMENITIES : parsed.data.sharedAmenities;

    const amenities = validateAmenities(inputAmenities, "PROPERTY");
    if (!amenities.success) {
        return invalidForm({ sharedAmenities: "Tiện ích không hợp lệ." });
    }

    const inputPolicies = parsed.data.policies === undefined ? DEFAULT_POLICIES : parsed.data.policies;

    const policies = validatePropertyPolicies(inputPolicies);
    if (!policies.success) {
        return invalidForm({ policies: "Quy định không hợp lệ." });
    }

    const result = await runAction(async () => {
        const property = await prisma.$transaction(async (tx) => {
            const created = await tx.property.create({
                data: {
                    ownerId: user.profileId,
                    name: parsed.data.name,
                    propertyType: parsed.data.propertyType,
                    rentalArrangement: parsed.data.rentalArrangement,
                    addressLine: nullableText(parsed.data.addressLine),
                    ward: nullableText(parsed.data.ward),
                    district: nullableText(parsed.data.district),
                    city: nullableText(parsed.data.city),
                    description: nullableText(parsed.data.description),
                    sharedAmenities: amenities.data as Prisma.InputJsonValue,
                    policies: policies.data as Prisma.InputJsonValue,
                },
            });

            if (parsed.data.rentalArrangement === "WHOLE_SPACE") {
                const unitKind = parsed.data.propertyType === "HOUSE" ? "HOUSE" : "APARTMENT";
                const unitLabel = unitKind === "HOUSE" ? "Toàn bộ nhà" : "Toàn bộ căn hộ";

                await tx.unit.create({
                    data: {
                        propertyId: created.id,
                        label: unitLabel,
                        unitKind,
                        bedrooms: 0,
                        bathrooms: 0,
                        bathroomArrangement: "PRIVATE",
                        minimumRentalMonths: 3,
                    },
                });
            }

            return created;
        });

        revalidatePath("/manage/properties");

        return {
            id: property.id,
            contentRevision: property.contentRevision,
        };
    });

    return result;
}