<script setup lang="ts">
import type { PokemonCardItem } from "../domain/pokemon.types";
import PokemonCard from "./PokemonCard.vue";

interface Props {
  items: PokemonCardItem[];
}

interface Emits {
  (event: "select", item: PokemonCardItem): void;
}

defineProps<Props>();
const emit = defineEmits<Emits>();
</script>

<template>
  <div
    class="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5"
  >
    <PokemonCard
      v-for="item in items"
      :key="item.name"
      :item="item"
      @select="emit('select', $event)"
    />
  </div>
</template>
