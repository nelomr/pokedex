import { createPinia, setActivePinia } from "pinia";
import { flushPromises, mount } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { httpGet } from "../api/httpClient";
import placeholderSrc from "../assets/pokemon-placeholder.svg";
import { NotFoundError } from "../domain/errors";
import type { PokemonCardItem } from "../domain/pokemon.types";
import { usePokemonDetailStore } from "../stores/pokemonDetail.store";
import PokemonDetailModal from "./PokemonDetailModal.vue";
import PokemonDetailSkeleton from "./PokemonDetailSkeleton.vue";

vi.mock("../api/httpClient", () => ({
  httpGet: vi.fn(),
}));

const item: PokemonCardItem = {
  id: 1,
  name: "bulbasaur",
  spriteUrl: "https://example.com/1.png",
};

function makeDetailDto() {
  return {
    id: 1,
    name: "bulbasaur",
    height: 7,
    weight: 69,
    types: [{ slot: 1, type: { name: "grass", url: "" } }],
    abilities: [
      { ability: { name: "overgrow", url: "" }, is_hidden: false, slot: 1 },
    ],
    stats: [
      { base_stat: 45, effort: 0, stat: { name: "hp", url: "" } },
      { base_stat: 49, effort: 0, stat: { name: "attack", url: "" } },
      { base_stat: 49, effort: 0, stat: { name: "defense", url: "" } },
      { base_stat: 65, effort: 0, stat: { name: "special-attack", url: "" } },
      { base_stat: 65, effort: 0, stat: { name: "special-defense", url: "" } },
      { base_stat: 45, effort: 0, stat: { name: "speed", url: "" } },
    ],
    sprites: { front_default: null },
  };
}

function mountModal() {
  setActivePinia(createPinia());
  return mount(PokemonDetailModal, {
    props: { open: true, item },
    attachTo: document.body,
  });
}

describe("PokemonDetailModal", () => {
  beforeEach(() => {
    vi.mocked(httpGet).mockReset();
  });

  it("renders the skeleton while loading and not once loaded", async () => {
    let resolveFn: (value: unknown) => void = () => {};
    vi.mocked(httpGet).mockReturnValue(
      new Promise((resolve) => {
        resolveFn = resolve;
      }),
    );
    const wrapper = mountModal();
    await wrapper.vm.$nextTick();

    expect(wrapper.findComponent(PokemonDetailSkeleton).exists()).toBe(true);

    resolveFn(makeDetailDto());
    await flushPromises();

    expect(wrapper.findComponent(PokemonDetailSkeleton).exists()).toBe(false);
    expect(wrapper.text()).toContain("bulbasaur");
    expect(wrapper.text()).toContain("grass");
    expect(wrapper.text()).toContain("overgrow");
    wrapper.unmount();
  });

  it("renders an error state with retry on failure, without the skeleton", async () => {
    vi.mocked(httpGet).mockRejectedValue(new NotFoundError());
    const wrapper = mountModal();
    await flushPromises();

    expect(wrapper.findComponent(PokemonDetailSkeleton).exists()).toBe(false);
    expect(wrapper.find("[data-testid='detail-error']").exists()).toBe(true);
    expect(wrapper.find("[data-testid='detail-retry']").exists()).toBe(true);
    wrapper.unmount();
  });

  it("re-issues the detail request on retry", async () => {
    vi.mocked(httpGet).mockRejectedValueOnce(new NotFoundError());
    const wrapper = mountModal();
    await flushPromises();

    vi.mocked(httpGet).mockResolvedValueOnce(makeDetailDto());
    await wrapper.find("[data-testid='detail-retry']").trigger("click");
    await flushPromises();

    expect(httpGet).toHaveBeenCalledTimes(2);
    expect(wrapper.text()).toContain("bulbasaur");
    wrapper.unmount();
  });

  it("renders the loaded state directly, skipping loading, for a cached Pokémon", async () => {
    setActivePinia(createPinia());
    const detailStore = usePokemonDetailStore();
    vi.mocked(httpGet).mockResolvedValueOnce(makeDetailDto());
    await detailStore.getPokemonDetail(1);

    const wrapper = mount(PokemonDetailModal, {
      props: { open: true, item },
      attachTo: document.body,
    });
    await wrapper.vm.$nextTick();

    expect(wrapper.findComponent(PokemonDetailSkeleton).exists()).toBe(false);
    expect(wrapper.text()).toContain("bulbasaur");
    expect(httpGet).toHaveBeenCalledTimes(1);
    wrapper.unmount();
  });

  it("skeleton stat placeholder count matches the loaded stat row count", async () => {
    let resolveFn: (value: unknown) => void = () => {};
    vi.mocked(httpGet).mockReturnValue(
      new Promise((resolve) => {
        resolveFn = resolve;
      }),
    );
    const wrapper = mountModal();
    await wrapper.vm.$nextTick();

    const skeletonStatRows = wrapper.findAll(
      "[data-testid='skeleton-stat-row']",
    ).length;

    resolveFn(makeDetailDto());
    await flushPromises();

    const loadedStatRows = wrapper.findAll(
      "[data-testid='detail-content'] [data-testid='detail-stat-row']",
    ).length;

    expect(skeletonStatRows).toBe(loadedStatRows);
    wrapper.unmount();
  });

  it("falls back to the placeholder image when the artwork fails to load", async () => {
    vi.mocked(httpGet).mockResolvedValueOnce(makeDetailDto());
    const wrapper = mountModal();
    await flushPromises();

    const image = wrapper.find("[data-testid='detail-artwork']");
    expect(image.attributes("src")).not.toBe(placeholderSrc);

    await image.trigger("error");

    expect(
      wrapper.find("[data-testid='detail-artwork']").attributes("src"),
    ).toBe(placeholderSrc);
    wrapper.unmount();
  });
});
