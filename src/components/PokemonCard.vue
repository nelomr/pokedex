<script setup lang="ts">
import { ref } from "vue";
import type { PokemonCardItem } from "../domain/pokemon.types";
import placeholderSrc from "../assets/pokemon-placeholder.svg";

interface Props {
  item: PokemonCardItem;
}

interface Emits {
  (event: "select", item: PokemonCardItem): void;
}

const { item } = defineProps<Props>();
const emit = defineEmits<Emits>();

const hasImageError = ref(false);
const displayedSrc = ref(item.spriteUrl ?? placeholderSrc);

function handleImageError(): void {
  hasImageError.value = true;
  displayedSrc.value = placeholderSrc;
}

function activate(): void {
  emit("select", item);
}

function handleKeydown(event: KeyboardEvent): void {
  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    activate();
  }
}
</script>

<template>
  <div
    role="button"
    tabindex="0"
    class="flex cursor-pointer flex-col items-center gap-2 rounded-lg bg-slate-800 p-3 text-center shadow transition-transform duration-150 ease-out hover:-translate-y-0.5 hover:shadow-lg focus:outline-none focus-visible:-translate-y-0.5 focus-visible:shadow-lg focus-visible:ring-2 focus-visible:ring-sky-400"
    @click="activate"
    @keydown="handleKeydown"
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
