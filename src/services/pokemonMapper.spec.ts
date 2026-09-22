import { describe, expect, it } from "vitest";
import type { PokemonDetailResponseDTO } from "../api/pokeApi.dto";
import {
  buildSpriteUrl,
  extractIdFromUrl,
  mapToPokemonDetail,
} from "./pokemonMapper";

function makeDetailDto(
  overrides: Partial<PokemonDetailResponseDTO> = {},
): PokemonDetailResponseDTO {
  return {
    id: 1,
    name: "bulbasaur",
    height: 7,
    weight: 69,
    types: [
      { slot: 1, type: { name: "grass", url: "" } },
      { slot: 2, type: { name: "poison", url: "" } },
    ],
    abilities: [
      { ability: { name: "overgrow", url: "" }, is_hidden: false, slot: 1 },
      { ability: { name: "chlorophyll", url: "" }, is_hidden: true, slot: 3 },
    ],
    stats: [
      { base_stat: 45, effort: 0, stat: { name: "hp", url: "" } },
      { base_stat: 49, effort: 0, stat: { name: "attack", url: "" } },
    ],
    sprites: {
      front_default: null,
      other: {
        "official-artwork": { front_default: "https://example.com/1.png" },
      },
    },
    ...overrides,
  };
}

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

  describe("mapToPokemonDetail", () => {
    it("converts height decimetres to metres", () => {
      const result = mapToPokemonDetail(makeDetailDto({ height: 7 }));
      expect(result.heightMeters).toBe(0.7);
    });

    it("converts weight hectograms to kilograms", () => {
      const result = mapToPokemonDetail(makeDetailDto({ weight: 69 }));
      expect(result.weightKilograms).toBe(6.9);
    });

    it("maps a missing height to null", () => {
      const dto = makeDetailDto();
      // @ts-expect-error simulating an absent field from the API
      delete dto.height;
      expect(mapToPokemonDetail(dto).heightMeters).toBeNull();
    });

    it("maps a missing weight to null", () => {
      const dto = makeDetailDto();
      // @ts-expect-error simulating an absent field from the API
      delete dto.weight;
      expect(mapToPokemonDetail(dto).weightKilograms).toBeNull();
    });

    it("maps a non-finite height to null, never NaN", () => {
      const result = mapToPokemonDetail(makeDetailDto({ height: Number.NaN }));
      expect(result.heightMeters).toBeNull();
      expect(Number.isNaN(result.heightMeters)).toBe(false);
    });

    it("maps a non-finite weight to null, never NaN", () => {
      const result = mapToPokemonDetail(
        makeDetailDto({ weight: Number.POSITIVE_INFINITY }),
      );
      expect(result.weightKilograms).toBeNull();
    });

    it("flattens types to a plain string array in response order", () => {
      const result = mapToPokemonDetail(makeDetailDto());
      expect(result.types).toEqual(["grass", "poison"]);
    });

    it("flattens abilities to a plain string array in response order", () => {
      const result = mapToPokemonDetail(makeDetailDto());
      expect(result.abilities).toEqual(["overgrow", "chlorophyll"]);
    });

    it("maps each stat to a name/value pair", () => {
      const result = mapToPokemonDetail(makeDetailDto());
      expect(result.stats).toEqual([
        { name: "hp", value: 45 },
        { name: "attack", value: 49 },
      ]);
    });

    it("reuses buildSpriteUrl for the artwork URL", () => {
      const result = mapToPokemonDetail(makeDetailDto({ id: 25 }));
      expect(result.artworkUrl).toBe(buildSpriteUrl(25));
    });
  });
});
