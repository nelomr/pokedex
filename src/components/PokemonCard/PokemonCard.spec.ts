import { flushPromises, mount } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";
import { createMemoryHistory, createRouter, type Router } from "vue-router";
import type { PokemonCardItem } from "../../domain/pokemon.types";
import { routes } from "../../router";
import PokemonCard from "./PokemonCard.vue";

const item: PokemonCardItem = {
  id: 1,
  name: "bulbasaur",
  spriteUrl: "https://example.com/1.png",
};

function mountCard(router: Router) {
  return mount(PokemonCard, {
    props: { item },
    global: { plugins: [router] },
  });
}

describe("PokemonCard", () => {
  it("renders an anchor whose href is the Pokémon's detail path", async () => {
    const router = createRouter({ history: createMemoryHistory(), routes });
    await router.push("/");
    const wrapper = mountCard(router);

    expect(wrapper.element.tagName).toBe("A");
    expect(wrapper.attributes("href")).toBe("/pokemon/bulbasaur");
  });

  it("emits no select event", () => {
    const emitSpy = vi.fn();
    const router = createRouter({ history: createMemoryHistory(), routes });
    const wrapper = mountCard(router);
    wrapper.vm.$emit = emitSpy;

    expect(wrapper.emitted("select")).toBeUndefined();
  });

  it("navigates to the detail route when activated", async () => {
    const router = createRouter({ history: createMemoryHistory(), routes });
    await router.push("/");
    const wrapper = mountCard(router);

    await wrapper.trigger("click");
    await flushPromises();

    expect(router.currentRoute.value.fullPath).toBe("/pokemon/bulbasaur");
  });
});
