import { flushPromises, mount } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";
import DeploymentAutoscaleCard from "./DeploymentAutoscaleCard.vue";

vi.mock("@/stores/notifications", () => ({
  useNotificationsStore: () => ({ success: vi.fn() }),
}));

vi.mock("@/services/api", () => ({
  autoscaleApi: { getPolicy: vi.fn(), updatePolicy: vi.fn() },
}));

describe("DeploymentAutoscaleCard", () => {
  beforeEach(async () => {
    window.history.replaceState({}, "", "/");
    vi.clearAllMocks();
    const { autoscaleApi } = await import("@/services/api");
    vi.mocked(autoscaleApi.getPolicy).mockResolvedValue({
      data: {
        enabled: true,
        min_replicas: 1,
        max_replicas: 3,
        scale_up_percent: 80,
        scale_down_percent: 30,
        scale_up_windows: 3,
        scale_down_windows: 10,
        cooldown_seconds: 300,
        allow_fleet_capacity: false,
        state: { high_windows: 0, low_windows: 0 },
      },
    } as any);
    vi.mocked(autoscaleApi.updatePolicy).mockImplementation(
      async (_deployment, policy) =>
        ({
          data: { ...policy, state: { high_windows: 0, low_windows: 0 } },
        }) as any,
    );
  });

  it("updates the policy through the deployment UI", async () => {
    const { autoscaleApi } = await import("@/services/api");
    const wrapper = mount(DeploymentAutoscaleCard, {
      props: { deployment: "shop", canWrite: true },
      global: {
        stubs: {
          BaseModal: {
            props: ["visible"],
            template: '<div v-if="visible"><slot /><slot name="footer" /></div>',
          },
        },
      },
    });
    await flushPromises();
    await wrapper.find(".autoscale-header button").trigger("click");
    await wrapper.find('input[type="number"]').setValue(2);
    await wrapper.find("#autoscale-policy-form").trigger("submit");
    await flushPromises();

    expect(autoscaleApi.updatePolicy).toHaveBeenCalledWith("shop", expect.objectContaining({ min_replicas: 2 }));
  });

  it("renders review data without calling the agent", async () => {
    const { autoscaleApi } = await import("@/services/api");
    window.history.replaceState({}, "", "/deployments/trakli-local?review=autoscale");
    const wrapper = mount(DeploymentAutoscaleCard, { props: { deployment: "trakli-local", canWrite: true } });
    await flushPromises();

    expect(wrapper.text()).toContain("1 to 4");
    expect(wrapper.text()).toContain("Allowed");
    expect(autoscaleApi.getPolicy).not.toHaveBeenCalled();
  });
});
