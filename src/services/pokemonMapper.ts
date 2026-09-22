import type {
  NamedAPIResourceDTO,
  PokemonDetailResponseDTO,
} from "../api/pokeApi.dto";
import type { PokemonDetail } from "../domain/pokemon.types";
import type { PokemonCardItem } from "../domain/pokemon.types";

const SPRITE_BASE_URL =
  "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork";

export function extractIdFromUrl(url: string): number | null {
  const match = /\/(\d+)\/?$/.exec(url);
  if (!match) {
    return null;
  }

  const id = Number(match[1]);
  return Number.isFinite(id) ? id : null;
}

export function buildSpriteUrl(id: number): string {
  return `${SPRITE_BASE_URL}/${id}.png`;
}

export function mapToPokemonCardItem(
  dto: NamedAPIResourceDTO,
): PokemonCardItem {
  const id = extractIdFromUrl(dto.url);

  return {
    id,
    name: dto.name,
    spriteUrl: id === null ? null : buildSpriteUrl(id),
  };
}

function toSafeMeasurement(
  value: number | undefined,
  divisor: number,
): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return null;
  }

  return value / divisor;
}

export function mapToPokemonDetail(
  dto: PokemonDetailResponseDTO,
): PokemonDetail {
  return {
    id: dto.id,
    name: dto.name,
    types: dto.types.map((slot) => slot.type.name),
    abilities: dto.abilities.map((slot) => slot.ability.name),
    stats: dto.stats.map((slot) => ({
      name: slot.stat.name,
      value: slot.base_stat,
    })),
    heightMeters: toSafeMeasurement(dto.height, 10),
    weightKilograms: toSafeMeasurement(dto.weight, 10),
    artworkUrl: buildSpriteUrl(dto.id),
  };
}
