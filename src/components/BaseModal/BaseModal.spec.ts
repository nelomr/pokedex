import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import BaseModal from "./BaseModal.vue";

function mountModal(open = true) {
  return mount(BaseModal, {
    props: { open, titleId: "test-title" },
    slots: {
      title: "<h2 id='test-title'>Arbitrary title</h2>",
      default: "<p data-testid='body-content'>Arbitrary body content</p>",
    },
    attachTo: document.body,
  });
}

describe("BaseModal", () => {
  it("carries the WAI-ARIA dialog attributes when open", () => {
    const wrapper = mountModal();
    const dialog = wrapper.find("[role='dialog']");

    expect(dialog.exists()).toBe(true);
    expect(dialog.attributes("aria-modal")).toBe("true");
    expect(dialog.attributes("aria-labelledby")).toBe("test-title");
    wrapper.unmount();
  });

  it("does not render when closed", () => {
    const wrapper = mountModal(false);
    expect(wrapper.find("[role='dialog']").exists()).toBe(false);
    wrapper.unmount();
  });

  it("renders arbitrary slot content", () => {
    const wrapper = mountModal();
    expect(wrapper.find("[data-testid='body-content']").text()).toBe(
      "Arbitrary body content",
    );
    wrapper.unmount();
  });

  it("emits close on Escape", async () => {
    const wrapper = mountModal();
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    await wrapper.vm.$nextTick();

    expect(wrapper.emitted("close")).toBeTruthy();
    wrapper.unmount();
  });

  it("emits close on a backdrop click", async () => {
    const wrapper = mountModal();
    await wrapper.find("[data-testid='modal-backdrop']").trigger("click");

    expect(wrapper.emitted("close")).toBeTruthy();
    wrapper.unmount();
  });

  it("emits close when the close control is activated", async () => {
    const wrapper = mountModal();
    await wrapper.find("[data-testid='modal-close']").trigger("click");

    expect(wrapper.emitted("close")).toBeTruthy();
    wrapper.unmount();
  });

  it("does not emit close on a click inside the modal surface", async () => {
    const wrapper = mountModal();
    await wrapper.find("[data-testid='body-content']").trigger("click");

    expect(wrapper.emitted("close")).toBeUndefined();
    wrapper.unmount();
  });
});
