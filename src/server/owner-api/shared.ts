import type {
  Listing,
  Property,
  Unit,
} from "../../../generated/prisma/client";
import type {
  AmenityDocument,
  OwnerListing,
  OwnerProperty,
  OwnerPropertyDetail,
  OwnerPropertySummary,
  OwnerPropertyMedia,
  OwnerUnit,
  PropertyPolicies,
} from "@/lib/owner-types";
import { todayInVietnam } from "@/domain/discovery/unit-availability";
import {
  classifyUnits,
  listOccupancy,
} from "@/domain/tenancies/occupancy";
import type { ActionResult } from "@/server/validation";
import { toHoldTenancy } from "@/server/tenancies/hold";

export type JsonObject = Record<string, unknown>;

type ListingWithRevision = Listing & {
  property?: { contentRevision: number };
};

export type MediaRecord = {
  id: string;
  unitId: string | null;
  caption: string | null;
  sortOrder: number;
  isSelectedForListing: boolean;
  mimeType: string;
  sizeBytes: number;
  signedUrl: string | null;
  assignedUnitIds: string[];
};

export class OwnerApiError extends Error {
  constructor(
    message: string,
    readonly status = 400,
    readonly errors: Record<string, string[]> = {},
  ) {
    super(message);
    this.name = "OwnerApiError";
  }
}

export function apiErrorResponse(error: OwnerApiError) {
  return Response.json(
    { message: error.message, errors: error.errors },
    { status: error.status },
  );
}

export async function ownerApiResponse(
  operation: () => Promise<Response>,
) {
  try {
    return await operation();
  } catch (error) {
    if (error instanceof OwnerApiError) return apiErrorResponse(error);
    throw error;
  }
}

export function actionData<T>(result: ActionResult<T>): T {
  if (result.ok) return result.data as T;
  const errors = Object.fromEntries(
    Object.entries(result.fieldErrors ?? {}).map(([field, message]) => [
      field,
      [message],
    ]),
  );
  throw new OwnerApiError(result.error, 422, errors);
}

export function asObject(value: unknown): JsonObject {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return {};
  }
  return value as JsonObject;
}

export async function readJsonObject(request: Request) {
  return asObject(await request.json());
}

export function camelize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(camelize);
  if (typeof value !== "object" || value === null) return value;
  return Object.fromEntries(
    Object.entries(value).map(([key, child]) => [
      key.replace(
        /_([a-z])/gu,
        (_match, letter: string) => letter.toUpperCase(),
      ),
      camelize(child),
    ]),
  );
}

function snakeKey(key: string): string {
  return key.replace(
    /[A-Z]/gu,
    (letter) => `_${letter.toLowerCase()}`,
  );
}

export function restoreAmenityDocument(value: unknown) {
  const input = asObject(value);
  if (input.schema_version === 1) return input;
  const standard = asObject(input.standard);
  return {
    schema_version: 1,
    standard: Object.fromEntries(
      Object.entries(standard).map(([key, item]) => [
        snakeKey(key),
        item,
      ]),
    ),
    custom: Array.isArray(input.custom) ? input.custom : [],
  };
}

function policyValue(value: unknown, fallback: string) {
  if (
    value === "ALLOWED" ||
    value === "NOT_ALLOWED" ||
    value === "ASK_OWNER"
  ) {
    return value;
  }
  if (value === "WITH_APPROVAL") return "ASK_OWNER";
  if (value === "OUTDOOR_ONLY") return "NOT_ALLOWED";
  return fallback;
}

export function toDomainPolicies(value: unknown) {
  const input = asObject(value);
  const defaults = asObject(input.defaults);
  return {
    schema_version: 1,
    defaults: {
      pets: policyValue(
        input.pets ?? defaults.pets,
        "ASK_OWNER",
      ),
      smoking: policyValue(
        input.smoking ?? defaults.smoking,
        "NOT_ALLOWED",
      ),
    },
    shared_rules: input.shared_rules ?? input.sharedRules ?? [],
  };
}

