import { describe, expect, it } from "vitest";
import { checkListingCompleteness, type ListingCompletenessInput } from "./completeness";

const completePackage: ListingCompletenessInput = {
  rentalArrangement: "SEPARATE_UNITS",
  title: "Studio gần biển Mỹ Khê",
  description: "Căn hộ đầy đủ tiện nghi, gần biển.",
  addressLine: "29 Hải Phòng",
  city: "Đà Nẵng",
  propertyDescription: "Bất động sản gần biển, đầy đủ tiện nghi.",
  hasSelectedSharedPhoto: true,
  hasSelectedCover: true,
  policiesValid: true,
  units: [{
    id: "unit-1",
    label: "S201",
    isMarketed: true,
    description: "Studio rộng rãi.",
    areaM2: 24,
    advertisedMonthlyRent: 3_800_000,
    deposit: 3_800_000,
    minimumRentalMonths: 3,
    maxOccupants: 2,
    hasSelectedPhoto: true,
  }],
};

describe("checkListingCompleteness", () => {
  it("accepts a complete listing package", () => {
    expect(checkListingCompleteness(completePackage)).toEqual([]);
  });

  it("allows an incomplete draft to be represented and identifies missing property content", () => {
    const issues = checkListingCompleteness({
      ...completePackage,
      addressLine: null,
      hasSelectedSharedPhoto: false,
    });

    expect(issues.map((issue) => issue.field)).toContain("address");
    expect(issues.map((issue) => issue.field)).toContain("sharedPhotos");
  });

  it("names each marketed unit missing its own selected photo", () => {
    const issues = checkListingCompleteness({
      ...completePackage,
      units: completePackage.units.map((unit) => ({ ...unit, hasSelectedPhoto: false })),
    });

    expect(issues).toContainEqual(expect.objectContaining({
      field: "unit.photos",
      unitLabel: "S201",
      message: expect.stringContaining("S201"),
    }));
  });

  it("uses the property gallery for a whole-space listing without requiring unit photo assignment", () => {
    const issues = checkListingCompleteness({
      ...completePackage,
      rentalArrangement: "WHOLE_SPACE",
      units: completePackage.units.map((unit) => ({ ...unit, hasSelectedPhoto: false })),
    });

    expect(issues).toEqual([]);
  });

  it("requires at least one marketed unit and validates marketed terms", () => {
    const issues = checkListingCompleteness({
      ...completePackage,
      units: [{ ...completePackage.units[0]!, isMarketed: false }],
    });
    expect(issues.map((issue) => issue.field)).toContain("units");

    const unitIssues = checkListingCompleteness({
      ...completePackage,
      units: [{ ...completePackage.units[0]!, advertisedMonthlyRent: 0, minimumRentalMonths: 2 }],
    });
    expect(unitIssues.map((issue) => issue.field)).toContain("unit.rent");
    expect(unitIssues.map((issue) => issue.field)).toContain("unit.minimumRentalMonths");
  });
});
