import { AMENITY_CATALOG } from "@/domain/amenities";
import { MIN_WORD_SIMILARITY } from "@/domain/discovery/location-query";
import {
  describeUnitAvailability,
  formatDisplayDate,
  stayIsFree,
} from "@/domain/discovery/unit-availability";
import type { ListingSearchFilters } from "@/domain/discovery/listing-search-params";
import { Prisma } from "../../../generated/prisma/client";
import { prisma } from "../db";
import { publicMediaUrl } from "./public-media-url";
import { marketedUnitSql, publiclyVisibleSql } from "./visibility";

export type EligibleUnitRow = {
  listingId: string;
  unitId: string;
  score: number;
  rent: string;
  minimumRentalMonths: number;
  bedrooms: number;
  unitKind: string;
};

type RawEligibleUnit = {
  listing_id: string;
  unit_id: string;
  score: number | string;
  rent: string;
  minimum_rental_months: number;
  bedrooms: number;
  unit_kind: string;
};

export type ListingCardData = {
  id: string;
  title: string;
  availabilityLabel: string;
  availableUnitCount: number;
  rentMin: string;
  rentMax: string;
  minimumRentalMonths: number;
  coverUrl: string | null;
  imageUrls: string[];
  property: {
    name: string;
    propertyType: string;
    ward: string | null;
    city: string | null;
  };
};

export type ListingSearchPage = {
  items: ListingCardData[];
  total: number;
  page: number;
  perPage: number;
  resultLabel: string | null;
};

function folded(column: Prisma.Sql): Prisma.Sql {
  return Prisma.sql`lower(public.immutable_unaccent(${column}))`;
}

function amenityPredicate(key: string): Prisma.Sql {
  const definition = AMENITY_CATALOG.find((item) => item.key === key);
  if (!definition) return Prisma.sql`FALSE`;
  const onProperty = Prisma.sql`p.shared_amenities -> 'standard' -> ${key} ->> 'enabled' = 'true'`;
  const onUnit = Prisma.sql`u.amenities -> 'standard' -> ${key} ->> 'enabled' = 'true'`;
  const scopes: readonly string[] = definition.scopes;
  if (scopes.includes("PROPERTY") && scopes.includes("UNIT")) {
    return Prisma.sql`(${onProperty} OR ${onUnit})`;
  }
  return scopes.includes("PROPERTY") ? onProperty : onUnit;
}

function whereSql(filters: ListingSearchFilters, listingId: string | null, requireFree: boolean): Prisma.Sql {
  const parts: Prisma.Sql[] = [publiclyVisibleSql(), marketedUnitSql()];

  if (listingId) parts.push(Prisma.sql`l.id = ${listingId}::uuid`);

  if (filters.location) {
    const query = filters.location.value;
    const foldedQuery = Prisma.sql`lower(public.immutable_unaccent(${query}))`;
    const address = folded(Prisma.sql`p.address_line`);
    const ward = folded(Prisma.sql`p.ward`);
    const city = folded(Prisma.sql`p.city`);
    parts.push(Prisma.sql`(
      ${address} OPERATOR(extensions.%>) ${foldedQuery}
      OR ${ward} OPERATOR(extensions.%>) ${foldedQuery}
      OR ${city} OPERATOR(extensions.%>) ${foldedQuery}
      OR extensions.word_similarity(${foldedQuery}, ${address}) >= ${MIN_WORD_SIMILARITY}
      OR extensions.word_similarity(${foldedQuery}, ${ward}) >= ${MIN_WORD_SIMILARITY}
      OR extensions.word_similarity(${foldedQuery}, ${city}) >= ${MIN_WORD_SIMILARITY}
    )`);
  }

  if (filters.minRent != null) {
    parts.push(Prisma.sql`u.advertised_monthly_rent >= ${filters.minRent}`);
  }
  if (filters.maxRent != null) {
    parts.push(Prisma.sql`u.advertised_monthly_rent <= ${filters.maxRent}`);
  }
  if (filters.unitKind) parts.push(Prisma.sql`u.unit_kind = ${filters.unitKind}`);
  if (filters.bedrooms != null) parts.push(Prisma.sql`u.bedrooms >= ${filters.bedrooms}`);
  if (filters.bathrooms != null) parts.push(Prisma.sql`u.bathrooms >= ${filters.bathrooms}`);
  if (filters.occupants != null) {
    parts.push(Prisma.sql`(u.max_occupants IS NULL OR u.max_occupants >= ${filters.occupants})`);
  }
  if (filters.pets) {
    parts.push(Prisma.sql`COALESCE(
      u.policy_overrides #>> '{overrides,pets}',
      p.policies #>> '{defaults,pets}'
    ) = ${filters.pets}`);
  }
  for (const key of filters.amenityKeys) parts.push(amenityPredicate(key));

  if (requireFree && filters.moveInDate) {
    parts.push(Prisma.sql`NOT EXISTS (
      SELECT 1 FROM tenancies AS hold
      WHERE hold.unit_id = u.id
        AND hold.status IN ('PENDING_CONFIRMATION', 'CONFIRMED', 'ACTIVE')
        AND hold.blocked_start_date IS NOT NULL
        AND hold.blocked_end_date IS NOT NULL
        AND daterange(hold.blocked_start_date, hold.blocked_end_date + 1, '[)')
            && daterange(
              ${filters.moveInDate}::date,
              (${filters.moveInDate}::date + make_interval(months => u.minimum_rental_months))::date,
              '[)'
            )
    )`);
  }

  return Prisma.join(parts, " AND ");
}

