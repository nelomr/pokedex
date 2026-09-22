<script setup lang="ts">
import { ref, watch } from "vue";
import { useAccessibleModal } from "../../composables/useAccessibleModal";

interface Props {
  open: boolean;
  titleId: string;
}

interface Emits {
  (event: "close"): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

const surfaceRef = ref<HTMLElement | null>(null);
const isOpen = ref(false);

function handleClose(): void {
  emit("close");
}

useAccessibleModal({
  containerRef: surfaceRef,
  isOpen,
  onClose: handleClose,
});

watch(
  () => props.open,
  (value) => {
    isOpen.value = value;
  },
  { immediate: true },
);
</script>

<template>
  <div
    v-if="open"
    data-testid="modal-backdrop"
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
    @click="handleClose"
  >
    <div
      ref="surfaceRef"
      role="dialog"
      aria-modal="true"
      :aria-labelledby="titleId"
      class="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-lg bg-slate-800 p-6 text-slate-50 shadow-xl"
      @click.stop
    >
      <div class="mb-4 flex items-start justify-between gap-4">
        <slot name="title" />
        <button
          type="button"
          data-testid="modal-close"
          aria-label="Close"
          class="rounded p-1 text-slate-300 hover:text-slate-100 cursor-pointer"
          @click="handleClose"
        >
          ✕
        </button>
      </div>
      <slot />
    </div>
  </div>
</template>
