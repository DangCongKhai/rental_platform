import { AMENITY_CATALOG, validateAmenities } from "@/domain/amenities";
import {
  describeUnitAvailability,
  type DateBlock,
} from "@/domain/discovery/unit-availability";
import type { ListingSearchFilters } from "@/domain/discovery/listing-search-params";
import {
  resolveEffectivePolicies,
  validatePropertyPolicies,
  validateUnitPolicyOverrides,
} from "@/domain/policies";
import { Prisma } from "../../../generated/prisma/client";
import { prisma } from "../db";
import { searchEligibleUnits } from "./search";
import { publicMediaUrl } from "./public-media-url";

export type PublicAmenity = {
  key: string;
  label_vi: string;
  details: string | null;
};

export type PublicPhoto = {
  id: string;
  caption: string | null;
  sortOrder: number;
  url: string;
};

export type PublicUnit = {
  id: string;
  label: string;
  unitKind: string;
  description: string | null;
  bedrooms: number;
  bathrooms: string;
  areaM2: string | null;
  rent: string;
  deposit: string | null;
  minimumRentalMonths: number;
  maxOccupants: number | null;
  availabilityLabel: string;
  availableFrom: string | null;
  availableUntil: string | null;
  heldStart: string | null;
  heldEnd: string | null;
  pets: string;
  amenities: PublicAmenity[];
  customAmenities: string[];
  additionalRules: string[];
  photos: PublicPhoto[];
};

export type PublicListing = {
  id: string;
  title: string;
  description: string;
  property: {
    name: string;
    propertyType: string;
    addressLine: string;
    ward: string | null;
    city: string | null;
    description: string;
    sharedAmenities: PublicAmenity[];
    customAmenities: string[];
    sharedRules: string[];
    pets: string;
    smoking: string;
  };
  ownerName: string | null;
  units: PublicUnit[];
  gallery: PublicPhoto[];
};

function amenityList(value: unknown): PublicAmenity[] {
  const parsed = validateAmenities(value, "PROPERTY");
  const unitParsed = parsed.success ? null : validateAmenities(value, "UNIT");
  const data = parsed.success ? parsed.data : unitParsed?.success ? unitParsed.data : null;
  if (!data) return [];
  return Object.entries(data.standard)
    .filter(([, entry]) => entry.enabled)
    .flatMap(([key, entry]) => {
      const definition = AMENITY_CATALOG.find((item) => item.key === key);
      if (!definition) return [];
      return [{ key, label_vi: definition.label, details: entry.details ?? null }];
    });
}

function enabledAmenities(value: unknown): { keys: string[]; custom: string[] } {
  const parsed = validateAmenities(value, "PROPERTY");
  const unitParsed = parsed.success ? null : validateAmenities(value, "UNIT");
  const data = parsed.success ? parsed.data : unitParsed?.success ? unitParsed.data : null;
  if (!data) return { keys: [], custom: [] };
  return {
    keys: Object.entries(data.standard)
      .filter(([, entry]) => entry.enabled)
      .map(([key]) => key),
    custom: data.custom,
  };
}

function digit(value: { toFixed: (digits: number) => string } | null): string | null {
  if (!value) return null;
  return value.toFixed(0);
}

function photoOf(media: { id: string; caption: string | null; sortOrder: number; storagePath: string }): PublicPhoto {
  return {
    id: media.id,
    caption: media.caption,
    sortOrder: media.sortOrder,
    url: publicMediaUrl(media.storagePath) ?? "",
  };
}

