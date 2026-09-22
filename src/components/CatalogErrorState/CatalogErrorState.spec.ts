import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import CatalogErrorState from "./CatalogErrorState.vue";

describe("CatalogErrorState", () => {
  it("renders the message and emits 'retry' when the retry button is clicked", async () => {
    const wrapper = mount(CatalogErrorState, {
      props: { message: "Something went wrong" },
    });

    expect(wrapper.find('[data-testid="catalog-error"]').text()).toContain(
      "Something went wrong",
    );

    await wrapper.get('[data-testid="catalog-retry"]').trigger("click");

    expect(wrapper.emitted("retry")).toHaveLength(1);
  });
});
