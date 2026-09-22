<script setup lang="ts">
import { POKEMON_TYPES } from "../domain/pokemon.types";

interface Props {
  modelValue: string | null;
}

interface Emits {
  "update:modelValue": [value: string | null];
}

defineProps<Props>();
const emit = defineEmits<Emits>();

function handleChange(event: Event): void {
  const target = event.target as HTMLSelectElement;
  emit("update:modelValue", target.value === "" ? null : target.value);
}
</script>

<template>
  <select
    data-testid="type-filter-select"
    aria-label="Filter by Pokémon type"
    class="rounded bg-slate-800 px-3 py-2 text-slate-100"
    :value="modelValue ?? ''"
    @change="handleChange"
  >
    <option value="">All types</option>
    <option v-for="type in POKEMON_TYPES" :key="type" :value="type">
      {{ type }}
    </option>
  </select>
</template>
