import { mount } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";
import { httpGet } from "../../api/httpClient";
import TypeFilterSelect from "./TypeFilterSelect.vue";

vi.mock("../../api/httpClient", () => ({
  httpGet: vi.fn(),
}));

describe("TypeFilterSelect", () => {
  it("renders all 18 availableTypes options with no HTTP call on mount", () => {
    const wrapper = mount(TypeFilterSelect, {
      props: { modelValue: null },
    });

    const options = wrapper.findAll("option[value]:not([value=''])");
    expect(options).toHaveLength(18);
    expect(httpGet).not.toHaveBeenCalled();
  });

  it("emits the selected type value", async () => {
    const wrapper = mount(TypeFilterSelect, {
      props: { modelValue: null },
    });

    await wrapper.find("select").setValue("grass");

    expect(wrapper.emitted("update:modelValue")?.at(-1)).toEqual(["grass"]);
  });

  it("emits null on a cleared selection", async () => {
    const wrapper = mount(TypeFilterSelect, {
      props: { modelValue: "grass" },
    });

    await wrapper.find("select").setValue("");

    expect(wrapper.emitted("update:modelValue")?.at(-1)).toEqual([null]);
  });
});
