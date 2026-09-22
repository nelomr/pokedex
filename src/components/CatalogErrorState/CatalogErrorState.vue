<script setup lang="ts">
interface Props {
  message: string;
}

interface Emits {
  retry: [];
}

defineProps<Props>();
const emit = defineEmits<Emits>();

function handleRetry(): void {
  emit("retry");
}
</script>

<template>
  <div data-testid="catalog-error" class="p-4">
    <p>{{ message }}</p>
    <button
      type="button"
      data-testid="catalog-retry"
      class="mt-2 rounded bg-slate-700 px-3 py-1 cursor-pointer"
      @click="handleRetry"
    >
      Retry
    </button>
  </div>
</template>