function scoreSql(filters: ListingSearchFilters): Prisma.Sql {
  if (!filters.location) return Prisma.sql`0`;
  const query = filters.location.value;
  const foldedQuery = Prisma.sql`lower(public.immutable_unaccent(${query}))`;
  return Prisma.sql`GREATEST(
    COALESCE(extensions.word_similarity(${foldedQuery}, ${folded(Prisma.sql`p.address_line`)}), 0),
    COALESCE(extensions.word_similarity(${foldedQuery}, ${folded(Prisma.sql`p.ward`)}), 0),
    COALESCE(extensions.word_similarity(${foldedQuery}, ${folded(Prisma.sql`p.city`)}), 0)
  )`;
}

export async function searchEligibleUnits(
  filters: ListingSearchFilters,
  _today: string,
  options: { listingId?: string; requireFree?: boolean } = {},
): Promise<EligibleUnitRow[]> {
  const requireFree = options.requireFree ?? Boolean(filters.moveInDate);
  const score = scoreSql(filters);
  const order = filters.location
    ? Prisma.sql`score DESC, l.id ASC, u.id ASC`
    : Prisma.sql`l.created_at DESC, l.id ASC, u.id ASC`;

  const rows = await prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT set_config('search_path', 'public, extensions', true)`;
    await tx.$queryRaw`SELECT set_config('pg_trgm.word_similarity_threshold', '0.4', true)`;
    return tx.$queryRaw<RawEligibleUnit[]>`
      SELECT
        l.id::text AS listing_id,
        u.id::text AS unit_id,
        ${score} AS score,
        u.advertised_monthly_rent::text AS rent,
        u.minimum_rental_months,
        u.bedrooms,
        u.unit_kind
      FROM units AS u
      JOIN properties AS p ON p.id = u.property_id
      JOIN listings AS l ON l.property_id = p.id
      WHERE ${whereSql(filters, options.listingId ?? null, requireFree)}
      ORDER BY ${order}
    `;
  }, {
    timeout: 20000,
  });

  return rows.map((row) => ({
    listingId: row.listing_id,
    unitId: row.unit_id,
    score: Number(row.score),
    rent: row.rent.split(".")[0],
    minimumRentalMonths: row.minimum_rental_months,
    bedrooms: row.bedrooms,
    unitKind: row.unit_kind,
  }));
}

type BlockRow = { unit_id: string; start: string; end: string };

async function blocksFor(unitIds: string[]): Promise<Map<string, { start: string; end: string }[]>> {
  const grouped = new Map<string, { start: string; end: string }[]>();
  if (unitIds.length === 0) return grouped;

  const rows = await prisma.$queryRaw<BlockRow[]>`
    SELECT unit_id::text AS unit_id,
           blocked_start_date::text AS start,
           blocked_end_date::text AS end
    FROM tenancies
    WHERE unit_id IN (${Prisma.join(unitIds.map((id) => Prisma.sql`${id}::uuid`))})
      AND status IN ('PENDING_CONFIRMATION', 'CONFIRMED', 'ACTIVE')
      AND blocked_start_date IS NOT NULL
      AND blocked_end_date IS NOT NULL
  `;

  for (const row of rows) {
    const blocks = grouped.get(row.unit_id) ?? [];
    blocks.push({ start: row.start, end: row.end });
    grouped.set(row.unit_id, blocks);
  }
  return grouped;
}

function money(value: string): string {
  return value.split(".")[0];
}

export async function searchListings(filters: ListingSearchFilters, today: string): Promise<ListingSearchPage> {
  const rows = await searchEligibleUnits(filters, today);
  const groups: { listingId: string; units: EligibleUnitRow[] }[] = [];
  for (const row of rows) {
    const existing = groups.find((group) => group.listingId === row.listingId);
    if (existing) existing.units.push(row);
    else groups.push({ listingId: row.listingId, units: [row] });
  }

  const perPage = Math.min(Math.max(filters.perPage, 1), 20);
  const page = Math.max(filters.page, 1);
  const pageGroups = groups.slice((page - 1) * perPage, page * perPage);
  const listingIds = pageGroups.map((group) => group.listingId);
  const listings = listingIds.length
    ? await prisma.listing.findMany({
        where: { id: { in: listingIds } },
        select: {
          id: true,
          title: true,
          coverMediaId: true,
          property: {
            select: {
              name: true,
              propertyType: true,
              ward: true,
              city: true,
              media: {
                where: { deletedAt: null, purgedAt: null, isSelectedForListing: true },
                orderBy: { sortOrder: "asc" },
                select: { id: true, storagePath: true },
              },
            },
          },
        },
      })
    : [];
  const listingById = new Map(listings.map((listing) => [listing.id, listing]));
  const blocks = await blocksFor(pageGroups.flatMap((group) => group.units.map((unit) => unit.unitId)));

  const items = pageGroups.flatMap((group) => {
    const listing = listingById.get(group.listingId);
    if (!listing) return [];
    const rents = group.units.map((unit) => Number(unit.rent));
    let availableUnitCount = 0;
    let earliestFree: string | null = null;
    let earliestUntil: string | null = null;
    let freeWithoutUntil = false;
    for (const unit of group.units) {
      const unitBlocks = blocks.get(unit.unitId) ?? [];
      if (filters.moveInDate) {
        if (stayIsFree(filters.moveInDate, unit.minimumRentalMonths, unitBlocks)) availableUnitCount += 1;
        continue;
      }
      const described = describeUnitAvailability(today, unitBlocks);
      if (described.availableNow) {
        availableUnitCount += 1;
        if (described.availableUntil == null) freeWithoutUntil = true;
        else if (earliestUntil == null || described.availableUntil < earliestUntil) {
          earliestUntil = described.availableUntil;
        }
      } else if (described.availableFrom && (earliestFree == null || described.availableFrom < earliestFree)) {
        earliestFree = described.availableFrom;
      }
    }

    const availabilityLabel = availableUnitCount === 0
      ? (earliestFree ? `Trống từ ${formatDisplayDate(earliestFree)}` : "Còn trống")
      : (!freeWithoutUntil && earliestUntil
          ? `Còn trống đến ${formatDisplayDate(earliestUntil)}`
          : "Còn trống");
    const media = listing.property.media;
    const cover = media.find((item) => item.id === listing.coverMediaId) ?? media[0] ?? null;
    const coverUrl = cover ? publicMediaUrl(cover.storagePath) : null;
    const imageUrls = [
      ...(coverUrl ? [coverUrl] : []),
      ...media.flatMap((item) => {
        if (cover && item.id === cover.id) return [];
        const url = publicMediaUrl(item.storagePath);
        return url ? [url] : [];
      }),
    ];

    return [{
      id: listing.id,
      title: listing.title,
      availabilityLabel,
      availableUnitCount,
      rentMin: money(String(Math.min(...rents))),
      rentMax: money(String(Math.max(...rents))),
      minimumRentalMonths: Math.min(...group.units.map((unit) => unit.minimumRentalMonths)),
      coverUrl,
      imageUrls,
      property: {
        name: listing.property.name,
        propertyType: listing.property.propertyType,
        ward: listing.property.ward,
        city: listing.property.city,
      },
    }];
  });

  return {
    items,
    total: groups.length,
    page,
    perPage,
    resultLabel: filters.moveInDate
      ? `${groups.length} tin đăng còn trống từ ${formatDisplayDate(filters.moveInDate)}`
      : null,
  };
}
