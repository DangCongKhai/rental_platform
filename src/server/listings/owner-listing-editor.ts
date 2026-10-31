import { checkListingCompleteness } from "@/domain/listings/completeness";
import { validateAmenities } from "@/domain/amenities";
import { validatePropertyPolicies, validateUnitPolicyOverrides } from "@/domain/policies";
import { requireUser } from "@/server/auth";
import { prisma } from "@/server/db";
import { getPropertyMedia } from "@/server/property-media";

export async function getOwnerListingEditor(propertyId: string) {
  const user = await requireUser();
  const property = await prisma.property.findFirst({
    where: { id: propertyId, ownerId: user.profileId, archivedAt: null },
    include: {
      units: {
        where: { archivedAt: null },
        orderBy: [{ createdAt: "asc" }, { id: "asc" }],
        include: {
          media: { where: { deletedAt: null, purgedAt: null, isSelectedForListing: true }, select: { id: true } },
          mediaAssignments: {
            where: { isSelectedForListing: true, media: { deletedAt: null, purgedAt: null } },
            select: { mediaId: true },
          },
        },
      },
      media: {
        where: { unitId: null, deletedAt: null, purgedAt: null, isSelectedForListing: true },
        select: { id: true },
      },
      listings: { where: { archivedAt: null }, take: 1 },
    },
  });
  if (!property) return null;

  const listing = property.listings[0] ?? null;
  const propertyPolicies = validatePropertyPolicies(property.policies);
  const unitData = property.units.map((unit) => ({
    id: unit.id,
    label: unit.label,
    isMarketed: unit.isMarketed,
    description: unit.description,
    areaM2: unit.areaM2 === null ? null : Number(unit.areaM2),
    advertisedMonthlyRent: unit.advertisedMonthlyRent === null ? null : Number(unit.advertisedMonthlyRent),
    deposit: unit.deposit === null ? null : Number(unit.deposit),
    minimumRentalMonths: unit.minimumRentalMonths,
    maxOccupants: unit.maxOccupants,
    hasSelectedPhoto: unit.media.length > 0 || unit.mediaAssignments.length > 0,
    policiesValid: validateAmenities(unit.amenities, "UNIT").success && validateUnitPolicyOverrides(unit.policyOverrides).success,
  }));
  const media = await getPropertyMedia(property.id);
  const photos = media.filter((item) => item.unitId === null && item.isSelectedForListing && item.signedUrl);
  const listingValues = listing ?? { title: "", description: "", coverMediaId: null };
  const issues = checkListingCompleteness({
    title: listingValues.title,
    description: listingValues.description,
    addressLine: property.addressLine,
    city: property.city,
    propertyDescription: property.description,
    hasSelectedSharedPhoto: property.media.length > 0,
    hasSelectedCover: Boolean(listingValues.coverMediaId && property.media.some((item) => item.id === listingValues.coverMediaId)),
    policiesValid: propertyPolicies.success && unitData.every((unit) => unit.policiesValid),
    units: unitData,
  });

  return {
    property: {
      id: property.id,
      name: property.name,
      addressLine: property.addressLine,
      ward: property.ward,
      city: property.city,
      description: property.description,
      contentRevision: property.contentRevision,
    },
    units: unitData.map((unit) => ({
      id: unit.id,
      label: unit.label,
      isMarketed: unit.isMarketed,
      description: unit.description,
      areaM2: unit.areaM2,
      advertisedMonthlyRent: unit.advertisedMonthlyRent,
      deposit: unit.deposit,
      minimumRentalMonths: unit.minimumRentalMonths,
      maxOccupants: unit.maxOccupants,
      hasSelectedPhoto: unit.hasSelectedPhoto,
    })),
    photos: photos.map(({ id, caption, signedUrl }) => ({ id, caption, signedUrl })),
    listing: listing ? {
      id: listing.id,
      title: listing.title,
      description: listing.description,
      coverMediaId: listing.coverMediaId,
      moderationStatus: listing.moderationStatus,
      publicationStatus: listing.publicationStatus,
      submittedContentRevision: listing.submittedContentRevision,
      reviewReason: listing.reviewReason,
      adminSuspendedAt: listing.adminSuspendedAt,
      suspensionReason: listing.suspensionReason,
    } : null,
    issues,
  };
}

export async function getOwnerListingEditorById(listingId: string) {
  const user = await requireUser();
  const listing = await prisma.listing.findFirst({
    where: {
      id: listingId,
      archivedAt: null,
      property: { ownerId: user.profileId, archivedAt: null },
    },
    select: { propertyId: true },
  });
  if (!listing) return null;
  return getOwnerListingEditor(listing.propertyId);
}
