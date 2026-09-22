<script setup lang="ts">
import { ref } from "vue";
import type { PokemonCardItem } from "../domain/pokemon.types";
import placeholderSrc from "../assets/pokemon-placeholder.svg";

interface Props {
  item: PokemonCardItem;
}

const { item } = defineProps<Props>();

const hasImageError = ref(false);
const displayedSrc = ref(item.spriteUrl ?? placeholderSrc);

function handleImageError(): void {
  hasImageError.value = true;
  displayedSrc.value = placeholderSrc;
}
</script>

<template>
  <div
    class="flex flex-col items-center gap-2 rounded-lg bg-slate-800 p-3 text-center shadow"
  >
    <img
      :src="displayedSrc"
      :alt="item.name"
      loading="lazy"
      class="h-24 w-24 object-contain"
      data-testid="pokemon-card-image"
      @error="handleImageError"
    />
    <span class="text-sm font-medium capitalize text-slate-100">{{
      item.name
    }}</span>
  </div>
</template>
