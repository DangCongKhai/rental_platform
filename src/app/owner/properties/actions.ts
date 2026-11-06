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
import { normalizeUnitLabel } from "@/domain/units";

const propertyTypeSchema = z.enum(["HOUSE", "APARTMENT", "APARTMENT_BUILDING"]);

const rentalArrangementSchema = z.enum(["WHOLE_SPACE", "SEPARATE_UNITS"]);

const wholeSpaceUnitSchema = z
  .object({
    areaM2: z.number().positive().nullable().optional(),
    bedrooms: z.number().int().min(0).optional(),
    bathrooms: z.number().min(0).optional(),
    advertisedMonthlyRent: z.number().positive().nullable().optional(),
    deposit: z.number().min(0).nullable().optional(),
    minimumRentalMonths: z.number().int().min(3).optional(),
    maxOccupants: z.number().int().positive().nullable().optional(),
    description: z.string().trim().max(2000).nullable().optional(),
    amenities: z.unknown().optional(),
  })
  .strict();

const createPropertySchema = z
  .object({
    name: z.string().trim().min(1).max(120),
    propertyType: propertyTypeSchema,
    rentalArrangement: rentalArrangementSchema,
    addressLine: z.string().trim().max(240).nullable().optional(),
    ward: z.string().trim().max(120).nullable().optional(),
    city: z.string().trim().max(120).nullable().optional(),
    description: z.string().trim().max(2000).nullable().optional(),
    sharedAmenities: z.unknown().optional(),
    policies: z.unknown().optional(),
    wholeSpaceUnit: wholeSpaceUnitSchema.optional(),
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

const EMPTY_UNIT_AMENITIES = {
  schema_version: 1,
  standard: {},
  custom: [],
};

function unitKindForPropertyType(propertyType: string) {
  return propertyType === "HOUSE" ? "HOUSE" : "APARTMENT";
}

function wholeSpaceUnitLabel(propertyType: string) {
  return propertyType === "HOUSE" ? "Toàn bộ nhà" : "Toàn bộ căn hộ";
}

function unitAmenities(value: unknown) {
  const input = value ?? EMPTY_UNIT_AMENITIES;
  const parsed = validateAmenities(input, "UNIT");
  if (!parsed.success) return null;
  return parsed.data as Prisma.InputJsonValue;
}

function wholeSpaceUnitData(
  propertyType: string,
  input: z.infer<typeof wholeSpaceUnitSchema> | undefined,
  amenities: Prisma.InputJsonValue,
): Omit<Prisma.UnitUncheckedCreateInput, "propertyId"> {
  const label = wholeSpaceUnitLabel(propertyType);
  return {
    label,
    normalizedLabel: normalizeUnitLabel(label),
    unitKind: unitKindForPropertyType(propertyType),
    bedrooms: input?.bedrooms ?? 0,
    bathrooms: input?.bathrooms ?? 0,
    bathroomArrangement: "PRIVATE",
    areaM2: input?.areaM2 ?? null,
    advertisedMonthlyRent: input?.advertisedMonthlyRent ?? null,
    deposit: input?.deposit ?? null,
    minimumRentalMonths: input?.minimumRentalMonths ?? 3,
    maxOccupants: input?.maxOccupants ?? null,
    description: nullableText(input?.description),
    amenities,
    policyOverrides: {
      schema_version: 1,
      overrides: {},
      additional_rules: [],
    } as Prisma.InputJsonValue,
    operationalStatus: "READY",
    isMarketed: true,
  };
}

function fieldErrors(error: z.ZodError): Record<string, string> {
  const result: Record<string, string> = {};

  for (const issue of error.issues) {
    const firstPathPart = issue.path[0];
    const field = typeof firstPathPart === "string" ? firstPathPart : "form";

    result[field] ??= issue.message;
  }

  return result;
}

function invalidForm<T = void>(
  errors: Record<string, string>,
): ActionResult<T> {
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

export async function createProperty(
  input: unknown,
): Promise<ActionResult<CreatedProperty>> {
  const auth = await runAction(() => requireUser());
  if (!auth.ok) return auth;

  const user = auth.data;
  if (!user) {
    return {
      ok: false,
      error: "Vui lòng đăng nhập lại.",
    };
  }

  const parsed = createPropertySchema.safeParse(input);
  if (!parsed.success) {
    return invalidForm<CreatedProperty>(fieldErrors(parsed.error));
  }

  const inputAmenities =
    parsed.data.sharedAmenities === undefined
      ? EMPTY_AMENITIES
      : parsed.data.sharedAmenities;
  console.log(inputAmenities);
  const amenities = validateAmenities(inputAmenities, "PROPERTY");
  if (!amenities.success) {
    return invalidForm<CreatedProperty>({
      sharedAmenities: "Tiện ích không hợp lệ.",
    });
  }

  const inputPolicies =
    parsed.data.policies === undefined
      ? DEFAULT_POLICIES
      : parsed.data.policies;

  const policies = validatePropertyPolicies(inputPolicies);
  if (!policies.success) {
    return invalidForm<CreatedProperty>({ policies: "Quy định không hợp lệ." });
  }

  if (
    parsed.data.rentalArrangement === "SEPARATE_UNITS" &&
    parsed.data.wholeSpaceUnit
  ) {
    return invalidForm<CreatedProperty>({
      wholeSpaceUnit: "Chỉ dùng thông tin này khi cho thuê toàn bộ.",
    });
  }

  const wholeAmenities =
    parsed.data.rentalArrangement === "WHOLE_SPACE"
      ? unitAmenities(parsed.data.wholeSpaceUnit?.amenities)
      : null;
  if (
    parsed.data.rentalArrangement === "WHOLE_SPACE" &&
    !wholeAmenities
  ) {
    return invalidForm<CreatedProperty>({
      wholeSpaceUnit: "Tiện ích của không gian không hợp lệ.",
    });
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
          city: nullableText(parsed.data.city),
          description: nullableText(parsed.data.description),
          sharedAmenities: amenities.data as Prisma.InputJsonValue,
          policies: policies.data as Prisma.InputJsonValue,
        },
      });

      if (parsed.data.rentalArrangement === "WHOLE_SPACE") {
        await tx.unit.create({
          data: {
            propertyId: created.id,
            ...wholeSpaceUnitData(
              parsed.data.propertyType,
              parsed.data.wholeSpaceUnit,
              wholeAmenities as Prisma.InputJsonValue,
            ),
          },
        });
      }

      return created;
    });

    revalidatePath("/owner/properties");
    revalidatePath("/owner/listings");

    return {
      id: property.id,
      contentRevision: property.contentRevision,
    };
  });

  return result;
}

