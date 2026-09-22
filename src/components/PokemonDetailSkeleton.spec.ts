import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import PokemonDetailSkeleton from "./PokemonDetailSkeleton.vue";

describe("PokemonDetailSkeleton", () => {
  it("marks its container as aria-busy", () => {
    const wrapper = mount(PokemonDetailSkeleton, {
      props: { statCount: 6 },
    });

    expect(wrapper.attributes("aria-busy")).toBe("true");
  });

  it("hides its placeholder blocks from assistive technology", () => {
    const wrapper = mount(PokemonDetailSkeleton, {
      props: { statCount: 6 },
    });

    const blocks = wrapper.findAll("[data-testid='skeleton-block']");
    expect(blocks.length).toBeGreaterThan(0);
    for (const block of blocks) {
      expect(block.attributes("aria-hidden")).toBe("true");
    }
  });

  it("renders one stat placeholder row per requested statCount", () => {
    const wrapper = mount(PokemonDetailSkeleton, {
      props: { statCount: 6 },
    });

    expect(wrapper.findAll("[data-testid='skeleton-stat-row']")).toHaveLength(
      6,
    );
  });
});
