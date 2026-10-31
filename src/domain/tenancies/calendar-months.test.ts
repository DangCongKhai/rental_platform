import { describe, expect, it } from "vitest";
import { meetsMinimumTerm } from "./calendar-months";
describe("three calendar month minimum", () => {
  it.each([
    ["2026-01-31", "2026-04-30"],
    ["2024-02-29", "2024-05-29"],
    ["2026-11-30", "2027-02-28"],
  ])("clamps %s to %s", (start, end) => {
    expect(meetsMinimumTerm(new Date(start), new Date(end))).toBe(true);
    expect(
      meetsMinimumTerm(
        new Date(start),
        new Date(new Date(end).getTime() - 86400000),
      ),
    ).toBe(false);
  });
  it("rejects invalid dates", () =>
    expect(meetsMinimumTerm(new Date("invalid"), new Date())).toBe(false));
});
