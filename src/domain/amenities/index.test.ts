import { describe, expect, it } from "vitest";
import { searchAmenityCatalog, validateAmenities } from "./index";

describe("amenity catalog and validation", () => {
    it("suggests air conditioning for the explicit aircon alias without selecting it", () => {
        const matches = searchAmenityCatalog("aircon", "UNIT");
    
        expect(matches.map((item) => item.key)).toContain("air_conditioning");

        const result = validateAmenities({
            schema_version: 1,
            standard: {},
            custom: []
        }, "UNIT");

        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.data.standard).toEqual({});
        }
    });

    it("rejects unknown keys and keys from the wrong scope", () => {
        const unknown = validateAmenities({
            schema_version: 1,
            standard: {made_up_key: {enabled: true}},
            custom: []
        }, "PROPERTY");

        const wrongScope = validateAmenities(
        {
            schema_version: 1,
            standard: { air_conditioning: { enabled: true } },
            custom: [],
        }, "PROPERTY");

        expect(unknown.success).toBe(false);
        expect(wrongScope.success).toBe(false);
    });

    it("normalizes custom labels and removes duplicates", () => {
        const result = validateAmenities({
            schema_version: 1,
            standard: {wifi: {enabled: true}},
            custom: ["  Cafe\u0301   gần nhà  ", "Café gần nhà"],
        }, "PROPERTY");

        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.data.custom).toEqual(["Café gần nhà"]);
        }
    });

    it("rejects malformed amenity entries", () => {
        const result = validateAmenities({
            schema_version: 1,
            standard: {wifi: {enabled: "yes"}},
            custom: []
        }, "PROPERTY");

        expect(result.success).toBe(false);
    })
})