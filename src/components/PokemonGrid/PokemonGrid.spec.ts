import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import { createMemoryHistory, createRouter } from "vue-router";
import type { PokemonCardItem } from "../../domain/pokemon.types";
import { routes } from "../../router";
import PokemonCard from "../PokemonCard/PokemonCard.vue";
import PokemonGrid from "./PokemonGrid.vue";

function makeItems(count: number): PokemonCardItem[] {
  return Array.from({ length: count }, (_, i) => ({
    id: i + 1,
    name: `pokemon-${i + 1}`,
    spriteUrl: `https://example.com/${i + 1}.png`,
  }));
}

describe("PokemonGrid", () => {
  it("renders one PokemonCard per item in the passed array", () => {
    const router = createRouter({ history: createMemoryHistory(), routes });
    const wrapper = mount(PokemonGrid, {
      props: { items: makeItems(7) },
      global: { plugins: [router] },
    });

    expect(wrapper.findAllComponents(PokemonCard)).toHaveLength(7);
  });
});
