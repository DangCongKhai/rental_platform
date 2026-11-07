import { describe, expect, it } from "vitest";
import { formatGroupedMoney, moneyDigits } from "./money";

describe("money digits", () => {
  it("keeps whole digits and drops a decimal part", () => {
    expect(moneyDigits("23092293.00")).toBe("23092293");
    expect(moneyDigits(209)).toBe("209");
    expect(moneyDigits(null)).toBe("");
  });

  it("groups thousands with dots", () => {
    expect(formatGroupedMoney("23092293")).toBe("23.092.293");
    expect(formatGroupedMoney("")).toBe("");
  });
});
