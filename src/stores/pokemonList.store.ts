import { defineStore } from "pinia";
import { computed, ref } from "vue";
import { httpGet } from "../api/httpClient";
import type {
  NamedAPIResourceDTO,
  PokemonListResponseDTO,
  PokemonTypeResponseDTO,
} from "../api/pokeApi.dto";
import { AppError, NetworkError } from "../domain/errors";
import { POKEMON_TYPES } from "../domain/pokemon.types";
import type {
  CatalogError,
  CatalogStatus,
  SearchMode,
} from "../domain/pokemon.types";
import {
  extractIdFromUrl,
  mapToPokemonCardItem,
} from "../services/pokemonMapper";

const CATALOG_URL = "https://pokeapi.co/api/v2/pokemon?limit=100000";
const PAGE_SIZE = 20;

function typeUrl(type: string): string {
  return `https://pokeapi.co/api/v2/type/${type}`;
}

export const usePokemonListStore = defineStore("pokemonList", () => {
  const rawCatalogIndex = ref<NamedAPIResourceDTO[]>([]);
  const currentPage = ref(1);
  const pageSize = ref(PAGE_SIZE);
  const status = ref<CatalogStatus>("idle");
  const error = ref<CatalogError>(null);

  const searchQuery = ref("");
  const searchMode = ref<SearchMode>("name");
  const selectedType = ref<string | null>(null);
  const typeIndex = ref<Map<string, Set<number>>>(new Map());
  const typeFilterError = ref<CatalogError>(null);
  const availableTypes = ref<readonly string[]>(POKEMON_TYPES);

  const filteredList = computed(() => {
    let entries = rawCatalogIndex.value;

    if (searchMode.value === "id") {
      const trimmed = searchQuery.value.trim();
      if (trimmed !== "") {
        const target = Number(trimmed);
        entries = entries.filter((entry) => {
          const id = extractIdFromUrl(entry.url);
          return id !== null && id === target;
        });
      }
    } else {
      const query = searchQuery.value.trim().toLowerCase();
      if (query !== "") {
        entries = entries.filter((entry) =>
          entry.name.toLowerCase().includes(query),
        );
      }
    }

    if (selectedType.value !== null) {
      const memberIds = typeIndex.value.get(selectedType.value);
      if (memberIds) {
        entries = entries.filter((entry) => {
          const id = extractIdFromUrl(entry.url);
          return id !== null && memberIds.has(id);
        });
      }
    }

    return entries.map(mapToPokemonCardItem);
  });

  const totalPages = computed(() =>
    Math.ceil(filteredList.value.length / pageSize.value),
  );

  const paginatedItems = computed(() => {
    const start = (currentPage.value - 1) * pageSize.value;
    const end = start + pageSize.value;
    return filteredList.value.slice(start, end);
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

  function goToPageOf(key: string | number | null): void {
    if (key === null) {
      return;
    }

    const index = filteredList.value.findIndex((item) =>
      typeof key === "number" ? item.id === key : item.name === key,
    );

    if (index === -1) {
      return;
    }

    goToPage(Math.floor(index / pageSize.value) + 1);
  }

  function setSearchQuery(query: string): void {
    searchQuery.value = query;
    currentPage.value = 1;
  }

  function setSearchMode(mode: SearchMode): void {
    searchMode.value = mode;
    searchQuery.value = "";
    currentPage.value = 1;
  }

  async function setTypeFilter(type: string | null): Promise<void> {
    if (type === null) {
      selectedType.value = null;
      currentPage.value = 1;
      return;
    }

    typeFilterError.value = null;

    if (!typeIndex.value.has(type)) {
      try {
        const response = await httpGet<PokemonTypeResponseDTO>(typeUrl(type));
        const ids = new Set<number>();
        for (const member of response.pokemon) {
          const id = extractIdFromUrl(member.pokemon.url);
          if (id !== null) {
            ids.add(id);
          }
        }
        typeIndex.value.set(type, ids);
      } catch (caughtError) {
        typeFilterError.value =
          caughtError instanceof AppError ? caughtError : new NetworkError();
        selectedType.value = type;
        currentPage.value = 1;
        return;
      }
    }

    selectedType.value = type;
    currentPage.value = 1;
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
    searchQuery,
    searchMode,
    selectedType,
    typeIndex,
    typeFilterError,
    availableTypes,
    filteredList,
    totalPages,
    paginatedItems,
    hasNextPage,
    hasPrevPage,
    goToPage,
    goToPageOf,
    setSearchQuery,
    setSearchMode,
    setTypeFilter,
    initCatalog,
  };
});
