import { describe, expect, it } from "vitest";
import { MIN_WORD_SIMILARITY, locationQueryFromInput } from "./location-query";

describe("locationQueryFromInput", () => {
  it("returns null for blank and whitespace-only input", () => {
    expect(locationQueryFromInput(null)).toBeNull();
    expect(locationQueryFromInput(undefined)).toBeNull();
    expect(locationQueryFromInput("")).toBeNull();
    expect(locationQueryFromInput(" \n\t ")).toBeNull();
  });

  it("collapses whitespace and keeps accents", () => {
    expect(locationQueryFromInput("  Hải   Châu \n")?.value).toBe("Hải Châu");
  });

  it("keeps percent and underscore as ordinary characters", () => {
    expect(locationQueryFromInput("100% _Hải")?.value).toBe("100% _Hải");
  });

  it("uses a word similarity threshold of 0.4", () => {
    expect(MIN_WORD_SIMILARITY).toBe(0.4);
  });
});
