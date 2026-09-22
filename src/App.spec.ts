import { mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { beforeEach, describe, expect, it, vi } from "vitest";
import App from "./App.vue";
import { NetworkError, NotFoundError, RateLimitError } from "./domain/errors";
import { httpGet } from "./api/httpClient";

vi.mock("./api/httpClient", () => ({
  httpGet: vi.fn(),
}));

describe("App", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.mocked(httpGet).mockReset();
  });

  it("shows a distinct loading state while the catalog has not finished loading", async () => {
    vi.mocked(httpGet).mockReturnValue(new Promise(() => {}));
    const wrapper = mount(App);
    await flushAsync();

    expect(wrapper.find('[data-testid="catalog-loading"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="catalog-error"]').exists()).toBe(false);
    expect(wrapper.find('[data-testid="catalog-empty"]').exists()).toBe(false);
    expect(wrapper.find('[data-testid="catalog-populated"]').exists()).toBe(
      false,
    );
  });

  it("shows a distinct error state with a retry action when the catalog fails to load", async () => {
    vi.mocked(httpGet).mockRejectedValue(new NetworkError());
    const wrapper = mount(App);
    await flushAsync();

    expect(wrapper.find('[data-testid="catalog-error"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="catalog-retry"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="catalog-loading"]').exists()).toBe(
      false,
    );
    expect(wrapper.find('[data-testid="catalog-populated"]').exists()).toBe(
      false,
    );
  });

  it("shows a distinct empty state when the catalog loads with no entries", async () => {
    vi.mocked(httpGet).mockResolvedValue({ results: [] });
    const wrapper = mount(App);
    await flushAsync();

    expect(wrapper.find('[data-testid="catalog-empty"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="catalog-error"]').exists()).toBe(false);
    expect(wrapper.find('[data-testid="catalog-populated"]').exists()).toBe(
      false,
    );
  });

  it("shows the populated state when the catalog loads with entries", async () => {
    vi.mocked(httpGet).mockResolvedValue({
      results: [
        { name: "bulbasaur", url: "https://pokeapi.co/api/v2/pokemon/1/" },
      ],
    });
    const wrapper = mount(App);
    await flushAsync();

    expect(wrapper.find('[data-testid="catalog-populated"]').exists()).toBe(
      true,
    );
    expect(wrapper.find('[data-testid="catalog-empty"]').exists()).toBe(false);
    expect(wrapper.find('[data-testid="catalog-error"]').exists()).toBe(false);
  });

  it("shows a message matching the failure class for a rate-limit error", async () => {
    vi.mocked(httpGet).mockRejectedValue(new RateLimitError());
    const wrapper = mount(App);
    await flushAsync();

    expect(wrapper.find('[data-testid="catalog-error"]').text()).toContain(
      new RateLimitError().message,
    );
  });

  it("shows a message matching the failure class for a not-found error", async () => {
    vi.mocked(httpGet).mockRejectedValue(new NotFoundError());
    const wrapper = mount(App);
    await flushAsync();

    expect(wrapper.find('[data-testid="catalog-error"]').text()).toContain(
      new NotFoundError().message,
    );
  });

  it("shows a message matching the failure class for a network error", async () => {
    vi.mocked(httpGet).mockRejectedValue(new NetworkError());
    const wrapper = mount(App);
    await flushAsync();

    expect(wrapper.find('[data-testid="catalog-error"]').text()).toContain(
      new NetworkError().message,
    );
  });

  it("retries the load when the retry action is triggered", async () => {
    vi.mocked(httpGet).mockRejectedValueOnce(new NetworkError());
    const wrapper = mount(App);
    await flushAsync();

    vi.mocked(httpGet).mockResolvedValueOnce({ results: [] });
    await wrapper.get('[data-testid="catalog-retry"]').trigger("click");
    await flushAsync();

    expect(httpGet).toHaveBeenCalledTimes(2);
    expect(wrapper.find('[data-testid="catalog-empty"]').exists()).toBe(true);
  });

  it("shows a distinct no-results state when filters exclude every entry", async () => {
    vi.useFakeTimers();
    vi.mocked(httpGet).mockResolvedValue({
      results: [
        { name: "bulbasaur", url: "https://pokeapi.co/api/v2/pokemon/1/" },
      ],
    });
    const wrapper = mount(App);
    await flushAsync();

    await wrapper
      .get("[data-testid='search-input']")
      .setValue("nonexistent-pokemon-xyz");
    vi.advanceTimersByTime(300);
    await flushAsync();

    expect(wrapper.find('[data-testid="catalog-no-results"]').exists()).toBe(
      true,
    );
    expect(wrapper.find('[data-testid="catalog-empty"]').exists()).toBe(false);
    expect(wrapper.find('[data-testid="catalog-loading"]').exists()).toBe(
      false,
    );
    expect(wrapper.find('[data-testid="catalog-error"]').exists()).toBe(false);
    vi.useRealTimers();
  });

  describe("detail modal wiring", () => {
    async function mountWithOnePokemon() {
      vi.mocked(httpGet).mockResolvedValueOnce({
        results: [
          { name: "bulbasaur", url: "https://pokeapi.co/api/v2/pokemon/1/" },
        ],
      });
      const wrapper = mount(App, { attachTo: document.body });
      await flushAsync();
      return wrapper;
    }

    it("does not render the detail modal initially", async () => {
      const wrapper = await mountWithOnePokemon();
      expect(wrapper.find("[role='dialog']").exists()).toBe(false);
      wrapper.unmount();
    });

    it("opens the detail modal when a card emits select", async () => {
      vi.mocked(httpGet).mockReturnValue(new Promise(() => {}));
      const wrapper = await mountWithOnePokemon();

      const card = wrapper.find("[role='button']");
      await card.trigger("click");
      await flushAsync();

      expect(wrapper.find("[role='dialog']").exists()).toBe(true);
      wrapper.unmount();
    });

    it("closes the detail modal and restores focus to the originating card on close", async () => {
      vi.mocked(httpGet).mockReturnValue(new Promise(() => {}));
      const wrapper = await mountWithOnePokemon();

      const card = wrapper.get("[role='button']");
      (card.element as HTMLElement).focus();
      await card.trigger("click");
      await flushAsync();

      await wrapper.get("[data-testid='modal-close']").trigger("click");
      await flushAsync();

      expect(wrapper.find("[role='dialog']").exists()).toBe(false);
      expect(document.activeElement).toBe(card.element);
      wrapper.unmount();
    });

    it("marks the background content inert while the modal is open, and reachable again after close", async () => {
      vi.mocked(httpGet).mockReturnValue(new Promise(() => {}));
      const wrapper = await mountWithOnePokemon();
      const content = wrapper.get("[data-testid='app-content']").element;

      expect(content.hasAttribute("inert")).toBe(false);

      await wrapper.find("[role='button']").trigger("click");
      await flushAsync();

      expect(content.hasAttribute("inert")).toBe(true);

      await wrapper.get("[data-testid='modal-close']").trigger("click");
      await flushAsync();

      expect(content.hasAttribute("inert")).toBe(false);
      wrapper.unmount();
    });
  });
});

async function flushAsync(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
}