const updatePropertySchema = createPropertySchema.partial().extend({
  expectedRevision: z.number().int().positive(),
});

export async function updateProperty(
  id: string,
  input: unknown,
): Promise<ActionResult<{ contentRevision: number }>> {
  type UpdatePropertyResult = { contentRevision: number };

  const auth = await runAction(() => requireUser());
  if (!auth.ok) return auth;

  const user = auth.data;
  if (!user) {
    return {
      ok: false,
      error: "Vui lòng đăng nhập lại.",
    };
  }

  const parsed = updatePropertySchema.safeParse(input);
  if (!parsed.success) {
    return invalidForm<UpdatePropertyResult>(fieldErrors(parsed.error));
  }

  const { expectedRevision, ...fields } = parsed.data;

  if (Object.keys(fields).length === 0) {
    return invalidForm<UpdatePropertyResult>({
      form: "Không có nội dung nào để lưu.",
    });
  }

  const changes: Prisma.PropertyUpdateInput = {};

  if (fields.name !== undefined) changes.name = fields.name;
  if (fields.propertyType !== undefined)
    changes.propertyType = fields.propertyType;
  if (fields.addressLine !== undefined)
    changes.addressLine = nullableText(fields.addressLine);
  if (fields.ward !== undefined) changes.ward = nullableText(fields.ward);
  if (fields.city !== undefined) changes.city = nullableText(fields.city);
  if (fields.description !== undefined)
    changes.description = nullableText(fields.description);
  if (fields.sharedAmenities !== undefined) {
    console.log(fields.sharedAmenities);
    const amenities = validateAmenities(fields.sharedAmenities, "PROPERTY");
    if (!amenities.success)
      return invalidForm<UpdatePropertyResult>({
        sharedAmenities: "Tiện ích không hợp lệ.",
      });
    changes.sharedAmenities = amenities.data as Prisma.InputJsonValue;
  }
  if (fields.policies !== undefined) {
    const policies = validatePropertyPolicies(fields.policies);
    if (!policies.success) {
      return invalidForm<UpdatePropertyResult>({
        policies: "Quy định không hợp lệ.",
      });
    }
    changes.policies = policies.data as Prisma.InputJsonValue;
  }

  const submittedUnitAmenities = fields.wholeSpaceUnit?.amenities;
  const validatedUnitAmenities =
    submittedUnitAmenities === undefined
      ? undefined
      : unitAmenities(submittedUnitAmenities);
  if (
    submittedUnitAmenities !== undefined &&
    !validatedUnitAmenities
  ) {
    return invalidForm<UpdatePropertyResult>({
      wholeSpaceUnit: "Tiện ích của không gian không hợp lệ.",
    });
  }

  return runAction(async () => {
    const updated = await prisma.$transaction(async (tx) => {
      const rows = await tx.$queryRaw<
        Array<{
          contentRevision: number;
          rentalArrangement: string;
          propertyType: string;
        }>
      >`
        SELECT content_revision AS "contentRevision",
               rental_arrangement AS "rentalArrangement",
               property_type AS "propertyType"
        FROM properties
        WHERE id = ${id}::uuid
          AND owner_id = ${user.profileId}::uuid
          AND archived_at IS NULL
        FOR UPDATE
      `;
      const current = rows[0];
      if (!current) {
        throw new ActionError("NOT_FOUND", "Không tìm thấy dữ liệu.");
      }
      if (current.contentRevision !== expectedRevision) {
        throw new ActionError(
          "CONFLICT",
          "Thông tin đã thay đổi. Hãy tải lại trang và thử lại.",
        );
      }
      if (
        fields.rentalArrangement !== undefined &&
        fields.rentalArrangement !== current.rentalArrangement
      ) {
        throw new ActionError(
          "CONFLICT",
          "Không thể thay đổi hình thức thuê sau khi tạo bất động sản.",
        );
      }
      if (
        fields.wholeSpaceUnit &&
        current.rentalArrangement !== "WHOLE_SPACE"
      ) {
        throw new ActionError(
          "CONFLICT",
          "Chỉ bất động sản cho thuê toàn bộ có thông tin không gian này.",
        );
      }

      let listingId: string | null = null;
      if (current.rentalArrangement === "WHOLE_SPACE") {
        const units = await tx.unit.findMany({
          where: { propertyId: id, archivedAt: null },
          orderBy: [{ createdAt: "asc" }, { id: "asc" }],
          take: 2,
          select: { id: true },
        });
        if (units.length !== 1) {
          throw new ActionError(
            "CONFLICT",
            "Bất động sản cho thuê toàn bộ cần đúng một căn đại diện.",
          );
        }

        const unitData: Prisma.UnitUpdateInput = {};
        if (fields.propertyType !== undefined) {
          const label = wholeSpaceUnitLabel(fields.propertyType);
          unitData.label = label;
          unitData.normalizedLabel = normalizeUnitLabel(label);
          unitData.unitKind = unitKindForPropertyType(
            fields.propertyType,
          );
        }
        const wholeSpaceUnit = fields.wholeSpaceUnit;
        if (wholeSpaceUnit?.areaM2 !== undefined) {
          unitData.areaM2 = wholeSpaceUnit.areaM2;
        }
        if (wholeSpaceUnit?.bedrooms !== undefined) {
          unitData.bedrooms = wholeSpaceUnit.bedrooms;
        }
        if (wholeSpaceUnit?.bathrooms !== undefined) {
          unitData.bathrooms = wholeSpaceUnit.bathrooms;
        }
        if (wholeSpaceUnit?.advertisedMonthlyRent !== undefined) {
          unitData.advertisedMonthlyRent =
            wholeSpaceUnit.advertisedMonthlyRent;
        }
        if (wholeSpaceUnit?.deposit !== undefined) {
          unitData.deposit = wholeSpaceUnit.deposit;
        }
        if (wholeSpaceUnit?.minimumRentalMonths !== undefined) {
          unitData.minimumRentalMonths =
            wholeSpaceUnit.minimumRentalMonths;
        }
        if (wholeSpaceUnit?.maxOccupants !== undefined) {
          unitData.maxOccupants = wholeSpaceUnit.maxOccupants;
        }
        if (wholeSpaceUnit?.description !== undefined) {
          unitData.description = nullableText(wholeSpaceUnit.description);
        }
        if (
          validatedUnitAmenities !== undefined &&
          validatedUnitAmenities !== null
        ) {
          unitData.amenities = validatedUnitAmenities;
        }
        if (Object.keys(unitData).length > 0) {
          await tx.unit.update({
            where: { id: units[0].id },
            data: unitData,
          });
        }

        const listing = await tx.listing.findFirst({
          where: { propertyId: id, archivedAt: null },
          select: { id: true },
        });
        listingId = listing?.id ?? null;
      }

      const property = await tx.property.update({
        where: { id },
        data: {
          ...changes,
          contentRevision: { increment: 1 },
        },
        select: { contentRevision: true },
      });
      return { contentRevision: property.contentRevision, listingId };
    });

    revalidatePath("/owner/properties");
    revalidatePath(`/owner/properties/${id}`);
    revalidatePath("/owner/listings");
    if (updated.listingId) {
      revalidatePath(`/owner/listings/${updated.listingId}`);
    }
    revalidatePath("/listings");

    return { contentRevision: updated.contentRevision };
  });
}

