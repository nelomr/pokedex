import { customRef, onUnmounted, watch, type Ref } from "vue";

export function useDebounce<T>(source: Ref<T>, delayMs: number): Ref<T> {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  const debounced = customRef<T>((track, trigger) => {
    let value = source.value;

    return {
      get() {
        track();
        return value;
      },
      set(newValue: T) {
        value = newValue;
        trigger();
      },
    };
  });

  function clearPendingTimeout(): void {
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
  }

  watch(source, (newValue) => {
    clearPendingTimeout();
    timeoutId = setTimeout(() => {
      debounced.value = newValue;
      timeoutId = null;
    }, delayMs);
  });

  onUnmounted(() => {
    clearPendingTimeout();
  });

  return debounced;
}
