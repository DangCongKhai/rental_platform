import { describe, expect, it } from "vitest";
import { parseGeocodePoint } from "./geocoding";

describe("parse geocode point", () => {
  it("reads the first Nominatim result", () => {
    expect(
      parseGeocodePoint([{ lat: "16.054407", lon: "108.202167" }]),
    ).toEqual({ latitude: 16.054407, longitude: 108.202167 });
  });

  it("rejects an empty or out-of-range result", () => {
    expect(parseGeocodePoint([])).toBeNull();
    expect(parseGeocodePoint([{ lat: "91", lon: "108" }])).toBeNull();
  });
});
