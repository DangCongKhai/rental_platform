import { expect, it } from "vitest";
import { isValidPhone } from "./phone";
it("accepts only trimmed local or +84 numbers with nine following digits", () => {
  for (const value of ["0901234567", " +84901234567 "])
    expect(isValidPhone(value)).toBe(true);
  for (const value of [
    "0905 123 456",
    "84901234567",
    "+840901234567",
    "090123456",
    "phone",
  ])
    expect(isValidPhone(value)).toBe(false);
});