export async function getPublicListing(
  id: string,
  filters: ListingSearchFilters,
  today: string,
): Promise<PublicListing | null> {
  const listing = await prisma.listing.findFirst({
    where: {
      id,
      publicationStatus: "PUBLISHED",
      moderationStatus: "APPROVED",
      archivedAt: null,
      adminSuspendedAt: null,
      property: { archivedAt: null },
    },
    include: {
      property: {
        include: {
          owner: { select: { fullName: true } },
          media: true,
          units: { include: { media: true, mediaAssignments: { include: { media: true } } } },
        },
      },
    },
  });

  if (!listing) return null;
  const property = listing.property;
  if (!property.addressLine?.trim() || !property.city?.trim() || !property.description?.trim()) {
    return null;
  }

  const eligible = await searchEligibleUnits(
    { ...filters, moveInDate: null },
    today,
    { listingId: id, requireFree: false },
  );
  const eligibleIds = new Set(eligible.map((row) => row.unitId));
  const unitIds = [...eligibleIds];
  const blockRows = unitIds.length
    ? await prisma.$queryRaw<Array<{ unit_id: string; start: string; end: string }>>`
        SELECT unit_id::text AS unit_id,
               blocked_start_date::text AS start,
               blocked_end_date::text AS end
        FROM tenancies
        WHERE unit_id IN (${Prisma.join(unitIds.map((unitId) => Prisma.sql`${unitId}::uuid`))})
          AND status IN ('PENDING_CONFIRMATION', 'CONFIRMED', 'ACTIVE')
          AND blocked_start_date IS NOT NULL
          AND blocked_end_date IS NOT NULL
      `
    : [];
  const blocks = new Map<string, DateBlock[]>();
  for (const row of blockRows) {
    const list = blocks.get(row.unit_id) ?? [];
    list.push({ start: row.start, end: row.end });
    blocks.set(row.unit_id, list);
  }

  const propertyPolicies = validatePropertyPolicies(property.policies);
  const shared = enabledAmenities(property.sharedAmenities);
  const liveMedia = property.media.filter(
    (item) => item.deletedAt == null && item.purgedAt == null && item.isSelectedForListing,
  );

  const units = property.units
    .filter((unit) => eligibleIds.has(unit.id))
    .sort((left, right) => left.label.localeCompare(right.label, "vi"))
    .map((unit) => {
      const unitBlocks = blocks.get(unit.id) ?? [];
      const availability = describeUnitAvailability(today, unitBlocks);
      const covering = unitBlocks.find((block) => block.start <= today && today <= block.end) ?? null;
      const overrides = validateUnitPolicyOverrides(unit.policyOverrides);
      const effective = propertyPolicies.success && overrides.success
        ? resolveEffectivePolicies(propertyPolicies.data, overrides.data)
        : null;
      const ownAmenities = enabledAmenities(unit.amenities);
      const heldLabel = availability.availableNow
        ? availability.label
        : `${availability.label}`;
      const unitPhotos = [
        ...unit.mediaAssignments
          .filter((assignment) =>
            assignment.isSelectedForListing &&
            assignment.media.deletedAt == null &&
            assignment.media.purgedAt == null,
          )
          .sort((left, right) => left.sortOrder - right.sortOrder)
          .map((assignment) => ({ ...assignment.media, sortOrder: assignment.sortOrder })),
        ...unit.media
          .filter((item) => item.deletedAt == null && item.purgedAt == null && item.isSelectedForListing)
          .sort((left, right) => left.sortOrder - right.sortOrder),
      ];

      return {
        id: unit.id,
        label: unit.label,
        unitKind: unit.unitKind,
        description: unit.description,
        bedrooms: unit.bedrooms,
        bathrooms: unit.bathrooms.toFixed(0),
        areaM2: digit(unit.areaM2),
        rent: digit(unit.advertisedMonthlyRent) ?? "0",
        deposit: digit(unit.deposit),
        minimumRentalMonths: unit.minimumRentalMonths,
        maxOccupants: unit.maxOccupants,
        availabilityLabel: heldLabel,
        availableFrom: availability.availableFrom,
        availableUntil: availability.availableUntil,
        heldStart: covering?.start ?? null,
        heldEnd: covering?.end ?? null,
        pets: effective?.defaults.pets ?? "ASK_OWNER",
        amenities: amenityList(unit.amenities),
        customAmenities: ownAmenities.custom,
        additionalRules: effective?.additional_rules ?? [],
        photos: unitPhotos.map(photoOf),
      };
    });

  return {
    id: listing.id,
    title: listing.title,
    description: listing.description,
    property: {
      name: property.name,
      propertyType: property.propertyType,
      addressLine: property.addressLine ?? "",
      ward: property.ward,
      city: property.city,
      description: property.description ?? "",
      sharedAmenities: amenityList(property.sharedAmenities),
      customAmenities: shared.custom,
      sharedRules: propertyPolicies.success ? propertyPolicies.data.shared_rules : [],
      pets: propertyPolicies.success ? propertyPolicies.data.defaults.pets : "ASK_OWNER",
    smoking: propertyPolicies.success ? propertyPolicies.data.defaults.smoking : "NOT_ALLOWED",
  },
  ownerName: property.owner.fullName,
    units,
    gallery: liveMedia
      .filter((item) => item.unitId == null)
      .sort((left, right) => left.sortOrder - right.sortOrder)
      .map(photoOf),
  };
}
