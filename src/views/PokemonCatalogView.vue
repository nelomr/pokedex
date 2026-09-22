<script setup lang="ts">
import { computed, onMounted } from "vue";
import { useRoute } from "vue-router";
import {
  PaginationControls,
  PokemonGrid,
  SearchBar,
  TypeFilterSelect,
} from "../components";
import { ROUTE_NAMES } from "../router/routeNames";
import { usePokemonListStore } from "../stores/pokemonList.store";

const store = usePokemonListStore();
const route = useRoute();

const isDetailOpen = computed(() => route.name === ROUTE_NAMES.pokemonDetail);

const errorMessage = computed(() => store.error?.message ?? "");
const typeFilterErrorMessage = computed(
  () => store.typeFilterError?.message ?? "",
);

const isNoResults = computed(
  () =>
    store.status === "success" &&
    store.rawCatalogIndex.length > 0 &&
    store.filteredList.length === 0,
);

function retry(): void {
  store.status = "idle";
  void store.initCatalog();
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

      <div class="flex flex-wrap items-start gap-4 p-4">
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

      <p
        v-if="store.status === 'loading'"
        data-testid="catalog-loading"
        class="p-4"
      >
        Loading Pokémon…
      </p>

      <div
        v-else-if="store.status === 'error'"
        data-testid="catalog-error"
        class="p-4"
      >
        <p>{{ errorMessage }}</p>
        <button
          type="button"
          data-testid="catalog-retry"
          class="mt-2 rounded bg-slate-700 px-3 py-1 cursor-pointer"
          @click="retry"
        >
          Retry
        </button>
      </div>

      <p
        v-else-if="
          store.status === 'success' && store.rawCatalogIndex.length === 0
        "
        data-testid="catalog-empty"
        class="p-4"
      >
        No Pokémon found.
      </p>

      <p v-else-if="isNoResults" data-testid="catalog-no-results" class="p-4">
        No Pokémon match your search or filters.
      </p>

      <div
        v-else-if="store.status === 'success'"
        data-testid="catalog-populated"
      >
        <PokemonGrid :items="store.paginatedItems" />
        <PaginationControls
          :current-page="store.currentPage"
          :total-pages="store.totalPages"
          @prev="store.goToPage(store.currentPage - 1)"
          @next="store.goToPage(store.currentPage + 1)"
        />
      </div>
    </div>

    <router-view />
  </div>
</template>
