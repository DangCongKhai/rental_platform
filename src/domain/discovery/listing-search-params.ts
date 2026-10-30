import { z } from "zod";
import { AMENITY_CATALOG } from "@/domain/amenities";
import { locationQueryFromInput, type LocationQuery } from "./location-query";

export const UNIT_KINDS = ["ROOM", "STUDIO", "APARTMENT", "HOUSE"] as const;
export const PET_VALUES = ["ALLOWED", "ASK_OWNER", "NOT_ALLOWED"] as const;

export type UnitKind = (typeof UNIT_KINDS)[number];
export type PetPolicy = (typeof PET_VALUES)[number];

export type ListingSearchFilters = {
  location: LocationQuery | null;
  moveInDate: string | null;
  minRent: number | null;
  maxRent: number | null;
  unitKind: UnitKind | null;
  bedrooms: number | null;
  bathrooms: number | null;
  occupants: number | null;
  amenityKeys: string[];
  pets: PetPolicy | null;
  page: number;
  perPage: number;
};

export class ListingSearchValidationError extends Error {
  readonly field: string;

  constructor(field: string, message: string) {
    super(message);
    this.name = "ListingSearchValidationError";
    this.field = field;
  }
}

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/u).refine((value) => {
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}, "Ngày không hợp lệ.");

const optionalNumber = z
  .string()
  .trim()
  .optional()
  .transform((value) => (value ? Number(value) : null))
  .refine((value) => value === null || (Number.isInteger(value) && value >= 0), "Số không hợp lệ.");

function first(input: URLSearchParams, key: string): string | undefined {
  const value = input.get(key);
  if (value == null || value.trim() === "") return undefined;
  return value;
}

function fail(field: string, message: string): never {
  throw new ListingSearchValidationError(field, message);
}

export function parseListingSearchParams(input: URLSearchParams): ListingSearchFilters {
  const location = locationQueryFromInput(input.get("location"));

  let moveInDate: string | null = null;
  const rawMoveIn = first(input, "move_in_date");
  if (rawMoveIn) {
    const parsed = isoDate.safeParse(rawMoveIn);
    if (!parsed.success) fail("move_in_date", "Ngày thuê không hợp lệ.");
    moveInDate = parsed.data;
  }

  const minRent = parseMoney(input, "min_rent");
  const maxRent = parseMoney(input, "max_rent");
  if (minRent != null && maxRent != null && minRent > maxRent) {
    fail("max_rent", "Mức giá tối đa phải lớn hơn mức tối thiểu.");
  }

  const unitKindRaw = first(input, "unit_kind");
  let unitKind: UnitKind | null = null;
  if (unitKindRaw) {
    if (!UNIT_KINDS.includes(unitKindRaw as UnitKind)) fail("unit_kind", "Loại phòng không hợp lệ.");
    unitKind = unitKindRaw as UnitKind;
  }

  const bedrooms = parseAtLeastZero(input, "bedrooms");
  const bathrooms = parseAtLeastZero(input, "bathrooms");
  const occupants = parseCount(input, "occupants");

  const amenityKeys: string[] = [];
  const catalogKeys = new Set(AMENITY_CATALOG.map((item) => item.key));
  for (const key of [...input.getAll("amenities"), ...input.getAll("amenities[]")]) {
    if (!key) continue;
    if (!catalogKeys.has(key as (typeof AMENITY_CATALOG)[number]["key"])) {
      fail("amenities", "Tiện ích không hợp lệ.");
    }
    if (!amenityKeys.includes(key)) amenityKeys.push(key);
  }

  const petsRaw = first(input, "pets");
  let pets: PetPolicy | null = null;
  if (petsRaw) {
    if (!PET_VALUES.includes(petsRaw as PetPolicy)) fail("pets", "Chính sách thú cưng không hợp lệ.");
    pets = petsRaw as PetPolicy;
  }

  const page = parseCount(input, "page") ?? 1;
  const perPageRaw = parseCount(input, "per_page") ?? 12;
  if (page < 1) fail("page", "Trang không hợp lệ.");
  if (perPageRaw < 1 || perPageRaw > 20) fail("per_page", "Số tin mỗi trang không hợp lệ.");

  return {
    location,
    moveInDate,
    minRent,
    maxRent,
    unitKind,
    bedrooms,
    bathrooms,
    occupants,
    amenityKeys,
    pets,
    page,
    perPage: perPageRaw,
  };
}

function parseMoney(input: URLSearchParams, key: string): number | null {
  const raw = first(input, key);
  if (!raw) return null;
  const parsed = optionalNumber.safeParse(raw);
  if (!parsed.success || parsed.data == null) fail(key, "Mức giá không hợp lệ.");
  return parsed.data;
}

function parseAtLeastZero(input: URLSearchParams, key: string): number | null {
  const raw = first(input, key);
  if (!raw) return null;
  const parsed = optionalNumber.safeParse(raw);
  if (!parsed.success || parsed.data == null) fail(key, "Số không hợp lệ.");
  return parsed.data;
}

function parseCount(input: URLSearchParams, key: string): number | null {
  const raw = first(input, key);
  if (!raw) return null;
  const parsed = optionalNumber.safeParse(raw);
  if (!parsed.success || parsed.data == null || parsed.data < 1) fail(key, "Số không hợp lệ.");
  return parsed.data;
}

export function toListingSearchParams(filters: ListingSearchFilters): URLSearchParams {
  const params = new URLSearchParams();
  if (filters.location) params.set("location", filters.location.value);
  if (filters.moveInDate) params.set("move_in_date", filters.moveInDate);
  if (filters.minRent != null) params.set("min_rent", String(filters.minRent));
  if (filters.maxRent != null) params.set("max_rent", String(filters.maxRent));
  if (filters.unitKind) params.set("unit_kind", filters.unitKind);
  if (filters.bedrooms != null) params.set("bedrooms", String(filters.bedrooms));
  if (filters.bathrooms != null) params.set("bathrooms", String(filters.bathrooms));
  if (filters.occupants != null) params.set("occupants", String(filters.occupants));
  for (const key of filters.amenityKeys) params.append("amenities", key);
  if (filters.pets) params.set("pets", filters.pets);
  params.set("page", String(filters.page));
  if (filters.perPage !== 12) params.set("per_page", String(filters.perPage));
  return params;
}

export function clearLocation(filters: ListingSearchFilters): ListingSearchFilters {
  return { ...filters, location: null, page: 1 };
}

export function homeSearchHref(location: string, minRent: string, maxRent: string): string {
  const params = toListingSearchParams(
    parseListingSearchParams(
      new URLSearchParams({
        ...(location.trim() ? { location } : {}),
        ...(minRent.trim() ? { min_rent: minRent } : {}),
        ...(maxRent.trim() ? { max_rent: maxRent } : {}),
      }),
    ),
  );
  const query = params.toString();
  return query ? `/listings?${query}` : "/listings";
}
