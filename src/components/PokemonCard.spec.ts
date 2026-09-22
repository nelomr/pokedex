import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import type { PokemonCardItem } from "../domain/pokemon.types";
import PokemonCard from "./PokemonCard.vue";

const item: PokemonCardItem = {
  id: 1,
  name: "bulbasaur",
  spriteUrl: "https://example.com/1.png",
};

describe("PokemonCard", () => {
  it("emits select with the card's item on click", async () => {
    const wrapper = mount(PokemonCard, { props: { item } });

    await wrapper.trigger("click");

    expect(wrapper.emitted("select")?.at(-1)).toEqual([item]);
  });

  it("emits select with the card's item on Enter", async () => {
    const wrapper = mount(PokemonCard, { props: { item } });

    await wrapper.trigger("keydown", { key: "Enter" });

    expect(wrapper.emitted("select")?.at(-1)).toEqual([item]);
  });

  it("emits select with the card's item on Space", async () => {
    const wrapper = mount(PokemonCard, { props: { item } });

    await wrapper.trigger("keydown", { key: " " });

    expect(wrapper.emitted("select")?.at(-1)).toEqual([item]);
  });

  it("is focusable and exposes button semantics for keyboard activation", () => {
    const wrapper = mount(PokemonCard, { props: { item } });

    expect(wrapper.attributes("tabindex")).toBe("0");
    expect(wrapper.attributes("role")).toBe("button");
  });
});
