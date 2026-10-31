import { describe, expect, it, vi } from "vitest";

vi.mock("./search", () => ({
  searchListings: vi.fn(async () => ({
    items: [
      {
        id: "listing-1",
        title: "Studio Hải Châu",
        availabilityLabel: "Còn trống",
        availableUnitCount: 1,
        rentMin: "4500000",
        rentMax: "4500000",
        minimumRentalMonths: 3,
        coverUrl: "https://example.test/cover.webp",
        imageUrls: ["https://example.test/cover.webp"],
        property: {
          name: "Nhà A",
          propertyType: "APARTMENT",
          ward: "Hải Châu",
          city: "Đà Nẵng",
        },
      },
    ],
    total: 1,
    page: 1,
    perPage: 12,
    resultLabel: null,
  })),
}));

vi.mock("./public-listing", () => ({
  getPublicListing: vi.fn(async (id: string) =>
    id.endsWith("0000")
      ? null
      : {
          id,
          title: "Studio",
          description: "Mô tả",
          property: {
            name: "Nhà A",
            propertyType: "APARTMENT",
            addressLine: "Trần Phú",
            ward: "Hải Châu",
            city: "Đà Nẵng",
            description: "Mô tả nhà",
            sharedAmenities: [],
            customAmenities: [],
            sharedRules: [],
            pets: "ASK_OWNER",
            smoking: "NOT_ALLOWED",
          },
          ownerName: "Lan",
          units: [],
          gallery: [],
        },
  ),
}));

import {
  amenityCatalogJson,
  listingDetailJson,
  listingsIndexJson,
} from "./public-api";
import { GET as amenitiesGet } from "@/app/api/amenities/route";
import { GET as listingGet } from "@/app/api/listings/[id]/route";
import { GET as listingsGet } from "@/app/api/listings/route";

describe("public listing api", () => {
  it("returns a card page", async () => {
    const body = await listingsIndexJson(new URLSearchParams());
    expect(body.data[0]?.cover_url).toBe("https://example.test/cover.webp");
    expect(body.meta).toMatchObject({
      current_page: 1,
      total: 1,
      last_page: 1,
    });
    expect(body.meta.result_label).toBeUndefined();
  });

  it("rejects an invalid filter", async () => {
    await expect(
      listingsIndexJson(new URLSearchParams("move_in_date=yesterday")),
    ).rejects.toThrow(/Ngày thuê không hợp lệ/);
  });

  it("returns null for a missing listing", async () => {
    expect(
      await listingDetailJson("00000000-0000-0000-0000-000000000000"),
    ).toBeNull();
    expect(await listingDetailJson("not-a-uuid")).toBeNull();
  });

  it("lists amenity keys", async () => {
    const keys = amenityCatalogJson().data.map((item) => item.key);
    expect(keys).toContain("wifi");
    const response = amenitiesGet();
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.data[0]).toHaveProperty("label_vi");
  });

  it("serves a result page, a 422, and a 404", async () => {
    const page = await listingsGet(
      new Request("http://localhost/api/listings"),
    );
    expect(page.status).toBe(200);
    const listed = await page.json();
    expect(listed.data[0].cover_url).toBe("https://example.test/cover.webp");

    const invalid = await listingsGet(
      new Request("http://localhost/api/listings?move_in_date=yesterday"),
    );
    expect(invalid.status).toBe(422);

    const missing = await listingGet(
      new Request("http://localhost/api/listings/missing"),
      {
        params: Promise.resolve({ id: "not-a-uuid" }),
      },
    );
    expect(missing.status).toBe(404);
  });
});
