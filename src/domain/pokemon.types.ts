import type { AppError } from "./errors";

export interface PokemonCardItem {
  id: number | null;
  name: string;
  spriteUrl: string | null;
}

export type CatalogStatus = "idle" | "loading" | "success" | "error";

export type CatalogError = AppError | null;

export interface PokemonStat {
  name: string;
  value: number;
}

// PokéAPI always returns exactly 6 base stats (hp, attack, defense,
// special-attack, special-defense, speed) per Pokémon. Shared by the loading
// skeleton and the loaded detail view so the two layouts cannot drift apart
// unnoticed.
export const POKEMON_STAT_COUNT = 6;

export interface PokemonDetail {
  id: number;
  name: string;
  types: string[];
  abilities: string[];
  stats: PokemonStat[];
  heightMeters: number | null;
  weightKilograms: number | null;
  artworkUrl: string | null;
}

export type DetailStatus = "idle" | "loading" | "success" | "error";

export type SearchMode = "name" | "id";

export const POKEMON_TYPES = [
  "normal",
  "fighting",
  "flying",
  "poison",
  "ground",
  "rock",
  "bug",
  "ghost",
  "steel",
  "fire",
  "water",
  "grass",
  "electric",
  "psychic",
  "ice",
  "dragon",
  "dark",
  "fairy",
] as const;

export type PokemonType = (typeof POKEMON_TYPES)[number];
