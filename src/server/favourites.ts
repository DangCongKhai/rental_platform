"use server";

import { z } from "zod";
import { requireUser } from "./auth";
import { ActionError, runAction } from "./action";
import { prisma } from "./db";
import { publicMediaUrl } from "./listings/public-media-url";
import type { ListingCard } from "@/features/discovery/listings-api";

export type Favourite =
  | { propertyId: string; available: false }
  | { propertyId: string; available: true; card: ListingCard };

const publicListingWhere = {
  publicationStatus: "PUBLISHED",
  moderationStatus: "APPROVED",
  archivedAt: null,
  adminSuspendedAt: null,
  property: {
    archivedAt: null,
    units: { some: { archivedAt: null } },
  },
} as const;

async function publicCards(propertyIds: string[]) {
  const cards = new Map<string, ListingCard>();
  if (propertyIds.length === 0) return cards;
  const listings = await prisma.listing.findMany({
    where: { propertyId: { in: propertyIds }, ...publicListingWhere },
    orderBy: { id: "asc" },
    select: {
      id: true,
      propertyId: true,
      title: true,
      coverMediaId: true,
      property: {
        select: {
          name: true,
          propertyType: true,
          ward: true,
          city: true,
          units: {
            where: { archivedAt: null },
            select: {
              advertisedMonthlyRent: true,
              minimumRentalMonths: true,
              operationalStatus: true,
            },
          },
          media: {
            where: {
              deletedAt: null,
              purgedAt: null,
              isSelectedForListing: true,
            },
            orderBy: { sortOrder: "asc" },
            select: { id: true, storagePath: true },
          },
        },
      },
    },
  });
  for (const listing of listings) {
    if (cards.has(listing.propertyId)) continue;
    const rents = listing.property.units
      .map((unit) => Number(unit.advertisedMonthlyRent))
      .filter((rent) => Number.isFinite(rent));
    if (rents.length === 0) continue;
    const photos = listing.property.media
      .map((item) => publicMediaUrl(item.storagePath))
      .filter((url): url is string => url != null);
    const cover = listing.property.media.find(
      (item) => item.id === listing.coverMediaId,
    );
    cards.set(listing.propertyId, {
      id: listing.id,
      property_id: listing.propertyId,
      title: listing.title,
      availability_label: "Còn trống",
      available_unit_count: listing.property.units.filter(
        (unit) => unit.operationalStatus === "READY",
      ).length,
      rent_min: String(Math.min(...rents)),
      rent_max: String(Math.max(...rents)),
      minimum_rental_months: Math.min(
        ...listing.property.units.map((unit) => unit.minimumRentalMonths),
      ),
      cover_url: cover
        ? publicMediaUrl(cover.storagePath)
        : (photos[0] ?? null),
      image_urls: photos,
      property: {
        name: listing.property.name,
        property_type: listing.property.propertyType,
        ward: listing.property.ward,
        city: listing.property.city ?? "",
      },
    });
  }
  return cards;
}

export async function saveFavourite(propertyId: string) {
  return runAction(async () => {
    const user = await requireUser();
    // Seed ids are Postgres uuids whose variant nibble is 0, so z.uuid() rejects them.
    if (!z.guid().safeParse(propertyId).success)
      throw new ActionError("NOT_FOUND", "Tin đăng không khả dụng.");
    const saved = await prisma.$queryRaw<Array<{ save_favourite: boolean }>>`
      SELECT save_favourite(${user.profileId}::uuid, ${propertyId}::uuid)
    `;
    if (!saved[0]?.save_favourite)
      throw new ActionError("NOT_FOUND", "Tin đăng không khả dụng.");
  });
}

export async function removeFavourite(propertyId: string) {
  return runAction(async () => {
    const user = await requireUser();
    if (!z.guid().safeParse(propertyId).success)
      throw new ActionError("NOT_FOUND", "Tin đăng không khả dụng.");
    await prisma.favouriteProperty.deleteMany({
      where: { userId: user.profileId, propertyId },
    });
  });
}

export async function getMyFavouriteIds(): Promise<string[]> {
  const user = await requireUser();
  return (
    await prisma.favouriteProperty.findMany({
      where: { userId: user.profileId },
      select: { propertyId: true },
    })
  ).map((row) => row.propertyId);
}

export async function getMyFavourites(): Promise<Favourite[]> {
  const user = await requireUser();
  const rows = await prisma.favouriteProperty.findMany({
    where: { userId: user.profileId },
    select: { propertyId: true },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
  });
  const cards = await publicCards(rows.map((row) => row.propertyId));
  return rows.map(({ propertyId }): Favourite => {
    const card = cards.get(propertyId);
    return card
      ? { propertyId, available: true, card }
      : { propertyId, available: false };
  });
}
