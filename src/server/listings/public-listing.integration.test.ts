import "dotenv/config";
import { afterEach, describe, expect, it } from "vitest";
import { parseListingSearchParams } from "@/domain/discovery/listing-search-params";
import { prisma } from "../db";
import { getPublicListing } from "./public-listing";
import {
  blockUnit,
  cleanupPublicListings,
  publishedListing,
} from "./public-listing-fixture";

const databaseUrl = process.env.DATABASE_URL;

describe.skipIf(!databaseUrl)(
  "public listing fixture",
  { timeout: 30_000 },
  () => {
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
      expect(stored.coverMediaId).toBeNull();
      expect(stored.property.units).toHaveLength(1);
      expect(stored.property.media).toHaveLength(0);

      const tenancy = await prisma.tenancy.findFirstOrThrow({
        where: { unitId: listing.unitIds[0] },
      });
      expect(tenancy.status).toBe("PENDING_CONFIRMATION");
      expect(tenancy.pendingContractId).not.toBeNull();
    });

    it("publishes with an empty gallery when no photo was uploaded", async () => {
      const listing = await publishedListing({
        rentalArrangement: "WHOLE_SPACE",
      });
      const publicListing = await getPublicListing(
        listing.listingId,
        parseListingSearchParams(new URLSearchParams()),
        "2026-10-31",
      );

      expect(publicListing?.gallery).toEqual([]);
      expect(publicListing?.units[0]?.photos).toEqual([]);
    });
  },
);