export async function archiveProperty(id: string): Promise<ActionResult<void>> {
  const auth = await runAction(() => requireUser());
  if (!auth.ok) return auth;

  const user = auth.data;
  if (!user) {
    return { ok: false, error: "Vui lòng đăng nhập lại." };
  }

  const parsedId = z.guid().safeParse(id);
  if (!parsedId.success) {
    return invalidForm<void>({ id: "Mã bất động sản không hợp lệ." });
  }

  return runAction(async () => {
    await prisma.$transaction(async (tx) => {
      const rows = await tx.$queryRaw<
        Array<{ id: string; archivedAt: Date | null }>
      >`
            SELECT id, archived_at AS "archivedAt"
            FROM properties
            WHERE id = ${id}::uuid
            AND owner_id = ${user.profileId}::uuid
            FOR UPDATE
        `;

      const property = rows[0];
      if (!property) {
        throw new ActionError("NOT_FOUND", "Không tìm thấy dữ liệu.");
      }

      if (property.archivedAt) return;

      const archivedAt = new Date();

      await tx.property.update({
        where: { id },
        data: { archivedAt },
      });

      await tx.listing.updateMany({
        where: { propertyId: id, archivedAt: null },
        data: { archivedAt },
      });

      await tx.unit.updateMany({
        where: { propertyId: id, archivedAt: null },
        data: { isMarketed: false },
      });
    });

    revalidatePath("/owner/properties");
    revalidatePath(`/owner/properties/${id}`);
  });
}
