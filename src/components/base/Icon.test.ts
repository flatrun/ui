import { describe, it, expect } from "vitest";
import { nextTick } from "vue";
import { mount } from "@vue/test-utils";
import { getIcon } from "@iconify/vue";
import Icon from "./Icon.vue";
import "@/lib/icons";

describe("Icon", () => {
  it("has the lucide set registered offline", () => {
    // No network: the icon body must already be resolvable from bundled data.
    expect(getIcon("lucide:refresh-cw")?.body).toBeTruthy();
  });

  it("renders a registered lucide icon as an inline svg", async () => {
    const wrapper = mount(Icon, { props: { name: "refresh-cw" } });
    // Iconify fills the icon body on the next tick.
    await nextTick();
    const svg = wrapper.find("svg");
    expect(svg.exists()).toBe(true);
    expect(svg.html()).toContain("<path");
  });

  it("applies the spin class when spin is set", () => {
    const wrapper = mount(Icon, { props: { name: "loader-circle", spin: true } });
    expect(wrapper.find(".app-icon--spin").exists()).toBe(true);
  });

  it("passes through an explicit set:name", () => {
    const wrapper = mount(Icon, { props: { name: "lucide:check" } });
    expect(wrapper.find("svg").exists()).toBe(true);
  });
});
