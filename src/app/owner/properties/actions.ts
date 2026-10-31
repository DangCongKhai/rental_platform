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
        const unitKind =
          parsed.data.propertyType === "HOUSE" ? "HOUSE" : "APARTMENT";
        const unitLabel =
          unitKind === "HOUSE" ? "Toàn bộ nhà" : "Toàn bộ căn hộ";

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

    revalidatePath("/owner/properties");

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

  const changes: Prisma.PropertyUpdateManyMutationInput = {};

  if (fields.name !== undefined) changes.name = fields.name;
  if (fields.propertyType !== undefined)
    changes.propertyType = fields.propertyType;
  if (fields.rentalArrangement !== undefined)
    changes.rentalArrangement = fields.rentalArrangement;
  if (fields.addressLine !== undefined)
    changes.addressLine = nullableText(fields.addressLine);
  if (fields.ward !== undefined) changes.ward = nullableText(fields.ward);
  if (fields.city !== undefined) changes.city = nullableText(fields.city);
  if (fields.description !== undefined)
    changes.description = nullableText(fields.description);
  if (fields.sharedAmenities !== undefined) {
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

  return runAction(async () => {
    const updated = await prisma.property.updateMany({
      where: {
        id,
        ownerId: user.profileId,
        archivedAt: null,
        contentRevision: expectedRevision,
      },
      data: {
        ...changes,
        contentRevision: { increment: 1 },
      },
    });

    if (updated.count !== 1) {
      const property = await prisma.property.findFirst({
        where: { id, ownerId: user.profileId },
        select: { archivedAt: true },
      });

      if (!property || property.archivedAt)
        throw new ActionError("NOT_FOUND", "Không tìm thấy dữ liệu.");

      throw new ActionError(
        "CONFLICT",
        "Thông tin đã thay đổi. Hãy tải lại trang và thử lại.",
      );
    }

    revalidatePath("/owner/properties");
    revalidatePath(`/owner/properties/${id}`);

    const property = await prisma.property.findFirstOrThrow({
      where: { id, ownerId: user.profileId },
      select: { contentRevision: true },
    });

    return { contentRevision: property.contentRevision };
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
