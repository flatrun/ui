import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";
import PlanChangeCard from "./PlanChangeCard.vue";
import type { PlanChange } from "@/types";

const makeChange = (overrides: Partial<PlanChange> = {}): PlanChange => ({
  type: "file",
  id: "docker-compose.yml",
  actions: ["update"],
  reason: "Compose file content changed",
  before: "old\n",
  after: "new\n",
  sensitive: false,
  ...overrides,
});

describe("PlanChangeCard", () => {
  it.each([
    ["create", "badge-create"],
    ["update", "badge-update"],
    ["delete", "badge-delete"],
    ["no-op", "badge-no-op"],
  ])("renders a %s badge", (action, badgeClass) => {
    const wrapper = mount(PlanChangeCard, {
      props: { change: makeChange({ actions: [action] }) },
    });

    const badges = wrapper.findAll(".action-badge");
    expect(badges).toHaveLength(1);
    expect(badges[0].classes()).toContain(badgeClass);
    expect(badges[0].text()).toBe(action);
  });

  it("renders a single replace badge for the delete plus create pair", () => {
    const wrapper = mount(PlanChangeCard, {
      props: { change: makeChange({ actions: ["delete", "create"] }) },
    });

    const badges = wrapper.findAll(".action-badge");
    expect(badges).toHaveLength(1);
    expect(badges[0].classes()).toContain("badge-replace");
    expect(badges[0].text()).toBe("replace");
  });

  it("shows the change id and reason", () => {
    const wrapper = mount(PlanChangeCard, { props: { change: makeChange() } });
    expect(wrapper.find(".change-id").text()).toBe("docker-compose.yml");
    expect(wrapper.find(".change-reason").text()).toBe("Compose file content changed");
  });

  it("expands the diff on header click", async () => {
    const wrapper = mount(PlanChangeCard, { props: { change: makeChange() } });
    expect(wrapper.find(".diff-view").exists()).toBe(false);

    await wrapper.find(".change-header").trigger("click");
    expect(wrapper.find(".diff-view").exists()).toBe(true);
  });

  it("masks redacted sensitive content and emits reveal", async () => {
    const wrapper = mount(PlanChangeCard, {
      props: {
        change: makeChange({ sensitive: true, before: "[redacted]", after: "[redacted]" }),
      },
    });

    expect(wrapper.find(".redacted-notice").exists()).toBe(true);
    expect(wrapper.find(".diff-view").exists()).toBe(false);

    await wrapper.find(".reveal-btn").trigger("click");
    expect(wrapper.emitted("reveal")).toHaveLength(1);
  });

  it("shows the diff for sensitive content that is already revealed", async () => {
    const wrapper = mount(PlanChangeCard, {
      props: { change: makeChange({ sensitive: true, before: "secret-old\n", after: "secret-new\n" }) },
    });

    expect(wrapper.find(".redacted-notice").exists()).toBe(false);
    await wrapper.find(".change-header").trigger("click");
    expect(wrapper.find(".diff-view").exists()).toBe(true);
  });
});
