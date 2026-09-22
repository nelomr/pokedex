<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useRouter } from "vue-router";
import {
  POKEMON_STAT_COUNT,
  type PokemonDetail,
} from "../../domain/pokemon.types";
import { typeBadgeClasses } from "../../domain/typeColors";
import { ROUTE_NAMES } from "../../router/routeNames";
import { normalizeDetailKey } from "../../services/detailRouteKey";
import { usePokemonDetailStore } from "../../stores/pokemonDetail.store";
import { usePokemonListStore } from "../../stores/pokemonList.store";
import BaseModal from "../BaseModal/BaseModal.vue";
import PokemonDetailSkeleton from "../PokemonDetailSkeleton/PokemonDetailSkeleton.vue";
import placeholderSrc from "../../assets/pokemon-placeholder.svg";

interface Props {
  idOrName: string;
}

const props = defineProps<Props>();

const router = useRouter();
const detailStore = usePokemonDetailStore();
const listStore = usePokemonListStore();

const key = computed(() => normalizeDetailKey(props.idOrName));
const pendingPageSyncKey = ref<string | number | null>(null);

const titleId = computed(
  () => `pokemon-detail-title-${key.value ?? props.idOrName}`,
);

const detail = computed<PokemonDetail | undefined>(() =>
  key.value === null ? undefined : detailStore.cache.get(key.value),
);
const requestError = computed(() =>
  key.value === null ? undefined : detailStore.errors.get(key.value),
);
const isLoading = computed(
  () =>
    key.value !== null &&
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
  if (key.value === null) {
    return;
  }
  void detailStore.getPokemonDetail(key.value);
}

function syncPageFor(syncKey: string | number | null): void {
  if (syncKey === null) {
    return;
  }

  if (listStore.status === "success") {
    listStore.goToPageOf(syncKey);
    return;
  }

  if (listStore.status === "error") {
    return;
  }

  pendingPageSyncKey.value = syncKey;
}

watch(
  key,
  (newKey) => {
    hasArtworkError.value = false;
    requestDetail();
    pendingPageSyncKey.value = null;
    syncPageFor(newKey);
  },
  { immediate: true },
);

watch(
  () => listStore.status,
  (newStatus) => {
    if (pendingPageSyncKey.value === null) {
      return;
    }

    if (newStatus === "success") {
      listStore.goToPageOf(pendingPageSyncKey.value);
      pendingPageSyncKey.value = null;
    } else if (newStatus === "error") {
      pendingPageSyncKey.value = null;
    }
  },
);

function handleClose(): void {
  void router.push({ name: ROUTE_NAMES.pokemonCatalog });
}

function retry(): void {
  requestDetail();
}
</script>

<template>
  <BaseModal :open="true" :title-id="titleId" @close="handleClose">
    <template #title>
      <h2 :id="titleId" class="text-xl font-bold capitalize">
        {{ detail?.name ?? idOrName }}
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
        class="rounded bg-slate-700 px-3 py-1 cursor-pointer"
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
          data-testid="detail-type-badge"
          class="rounded-full px-3 py-1 text-xs capitalize"
          :class="typeBadgeClasses(type)"
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
