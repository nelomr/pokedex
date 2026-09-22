import { nextTick, ref, type Ref } from "vue";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useAccessibleModal } from "./useAccessibleModal";

function setupContainer(): HTMLElement {
  const container = document.createElement("div");
  container.innerHTML = `
    <button id="first">First</button>
    <a id="link" href="#">Link</a>
    <button id="last">Last</button>
  `;
  document.body.appendChild(container);
  return container;
}

describe("useAccessibleModal", () => {
  let container: HTMLElement;
  let trigger: HTMLButtonElement;
  let onClose: () => void;
  let isOpen: Ref<boolean>;

  beforeEach(() => {
    document.body.innerHTML = "";
    trigger = document.createElement("button");
    trigger.id = "trigger";
    document.body.appendChild(trigger);
    trigger.focus();

    container = setupContainer();
    onClose = vi.fn();
    isOpen = ref(false);
  });

  afterEach(() => {
    document.body.innerHTML = "";
  });

  function mountModal() {
    const containerRef = ref(container);
    const result = useAccessibleModal({
      containerRef,
      isOpen,
      onClose,
    });
    return result;
  }

  it("moves focus to the first focusable element on open", async () => {
    mountModal();
    isOpen.value = true;
    await nextTick();

    expect(document.activeElement?.id).toBe("first");
  });

  it("wraps Tab from the last focusable element to the first", async () => {
    mountModal();
    isOpen.value = true;
    await nextTick();

    const last = container.querySelector<HTMLElement>("#last");
    last?.focus();

    const event = new KeyboardEvent("keydown", { key: "Tab", bubbles: true });
    document.dispatchEvent(event);

    expect(document.activeElement?.id).toBe("first");
  });

  it("wraps Shift+Tab from the first focusable element to the last", async () => {
    mountModal();
    isOpen.value = true;
    await nextTick();

    const first = container.querySelector<HTMLElement>("#first");
    first?.focus();

    const event = new KeyboardEvent("keydown", {
      key: "Tab",
      shiftKey: true,
      bubbles: true,
    });
    document.dispatchEvent(event);

    expect(document.activeElement?.id).toBe("last");
  });

  it("triggers close on Escape", async () => {
    mountModal();
    isOpen.value = true;
    await nextTick();

    const event = new KeyboardEvent("keydown", {
      key: "Escape",
      bubbles: true,
    });
    document.dispatchEvent(event);

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("triggers close on an outside click but not on an inside click", async () => {
    mountModal();
    isOpen.value = true;
    await nextTick();

    const inside = container.querySelector<HTMLElement>("#first");
    inside?.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
    expect(onClose).not.toHaveBeenCalled();

    const outside = document.createElement("div");
    document.body.appendChild(outside);
    outside.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("restores focus to the trigger element on close", async () => {
    mountModal();
    isOpen.value = true;
    await nextTick();
    expect(document.activeElement?.id).toBe("first");

    isOpen.value = false;
    await nextTick();

    expect(document.activeElement?.id).toBe("trigger");
  });

  it("removes every document listener added on open, on close", async () => {
    const addSpy = vi.spyOn(document, "addEventListener");
    const removeSpy = vi.spyOn(document, "removeEventListener");

    mountModal();
    isOpen.value = true;
    await nextTick();
    const addedTypes = addSpy.mock.calls.map((call) => call[0]);

    isOpen.value = false;
    await nextTick();
    const removedTypes = removeSpy.mock.calls.map((call) => call[0]);

    for (const type of addedTypes) {
      expect(removedTypes).toContain(type);
    }
  });

  describe("focus fallback with no usable trigger", () => {
    function setupHeading(): HTMLElement {
      const heading = document.createElement("h1");
      heading.setAttribute("data-testid", "catalog-heading");
      heading.setAttribute("tabindex", "-1");
      document.body.appendChild(heading);
      return heading;
    }

    it("falls back to the catalog heading when nothing was focused at open time", async () => {
      const heading = setupHeading();
      (document.activeElement as HTMLElement | null)?.blur();
      document.body.focus?.();

      mountModal();
      isOpen.value = true;
      await nextTick();

      isOpen.value = false;
      await nextTick();

      expect(document.activeElement).toBe(heading);
    });

    it("falls back to the catalog heading when the trigger is no longer in the document", async () => {
      const heading = setupHeading();
      trigger.focus();

      mountModal();
      isOpen.value = true;
      await nextTick();

      trigger.remove();

      isOpen.value = false;
      await nextTick();

      expect(document.activeElement).toBe(heading);
    });
  });

  describe("scroll lock", () => {
    beforeEach(() => {
      document.body.style.overflow = "";
      document.body.style.paddingRight = "";
      Object.defineProperty(window, "innerWidth", {
        configurable: true,
        value: 1024,
      });
      Object.defineProperty(document.documentElement, "clientWidth", {
        configurable: true,
        value: 1009,
      });
    });

    it("applies overflow hidden and scrollbar-width padding on lock", async () => {
      mountModal();
      isOpen.value = true;
      await nextTick();

      expect(document.body.style.overflow).toBe("hidden");
      expect(document.body.style.paddingRight).toBe("15px");
    });

    it("restores original overflow and padding on unlock", async () => {
      document.body.style.paddingRight = "3px";
      mountModal();
      isOpen.value = true;
      await nextTick();

      isOpen.value = false;
      await nextTick();

      expect(document.body.style.overflow).toBe("");
      expect(document.body.style.paddingRight).toBe("3px");
    });
  });
});
