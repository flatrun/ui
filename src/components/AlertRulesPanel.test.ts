import { describe, it, expect, vi, beforeEach } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";
import { createTestingPinia } from "@pinia/testing";
import AlertRulesPanel from "./AlertRulesPanel.vue";
import { observabilityApi } from "@/services/observability";

vi.mock("@/services/observability", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/services/observability")>();
  return {
    ...actual,
    observabilityApi: { alertRules: vi.fn(), saveAlertRules: vi.fn(), firingAlerts: vi.fn() },
  };
});

const rule = {
  id: "r1",
  name: "CPU high",
  deployment: "shop",
  metric: "container.cpu.usage",
  comparison: "above" as const,
  threshold: 80,
  for_seconds: 60,
  enabled: true,
};

const mountPanel = () =>
  mount(AlertRulesPanel, {
    props: { deployments: ["shop", "blog"] },
    global: {
      plugins: [createTestingPinia({ createSpy: vi.fn })],
      stubs: {
        BaseModal: { template: "<div v-if='visible'><slot /><slot name='footer' /></div>", props: ["visible"] },
      },
    },
  });

describe("AlertRulesPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(observabilityApi.alertRules).mockResolvedValue({ data: [rule] } as any);
    vi.mocked(observabilityApi.firingAlerts).mockResolvedValue({ data: [] } as any);
    vi.mocked(observabilityApi.saveAlertRules).mockResolvedValue({ data: [rule] } as any);
  });

  it("says what each rule watches in words", async () => {
    const wrapper = mountPanel();
    await flushPromises();

    expect(wrapper.text()).toContain("CPU high");
    expect(wrapper.text()).toContain("CPU usage above 80% for 60s, on shop");
  });

  it("marks a rule that is currently firing", async () => {
    vi.mocked(observabilityApi.firingAlerts).mockResolvedValue({
      data: [{ rule_id: "r1", rule_name: "CPU high", state: "firing" }],
    } as any);

    const wrapper = mountPanel();
    await flushPromises();

    expect(wrapper.text()).toContain("Firing");
    expect(wrapper.find(".arp-state--firing").exists()).toBe(true);
  });

  it("sends the threshold as a number, not the string the input holds", async () => {
    const wrapper = mountPanel();
    await flushPromises();

    (wrapper.vm as any).openNew();
    // An input hands back a string whatever its type is.
    (wrapper.vm as any).draft.name = "Memory";
    (wrapper.vm as any).draft.threshold = "90";
    (wrapper.vm as any).draft.for_seconds = "30";
    await (wrapper.vm as any).save();
    await flushPromises();

    const sent = vi.mocked(observabilityApi.saveAlertRules).mock.calls[0][0];
    const added = sent[sent.length - 1];
    expect(added.threshold).toBe(90);
    expect(added.for_seconds).toBe(30);
  });

  it("shows why the agent refused a rule", async () => {
    vi.mocked(observabilityApi.saveAlertRules).mockRejectedValue({
      response: { data: { error: 'unknown metric "container.disk.usage"' } },
    });

    const wrapper = mountPanel();
    await flushPromises();
    (wrapper.vm as any).openNew();
    await (wrapper.vm as any).save();
    await flushPromises();

    expect(wrapper.text()).toContain("unknown metric");
  });

  it("deletes a rule by saving the set without it", async () => {
    vi.mocked(observabilityApi.saveAlertRules).mockResolvedValue({ data: [] } as any);

    const wrapper = mountPanel();
    await flushPromises();
    await (wrapper.vm as any).remove(rule);

    expect(observabilityApi.saveAlertRules).toHaveBeenCalledWith([]);
  });

  it("invites the first rule when there are none", async () => {
    vi.mocked(observabilityApi.alertRules).mockResolvedValue({ data: [] } as any);

    const wrapper = mountPanel();
    await flushPromises();

    expect(wrapper.text()).toContain("Nothing is watched yet");
  });
});
