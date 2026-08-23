import { describe, it, expect, vi, beforeEach } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";
import { createTestingPinia } from "@pinia/testing";
import LogRulesPanel from "./LogRulesPanel.vue";
import { useAuthStore } from "@/stores/auth";

vi.mock("@/services/observability", () => ({
  observabilityApi: {
    logRules: vi.fn().mockResolvedValue({ data: [] }),
    saveLogRules: vi.fn().mockImplementation((rules) => Promise.resolve({ data: rules })),
  },
}));

vi.mock("@/services/api", () => ({
  notificationsApi: {
    getAlertTargetOptions: vi.fn().mockResolvedValue({ data: { targets: [{ id: "t1", name: "Ops chat" }] } }),
  },
}));

describe("LogRulesPanel", () => {
  beforeEach(() => vi.clearAllMocks());

  const mountPanel = () => {
    const pinia = createTestingPinia({ createSpy: vi.fn });
    const auth = useAuthStore(pinia);
    vi.mocked(auth.hasPermission).mockReturnValue(true);
    vi.mocked(auth.canAccessDeployment).mockReturnValue(true);
    return mount(LogRulesPanel, {
      props: { deployments: ["shop", "blog"] },
      global: {
        plugins: [pinia],
        stubs: { BaseModal: { template: "<div><slot /><slot name='footer' /></div>", props: ["visible", "title"] } },
      },
    });
  };

  const openForm = async (wrapper: ReturnType<typeof mountPanel>) => {
    await wrapper.find("button.btn-primary").trigger("click");
    await flushPromises();
  };

  // The defaults are the whole cost argument, so a rule created without touching them must
  // still carry them.
  it("creates a rule with the conservative defaults", async () => {
    const { observabilityApi } = await import("@/services/observability");
    const wrapper = mountPanel();
    await flushPromises();
    await openForm(wrapper);

    await wrapper
      .findAll("input")
      .find((i) => i.attributes("placeholder") === "Checkout errors")!
      .setValue("Boom");
    await wrapper.findAll("select")[0].setValue("shop");
    await wrapper
      .findAll("button")
      .find((b) => b.text().includes("Save rule"))!
      .trigger("click");
    await flushPromises();

    expect(observabilityApi.saveLogRules).toHaveBeenCalledWith([
      expect.objectContaining({
        name: "Boom",
        deployment: "shop",
        min_level: "error",
        min_count: 3,
        window_seconds: 300,
        cooldown_seconds: 3600,
        triage: false,
        enabled: true,
      }),
    ]);
  });

  // Triage is the only setting that costs money, so it must be off until it is ticked.
  it("only asks for triage when the box is ticked", async () => {
    const { observabilityApi } = await import("@/services/observability");
    const wrapper = mountPanel();
    await flushPromises();
    await openForm(wrapper);

    await wrapper
      .findAll("input")
      .find((i) => i.attributes("placeholder") === "Checkout errors")!
      .setValue("Boom");
    await wrapper.findAll("select")[0].setValue("shop");
    const triageBox = wrapper
      .findAll("label")
      .find((l) => l.text().includes("Ask the assistant"))!
      .find("input");
    await triageBox.setValue(true);
    await wrapper
      .findAll("button")
      .find((b) => b.text().includes("Save rule"))!
      .trigger("click");
    await flushPromises();

    expect(observabilityApi.saveLogRules).toHaveBeenCalledWith([expect.objectContaining({ triage: true })]);
  });

  it("shows what a saved rule watches", async () => {
    const { observabilityApi } = await import("@/services/observability");
    vi.mocked(observabilityApi.logRules).mockResolvedValueOnce({
      data: [
        {
          id: "r1",
          name: "OOM",
          enabled: true,
          deployment: "shop",
          service: "worker",
          min_level: "error",
          pattern: "out of memory",
          min_count: 3,
          window_seconds: 300,
          cooldown_seconds: 3600,
          triage: true,
        },
      ],
    } as any);

    const wrapper = mountPanel();
    await flushPromises();

    expect(wrapper.text()).toContain("OOM");
    expect(wrapper.text()).toContain("shop/worker");
    expect(wrapper.text()).toContain("out of memory");
    expect(wrapper.text()).toContain("triage");
  });

  it("deletes a rule by saving the set without it", async () => {
    const { observabilityApi } = await import("@/services/observability");
    vi.mocked(observabilityApi.logRules).mockResolvedValueOnce({
      data: [
        { id: "r1", name: "One", enabled: true, deployment: "shop" },
        { id: "r2", name: "Two", enabled: true, deployment: "blog" },
      ],
    } as any);

    const wrapper = mountPanel();
    await flushPromises();

    await wrapper
      .findAll("button")
      .find((b) => b.attributes("title") === "Delete rule")!
      .trigger("click");
    await flushPromises();

    expect(observabilityApi.saveLogRules).toHaveBeenCalledWith([expect.objectContaining({ id: "r2" })]);
  });
});
