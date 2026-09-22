import type { AppError } from "./errors";

export interface PokemonCardItem {
  id: number | null;
  name: string;
  spriteUrl: string | null;
}

export type CatalogStatus = "idle" | "loading" | "success" | "error";

export type CatalogError = AppError | null;

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
