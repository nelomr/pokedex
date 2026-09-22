import { describe, expect, it } from "vitest";
import { normalizeDetailKey } from "./detailRouteKey";

describe("normalizeDetailKey", () => {
  it("converts a digits-only string to a number", () => {
    expect(normalizeDetailKey("25")).toBe(25);
  });

  it("converts a digits-only string with leading zeros to its numeric value", () => {
    expect(normalizeDetailKey("025")).toBe(25);
  });

  it("lowercases an uppercase name", () => {
    expect(normalizeDetailKey("PIKACHU")).toBe("pikachu");
  });

  it("lowercases a mixed-case name", () => {
    expect(normalizeDetailKey("Pikachu")).toBe("pikachu");
  });

  it("trims and lowercases a padded name", () => {
    expect(normalizeDetailKey(" Pikachu ")).toBe("pikachu");
  });

  it("yields null for an empty string", () => {
    expect(normalizeDetailKey("")).toBeNull();
  });

  it("yields null for a whitespace-only string", () => {
    expect(normalizeDetailKey("   ")).toBeNull();
  });
});
