<script setup lang="ts">
import type { PokemonCardItem } from "../../domain/pokemon.types";
import PaginationControls from "../PaginationControls/PaginationControls.vue";
import PokemonGrid from "../PokemonGrid/PokemonGrid.vue";

interface Props {
  items: PokemonCardItem[];
  currentPage: number;
  totalPages: number;
}

interface Emits {
  prev: [];
  next: [];
}

defineProps<Props>();
const emit = defineEmits<Emits>();

function handlePrev(): void {
  emit("prev");
}

function handleNext(): void {
  emit("next");
}
</script>

<template>
  <div data-testid="catalog-populated">
    <PokemonGrid :items="items" />
    <PaginationControls
      :current-page="currentPage"
      :total-pages="totalPages"
      @prev="handlePrev"
      @next="handleNext"
    />
  </div>
</template>
