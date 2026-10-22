import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import { nextTick } from "vue";
import AppShell from "./AppShell.vue";
import { useTheme } from "@/composables/useTheme";

describe("AppShell", () => {
  it("renders the shell of the selected style and follows changes", async () => {
    const { setStyle } = useTheme();
    setStyle("modern");
    const wrapper = mount(AppShell, {
      global: {
        stubs: {
          ModernLayout: { template: "<div class='modern' />" },
          DashboardLayout: { template: "<div class='classic' />" },
        },
      },
    });
    expect(wrapper.find(".modern").exists()).toBe(true);

    setStyle("classic");
    await nextTick();
    expect(wrapper.find(".classic").exists()).toBe(true);
    expect(wrapper.find(".modern").exists()).toBe(false);
  });
});
