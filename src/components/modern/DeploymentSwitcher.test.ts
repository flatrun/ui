import { flushPromises, mount } from "@vue/test-utils";
import { createTestingPinia } from "@pinia/testing";
import { createMemoryHistory, createRouter } from "vue-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { defineComponent } from "vue";
import DeploymentSwitcher from "./DeploymentSwitcher.vue";
import deploymentsFixture from "./fixtures/deployments.json";
import { deploymentsApi } from "@/services/api";
import { useAuthStore } from "@/stores/auth";

const run = vi.fn();

vi.mock("@/services/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/services/api")>();
  return { ...actual, deploymentsApi: { list: vi.fn() } };
});

vi.mock("@/composables/useDeploymentJob", () => ({
  useDeploymentJob: () => ({
    state: { visible: false, isRunning: false, operation: "restart", deploymentName: "", output: "", isSuccess: null },
    run,
    close: vi.fn(),
  }),
}));

const Page = defineComponent({ template: "<div />" });

async function mountAt(path: string) {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: "/deployments", name: "deployments", component: Page },
      { path: "/deployments/:name", name: "deployment-detail", component: Page },
    ],
  });
  router.push(path);
  await router.isReady();
  const pinia = createTestingPinia({ createSpy: vi.fn });
  vi.mocked(useAuthStore(pinia).hasPermission).mockReturnValue(true);
  const wrapper = mount(DeploymentSwitcher, {
    global: { plugins: [router, pinia], stubs: { OperationModal: true } },
    attachTo: document.body,
  });
  await flushPromises();
  return { wrapper, router };
}

describe("DeploymentSwitcher", () => {
  beforeEach(() => {
    run.mockReset();
    vi.mocked(deploymentsApi.list).mockResolvedValue({ data: deploymentsFixture } as any);
  });

  it("names the open deployment and finds others by typing", async () => {
    const { wrapper, router } = await mountAt("/deployments/hello-web-staging");
    const crumb = wrapper.findAll(".crumb")[0];
    expect(crumb.text()).toBe("hello-web-staging");

    await crumb.trigger("click");
    await flushPromises();
    expect(wrapper.findAll(".row-name").map((r) => r.text())).toEqual([
      "hello-web",
      "hello-web-staging",
      "orders-db",
      "orders-worker",
    ]);

    await wrapper.get("input").setValue("orders");
    expect(wrapper.findAll(".row-name").map((r) => r.text())).toEqual(["orders-db", "orders-worker"]);
    await wrapper.get("input").trigger("keydown", { key: "ArrowDown" });
    await wrapper.get("input").trigger("keydown", { key: "Enter" });
    await flushPromises();

    expect(router.currentRoute.value.fullPath).toBe("/deployments/orders-worker");
    wrapper.unmount();
  });

  it("opens a section or runs an action from a row", async () => {
    const { wrapper, router } = await mountAt("/deployments");
    expect(wrapper.get(".crumb").text()).toBe("Deployments");
    await wrapper.get(".crumb").trigger("click");
    await flushPromises();

    const rows = wrapper.findAll(".row");
    expect(rows[0].find("[aria-label='Deploy latest']").exists()).toBe(true);
    expect(rows[2].find("[aria-label='Deploy latest']").exists()).toBe(false);

    await rows[2].get("[aria-label='Restart']").trigger("click");
    expect(run).toHaveBeenCalledWith("restart", "orders-db");

    await wrapper.get(".crumb").trigger("click");
    await flushPromises();
    await wrapper.findAll(".row")[0].get("[aria-label='Logs']").trigger("click");
    await flushPromises();
    expect(router.currentRoute.value.fullPath).toBe("/deployments/hello-web?section=logs");
    wrapper.unmount();
  });

  it("switches between a deployment's environments", async () => {
    const { wrapper, router } = await mountAt("/deployments/hello-web");
    const envCrumb = wrapper.findAll(".crumb")[1];
    expect(envCrumb.text()).toBe("production");

    await envCrumb.trigger("click");
    const options = wrapper.findAll(".row-main");
    expect(options.map((o) => o.find(".row-name").text())).toEqual(["production", "staging"]);
    await options[1].trigger("click");
    await flushPromises();

    expect(router.currentRoute.value.fullPath).toBe("/deployments/hello-web-staging");
    wrapper.unmount();
  });
});
