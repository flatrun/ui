import { mount } from "@vue/test-utils";
import { beforeEach, describe, expect, it } from "vitest";
import ContextBanner from "./ContextBanner.vue";

describe("ContextBanner", () => {
  beforeEach(() => localStorage.clear());

  it("stays dismissed after the user closes it", async () => {
    const wrapper = mount(ContextBanner, {
      props: { id: "fleet", icon: "network" },
      slots: { default: "Connected servers keep their existing deployments." },
    });

    await wrapper.get('[aria-label="Dismiss information"]').trigger("click");

    expect(wrapper.text()).toBe("");
    expect(localStorage.getItem("flatrun-context-fleet")).toBe("dismissed");
  });

  it("keeps page actions available after information is dismissed", async () => {
    const wrapper = mount(ContextBanner, {
      props: { id: "agents", icon: "bot" },
      slots: {
        default: "Scheduled agents use restricted permissions.",
        actions: '<button type="button">New agent</button>',
      },
    });

    await wrapper.get('[aria-label="Dismiss information"]').trigger("click");

    expect(wrapper.text()).not.toContain("Scheduled agents");
    expect(wrapper.get("button").text()).toBe("New agent");
    expect(wrapper.get("aside").classes()).toContain("information-dismissed");
  });
});
