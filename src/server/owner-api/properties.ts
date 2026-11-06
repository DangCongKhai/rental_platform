import { revalidatePath } from "next/cache";
import {
  archiveProperty,
  createProperty,
  updateProperty,
} from "@/app/owner/properties/actions/actions";
import {
  createUnits,
  updateUnit,
} from "@/app/owner/properties/actions/unit-actions";
import { requireUser } from "@/server/auth";
import { prisma } from "@/server/db";
import {
  getMyProperties,
  getMyProperty,
  type OwnerListingFilter,
} from "@/server/properties";
import type {
  OwnerListingStatusFilter,
  OwnerOccupancyFilter,
} from "@/lib/owner-types";
import {
  OwnerApiError,
  actionData,
  asObject,
  camelize,
  readJsonObject,
  restoreAmenityDocument,
  toDomainPolicies,
  toOwnerPropertyDetail,
  toOwnerPropertySummary,
  toOwnerUnit,
  toUnitInput,
} from "./shared";

function wholeSpaceInput(input: Record<string, unknown>) {
  return {
    areaM2: input.areaM2,
    bedrooms: input.bedrooms,
    bathrooms: input.bathrooms,
    advertisedMonthlyRent: input.advertisedMonthlyRent,
    deposit: input.deposit,
    minimumRentalMonths: input.minimumRentalMonths,
    maxOccupants: input.maxOccupants,
    description: input.unitDescription,
    amenities:
      input.unitAmenities === undefined
        ? undefined
        : restoreAmenityDocument(input.unitAmenities),
  };
}

function propertyInput(input: Record<string, unknown>) {
  return {
    name: input.name,
    propertyType: input.propertyType,
    rentalArrangement: input.rentalArrangement,
    addressLine: input.addressLine,
    ward: input.ward,
    city: input.city,
    description: input.description,
    sharedAmenities:
      input.sharedAmenities === undefined
        ? undefined
        : restoreAmenityDocument(input.sharedAmenities),
    policies: input.policies
      ? toDomainPolicies(input.policies)
      : undefined,
  };
}

function pageNumber(value: string | null) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 && parsed <= 100000
    ? parsed
    : 1;
}

function listingFilter(value: string | null): OwnerListingFilter {
  if (value === "action" || value === "published" || value === "draft") {
    return value;
  }
  return "all";
}

const occupancyFilters = [
  "OCCUPIED",
  "VACANT",
  "MAINTENANCE",
  "PENDING_CONFIRMATION",
  "AWAITING_MOVE_IN",
] as const;

function occupancyFilter(value: string | null): OwnerOccupancyFilter {
  if (
    occupancyFilters.some((filter) => filter === value)
  ) {
    return value as OwnerOccupancyFilter;
  }
  return "all";
}

const listingStatusFilters = [
  "published",
  "pending",
  "hidden",
  "none",
  "draft",
  "rejected",
  "approved",
  "suspended",
] as const;

function listingStatusFilter(
  value: string | null,
): OwnerListingStatusFilter {
  if (listingStatusFilters.some((filter) => filter === value)) {
    return value as OwnerListingStatusFilter;
  }
  return "all";
}

function listingStatusesFrom(
  params: URLSearchParams,
): OwnerListingStatusFilter[] {
  const selected: OwnerListingStatusFilter[] = [];
  for (const raw of params.getAll("listing_status")) {
    for (const part of raw.split(",")) {
      const status = listingStatusFilter(part.trim());
      if (status !== "all" && !selected.includes(status)) {
        selected.push(status);
      }
    }
  }
  return selected;
}

export async function listOwnerProperties(request: Request) {
  const url = new URL(request.url);
  const result = await getMyProperties(
    pageNumber(url.searchParams.get("page")),
    listingFilter(url.searchParams.get("filter")),
    url.searchParams.has("include_archived"),
    occupancyFilter(url.searchParams.get("occupancy")),
    listingStatusesFrom(url.searchParams),
  );
  return Response.json({
    data: result.properties.map(toOwnerPropertySummary),
    meta: {
      current_page: result.page,
      per_page: result.pageSize,
      total: result.total,
      last_page: Math.max(
        1,
        Math.ceil(result.total / result.pageSize),
      ),
    },
  });
}

export async function getOwnerPropertyResponse(propertyId: string) {
  const property = await getMyProperty(propertyId);
  if (!property) {
    throw new OwnerApiError("Không tìm thấy bất động sản.", 404);
  }
  return Response.json(toOwnerPropertyDetail(property));
}

export async function createOwnerPropertyResponse(request: Request) {
  const input = asObject(camelize(await readJsonObject(request)));
  const arrangement = input.rentalArrangement;
  const result = actionData(
    await createProperty({
      ...propertyInput(input),
      wholeSpaceUnit:
        arrangement === "WHOLE_SPACE"
          ? wholeSpaceInput(input)
          : undefined,
    }),
  );
  const property = await getMyProperty(result.id);
  if (!property) {
    throw new OwnerApiError("Không thể tải bất động sản vừa tạo.", 500);
  }
  return Response.json(toOwnerPropertyDetail(property));
}

