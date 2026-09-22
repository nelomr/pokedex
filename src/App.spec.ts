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
});

async function flushAsync(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
}
