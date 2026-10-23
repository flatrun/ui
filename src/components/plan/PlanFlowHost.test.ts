import { flushPromises, mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { beforeEach, describe, expect, it, vi } from "vitest";
import PlanFlowHost from "./PlanFlowHost.vue";
import PlanReviewModal from "./PlanReviewModal.vue";
import { usePlanFlowStore } from "@/stores/planFlow";
import { useTheme } from "@/composables/useTheme";
import { deploymentsApi, plansApi } from "@/services/api";
import envPlanFixture from "./fixtures/env-plan.json";
import applyFixture from "./fixtures/apply.json";

vi.mock("@/services/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/services/api")>();
  return {
    ...actual,
    plansApi: { apply: vi.fn(), discard: vi.fn(), get: vi.fn() },
    deploymentsApi: { ...actual.deploymentsApi, updateEnvVars: vi.fn() },
  };
});

const global = { stubs: { teleport: true } };

function stage() {
  vi.mocked(deploymentsApi.updateEnvVars).mockResolvedValue({ data: envPlanFixture } as any);
  return usePlanFlowStore().runPlanned(() =>
    deploymentsApi.updateEnvVars("phase-demo", [{ key: "LOG_LEVEL", value: "debug" }], { plan: true }),
  );
}

describe("PlanFlowHost", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
    vi.mocked(plansApi.apply).mockResolvedValue({ data: applyFixture } as any);
    vi.mocked(plansApi.discard).mockResolvedValue({ data: {} } as any);
  });

  describe("Birch", () => {
    beforeEach(() => useTheme().setStyle("birch"));

    it("holds a previewed change in a bar until it is applied", async () => {
      const wrapper = mount(PlanFlowHost, { global });
      const result = stage();
      await flushPromises();

      expect(wrapper.findComponent(PlanReviewModal).exists()).toBe(false);
      const bar = wrapper.get(".staged-bar");
      expect(bar.text()).toContain("Changes staged for phase-demo");
      expect(bar.text()).toContain("2 variable(s) added, 0 changed, 0 removed");
      expect(bar.text()).toContain("4 containers recreated on the next deploy");

      await bar
        .findAll("button")
        .find((b) => b.text() === "Apply changes")!
        .trigger("click");
      await flushPromises();

      expect(plansApi.apply).toHaveBeenCalledWith(envPlanFixture.plan.id);
      expect(await result).toEqual(expect.objectContaining({ data: applyFixture }));
      expect(wrapper.find(".staged-bar").exists()).toBe(false);
    });

    it("opens the diff on request and keeps the change staged when it is closed", async () => {
      const wrapper = mount(PlanFlowHost, { global });
      stage();
      await flushPromises();

      await wrapper
        .findAll(".staged-bar button")
        .find((b) => b.text() === "Details")!
        .trigger("click");
      const modal = wrapper.findComponent(PlanReviewModal);
      expect(modal.exists()).toBe(true);

      modal.vm.$emit("close");
      await flushPromises();
      expect(wrapper.findComponent(PlanReviewModal).exists()).toBe(false);
      expect(wrapper.find(".staged-bar").exists()).toBe(true);
      expect(plansApi.discard).not.toHaveBeenCalled();
    });

    it("discards the staged change", async () => {
      const wrapper = mount(PlanFlowHost, { global });
      const result = stage();
      await flushPromises();

      await wrapper
        .findAll(".staged-bar button")
        .find((b) => b.text() === "Discard")!
        .trigger("click");
      await flushPromises();

      expect(await result).toBe(false);
      expect(plansApi.discard).toHaveBeenCalledWith(envPlanFixture.plan.id);
      expect(wrapper.find(".staged-bar").exists()).toBe(false);
    });
  });

  it("keeps the review dialog under Oak, where closing it discards", async () => {
    useTheme().setStyle("oak");
    const wrapper = mount(PlanFlowHost, { global });
    const result = stage();
    await flushPromises();

    expect(wrapper.find(".staged-bar").exists()).toBe(false);
    wrapper.findComponent(PlanReviewModal).vm.$emit("close");
    await flushPromises();

    expect(await result).toBe(false);
    expect(plansApi.discard).toHaveBeenCalledWith(envPlanFixture.plan.id);
  });
});
