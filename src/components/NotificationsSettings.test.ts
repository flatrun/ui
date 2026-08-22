import { flushPromises, mount } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";
import NotificationsSettings from "./NotificationsSettings.vue";

vi.mock("@/stores/auth", () => ({
  useAuthStore: () => ({ hasPermission: () => true }),
}));

vi.mock("@/stores/notifications", () => ({
  useNotificationsStore: () => ({ success: vi.fn(), error: vi.fn() }),
}));

vi.mock("@/services/api", () => ({
  notificationsApi: {
    getTargets: vi.fn(),
    updateTargets: vi.fn(),
    getRules: vi.fn(),
    updateRules: vi.fn(),
    getIncidents: vi.fn(),
    test: vi.fn(),
  },
}));

describe("NotificationsSettings", () => {
  beforeEach(async () => {
    window.history.replaceState({}, "", "/");
    vi.clearAllMocks();
    const { notificationsApi } = await import("@/services/api");
    vi.mocked(notificationsApi.getTargets).mockResolvedValue({
      data: { targets: [{ id: "ops", name: "Operations", url: "********", kind: "email", enabled: true }] },
    } as any);
    vi.mocked(notificationsApi.getRules).mockResolvedValue({
      data: {
        rules: [
          {
            id: "critical-fleet",
            name: "Critical fleet incidents",
            enabled: true,
            topics: ["fleet"],
            severities: ["critical"],
            notifications: ["opened", "resolved"],
            target_ids: ["ops"],
          },
        ],
      },
    } as any);
    vi.mocked(notificationsApi.getIncidents).mockResolvedValue({
      data: {
        incidents: [
          {
            id: "inc-42",
            correlation_key: "node:prod-1",
            status: "open",
            severity: "critical",
            title: "Node unavailable",
            event_count: 4,
            first_event_at: new Date().toISOString(),
            last_event_at: new Date().toISOString(),
            last_event: {
              source: "fleet",
              type: "node.unavailable",
              title: "Node unavailable",
              message: "The node stopped responding.",
              scope: { node: "prod-1" },
            },
          },
        ],
      },
    } as any);
    vi.mocked(notificationsApi.updateRules).mockResolvedValue({ data: { rules: [] } } as any);
    vi.mocked(notificationsApi.updateTargets).mockResolvedValue({ data: { targets: [] } } as any);
  });

  const mountSettings = () =>
    mount(NotificationsSettings, {
      global: {
        stubs: {
          BaseModal: {
            props: ["visible", "title", "subtitle"],
            template:
              '<div v-if="visible" class="test-modal"><h2>{{ title }}</h2><p>{{ subtitle }}</p><slot /><slot name="footer" /></div>',
          },
        },
      },
    });

  it("loads incidents, rules, and targets as one notification view", async () => {
    const { notificationsApi } = await import("@/services/api");
    const wrapper = mountSettings();
    await flushPromises();

    expect(notificationsApi.getIncidents).toHaveBeenCalledOnce();
    expect(notificationsApi.getRules).toHaveBeenCalledOnce();
    expect(notificationsApi.getTargets).toHaveBeenCalledOnce();
    expect(wrapper.text()).toContain("Node unavailable");
    expect(wrapper.text()).toContain("inc-42");
    expect(wrapper.text()).toContain("4 events");
  });

  it("creates a delivery rule through the modal", async () => {
    const { notificationsApi } = await import("@/services/api");
    const wrapper = mountSettings();
    await flushPromises();

    await wrapper.findAll(".section-tabs button")[1].trigger("click");
    await wrapper.find(".content-header .btn-primary").trigger("click");
    await wrapper.find("#rule-name").setValue("Capacity warnings");
    await wrapper.find('input[value="capacity"]').setValue(true);
    await wrapper.find('input[value="warning"]').setValue(true);
    await wrapper.find('input[value="ops"]').setValue(true);
    await wrapper.find("#rule-form").trigger("submit");
    await flushPromises();

    expect(notificationsApi.updateRules).toHaveBeenCalledWith([
      expect.objectContaining({
        name: "Critical fleet incidents",
      }),
      expect.objectContaining({
        name: "Capacity warnings",
        topics: ["capacity"],
        severities: ["warning"],
        target_ids: ["ops"],
      }),
    ]);
  });

  it("edits a saved target without replacing its hidden connection", async () => {
    const { notificationsApi } = await import("@/services/api");
    const wrapper = mountSettings();
    await flushPromises();

    await wrapper.findAll(".section-tabs button")[2].trigger("click");
    await wrapper
      .findAll("button")
      .find((button) => button.text() === "Edit")!
      .trigger("click");
    await wrapper.find("#target-name").setValue("Primary operations");
    await wrapper.find("#target-form").trigger("submit");
    await flushPromises();

    expect(notificationsApi.updateTargets).toHaveBeenCalledWith([
      expect.objectContaining({ id: "ops", name: "Primary operations", url: "********", kind: "email" }),
    ]);
  });

  it("opens incident details from a compact row", async () => {
    const wrapper = mountSettings();
    await flushPromises();

    await wrapper
      .findAll("button")
      .find((button) => button.text() === "View")!
      .trigger("click");

    expect(wrapper.text()).toContain("Incident details");
    expect(wrapper.text()).toContain("The node stopped responding.");
    expect(wrapper.text()).toContain("inc-42");
  });

  it("renders notification review data without calling the agent", async () => {
    const { notificationsApi } = await import("@/services/api");
    window.history.replaceState({}, "", "/notifications?review=notifications");
    const wrapper = mountSettings();
    await flushPromises();

    expect(wrapper.text()).toContain("Autoscaling needs attention");
    expect(wrapper.text()).toContain("8 events");
    expect(notificationsApi.getIncidents).not.toHaveBeenCalled();
  });
});
