import { mount as mountComponent } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createMemoryHistory, createRouter, type Router } from "vue-router";
import PokemonCatalogView from "./PokemonCatalogView.vue";
import { NetworkError, NotFoundError, RateLimitError } from "../domain/errors";
import { httpGet } from "../api/httpClient";
import { routes } from "../router";

vi.mock("../api/httpClient", () => ({
  httpGet: vi.fn(),
}));

let router: Router;

function mount(
  component: typeof PokemonCatalogView,
  options?: Parameters<typeof mountComponent>[1],
) {
  return mountComponent(component, {
    ...options,
    global: { plugins: [router], ...options?.global },
  });
}

describe("PokemonCatalogView", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.mocked(httpGet).mockReset();
    router = createRouter({ history: createMemoryHistory(), routes });
  });

  it("shows a distinct loading state while the catalog has not finished loading", async () => {
    vi.mocked(httpGet).mockReturnValue(new Promise(() => {}));
    const wrapper = mount(PokemonCatalogView);
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
    const wrapper = mount(PokemonCatalogView);
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
    const wrapper = mount(PokemonCatalogView);
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
    const wrapper = mount(PokemonCatalogView);
    await flushAsync();

    expect(wrapper.find('[data-testid="catalog-populated"]').exists()).toBe(
      true,
    );
    expect(wrapper.find('[data-testid="catalog-empty"]').exists()).toBe(false);
    expect(wrapper.find('[data-testid="catalog-error"]').exists()).toBe(false);
  });

  it("shows a message matching the failure class for a rate-limit error", async () => {
    vi.mocked(httpGet).mockRejectedValue(new RateLimitError());
    const wrapper = mount(PokemonCatalogView);
    await flushAsync();

    expect(wrapper.find('[data-testid="catalog-error"]').text()).toContain(
      new RateLimitError().message,
    );
  });

  it("shows a message matching the failure class for a not-found error", async () => {
    vi.mocked(httpGet).mockRejectedValue(new NotFoundError());
    const wrapper = mount(PokemonCatalogView);
    await flushAsync();

    expect(wrapper.find('[data-testid="catalog-error"]').text()).toContain(
      new NotFoundError().message,
    );
  });

  it("shows a message matching the failure class for a network error", async () => {
    vi.mocked(httpGet).mockRejectedValue(new NetworkError());
    const wrapper = mount(PokemonCatalogView);
    await flushAsync();

    expect(wrapper.find('[data-testid="catalog-error"]').text()).toContain(
      new NetworkError().message,
    );
  });

  it("retries the load when the retry action is triggered", async () => {
    vi.mocked(httpGet).mockRejectedValueOnce(new NetworkError());
    const wrapper = mount(PokemonCatalogView);
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
    const wrapper = mount(PokemonCatalogView);
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

  // Detail-modal open/close wiring is now route-driven and is covered by
  // src/views/PokemonDetailRoute.spec.ts, which mounts the real router.
});

async function flushAsync(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
}
