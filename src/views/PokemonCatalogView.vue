<script setup lang="ts">
import { computed, onMounted } from "vue";
import { useRoute } from "vue-router";
import {
  BaseEmptyState,
  CatalogErrorState,
  CatalogLoadingState,
  CatalogPopulatedState,
  CatalogStateRenderer,
  SearchBar,
  TypeFilterSelect,
} from "../components";
import { defineStateEntry } from "../components";
import type { StateEntry } from "../components";
import { ROUTE_NAMES } from "../router/routeNames";
import { usePokemonListStore } from "../stores/pokemonList.store";
import { resolveCatalogViewState } from "./catalogViewState";
import type { CatalogViewState } from "./catalogViewState";

const store = usePokemonListStore();
const route = useRoute();

const isDetailOpen = computed(() => route.name === ROUTE_NAMES.pokemonDetail);

const errorMessage = computed(() => store.error?.message ?? "");
const typeFilterErrorMessage = computed(
  () => store.typeFilterError?.message ?? "",
);

const catalogViewState = computed<CatalogViewState>(() =>
  resolveCatalogViewState({
    status: store.status,
    totalCount: store.rawCatalogIndex.length,
    filteredCount: store.filteredList.length,
  }),
);

const loadingEntry = defineStateEntry(CatalogLoadingState, {});

const stateEntries = computed<Record<CatalogViewState, StateEntry>>(() => ({
  idle: loadingEntry,
  loading: loadingEntry,
  error: defineStateEntry(
    CatalogErrorState,
    { message: errorMessage.value },
    { retry },
  ),
  empty: defineStateEntry(BaseEmptyState, {
    message: "No Pokémon found.",
    testId: "catalog-empty",
  }),
  noResults: defineStateEntry(BaseEmptyState, {
    message: "No Pokémon match your search or filters.",
    testId: "catalog-no-results",
  }),
  populated: defineStateEntry(
    CatalogPopulatedState,
    {
      items: store.paginatedItems,
      currentPage: store.currentPage,
      totalPages: store.totalPages,
    },
    {
      prev: () => store.goToPage(store.currentPage - 1),
      next: () => store.goToPage(store.currentPage + 1),
    },
  ),
}));

const currentStateEntry = computed<StateEntry>(
  () => stateEntries.value[catalogViewState.value],
);

function retry(): void {
  void store.retryCatalog();
}

function handleQueryChange(query: string): void {
  store.setSearchQuery(query);
}

function handleSearchModeChange(mode: "name" | "id"): void {
  store.setSearchMode(mode);
}

function handleTypeChange(type: string | null): void {
  void store.setTypeFilter(type);
}

onMounted(() => {
  void store.initCatalog();
});
</script>

<template>
  <div>
    <div data-testid="app-content" :inert="isDetailOpen ? true : undefined">
      <h1
        tabindex="-1"
        data-testid="catalog-heading"
        class="p-4 text-2xl font-bold"
      >
        Pokedex
      </h1>

      <div class="flex flex-wrap items-end gap-4 p-4">
        <SearchBar
          :search-mode="store.searchMode"
          @update:query="handleQueryChange"
          @update:search-mode="handleSearchModeChange"
        />
        <TypeFilterSelect
          :model-value="store.selectedType"
          @update:model-value="handleTypeChange"
        />
      </div>

      <p
        v-if="typeFilterErrorMessage"
        data-testid="type-filter-error"
        class="px-4 text-sm text-amber-400"
      >
        {{ typeFilterErrorMessage }}
      </p>

      <CatalogStateRenderer :entry="currentStateEntry" />
    </div>

    <router-view />
  </div>
</template>
