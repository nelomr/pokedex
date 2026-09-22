<script setup lang="ts">
import { ref, watch } from "vue";
import { useDebounce } from "../composables/useDebounce";
import type { SearchMode } from "../domain/pokemon.types";

interface Props {
  searchMode: SearchMode;
}

interface Emits {
  "update:query": [value: string];
  "update:searchMode": [mode: SearchMode];
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

const rawQuery = ref("");
const debouncedQuery = useDebounce(rawQuery, 300);

watch(debouncedQuery, (value) => {
  emit("update:query", value);
});

function handleInput(event: Event): void {
  const target = event.target as HTMLInputElement;
  let value = target.value;

  if (props.searchMode === "id") {
    value = value.replace(/\D/g, "");
    target.value = value;
  }

  rawQuery.value = value;
}

function handleModeChange(mode: SearchMode): void {
  if (mode === props.searchMode) {
    return;
  }

  rawQuery.value = "";
  emit("update:searchMode", mode);
  emit("update:query", "");
}
</script>

<template>
  <div class="flex flex-col gap-2">
    <div role="radiogroup" aria-label="Search mode" class="flex gap-4">
      <label class="flex items-center gap-1 text-slate-100">
        <input
          data-testid="search-mode-name"
          type="radio"
          name="search-mode"
          value="name"
          :checked="props.searchMode === 'name'"
          @change="handleModeChange('name')"
        />
        Name
      </label>
      <label class="flex items-center gap-1 text-slate-100">
        <input
          data-testid="search-mode-id"
          type="radio"
          name="search-mode"
          value="id"
          :checked="props.searchMode === 'id'"
          @change="handleModeChange('id')"
        />
        Number
      </label>
    </div>

    <input
      data-testid="search-input"
      type="text"
      :inputmode="props.searchMode === 'id' ? 'numeric' : 'text'"
      :pattern="props.searchMode === 'id' ? '[0-9]*' : undefined"
      :aria-label="
        props.searchMode === 'id'
          ? 'Search Pokémon by number'
          : 'Search Pokémon by name'
      "
      :value="rawQuery"
      class="rounded bg-slate-800 px-3 py-2 text-slate-100"
      @input="handleInput"
    />
  </div>
</template>