export async function updateOwnerPropertyResponse(
  request: Request,
  propertyId: string,
) {
  const input = asObject(camelize(await readJsonObject(request)));
  const current = await getMyProperty(propertyId);
  if (!current) {
    throw new OwnerApiError("Không tìm thấy bất động sản.", 404);
  }
  actionData(
    await updateProperty(propertyId, {
      ...propertyInput(input),
      expectedRevision: input.expectedContentRevision,
      wholeSpaceUnit:
        current.rentalArrangement === "WHOLE_SPACE"
          ? wholeSpaceInput(input)
          : undefined,
    }),
  );
  const property = await getMyProperty(propertyId);
  if (!property) {
    throw new OwnerApiError("Không thể tải bất động sản vừa cập nhật.", 500);
  }
  return Response.json(toOwnerPropertyDetail(property));
}

export async function archiveOwnerPropertyResponse(propertyId: string) {
  actionData(await archiveProperty(propertyId));
  return Response.json({ id: propertyId });
}

async function createUnitRecords(
  propertyId: string,
  values: unknown[],
) {
  const result = actionData(
    await createUnits(propertyId, values.map(toUnitInput)),
  );
  const property = await getMyProperty(propertyId);
  if (!property) {
    throw new OwnerApiError("Không tìm thấy bất động sản.", 404);
  }
  return property.units.filter((unit) => result.ids.includes(unit.id));
}

export async function createOwnerUnitResponse(
  request: Request,
  propertyId: string,
) {
  const unit = await createUnitRecords(
    propertyId,
    [await readJsonObject(request)],
  );
  if (!unit[0]) {
    throw new OwnerApiError("Không thể tải căn/phòng vừa tạo.", 500);
  }
  return Response.json(toOwnerUnit(unit[0]));
}

export async function createOwnerUnitsResponse(
  request: Request,
  propertyId: string,
) {
  const body = await readJsonObject(request);
  const units = Array.isArray(body.units) ? body.units : [];
  const created = await createUnitRecords(propertyId, units);
  return Response.json(created.map(toOwnerUnit));
}

function partialUnitInput(value: unknown) {
  const input = asObject(camelize(value));
  const mapped = toUnitInput(input);
  return Object.fromEntries(
    Object.entries(mapped).filter(([field]) => {
      if (field === "policyOverrides") {
        return input.policyOverrides !== undefined;
      }
      return input[field] !== undefined;
    }),
  );
}

export async function updateOwnerUnitResponse(
  request: Request,
  propertyId: string,
  unitId: string,
) {
  const body = await readJsonObject(request);
  const property = await getMyProperty(propertyId);
  if (!property) {
    throw new OwnerApiError("Không tìm thấy bất động sản.", 404);
  }
  const input = partialUnitInput(body);
  if (property.rentalArrangement === "WHOLE_SPACE") {
    const camel = asObject(camelize(body));
    actionData(
      await updateProperty(propertyId, {
        expectedRevision: camel.expectedContentRevision,
        wholeSpaceUnit: {
          areaM2: camel.areaM2,
          bedrooms: camel.bedrooms,
          bathrooms: camel.bathrooms,
          advertisedMonthlyRent: camel.advertisedMonthlyRent,
          deposit: camel.deposit,
          minimumRentalMonths: camel.minimumRentalMonths,
          maxOccupants: camel.maxOccupants,
          description: camel.description,
          amenities:
            camel.amenities === undefined
              ? undefined
              : restoreAmenityDocument(camel.amenities),
        },
      }),
    );
  } else {
    actionData(await updateUnit(unitId, input));
  }
  const updated = await getMyProperty(propertyId);
  const unit = updated?.units.find((item) => item.id === unitId);
  if (!unit) {
    throw new OwnerApiError("Không tìm thấy căn/phòng.", 404);
  }
  return Response.json(toOwnerUnit(unit));
}

export async function archiveOwnerUnitResponse(
  propertyId: string,
  unitId: string,
) {
  const user = await requireUser();
  const unit = await prisma.unit.findFirst({
    where: {
      id: unitId,
      propertyId,
      archivedAt: null,
      property: { ownerId: user.profileId, archivedAt: null },
    },
    select: { id: true },
  });
  if (!unit) throw new OwnerApiError("Không tìm thấy căn/phòng.", 404);
  await prisma.$transaction([
    prisma.unit.update({
      where: { id: unitId },
      data: { archivedAt: new Date(), isMarketed: false },
    }),
    prisma.property.update({
      where: { id: propertyId },
      data: { contentRevision: { increment: 1 } },
    }),
  ]);
  revalidatePath(`/owner/properties/${propertyId}`);
  revalidatePath(`/owner/properties/${propertyId}/edit`);
  revalidatePath("/owner/properties");
  revalidatePath("/owner/listings");
  revalidatePath("/listings");
  return Response.json({ id: unitId });
}
