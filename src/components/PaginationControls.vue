<script setup lang="ts">
interface Props {
  currentPage: number;
  totalPages: number;
}

interface Emits {
  prev: [];
  next: [];
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

function handlePrev(): void {
  emit("prev");
}

function handleNext(): void {
  emit("next");
}
</script>

<template>
  <div class="flex items-center justify-center gap-4 p-4 text-slate-100">
    <button
      type="button"
      data-testid="prev-page"
      :disabled="props.currentPage <= 1"
      class="rounded bg-slate-700 px-3 py-1 disabled:cursor-not-allowed disabled:opacity-40"
      :class="{ 'cursor-pointer': props.currentPage > 1 }"
      @click="handlePrev"
    >
      Previous
    </button>
    <span data-testid="page-status"
      >Page {{ props.currentPage }} of {{ props.totalPages }}</span
    >
    <button
      type="button"
      data-testid="next-page"
      :disabled="props.currentPage >= props.totalPages"
      class="rounded bg-slate-700 px-3 py-1 disabled:cursor-not-allowed disabled:opacity-40"
      :class="{ 'cursor-pointer': props.currentPage < props.totalPages }"
      @click="handleNext"
    >
      Next
    </button>
  </div>
</template>