function toOwnerPolicies(value: unknown): PropertyPolicies {
  const input = asObject(value);
  const defaults = asObject(input.defaults);
  return {
    schema_version: 1,
    pets: String(defaults.pets ?? "ASK_OWNER"),
    smoking: String(defaults.smoking ?? "NOT_ALLOWED"),
    shared_rules: Array.isArray(input.shared_rules)
      ? input.shared_rules.filter(
          (item): item is string => typeof item === "string",
        )
      : [],
  };
}

function toAmenityDocument(value: unknown): AmenityDocument {
  const input = asObject(value);
  const standard = asObject(input.standard);
  const entries = Object.fromEntries(
    Object.entries(standard).flatMap(([key, item]) => {
      const amenity = asObject(item);
      if (typeof amenity.enabled !== "boolean") return [];
      const details =
        typeof amenity.details === "string" ? amenity.details : undefined;
      return [[key, { enabled: amenity.enabled, details }]];
    }),
  );
  return {
    schema_version: 1,
    standard: entries,
    custom: Array.isArray(input.custom)
      ? input.custom.filter(
          (item): item is string => typeof item === "string",
        )
      : [],
  };
}

export function toOwnerUnit(unit: Unit): OwnerUnit {
  const policyOverrides = asObject(unit.policyOverrides);
  const overrides = asObject(policyOverrides.overrides);
  const additionalRules = policyOverrides.additional_rules;
  return {
    id: unit.id,
    property_id: unit.propertyId,
    label: unit.label,
    unit_kind: unit.unitKind,
    description: unit.description,
    floor: unit.floor,
    area_m2: unit.areaM2 === null ? null : Number(unit.areaM2),
    bedrooms: unit.bedrooms,
    bathrooms: Number(unit.bathrooms),
    bathroom_arrangement: unit.bathroomArrangement,
    amenities: toAmenityDocument(unit.amenities),
    advertised_monthly_rent:
      unit.advertisedMonthlyRent === null
        ? null
        : Number(unit.advertisedMonthlyRent),
    deposit: unit.deposit === null ? null : Number(unit.deposit),
    minimum_rental_months: unit.minimumRentalMonths,
    max_occupants: unit.maxOccupants,
    operational_status: unit.operationalStatus as OwnerUnit[
      "operational_status"
    ],
    is_marketed: unit.isMarketed,
    policy_overrides: {
      ...(typeof overrides.pets === "string"
        ? { pets: overrides.pets }
        : {}),
      ...(typeof overrides.smoking === "string"
        ? { smoking: overrides.smoking }
        : {}),
      additional_rules: Array.isArray(additionalRules)
        ? additionalRules.filter(
            (item): item is string => typeof item === "string",
          )
        : [],
    },
    archived_at: unit.archivedAt?.toISOString() ?? null,
  };
}

export function toOwnerProperty(property: Property): OwnerProperty {
  return {
    id: property.id,
    owner_id: property.ownerId,
    client_operation_id: property.id,
    name: property.name,
    property_type: property.propertyType,
    rental_arrangement: property.rentalArrangement,
    city: property.city,
    policies: toOwnerPolicies(property.policies),
    archived_at: property.archivedAt?.toISOString() ?? null,
    created_at: property.createdAt.toISOString(),
    updated_at: property.updatedAt.toISOString(),
  };
}

export function toOwnerPropertySummary(
  property: Property & {
    units: Array<{
      isMarketed: boolean;
      operationalStatus: string;
      tenancies?: Parameters<typeof toHoldTenancy>[0][];
    }>;
    listings: Array<{
      id: string;
      title: string;
      moderationStatus: string;
      publicationStatus: string;
      adminSuspendedAt: Date | null;
    }>;
  },
): OwnerPropertySummary {
  const listing = property.listings[0] ?? null;
  const occupancy = listOccupancy(
    property.rentalArrangement,
    classifyUnits(
      property.units.map((unit) => ({
        operationalStatus: unit.operationalStatus,
        tenancies: (unit.tenancies ?? []).map(toHoldTenancy),
      })),
      todayInVietnam(),
    ),
  );
  return {
    ...toOwnerProperty(property),
    address_line: property.addressLine,
    ward: property.ward,
    unit_count: property.units.length,
    eligible_unit_count: property.units.filter(
      (unit) =>
        unit.isMarketed && unit.operationalStatus === "READY",
    ).length,
    occupancy,
    listing: listing
      ? {
          id: listing.id,
          title: listing.title,
          moderation_status: moderationStatus(listing.moderationStatus),
          publication_status: publicationStatus(
            listing.publicationStatus,
          ),
          admin_suspended_at:
            listing.adminSuspendedAt?.toISOString() ?? null,
        }
      : null,
  };
}

