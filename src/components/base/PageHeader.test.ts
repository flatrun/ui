import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import PageHeader from "./PageHeader.vue";

describe("PageHeader", () => {
  it("presents page context and actions together", () => {
    const wrapper = mount(PageHeader, {
      props: { title: "Fleet", subtitle: "Manage connected servers.", section: "Infrastructure", icon: "network" },
      slots: { actions: '<button type="button">Refresh</button>' },
    });

    expect(wrapper.get('[aria-label="Breadcrumb"]').text()).toContain("Infrastructure");
    expect(wrapper.text()).toContain("Fleet");
    expect(wrapper.text()).toContain("Manage connected servers.");
    expect(wrapper.get("button").text()).toBe("Refresh");
    expect(wrapper.get(".page-header-icon").element).toBeTruthy();
  });
});
