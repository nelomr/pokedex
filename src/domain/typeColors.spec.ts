import { describe, expect, it } from "vitest";
import { POKEMON_TYPES } from "./pokemon.types";
import {
  NEUTRAL_BADGE_CLASSES,
  TYPE_BADGE_CLASSES,
  typeBadgeClasses,
} from "./typeColors";

describe("typeBadgeClasses", () => {
  it("resolves every known Pokémon type to a non-empty class string", () => {
    for (const type of POKEMON_TYPES) {
      expect(typeBadgeClasses(type)).not.toBe("");
    }
  });

  it("falls back to the neutral treatment for an unrecognised type", () => {
    expect(typeBadgeClasses("not-a-real-type")).toBe(
      "bg-slate-700 text-slate-100",
    );
    expect(NEUTRAL_BADGE_CLASSES).toBe("bg-slate-700 text-slate-100");
  });
});

describe("TYPE_BADGE_CLASSES", () => {
  it("stores only static literal class strings so Tailwind can scan them", () => {
    for (const classes of Object.values(TYPE_BADGE_CLASSES)) {
      expect(classes).not.toContain("${");
    }
  });
});
