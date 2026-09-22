import { mount } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import SearchBar from "./SearchBar.vue";

describe("SearchBar", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("emits the entered value debounced", async () => {
    const wrapper = mount(SearchBar, {
      props: { searchMode: "name" },
    });
    const input = wrapper.find("[data-testid='search-input']");

    await input.setValue("pikachu");

    expect(wrapper.emitted("update:query")).toBeUndefined();

    vi.advanceTimersByTime(300);
    await wrapper.vm.$nextTick();

    expect(wrapper.emitted("update:query")).toBeTruthy();
    expect(wrapper.emitted("update:query")?.at(-1)).toEqual(["pikachu"]);
  });

  it("rejects non-digit input when number mode is active", async () => {
    const wrapper = mount(SearchBar, {
      props: { searchMode: "id" },
    });
    const input = wrapper.find("[data-testid='search-input']");

    await input.setValue("12a3b");

    expect((input.element as HTMLInputElement).value).toBe("123");
  });

  it("reflects the active mode in the input's accessible name", async () => {
    const wrapperName = mount(SearchBar, { props: { searchMode: "name" } });
    const wrapperId = mount(SearchBar, { props: { searchMode: "id" } });

    const nameInput = wrapperName.find("[data-testid='search-input']");
    const idInput = wrapperId.find("[data-testid='search-input']");

    expect(nameInput.attributes("aria-label")).not.toEqual(
      idInput.attributes("aria-label"),
    );
  });

  it("emits a cleared query when the mode selector is switched", async () => {
    const wrapper = mount(SearchBar, {
      props: { searchMode: "name" },
    });
    const input = wrapper.find("[data-testid='search-input']");
    await input.setValue("pikachu");
    vi.advanceTimersByTime(300);
    await wrapper.vm.$nextTick();

    const radio = wrapper.find("[data-testid='search-mode-id']");
    await radio.setValue(true);

    expect(wrapper.emitted("update:searchMode")?.at(-1)).toEqual(["id"]);
    expect(wrapper.emitted("update:query")?.at(-1)).toEqual([""]);
  });

  it("exposes an accessible radiogroup with labeled mode options", () => {
    const wrapper = mount(SearchBar, { props: { searchMode: "name" } });

    expect(wrapper.find("[role='radiogroup']").exists()).toBe(true);
    expect(wrapper.find("[data-testid='search-mode-name']").exists()).toBe(
      true,
    );
    expect(wrapper.find("[data-testid='search-mode-id']").exists()).toBe(true);
  });
});
