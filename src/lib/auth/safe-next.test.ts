import { describe, expect, it } from "vitest";
import { safeNext } from "./safe-next";

describe("safeNext", () => {
  it("preserves local paths and their query", () => {
    expect(safeNext("/listings/abc")).toBe("/listings/abc");
    expect(safeNext("/listings?q=room#results")).toBe(
      "/listings?q=room#results",
    );
  });
  it.each([
    null,
    undefined,
    "",
    "https://evil.test",
    "//evil.test",
    "/auth/login",
    "/auth/sign-up?next=/",
    "/a/../auth/login",
    "/%61uth/login",
    "/\\evil.test",
    "/\nevil.test",
    "/%invalid",
    "/a/..//evil.test",
    "/%5cevil.test",
  ])("rejects unsafe destination %s", (value) => {
    expect(safeNext(value)).toBeNull();
  });
});
