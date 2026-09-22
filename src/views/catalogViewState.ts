import type { CatalogStatus } from "../domain/pokemon.types";

export type CatalogViewState =
  "idle" | "loading" | "error" | "empty" | "noResults" | "populated";

interface ResolveCatalogViewStateParams {
  status: CatalogStatus;
  totalCount: number;
  filteredCount: number;
}

export function resolveCatalogViewState({
  status,
  totalCount,
  filteredCount,
}: ResolveCatalogViewStateParams): CatalogViewState {
  if (status === "idle" || status === "loading" || status === "error") {
    return status;
  }

  if (totalCount === 0) {
    return "empty";
  }

  if (filteredCount === 0) {
    return "noResults";
  }

  return "populated";
}
