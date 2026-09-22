import { defineStore } from "pinia";
import { computed, ref } from "vue";
import { httpGet } from "../api/httpClient";
import type {
  NamedAPIResourceDTO,
  PokemonListResponseDTO,
} from "../api/pokeApi.dto";
import { AppError, NetworkError } from "../domain/errors";
import type { CatalogError, CatalogStatus } from "../domain/pokemon.types";
import { mapToPokemonCardItem } from "../services/pokemonMapper";

const CATALOG_URL = "https://pokeapi.co/api/v2/pokemon?limit=100000";
const PAGE_SIZE = 20;

export const usePokemonListStore = defineStore("pokemonList", () => {
  const rawCatalogIndex = ref<NamedAPIResourceDTO[]>([]);
  const currentPage = ref(1);
  const pageSize = ref(PAGE_SIZE);
  const status = ref<CatalogStatus>("idle");
  const error = ref<CatalogError>(null);

  const totalPages = computed(() =>
    Math.ceil(rawCatalogIndex.value.length / pageSize.value),
  );

  const paginatedItems = computed(() => {
    const start = (currentPage.value - 1) * pageSize.value;
    const end = start + pageSize.value;
    return rawCatalogIndex.value.slice(start, end).map(mapToPokemonCardItem);
  });

  const hasNextPage = computed(
    () => totalPages.value > 0 && currentPage.value < totalPages.value,
  );

  const hasPrevPage = computed(
    () => totalPages.value > 0 && currentPage.value > 1,
  );

  function goToPage(page: number): void {
    if (totalPages.value === 0) {
      currentPage.value = 1;
      return;
    }

    if (!Number.isFinite(page)) {
      return;
    }

    const targetPage = Math.floor(page);
    currentPage.value = Math.min(Math.max(targetPage, 1), totalPages.value);
  }

  async function initCatalog(): Promise<void> {
    if (status.value === "success" || status.value === "loading") {
      return;
    }

    status.value = "loading";
    error.value = null;

    try {
      const response = await httpGet<PokemonListResponseDTO>(CATALOG_URL);
      rawCatalogIndex.value = response.results;
      currentPage.value = 1;
      status.value = "success";
    } catch (caughtError) {
      status.value = "error";
      error.value =
        caughtError instanceof AppError ? caughtError : new NetworkError();
    }
  }

  return {
    rawCatalogIndex,
    currentPage,
    pageSize,
    status,
    error,
    totalPages,
    paginatedItems,
    hasNextPage,
    hasPrevPage,
    goToPage,
    initCatalog,
  };
});
