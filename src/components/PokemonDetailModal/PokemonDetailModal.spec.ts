import { createPinia, setActivePinia } from "pinia";
import { flushPromises, mount } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createMemoryHistory, createRouter, type Router } from "vue-router";
import { httpGet } from "../../api/httpClient";
import placeholderSrc from "../../assets/pokemon-placeholder.svg";
import { NotFoundError } from "../../domain/errors";
import {
  NEUTRAL_BADGE_CLASSES,
  typeBadgeClasses,
} from "../../domain/typeColors";
import { routes } from "../../router";
import { usePokemonDetailStore } from "../../stores/pokemonDetail.store";
import PokemonDetailModal from "./PokemonDetailModal.vue";
import PokemonDetailSkeleton from "../PokemonDetailSkeleton/PokemonDetailSkeleton.vue";

vi.mock("../../api/httpClient", () => ({
  httpGet: vi.fn(),
}));

let router: Router;

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

function makeDetailDtoWithTypes(typeNames: string[]) {
  return {
    ...makeDetailDto(),
    types: typeNames.map((name, index) => ({
      slot: index + 1,
      type: { name, url: "" },
    })),
  };
}

function mountModal() {
  setActivePinia(createPinia());
  return mount(PokemonDetailModal, {
    props: { idOrName: "1" },
    attachTo: document.body,
    global: { plugins: [router] },
  });
}

describe("PokemonDetailModal", () => {
  beforeEach(() => {
    vi.mocked(httpGet).mockReset();
    router = createRouter({ history: createMemoryHistory(), routes });
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
      props: { idOrName: "1" },
      attachTo: document.body,
      global: { plugins: [router] },
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

  it("colours each type badge with its own type's treatment", async () => {
    vi.mocked(httpGet).mockResolvedValueOnce(
      makeDetailDtoWithTypes(["grass", "poison"]),
    );
    const wrapper = mountModal();
    await flushPromises();

    const badges = wrapper.findAll("[data-testid='detail-type-badge']");
    expect(badges).toHaveLength(2);
    expect(badges[0].classes().join(" ")).toContain(typeBadgeClasses("grass"));
    expect(badges[1].classes().join(" ")).toContain(typeBadgeClasses("poison"));
    expect(badges[0].classes()).not.toEqual(badges[1].classes());
    wrapper.unmount();
  });

  it("keeps the type name visible alongside its colour", async () => {
    vi.mocked(httpGet).mockResolvedValueOnce(
      makeDetailDtoWithTypes(["ground"]),
    );
    const wrapper = mountModal();
    await flushPromises();

    const badge = wrapper.find("[data-testid='detail-type-badge']");
    expect(badge.text()).toBe("ground");
    wrapper.unmount();
  });

  it("renders an unknown type neutrally without failing", async () => {
    vi.mocked(httpGet).mockResolvedValueOnce(
      makeDetailDtoWithTypes(["mystery"]),
    );
    const wrapper = mountModal();
    await flushPromises();

    const badge = wrapper.find("[data-testid='detail-type-badge']");
    expect(badge.text()).toBe("mystery");
    expect(badge.classes().join(" ")).toContain(NEUTRAL_BADGE_CLASSES);
    wrapper.unmount();
  });
});
