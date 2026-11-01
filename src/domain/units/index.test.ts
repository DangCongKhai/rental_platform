import { describe, expect, it } from "vitest";
import { generateUnitPreview, MAX_BULK_UNIT_COUNT, normalizeUnitLabel } from "./index";

describe("generateUnitPreview", () => {
    it ("generates the expected sequence and applies defaults", () => {
        const rows = generateUnitPreview({
            count: 5,
            prefix: " S ",
            startNumber: 201,
            unitKind: "STUDIO",
            areaM2: 24,
            advertisedMonthlyRent: 3_800_000,
            deposit: 3_800_000,
            maxOccupants: 2,
            minimumRentalMonths: 3
        });

        expect(rows.map((row) => row.label)).toEqual([
            "S201", "S202", "S203", "S204", "S205"]);
        expect(rows[4]).toMatchObject({
            unitKind: "STUDIO",
            areaM2: 24,
            advertisedMonthlyRent: 3_800_000,
            deposit: 3_800_000,
            maxOccupants: 2,
            minimumRentalMonths: 3,
        });
    });

    it("returns independent editable preview rows", () => {
        const rows = generateUnitPreview({
            count: 2,
            prefix: "S",
            startNumber: 201,
            unitKind: "STUDIO",
            areaM2: 24,
            advertisedMonthlyRent: 3_800_000,
            deposit: 3_800_000,
            maxOccupants: 2,
            minimumRentalMonths: 3,
        });

        rows[1].label = "Studio 2B";

        expect(rows[0].label).toBe("S201");
        expect(rows[1].label).toBe("Studio 2B");
    });

    it("normalizes labels for duplicate checking", () => {
        expect(normalizeUnitLabel("  S  205 ")).toBe("s 205");
        expect(normalizeUnitLabel("Căn A\u0301")).toBe(normalizeUnitLabel("Căn Á"));
    });

    it("rejects counts outside the supported limit", () => {
        expect(() => generateUnitPreview({
            count: MAX_BULK_UNIT_COUNT + 1,
            prefix: "S",
            startNumber: 201,
            unitKind: "STUDIO",
            areaM2: 24,
            advertisedMonthlyRent: 3_800_000,
            deposit: 3_800_000,
            maxOccupants: 2,
            minimumRentalMonths: 3
        })).toThrow(RangeError);
    });
});