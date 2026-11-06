import { describe, expect, it } from "vitest";
import { requestDatesOverlap, requestIsDue } from "./auto-reject";

describe("old rental request rules", () => {
  it("becomes due at 15 days and not before", () => {
    const now = new Date("2026-11-05T00:00:00.000Z");
    expect(requestIsDue(new Date("2026-10-21T00:00:00.000Z"), now)).toBe(true);
    expect(requestIsDue(new Date("2026-10-21T00:00:00.001Z"), now)).toBe(false);
  });

  it("treats touching date ranges as occupied", () => {
    const start = new Date("2090-11-01T00:00:00.000Z");
    const end = new Date("2091-02-01T00:00:00.000Z");
    expect(
      requestDatesOverlap(
        { start, end },
        { start: end, end: new Date("2091-04-01T00:00:00.000Z") },
      ),
    ).toBe(true);
    expect(
      requestDatesOverlap(
        { start, end },
        {
          start: new Date("2091-02-02T00:00:00.000Z"),
          end: new Date("2091-04-01T00:00:00.000Z"),
        },
      ),
    ).toBe(false);
  });
});
