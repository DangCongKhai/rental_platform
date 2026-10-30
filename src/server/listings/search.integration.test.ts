import "dotenv/config";
import { afterEach, describe, expect, it } from "vitest";
import { parseListingSearchParams } from "@/domain/discovery/listing-search-params";
import { prisma } from "../db";
import { getPublicListing } from "./public-listing";
import { blockUnit, cleanupPublicListings, publishedListing } from "./public-listing-fixture";
import { searchEligibleUnits, searchListings } from "./search";

const TODAY = "2026-11-01";
const databaseUrl = process.env.DATABASE_URL;

function filters(query = "") {
  return parseListingSearchParams(new URLSearchParams(query));
}

describe.skipIf(!databaseUrl)("public listing search", { timeout: 30_000 }, () => {
  afterEach(async () => {
    await cleanupPublicListings();
  });

  it("matches a stored ward with accents, missing accents, and a small typo", async () => {
    const haiChau = await publishedListing({ ward: "Hải Châu" });
    const sonTra = await publishedListing({ ward: "Sơn Trà", addressLine: "1 Võ Nguyên Giáp" });
    const hidden = await publishedListing({ ward: "Hải Châu", publicationStatus: "HIDDEN" });

    for (const query of ["hải   châu", "hai chau", "Hải Châ"]) {
      const rows = await searchEligibleUnits(filters(`location=${encodeURIComponent(query)}`), TODAY);
      const ids = rows.map((row) => row.listingId);
      expect(ids).toContain(haiChau.listingId);
      expect(ids).not.toContain(sonTra.listingId);
      expect(ids).not.toContain(hidden.listingId);
    }

    const empty = await searchListings(filters("location=zzzzqqqq-rent003"), TODAY);
    expect(empty.total).toBe(0);
  });

  it("ranks an exact ward ahead of a looser street match", async () => {
    const exact = await publishedListing({ ward: "Hải Châu", addressLine: "12 Trần Phú" });
    const loose = await publishedListing({ ward: "Sơn Trà", addressLine: "Hai Chauu" });

    const rows = await searchEligibleUnits(filters("location=Hải Châu"), TODAY);
    const ids = rows.map((row) => row.listingId);
    expect(ids.indexOf(exact.listingId)).toBeGreaterThanOrEqual(0);
    expect(ids.indexOf(loose.listingId)).toBeGreaterThan(ids.indexOf(exact.listingId));
  });

  it("keeps an occupied unit until a move-in date is set", async () => {
    const listing = await publishedListing();
    await blockUnit(listing.unitIds[0], "2026-11-01", "2027-05-01");

    const open = await searchEligibleUnits(filters("location=Hải Châu"), TODAY);
    expect(open.map((row) => row.unitId)).toContain(listing.unitIds[0]);

    const dated = await searchEligibleUnits(filters("location=Hải Châu&move_in_date=2026-11-01"), TODAY);
    expect(dated.map((row) => row.unitId)).not.toContain(listing.unitIds[0]);

    const stored = await prisma.listing.findUniqueOrThrow({ where: { id: listing.listingId } });
    expect(stored.publicationStatus).toBe("PUBLISHED");
  });

  it("keeps a unit when the block starts after the minimum stay", async () => {
    const listing = await publishedListing();
    await blockUnit(listing.unitIds[0], "2027-02-01", "2027-08-01");

    const rows = await searchEligibleUnits(filters("move_in_date=2026-11-01"), TODAY);
    expect(rows.map((row) => row.unitId)).toContain(listing.unitIds[0]);
  });

  it("requires rent and unit kind on the same unit", async () => {
    const listing = await publishedListing({
      units: [
        { label: "Rẻ", unitKind: "STUDIO", rent: 3_000_000 },
        { label: "Đắt", unitKind: "APARTMENT", rent: 6_000_000 },
      ],
    });

    const rows = await searchEligibleUnits(filters("max_rent=4000000&unit_kind=APARTMENT"), TODAY);
    expect(rows.map((row) => row.listingId)).not.toContain(listing.listingId);
  });

  it("does not treat shared laundry or custom text as a washing machine", async () => {
    const laundry = await publishedListing({
      propertyAmenities: { shared_laundry: true },
      units: [{ amenities: {}, custom: ["Máy giặt riêng"] }],
    });
    const washer = await publishedListing({
      units: [{ amenities: { washing_machine: true } }],
    });

    const rows = await searchEligibleUnits(filters("amenities=washing_machine"), TODAY);
    const ids = rows.map((row) => row.listingId);
    expect(ids).not.toContain(laundry.listingId);
    expect(ids).toContain(washer.listingId);
  });

  it("uses the unit pet override", async () => {
    const listing = await publishedListing({
      propertyPets: "NOT_ALLOWED",
      units: [{ pets: "ALLOWED" }],
    });

    const rows = await searchEligibleUnits(filters("pets=ALLOWED"), TODAY);
    expect(rows.map((row) => row.listingId)).toContain(listing.listingId);
  });

  it("drops incomplete or non-public units", async () => {
    const maintenance = await publishedListing({ units: [{ operationalStatus: "MAINTENANCE" }] });
    const unmarketed = await publishedListing({ units: [{ isMarketed: false }] });
    const draft = await publishedListing({ publicationStatus: "DRAFT", moderationStatus: "DRAFT" });
    const suspended = await publishedListing({ adminSuspended: true });

    const rows = await searchEligibleUnits(filters(), TODAY);
    const ids = rows.map((row) => row.listingId);
    expect(ids).not.toContain(maintenance.listingId);
    expect(ids).not.toContain(unmarketed.listingId);
    expect(ids).not.toContain(draft.listingId);
    expect(ids).not.toContain(suspended.listingId);
  });

  it("labels an occupied listing as free from the next day and keeps its rent", async () => {
    const listing = await publishedListing({ units: [{ rent: 3_800_000 }] });
    await blockUnit(listing.unitIds[0], "2026-11-01", "2027-05-01");

    const page = await searchListings(filters("location=Hải Châu"), TODAY);
    const card = page.items.find((item) => item.id === listing.listingId);
    expect(card?.availabilityLabel).toBe("Trống từ 02/05/2027");
    expect(card?.rentMin).toBe("3800000");
    expect(card?.availableUnitCount).toBe(0);
    expect(card).not.toHaveProperty("storagePath");
  });

  it("shows a later block as still free until that block", async () => {
    const listing = await publishedListing();
    await blockUnit(listing.unitIds[0], "2027-02-01", "2027-08-01");

    const detail = await getPublicListing(listing.listingId, filters(), TODAY);
    expect(detail?.units[0]?.availabilityLabel).toContain("Còn trống đến");
    const page = await searchListings(filters("location=Hải Châu"), TODAY);
    expect(page.items.find((item) => item.id === listing.listingId)?.availabilityLabel).toBe(
      "Còn trống đến 31/01/2027",
    );
  });

  it("returns null for a suspended listing and does not expose private fields", async () => {
    const listing = await publishedListing({ adminSuspended: true });
    await prisma.listing.update({
      where: { id: listing.listingId },
      data: { title: "SECRET TITLE" },
    });

    const detail = await getPublicListing(listing.listingId, filters(), TODAY);
    expect(detail).toBeNull();
    expect(JSON.stringify(detail)).not.toContain("SECRET TITLE");
  });
});
