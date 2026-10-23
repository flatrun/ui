import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import { nextTick } from "vue";
import AppShell from "./AppShell.vue";
import { useTheme } from "@/composables/useTheme";

describe("AppShell", () => {
  it("renders the shell of the selected style and follows changes", async () => {
    const { setStyle } = useTheme();
    setStyle("birch");
    const wrapper = mount(AppShell, {
      global: {
        stubs: {
          BirchLayout: { template: "<div class='birch' />" },
          OakLayout: { template: "<div class='oak' />" },
        },
      },
    });
    expect(wrapper.find(".birch").exists()).toBe(true);

    setStyle("oak");
    await nextTick();
    expect(wrapper.find(".oak").exists()).toBe(true);
    expect(wrapper.find(".birch").exists()).toBe(false);
  });
});
