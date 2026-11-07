import { describe, expect, it } from "vitest";
import { canCancelConfirmedTenancy, validateEarlyEnd } from "./end-cancel";

describe("tenancy cancellation rules", () => {
  const now = new Date("2026-11-04T12:00:00.000Z");

  it("allows cancellation of a confirmed tenancy before its start date", () => {
    expect(
      canCancelConfirmedTenancy(
        "CONFIRMED",
        new Date("2026-11-10T00:00:00.000Z"),
        now,
      ),
    ).toBe(true);
  });

  it("rejects cancellation once the start date has arrived", () => {
    expect(
      canCancelConfirmedTenancy(
        "CONFIRMED",
        new Date("2026-11-04T00:00:00.000Z"),
        now,
      ),
    ).toBe(false);
  });

  it("rejects cancellation for any state other than CONFIRMED", () => {
    expect(
      canCancelConfirmedTenancy(
        "ACTIVE",
        new Date("2026-11-10T00:00:00.000Z"),
        now,
      ),
    ).toBe(false);
  });
});

describe("early tenancy end rules", () => {
  const now = new Date("2026-11-04T12:00:00.000Z");
  const startDate = new Date("2026-10-01T00:00:00.000Z");

  it("accepts an active tenancy with an end date between its start and today", () => {
    expect(
      validateEarlyEnd({
        status: "ACTIVE",
        startDate,
        actualEndDate: "2026-11-03",
        reason: "Người thuê đã bàn giao nhà.",
        now,
      }),
    ).toEqual({ valid: true });
  });

  it("rejects a tenancy that is not ACTIVE", () => {
    expect(
      validateEarlyEnd({
        status: "CONFIRMED",
        startDate,
        actualEndDate: "2026-11-03",
        reason: "Đã bàn giao nhà.",
        now,
      }),
    ).toMatchObject({ valid: false });
  });

  it("rejects an empty reason", () => {
    expect(
      validateEarlyEnd({
        status: "ACTIVE",
        startDate,
        actualEndDate: "2026-11-03",
        reason: "   ",
        now,
      }),
    ).toMatchObject({ valid: false });
  });

  it("rejects an invalid date", () => {
    expect(
      validateEarlyEnd({
        status: "ACTIVE",
        startDate,
        actualEndDate: "not-a-date",
        reason: "Đã bàn giao nhà.",
        now,
      }),
    ).toMatchObject({ valid: false });
  });

  it("rejects a date before the tenancy start", () => {
    expect(
      validateEarlyEnd({
        status: "ACTIVE",
        startDate,
        actualEndDate: "2026-09-30",
        reason: "Đã bàn giao nhà.",
        now,
      }),
    ).toMatchObject({ valid: false });
  });

  it("rejects a date after today", () => {
    expect(
      validateEarlyEnd({
        status: "ACTIVE",
        startDate,
        actualEndDate: "2026-11-05",
        reason: "Đã bàn giao nhà.",
        now,
      }),
    ).toMatchObject({ valid: false });
  });
});
