import { defineComponent, h, nextTick, ref } from "vue";
import { mount } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useDebounce } from "./useDebounce";

describe("useDebounce", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("does not update the debounced value until the delay elapses", async () => {
    const source = ref("a");
    const debounced = useDebounce(source, 300);

    source.value = "ab";
    await nextTick();
    expect(debounced.value).toBe("a");

    vi.advanceTimersByTime(299);
    await nextTick();
    expect(debounced.value).toBe("a");

    vi.advanceTimersByTime(1);
    await nextTick();
    expect(debounced.value).toBe("ab");
  });

  it("collapses rapid successive changes into a single update after the delay", async () => {
    const source = ref("a");
    const debounced = useDebounce(source, 300);

    source.value = "ab";
    await nextTick();
    vi.advanceTimersByTime(100);
    source.value = "abc";
    await nextTick();
    vi.advanceTimersByTime(100);
    source.value = "abcd";
    await nextTick();

    vi.advanceTimersByTime(299);
    await nextTick();
    expect(debounced.value).toBe("a");

    vi.advanceTimersByTime(1);
    await nextTick();
    expect(debounced.value).toBe("abcd");
  });

  it("clears the pending timer when the consuming component unmounts", async () => {
    const source = ref("a");
    let debounced: ReturnType<typeof useDebounce<string>>;

    const TestComponent = defineComponent({
      setup() {
        debounced = useDebounce(source, 300);
        return () => h("div");
      },
    });

    const wrapper = mount(TestComponent);
    source.value = "ab";
    await nextTick();

    wrapper.unmount();

    vi.advanceTimersByTime(300);
    await nextTick();

    expect(debounced!.value).toBe("a");
  });
});
