import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import PageHeader from "./PageHeader.vue";

describe("PageHeader", () => {
  it("presents page context and actions together", () => {
    const wrapper = mount(PageHeader, {
      props: { title: "Fleet", subtitle: "Manage connected servers." },
      slots: { actions: '<button type="button">Refresh</button>' },
    });

    expect(wrapper.text()).toContain("Fleet");
    expect(wrapper.text()).toContain("Manage connected servers.");
    expect(wrapper.get("button").text()).toBe("Refresh");
  });
});
