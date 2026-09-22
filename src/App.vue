<script setup lang="ts">
import { computed, onMounted } from "vue";
import PaginationControls from "./components/PaginationControls.vue";
import PokemonGrid from "./components/PokemonGrid.vue";
import { usePokemonListStore } from "./stores/pokemonList.store";

const store = usePokemonListStore();

const errorMessage = computed(() => store.error?.message ?? "");

function retry(): void {
  store.status = "idle";
  void store.initCatalog();
}

onMounted(() => {
  void store.initCatalog();
});
</script>

<template>
  <div id="app" class="min-h-screen bg-slate-900 text-slate-50">
    <h1 class="p-4 text-2xl font-bold">Pokedex</h1>

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
        class="mt-2 rounded bg-slate-700 px-3 py-1"
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

    <div v-else-if="store.status === 'success'" data-testid="catalog-populated">
      <PokemonGrid :items="store.paginatedItems" />
      <PaginationControls
        :current-page="store.currentPage"
        :total-pages="store.totalPages"
        @prev="store.goToPage(store.currentPage - 1)"
        @next="store.goToPage(store.currentPage + 1)"
      />
    </div>
  </div>
</template>
