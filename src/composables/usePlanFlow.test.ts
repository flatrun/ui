import { describe, it, expect, vi, beforeEach } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import type { AxiosResponse } from "axios";
import { usePlanFlow } from "./usePlanFlow";
import { usePlanFlowStore } from "@/stores/planFlow";
import { useNotificationsStore } from "@/stores/notifications";
import type { Plan } from "@/types";

vi.mock("@/services/api", () => ({
  plansApi: {
    apply: vi.fn(),
    discard: vi.fn().mockResolvedValue({ data: { message: "discarded", id: "plan-1" } }),
  },
}));

const makePlan = (): Plan => ({
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
  changes: [],
  summary: { create: 0, update: 1, replace: 0, delete: 0, "no-op": 0 },
});

const planResponse = () => ({ status: 201, data: { plan: makePlan() } }) as unknown as AxiosResponse;

describe("usePlanFlow", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  it("opens the review modal state and resolves with the apply response", async () => {
    const { plansApi } = await import("@/services/api");
    const applyResponse = { status: 200, data: { message: "updated", plan: makePlan() } };
    vi.mocked(plansApi.apply).mockResolvedValueOnce(applyResponse as any);

    const { runPlanned } = usePlanFlow();
    const store = usePlanFlowStore();

    const pending = runPlanned(() => Promise.resolve(planResponse()));
    await vi.waitFor(() => expect(store.plan?.id).toBe("plan-1"));

    await store.apply();
    const result = await pending;

    expect(plansApi.apply).toHaveBeenCalledWith("plan-1");
    expect(result).toBe(applyResponse);
    expect(store.plan).toBeNull();
  });

  it("resolves false and discards the plan server side on discard", async () => {
    const { plansApi } = await import("@/services/api");
    const { runPlanned } = usePlanFlow();
    const store = usePlanFlowStore();

    const pending = runPlanned(() => Promise.resolve(planResponse()));
    await vi.waitFor(() => expect(store.plan?.id).toBe("plan-1"));

    await store.discard();
    const result = await pending;

    expect(result).toBe(false);
    expect(plansApi.discard).toHaveBeenCalledWith("plan-1");
    expect(store.plan).toBeNull();
  });

  it("warns and resolves false when the plan went stale", async () => {
    const { plansApi } = await import("@/services/api");
    vi.mocked(plansApi.apply).mockRejectedValueOnce({
      response: { status: 409, data: { error: "plan is stale", drifted: ["docker-compose.yml"], plan: makePlan() } },
    });

    const { runPlanned } = usePlanFlow();
    const store = usePlanFlowStore();
    const notifications = useNotificationsStore();

    const pending = runPlanned(() => Promise.resolve(planResponse()));
    await vi.waitFor(() => expect(store.plan?.id).toBe("plan-1"));

    await store.apply();
    const result = await pending;

    expect(result).toBe(false);
    expect(store.plan).toBeNull();
    expect(notifications.notifications.some((n) => n.type === "warning" && n.title === "Plan Stale")).toBe(true);
  });

  it("warns and resolves false when the plan expired", async () => {
    const { plansApi } = await import("@/services/api");
    vi.mocked(plansApi.apply).mockRejectedValueOnce({
      response: { status: 410, data: { error: "plan expired", plan: makePlan() } },
    });

    const { runPlanned } = usePlanFlow();
    const store = usePlanFlowStore();
    const notifications = useNotificationsStore();

    const pending = runPlanned(() => Promise.resolve(planResponse()));
    await vi.waitFor(() => expect(store.plan?.id).toBe("plan-1"));

    await store.apply();

    expect(await pending).toBe(false);
    expect(notifications.notifications.some((n) => n.type === "warning" && n.title === "Plan Expired")).toBe(true);
  });

  it("notifies an error and resolves false for other apply failures", async () => {
    const { plansApi } = await import("@/services/api");
    vi.mocked(plansApi.apply).mockRejectedValueOnce({
      response: { status: 423, data: { error: "deployment is protected" } },
    });

    const { runPlanned } = usePlanFlow();
    const store = usePlanFlowStore();
    const notifications = useNotificationsStore();

    const pending = runPlanned(() => Promise.resolve(planResponse()));
    await vi.waitFor(() => expect(store.plan?.id).toBe("plan-1"));

    await store.apply();

    expect(await pending).toBe(false);
    expect(notifications.notifications.some((n) => n.type === "error" && n.message === "deployment is protected")).toBe(
      true,
    );
  });

  it("returns false and notifies when the preview request fails", async () => {
    const { runPlanned } = usePlanFlow();
    const notifications = useNotificationsStore();

    const result = await runPlanned(() =>
      Promise.reject({ response: { status: 400, data: { error: "invalid compose" } } }),
    );

    expect(result).toBe(false);
    expect(notifications.notifications.some((n) => n.type === "error" && n.message === "invalid compose")).toBe(true);
  });

  it("passes through responses that did not create a plan", async () => {
    const { runPlanned } = usePlanFlow();
    const direct = { status: 200, data: { message: "updated" } } as unknown as AxiosResponse;

    const result = await runPlanned(() => Promise.resolve(direct));

    expect(result).toBe(direct);
  });

  describe("runGuarded", () => {
    it("executes directly when the deployment does not require plans", async () => {
      const { runGuarded } = usePlanFlow();
      const direct = { status: 200, data: { message: "updated" } } as unknown as AxiosResponse;
      const planFn = vi.fn();

      const result = await runGuarded(() => Promise.resolve(direct), planFn);

      expect(result).toBe(direct);
      expect(planFn).not.toHaveBeenCalled();
    });

    it("falls back to the plan flow on a plan_required response", async () => {
      const { plansApi } = await import("@/services/api");
      const applyResponse = { status: 200, data: { message: "updated" } };
      vi.mocked(plansApi.apply).mockResolvedValueOnce(applyResponse as any);

      const { runGuarded } = usePlanFlow();
      const store = usePlanFlowStore();

      const pending = runGuarded(
        () => Promise.reject({ response: { status: 428, data: { code: "plan_required", error: "plan required" } } }),
        () => Promise.resolve(planResponse()),
      );
      await vi.waitFor(() => expect(store.plan?.id).toBe("plan-1"));

      await store.apply();
      const result = await pending;

      expect(result).toBe(applyResponse);
    });

    it("notifies and resolves false on other direct-call errors without planning", async () => {
      const { runGuarded } = usePlanFlow();
      const notifications = useNotificationsStore();
      const planFn = vi.fn();

      const result = await runGuarded(
        () => Promise.reject({ response: { status: 423, data: { error: "deployment is protected" } } }),
        planFn,
        "Save Failed",
      );

      expect(result).toBe(false);
      expect(planFn).not.toHaveBeenCalled();
      expect(
        notifications.notifications.some((n) => n.title === "Save Failed" && n.message === "deployment is protected"),
      ).toBe(true);
    });
  });
});
