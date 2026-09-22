import { describe, expect, it } from "vitest";
import { buildSpriteUrl, extractIdFromUrl } from "./pokemonMapper";

describe("pokemonMapper", () => {
  describe("extractIdFromUrl", () => {
    it("extracts the numeric id from a resource URL with a trailing slash", () => {
      expect(extractIdFromUrl("https://pokeapi.co/api/v2/pokemon/25/")).toBe(
        25,
      );
    });

    it("extracts the numeric id from a resource URL without a trailing slash", () => {
      expect(extractIdFromUrl("https://pokeapi.co/api/v2/pokemon/25")).toBe(25);
    });

    it("returns null (not NaN) for a malformed URL", () => {
      const result = extractIdFromUrl("https://pokeapi.co/api/v2/pokemon/");
      expect(result).toBeNull();
      expect(Number.isNaN(result)).toBe(false);
    });

    it("returns null for an unexpected URL shape", () => {
      const result = extractIdFromUrl("not-a-url");
      expect(result).toBeNull();
      expect(Number.isNaN(result)).toBe(false);
    });
  });

  describe("buildSpriteUrl", () => {
    it("composes the official-artwork sprite URL for id 1", () => {
      expect(buildSpriteUrl(1)).toBe(
        "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/1.png",
      );
    });

    it("composes the official-artwork sprite URL for id 25", () => {
      expect(buildSpriteUrl(25)).toBe(
        "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/25.png",
      );
    });
  });
});
