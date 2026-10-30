import { describe, expect, it } from "vitest";
import {
  ListingSearchValidationError,
  clearLocation,
  parseListingSearchParams,
  toListingSearchParams,
} from "./listing-search-params";

describe("listing search params", () => {
  it("round-trips location, price, chips, and move-in date", () => {
    const parsed = parseListingSearchParams(
      new URLSearchParams(
        "location=H%E1%BA%A3i+Ch%C3%A2u&move_in_date=2026-12-01&min_rent=2000000&max_rent=5000000&unit_kind=STUDIO&bedrooms=1&occupants=2&amenities=wifi&amenities=washing_machine&pets=ALLOWED&page=2&per_page=12",
      ),
    );

    expect(parsed.location?.value).toBe("Hải Châu");
    expect(parsed.moveInDate).toBe("2026-12-01");
    expect(parsed.minRent).toBe(2_000_000);
    expect(parsed.maxRent).toBe(5_000_000);
    expect(parsed.unitKind).toBe("STUDIO");
    expect(parsed.amenityKeys).toEqual(["wifi", "washing_machine"]);
    expect(parsed.page).toBe(2);

    const encoded = toListingSearchParams(parsed);
    expect(encoded.get("location")).toBe("Hải Châu");
    expect(encoded.getAll("amenities")).toEqual(["wifi", "washing_machine"]);
    expect(encoded.get("move_in_date")).toBe("2026-12-01");
  });

  it("clears only the location and resets the page", () => {
    const parsed = parseListingSearchParams(
      new URLSearchParams("location=H%E1%BA%A3i+Ch%C3%A2u&max_rent=5000000&amenities=wifi&page=3"),
    );
    const cleared = toListingSearchParams(clearLocation(parsed));

    expect(cleared.get("location")).toBeNull();
    expect(cleared.get("max_rent")).toBe("5000000");
    expect(cleared.get("amenities")).toBe("wifi");
    expect(cleared.get("page")).toBe("1");
  });

  it("rejects an invalid move-in date", () => {
    expect(() => parseListingSearchParams(new URLSearchParams("move_in_date=not-a-date"))).toThrow(
      ListingSearchValidationError,
    );
  });

  it("omits a blank location", () => {
    const parsed = parseListingSearchParams(new URLSearchParams("location=+++"));
    expect(parsed.location).toBeNull();
    expect(toListingSearchParams(parsed).has("location")).toBe(false);
  });
});
