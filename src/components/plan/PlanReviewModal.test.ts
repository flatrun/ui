import { describe, it, expect, vi, beforeEach } from "vitest";
import { mount } from "@vue/test-utils";
import { createTestingPinia } from "@pinia/testing";
import PlanReviewModal from "./PlanReviewModal.vue";
import type { Plan } from "@/types";

vi.mock("@/services/api", () => ({
  plansApi: {
    get: vi.fn().mockResolvedValue({ data: { plan: {} } }),
  },
}));

const makePlan = (overrides: Partial<Plan> = {}): Plan => ({
  format_version: 1,
  id: "plan-1",
  action: "deployment.update_env",
  status: "available",
  resource: { type: "deployment", id: "my-app" },
  created_at: "2026-01-01T00:00:00Z",
  expires_at: "2026-01-01T01:00:00Z",
  created_by: { id: "1", name: "admin", type: "user" },
  request: { method: "PUT", path: "/deployments/my-app/env" },
  snapshot: { files: {} },
  changes: [
    {
      type: "file",
      id: ".env.flatrun",
      actions: ["update"],
      reason: "Environment variables changed",
      before: "A=1\n",
      after: "A=2\n",
      sensitive: false,
    },
  ],
  summary: { create: 1, update: 2, replace: 0, delete: 0, "no-op": 0 },
  ...overrides,
});

const mountModal = (plan: Plan = makePlan(), loading = false) =>
  mount(PlanReviewModal, {
    props: { plan, loading },
    global: {
      plugins: [createTestingPinia({ createSpy: vi.fn })],
      stubs: { teleport: true },
    },
  });

describe("PlanReviewModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders summary chips and hides zero counts", () => {
    const wrapper = mountModal();
    const chips = wrapper.findAll(".summary-chip");
    expect(chips).toHaveLength(2);
    expect(chips[0].text()).toBe("1 create");
    expect(chips[1].text()).toBe("2 update");
  });

  it("renders one card per change", () => {
    const wrapper = mountModal();
    expect(wrapper.findAll(".change-card")).toHaveLength(1);
  });

  it("shows the preview warning and expiry note", () => {
    const wrapper = mountModal();
    expect(wrapper.find(".preview-warning").text()).toContain("A plan is a preview; applying can still fail.");
    expect(wrapper.find(".expiry-note").exists()).toBe(true);
  });

  it("emits apply when the apply button is clicked", async () => {
    const wrapper = mountModal();
    await wrapper.find(".btn-primary").trigger("click");
    expect(wrapper.emitted("apply")).toHaveLength(1);
  });

  it("emits discard when the discard button is clicked", async () => {
    const wrapper = mountModal();
    await wrapper.find(".btn-secondary").trigger("click");
    expect(wrapper.emitted("discard")).toHaveLength(1);
  });

  it("styles apply as primary when nothing is deleted", () => {
    const wrapper = mountModal();
    expect(wrapper.find(".btn-primary").exists()).toBe(true);
    expect(wrapper.find(".btn-danger").exists()).toBe(false);
  });

  it("styles apply as danger when the plan deletes resources", () => {
    const wrapper = mountModal(makePlan({ summary: { create: 0, update: 0, replace: 0, delete: 1, "no-op": 0 } }));
    expect(wrapper.find(".btn-danger").exists()).toBe(true);
  });

  it("styles apply as danger for deployment deletion", () => {
    const wrapper = mountModal(makePlan({ action: "deployment.delete" }));
    expect(wrapper.find(".btn-danger").exists()).toBe(true);
  });

  it("refetches the plan with sensitive content on reveal", async () => {
    const { plansApi } = await import("@/services/api");
    const revealed = makePlan({
      changes: [
        {
          type: "file",
          id: ".env.flatrun",
          actions: ["update"],
          reason: "Environment variables changed",
          before: "SECRET=old\n",
          after: "SECRET=new\n",
          sensitive: true,
        },
      ],
    });
    vi.mocked(plansApi.get).mockResolvedValueOnce({ data: { plan: revealed } } as any);

    const masked = makePlan({
      changes: [
        {
          type: "file",
          id: ".env.flatrun",
          actions: ["update"],
          reason: "Environment variables changed",
          before: "[redacted]",
          after: "[redacted]",
          sensitive: true,
        },
      ],
    });
    const wrapper = mountModal(masked);
    expect(wrapper.find(".redacted-notice").exists()).toBe(true);

    await wrapper.find(".reveal-btn").trigger("click");
    await vi.waitFor(() => {
      expect(wrapper.find(".redacted-notice").exists()).toBe(false);
    });
    expect(plansApi.get).toHaveBeenCalledWith("plan-1", true);
  });
});
