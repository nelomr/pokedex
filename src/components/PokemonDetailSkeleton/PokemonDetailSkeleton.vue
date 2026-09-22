<script setup lang="ts">
import { POKEMON_STAT_COUNT } from "../../domain/pokemon.types";

interface Props {
  statCount?: number;
}

const { statCount = POKEMON_STAT_COUNT } = defineProps<Props>();
</script>

<template>
  <div aria-busy="true">
    <div
      data-testid="skeleton-block"
      aria-hidden="true"
      class="mx-auto mb-4 h-32 w-32 animate-pulse rounded-lg bg-slate-700"
    ></div>
    <div
      data-testid="skeleton-block"
      aria-hidden="true"
      class="mx-auto mb-4 h-6 w-2/3 animate-pulse rounded bg-slate-700"
    ></div>
    <div class="mb-4 flex justify-center gap-2">
      <div
        v-for="n in 2"
        :key="`type-${n}`"
        data-testid="skeleton-block"
        aria-hidden="true"
        class="h-6 w-16 animate-pulse rounded-full bg-slate-700"
      ></div>
    </div>
    <div class="flex flex-col gap-2">
      <div
        v-for="n in statCount"
        :key="`stat-${n}`"
        data-testid="skeleton-stat-row"
        aria-hidden="true"
        class="h-4 w-full animate-pulse rounded bg-slate-700"
      ></div>
    </div>
  </div>
</template>

<style scoped>
@media (prefers-reduced-motion: reduce) {
  .animate-pulse {
    animation: none;
  }
}
</style>
