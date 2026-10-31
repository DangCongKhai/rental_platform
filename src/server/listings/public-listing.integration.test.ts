import "dotenv/config";
import { afterEach, describe, expect, it } from "vitest";
import { parseListingSearchParams } from "@/domain/discovery/listing-search-params";
import { prisma } from "../db";
import { getPublicListing } from "./public-listing";
import { blockUnit, cleanupPublicListings, publishedListing } from "./public-listing-fixture";

const databaseUrl = process.env.DATABASE_URL;

describe.skipIf(!databaseUrl)("public listing fixture", { timeout: 30_000 }, () => {
  afterEach(async () => {
    await cleanupPublicListings();
  });

  it("publishes a listing and blocks one unit", async () => {
    const listing = await publishedListing();
    await blockUnit(listing.unitIds[0], "2026-07-01", "2026-07-31");

    const stored = await prisma.listing.findUniqueOrThrow({
      where: { id: listing.listingId },
      include: { property: { include: { units: true, media: true } } },
    });
    expect(stored.publicationStatus).toBe("PUBLISHED");
    expect(stored.moderationStatus).toBe("APPROVED");
    expect(stored.coverMediaId).toBe(listing.coverMediaId);
    expect(stored.property.units).toHaveLength(1);
    expect(stored.property.media.some((media) => media.unitId == null)).toBe(true);

    const tenancy = await prisma.tenancy.findFirstOrThrow({
      where: { unitId: listing.unitIds[0] },
    });
    expect(tenancy.status).toBe("PENDING_CONFIRMATION");
    expect(tenancy.pendingContractId).not.toBeNull();
  });

  it("shows a reused property photo in the selected unit gallery", async () => {
    const listing = await publishedListing();
    await prisma.unitMedia.create({
      data: {
        unitId: listing.unitIds[0]!,
        mediaId: listing.coverMediaId,
        sortOrder: 0,
        isSelectedForListing: true,
      },
    });

    const publicListing = await getPublicListing(
      listing.listingId,
      parseListingSearchParams(new URLSearchParams()),
      "2026-10-31",
    );

    expect(publicListing?.gallery.map((photo) => photo.id)).toContain(listing.coverMediaId);
    expect(publicListing?.units[0]?.photos.map((photo) => photo.id)).toContain(listing.coverMediaId);
  });
});
