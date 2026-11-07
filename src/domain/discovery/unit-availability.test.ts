import { describe, expect, it } from "vitest";
import { describeUnitAvailability, stayIsFree } from "./unit-availability";

const today = "2026-11-01";

describe("describeUnitAvailability", () => {
  it("says a unit with no blocks is free", () => {
    expect(describeUnitAvailability(today, [])).toEqual({
      availableNow: true,
      availableFrom: null,
      availableUntil: null,
      label: "Còn trống",
    });
  });

  it("labels a block that covers today as free the next day", () => {
    expect(
      describeUnitAvailability(today, [
        { start: "2026-11-01", end: "2027-05-01" },
      ]),
    ).toEqual({
      availableNow: false,
      availableFrom: "2027-05-02",
      availableUntil: null,
      label: "Trống từ 02/05/2027",
    });
  });

  it("labels a later block with the last free day", () => {
    expect(
      describeUnitAvailability(today, [
        { start: "2027-02-01", end: "2027-08-01" },
      ]),
    ).toEqual({
      availableNow: true,
      availableFrom: null,
      availableUntil: "2027-01-31",
      label: "Còn trống đến 31/01/2027",
    });
  });
});

describe("stayIsFree", () => {
  it("is free when the only block starts on the last day of the minimum stay", () => {
    expect(
      stayIsFree("2026-12-01", 3, [{ start: "2027-03-01", end: "2027-06-01" }]),
    ).toBe(true);
  });

  it("is blocked when a tenancy overlaps the minimum stay", () => {
    expect(
      stayIsFree("2026-12-01", 3, [{ start: "2026-12-01", end: "2027-01-15" }]),
    ).toBe(false);
  });

  it("is free when a block ends the day before move-in", () => {
    expect(
      stayIsFree("2026-12-01", 3, [{ start: "2026-11-01", end: "2026-11-30" }]),
    ).toBe(true);
  });
});
