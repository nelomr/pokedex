import type { NamedAPIResourceDTO } from "../api/pokeApi.dto";
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
