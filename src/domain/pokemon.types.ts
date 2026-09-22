import type { AppError } from "./errors";

export interface PokemonCardItem {
  id: number | null;
  name: string;
  spriteUrl: string | null;
}

export type CatalogStatus = "idle" | "loading" | "success" | "error";

export type CatalogError = AppError | null;
