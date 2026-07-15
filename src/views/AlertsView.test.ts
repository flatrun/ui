import { describe, it, expect, vi, beforeEach } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";
import { createTestingPinia } from "@pinia/testing";
import AlertsView from "./AlertsView.vue";
import { observabilityApi } from "@/services/observability";

vi.mock("@/services/observability", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/services/observability")>();
  return {
    ...actual,
    observabilityApi: {
      firingAlerts: vi.fn(),
      alertEvents: vi.fn(),
      alertRules: vi.fn().mockResolvedValue({ data: [] }),
      saveAlertRules: vi.fn(),
    },
  };
});

const breach = {
  rule_id: "r1",
  rule_name: "CPU high",
  deployment: "shop",
  container: "shop-web",
  metric: "container.cpu.usage",
  value: 95,
  threshold: 80,
  comparison: "above" as const,
  state: "firing" as const,
  at: "2026-07-15T10:00:00Z",
};

const recovered = { ...breach, state: "ok" as const, value: 10, at: "2026-07-15T09:00:00Z" };

const mountView = () =>
  mount(AlertsView, {
    global: {
      plugins: [createTestingPinia({ createSpy: vi.fn })],
      stubs: { RouterLink: { template: "<a><slot /></a>", props: ["to"] }, AlertRulesPanel: true },
    },
  });

describe("AlertsView", () => {
  beforeEach(() => vi.clearAllMocks());

  it("does not repeat a firing alert in the recent list", async () => {
    // The engine keeps every state change, so the current breach is also the newest event.
    vi.mocked(observabilityApi.firingAlerts).mockResolvedValue({ data: [breach] } as any);
    vi.mocked(observabilityApi.alertEvents).mockResolvedValue({ data: [recovered, breach] } as any);

    const wrapper = mountView();
    await flushPromises();

    expect(wrapper.findAll(".av-firing-row")).toHaveLength(1);
    // Recent shows what happened since, not the thing already named above it.
    const rows = wrapper.findAll(".av-history-row");
    expect(rows).toHaveLength(1);
    expect(rows[0].text()).toContain("ok");
  });

  it("shows nothing firing when nothing is", async () => {
    vi.mocked(observabilityApi.firingAlerts).mockResolvedValue({ data: [] } as any);
    vi.mocked(observabilityApi.alertEvents).mockResolvedValue({ data: [recovered] } as any);

    const wrapper = mountView();
    await flushPromises();

    expect(wrapper.find(".av-firing").exists()).toBe(false);
    expect(wrapper.findAll(".av-history-row")).toHaveLength(1);
  });
});
