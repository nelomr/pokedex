import { onUnmounted, type Ref, watch } from "vue";

const FOCUSABLE_SELECTOR = [
  'a[href]:not([tabindex="-1"])',
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(", ");

interface UseAccessibleModalOptions {
  containerRef: Ref<HTMLElement | null>;
  isOpen: Ref<boolean>;
  onClose: () => void;
}

function getFocusableElements(container: HTMLElement): HTMLElement[] {
  return Array.from(
    container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
  ).filter((el) => !el.hasAttribute("hidden"));
}

export function useAccessibleModal(options: UseAccessibleModalOptions): void {
  const { containerRef, isOpen, onClose } = options;

  let triggerElement: HTMLElement | null = null;
  let previousBodyOverflow = "";
  let previousBodyPaddingRight = "";
  let isLocked = false;

  function handleKeydown(event: KeyboardEvent): void {
    if (event.key === "Escape") {
      onClose();
      return;
    }

    if (event.key !== "Tab") {
      return;
    }

    const container = containerRef.value;
    if (!container) {
      return;
    }

    const focusable = getFocusableElements(container);
    if (focusable.length === 0) {
      return;
    }

    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    const active = document.activeElement;

    if (event.shiftKey) {
      if (active === first || !container.contains(active)) {
        event.preventDefault();
        last?.focus();
      }
    } else if (active === last || !container.contains(active)) {
      event.preventDefault();
      first?.focus();
    }
  }

  function handleMousedown(event: MouseEvent): void {
    const container = containerRef.value;
    if (!container) {
      return;
    }

    if (!container.contains(event.target as Node)) {
      onClose();
    }
  }

  function lockScroll(): void {
    if (isLocked) {
      return;
    }
    isLocked = true;

    previousBodyOverflow = document.body.style.overflow;
    previousBodyPaddingRight = document.body.style.paddingRight;

    const scrollbarWidth =
      window.innerWidth - document.documentElement.clientWidth;

    document.body.style.overflow = "hidden";
    document.body.style.paddingRight = `${scrollbarWidth}px`;
  }

  function unlockScroll(): void {
    if (!isLocked) {
      return;
    }
    isLocked = false;

    document.body.style.overflow = previousBodyOverflow;
    document.body.style.paddingRight = previousBodyPaddingRight;
  }

  function attach(): void {
    triggerElement = document.activeElement as HTMLElement | null;

    document.addEventListener("keydown", handleKeydown);
    document.addEventListener("mousedown", handleMousedown);

    lockScroll();

    const container = containerRef.value;
    if (container) {
      const focusable = getFocusableElements(container);
      focusable[0]?.focus();
    }
  }

  function detach(): void {
    document.removeEventListener("keydown", handleKeydown);
    document.removeEventListener("mousedown", handleMousedown);

    unlockScroll();

    triggerElement?.focus();
    triggerElement = null;
  }

  watch(isOpen, (open, wasOpen) => {
    if (open && !wasOpen) {
      attach();
    } else if (!open && wasOpen) {
      detach();
    }
  });

  onUnmounted(() => {
    document.removeEventListener("keydown", handleKeydown);
    document.removeEventListener("mousedown", handleMousedown);
    unlockScroll();
  });
}
