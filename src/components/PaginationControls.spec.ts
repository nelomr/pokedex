import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import PaginationControls from "./PaginationControls.vue";

describe("PaginationControls", () => {
  it("disables backward navigation on page 1", () => {
    const wrapper = mount(PaginationControls, {
      props: { currentPage: 1, totalPages: 5 },
    });

    expect(
      wrapper.get('[data-testid="prev-page"]').attributes("disabled"),
    ).toBeDefined();
    expect(
      wrapper.get('[data-testid="next-page"]').attributes("disabled"),
    ).toBeUndefined();
  });

  it("disables forward navigation on the last page", () => {
    const wrapper = mount(PaginationControls, {
      props: { currentPage: 5, totalPages: 5 },
    });

    expect(
      wrapper.get('[data-testid="next-page"]').attributes("disabled"),
    ).toBeDefined();
    expect(
      wrapper.get('[data-testid="prev-page"]').attributes("disabled"),
    ).toBeUndefined();
  });

  it("enables both directions mid-range", () => {
    const wrapper = mount(PaginationControls, {
      props: { currentPage: 3, totalPages: 5 },
    });

    expect(
      wrapper.get('[data-testid="prev-page"]').attributes("disabled"),
    ).toBeUndefined();
    expect(
      wrapper.get('[data-testid="next-page"]').attributes("disabled"),
    ).toBeUndefined();
  });
});
