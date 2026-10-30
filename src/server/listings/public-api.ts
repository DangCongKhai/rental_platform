import { AMENITY_CATALOG } from "@/domain/amenities";
import {
  ListingSearchValidationError,
  parseListingSearchParams,
} from "@/domain/discovery/listing-search-params";
import { todayInVietnam } from "@/domain/discovery/unit-availability";
import { getPublicListing, type PublicListing } from "./public-listing";
import { searchListings, type ListingCardData, type ListingSearchPage } from "./search";

const LISTING_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function amenityCatalogJson() {
  return {
    data: AMENITY_CATALOG.map((item) => ({
      key: item.key,
      scope: item.scopes[0],
      label_vi: item.label,
    })),
  };
}

function cardJson(card: ListingCardData) {
  return {
    id: card.id,
    title: card.title,
    availability_label: card.availabilityLabel,
    available_unit_count: card.availableUnitCount,
    rent_min: card.rentMin,
    rent_max: card.rentMax,
    minimum_rental_months: card.minimumRentalMonths,
    cover_url: card.coverUrl,
    image_urls: card.imageUrls,
    property: {
      name: card.property.name,
      property_type: card.property.propertyType,
      ward: card.property.ward,
      city: card.property.city,
    },
  };
}

function pageMeta(page: ListingSearchPage, moveInDate: string | null) {
  const meta: {
    current_page: number;
    per_page: number;
    total: number;
    last_page: number;
    result_label?: string;
  } = {
    current_page: page.page,
    per_page: page.perPage,
    total: page.total,
    last_page: Math.max(1, Math.ceil(page.total / page.perPage)),
  };
  if (moveInDate && page.resultLabel) meta.result_label = page.resultLabel;
  return meta;
}

export async function listingsIndexJson(params: URLSearchParams) {
  const filters = parseListingSearchParams(params);
  const page = await searchListings(filters, todayInVietnam());
  return {
    data: page.items.map(cardJson),
    meta: pageMeta(page, filters.moveInDate),
  };
}

function detailJson(listing: PublicListing) {
  return {
    id: listing.id,
    title: listing.title,
    description: listing.description,
    availability_label: listing.units.some((unit) => unit.availableFrom == null)
      ? "Còn trống"
      : listing.units[0]?.availabilityLabel ?? "Còn trống",
    available_unit_count: listing.units.filter((unit) => unit.availableFrom == null).length,
    gallery: listing.gallery.map((photo) => ({
      id: photo.id,
      caption: photo.caption,
      sort_order: photo.sortOrder,
      url: photo.url,
    })),
    property: {
      name: listing.property.name,
      property_type: listing.property.propertyType,
      address_line: listing.property.addressLine,
      ward: listing.property.ward,
      city: listing.property.city,
      description: listing.property.description,
      shared_rules: listing.property.sharedRules,
      shared_amenities: listing.property.sharedAmenities,
      custom_amenities: listing.property.customAmenities,
    },
    owner: { name: listing.ownerName },
    units: listing.units.map((unit) => ({
      id: unit.id,
      label: unit.label,
      unit_kind: unit.unitKind,
      description: unit.description,
      area_m2: unit.areaM2,
      bedrooms: unit.bedrooms,
      bathrooms: unit.bathrooms,
      advertised_monthly_rent: unit.rent,
      deposit: unit.deposit,
      minimum_rental_months: unit.minimumRentalMonths,
      max_occupants: unit.maxOccupants,
      availability_label: unit.availabilityLabel,
      available_from: unit.availableFrom,
      available_until: unit.availableUntil,
      held_start: unit.heldStart,
      held_end: unit.heldEnd,
      pets: unit.pets,
      amenities: unit.amenities,
      custom_amenities: unit.customAmenities,
      photos: unit.photos.map((photo) => ({
        id: photo.id,
        caption: photo.caption,
        sort_order: photo.sortOrder,
        url: photo.url,
      })),
    })),
  };
}

export async function listingDetailJson(id: string) {
  if (!LISTING_ID.test(id)) return null;
  const listing = await getPublicListing(id, parseListingSearchParams(new URLSearchParams()), todayInVietnam());
  if (!listing) return null;
  return { data: detailJson(listing) };
}

export function validationResponse(error: unknown): { status: 422; body: { message: string } } | null {
  if (!(error instanceof ListingSearchValidationError)) return null;
  return { status: 422, body: { message: error.message } };
}
