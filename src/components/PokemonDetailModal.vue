<script setup lang="ts">
import { computed, ref, watch } from "vue";
import {
  POKEMON_STAT_COUNT,
  type PokemonCardItem,
  type PokemonDetail,
} from "../domain/pokemon.types";
import { usePokemonDetailStore } from "../stores/pokemonDetail.store";
import BaseModal from "./BaseModal.vue";
import PokemonDetailSkeleton from "./PokemonDetailSkeleton.vue";
import placeholderSrc from "../assets/pokemon-placeholder.svg";

interface Props {
  open: boolean;
  item: PokemonCardItem;
}

interface Emits {
  (event: "close"): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

const detailStore = usePokemonDetailStore();

const titleId = computed(
  () => `pokemon-detail-title-${props.item.id ?? props.item.name}`,
);

const key = computed(() => props.item.id ?? props.item.name);
const detail = computed<PokemonDetail | undefined>(() =>
  detailStore.cache.get(key.value),
);
const requestError = computed(() => detailStore.errors.get(key.value));
const isLoading = computed(
  () =>
    !detail.value &&
    !requestError.value &&
    detailStore.loadingIds.has(key.value),
);

const hasArtworkError = ref(false);
const artworkSrc = computed(() =>
  hasArtworkError.value || !detail.value?.artworkUrl
    ? placeholderSrc
    : detail.value.artworkUrl,
);

function handleArtworkError(): void {
  hasArtworkError.value = true;
}

function requestDetail(): void {
  void detailStore.getPokemonDetail(key.value);
}

watch(
  () => props.open,
  (open) => {
    if (open) {
      hasArtworkError.value = false;
      requestDetail();
    }
  },
  { immediate: true },
);

function handleClose(): void {
  emit("close");
}

function retry(): void {
  requestDetail();
}
</script>

<template>
  <BaseModal :open="open" :title-id="titleId" @close="handleClose">
    <template #title>
      <h2 :id="titleId" class="text-xl font-bold capitalize">
        {{ detail?.name ?? item.name }}
      </h2>
    </template>

    <PokemonDetailSkeleton v-if="isLoading" :stat-count="POKEMON_STAT_COUNT" />

    <div
      v-else-if="requestError"
      data-testid="detail-error"
      class="flex flex-col items-center gap-3 py-6 text-center"
    >
      <p>{{ requestError.message }}</p>
      <button
        type="button"
        data-testid="detail-retry"
        class="rounded bg-slate-700 px-3 py-1"
        @click="retry"
      >
        Retry
      </button>
    </div>

    <div
      v-else-if="detail"
      data-testid="detail-content"
      class="flex flex-col gap-4"
    >
      <img
        :src="artworkSrc"
        :alt="detail.name"
        data-testid="detail-artwork"
        class="mx-auto h-32 w-32 object-contain"
        @error="handleArtworkError"
      />
      <p class="text-center text-sm text-slate-400">#{{ detail.id }}</p>

      <div class="flex justify-center gap-2">
        <span
          v-for="type in detail.types"
          :key="type"
          class="rounded-full bg-slate-700 px-3 py-1 text-xs capitalize"
        >
          {{ type }}
        </span>
      </div>

      <div>
        <h3 class="mb-1 text-sm font-semibold text-slate-300">Abilities</h3>
        <p class="capitalize">{{ detail.abilities.join(", ") }}</p>
      </div>

      <div>
        <h3 class="mb-1 text-sm font-semibold text-slate-300">Base stats</h3>
        <div class="flex flex-col gap-1">
          <div
            v-for="stat in detail.stats"
            :key="stat.name"
            data-testid="detail-stat-row"
            class="flex justify-between text-sm capitalize"
          >
            <span>{{ stat.name }}</span>
            <span>{{ stat.value }}</span>
          </div>
        </div>
      </div>

      <div class="flex justify-between text-sm">
        <span
          >Height:
          {{
            detail.heightMeters === null ? "—" : `${detail.heightMeters} m`
          }}</span
        >
        <span
          >Weight:
          {{
            detail.weightKilograms === null
              ? "—"
              : `${detail.weightKilograms} kg`
          }}</span
        >
      </div>
    </div>
  </BaseModal>
</template>
