import { describe, it, expect } from "vitest";
import { currentTerms } from "./current-terms";
describe("current confirmed terms", () => {
  const yes = new Date("2026-01-01");
  const base = {
    ownerConfirmedAt: yes,
    tenantConfirmedAt: yes,
    tenantRejectedAt: null,
  };
  it("never uses proposed or rejected rent", () => {
    const confirmed = { ...base, versionNumber: 1, monthlyRent: 100 };
    expect(
      currentTerms([
        confirmed,
        {
          ...base,
          versionNumber: 2,
          tenantConfirmedAt: null,
          monthlyRent: 200,
        },
        {
          ...base,
          versionNumber: 3,
          tenantConfirmedAt: null,
          tenantRejectedAt: yes,
          monthlyRent: 300,
        },
      ]),
    ).toEqual(confirmed);
  });
  it("selects highest mutually confirmed version regardless of input order", () => {
    expect(
      currentTerms([
        { ...base, versionNumber: 4 },
        { ...base, versionNumber: 1 },
      ])?.versionNumber,
    ).toBe(4);
    expect(
      currentTerms([{ ...base, versionNumber: 1, ownerConfirmedAt: null }]),
    ).toBeNull();
    expect(currentTerms([])).toBeNull();
  });
});
