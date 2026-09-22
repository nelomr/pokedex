<script setup lang="ts">
import { ref } from "vue";
import { RouterLink } from "vue-router";
import type { PokemonCardItem } from "../../domain/pokemon.types";
import { ROUTE_NAMES } from "../../router/routeNames";
import placeholderSrc from "../../assets/pokemon-placeholder.svg";

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
  <RouterLink
    :to="{ name: ROUTE_NAMES.pokemonDetail, params: { idOrName: item.name } }"
    class="flex cursor-pointer flex-col items-center gap-2 rounded-lg bg-slate-800 p-3 text-center shadow transition-transform duration-150 ease-out hover:-translate-y-0.5 hover:shadow-lg focus:outline-none focus-visible:-translate-y-0.5 focus-visible:shadow-lg focus-visible:ring-2 focus-visible:ring-sky-400"
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
  </RouterLink>
</template>