export function toOwnerPropertyDetail(
  property: Property & { units: Unit[] },
): OwnerPropertyDetail {
  return {
    ...toOwnerProperty(property),
    address_line: property.addressLine,
    ward: property.ward,
    description: property.description,
    content_revision: property.contentRevision,
    shared_amenities: toAmenityDocument(property.sharedAmenities),
    policies: toOwnerPolicies(property.policies),
    units: property.units.map(toOwnerUnit),
  };
}

function moderationStatus(value: string) {
  const allowed: OwnerListing["moderation_status"][] = [
    "DRAFT",
    "PENDING",
    "APPROVED",
    "REJECTED",
  ];
  return allowed.find((status) => status === value) ?? "DRAFT";
}

function publicationStatus(value: string) {
  const allowed: OwnerListing["publication_status"][] = [
    "DRAFT",
    "PUBLISHED",
    "HIDDEN",
  ];
  return allowed.find((status) => status === value) ?? "DRAFT";
}

export function toOwnerListing(
  listing: ListingWithRevision,
): OwnerListing {
  return {
    id: listing.id,
    property_id: listing.propertyId,
    client_operation_id: listing.id,
    title: listing.title,
    description: listing.description,
    cover_media_id: listing.coverMediaId,
    moderation_status: moderationStatus(listing.moderationStatus),
    publication_status: publicationStatus(listing.publicationStatus),
    submitted_revision: null,
    submitted_content_revision: listing.submittedContentRevision,
    approved_content_revision: listing.approvedContentRevision,
    review_reason: listing.reviewReason,
    admin_suspended_at:
      listing.adminSuspendedAt?.toISOString() ?? null,
    archived_at: listing.archivedAt?.toISOString() ?? null,
    property_content_revision:
      listing.property?.contentRevision ?? 1,
  };
}

export function toOwnerMedia(
  propertyId: string,
  item: MediaRecord,
): OwnerPropertyMedia {
  return {
    id: item.id,
    property_id: propertyId,
    unit_id: item.unitId,
    caption: item.caption,
    sort_order: item.sortOrder,
    is_selected_for_listing: item.isSelectedForListing,
    revision: 1,
    mime_type: item.mimeType,
    size_bytes: item.sizeBytes,
    preview_url: item.signedUrl,
    assigned_unit_ids: item.assignedUnitIds,
  };
}

export function toUnitInput(value: unknown) {
  const unit = asObject(camelize(value));
  const policyOverrides = asObject(unit.policyOverrides);
  const overrides = asObject(policyOverrides.overrides);
  const additionalRules =
    policyOverrides.additionalRules ??
    policyOverrides.additional_rules ??
    [];
  return {
    label: unit.label,
    unitKind: unit.unitKind,
    areaM2: unit.areaM2 ?? null,
    bedrooms: unit.bedrooms ?? 0,
    bathrooms: unit.bathrooms ?? 0,
    bathroomArrangement: unit.bathroomArrangement ?? "PRIVATE",
    advertisedMonthlyRent: unit.advertisedMonthlyRent ?? null,
    deposit: unit.deposit ?? null,
    minimumRentalMonths: unit.minimumRentalMonths ?? 3,
    maxOccupants: unit.maxOccupants ?? null,
    description: unit.description ?? null,
    floor: unit.floor ?? null,
    operationalStatus: unit.operationalStatus,
    isMarketed: unit.isMarketed,
    amenities:
      unit.amenities === undefined
        ? undefined
        : restoreAmenityDocument(unit.amenities),
    policyOverrides: {
      schema_version: 1,
      overrides: Object.keys(overrides).length > 0
        ? overrides
        : {
            ...(policyOverrides.pets
              ? { pets: policyOverrides.pets }
              : {}),
            ...(policyOverrides.smoking
              ? { smoking: policyOverrides.smoking }
              : {}),
          },
      additional_rules: additionalRules,
    },
  };
}
