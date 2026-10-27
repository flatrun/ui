import { flushPromises, mount } from "@vue/test-utils";
import { createTestingPinia } from "@pinia/testing";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ServiceCanvas from "./ServiceCanvas.vue";
import ServicePanel from "./ServicePanel.vue";
import servicesFixture from "@/model/fixtures/services.json";
import serviceLogsFixture from "./fixtures/service-logs.json";
import serviceSettingsFixture from "./fixtures/service-settings.json";
import sleepingDeployment from "./fixtures/deployment-service-sleep.json";
import { deploymentsApi } from "@/services/api";

vi.mock("@/services/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/services/api")>();
  return { ...actual, deploymentsApi: { getServices: vi.fn(), logs: vi.fn(), getServiceSettings: vi.fn() } };
});

describe("ServiceCanvas", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(deploymentsApi.getServices).mockResolvedValue({ data: servicesFixture } as any);
    vi.mocked(deploymentsApi.logs).mockResolvedValue({ data: serviceLogsFixture } as any);
    vi.mocked(deploymentsApi.getServiceSettings).mockResolvedValue({ data: serviceSettingsFixture } as any);
  });

  it("lays out the services with entry points above what they depend on", async () => {
    const wrapper = mount(ServiceCanvas, {
      props: { deploymentName: "phase-demo" },
      global: { plugins: [createTestingPinia({ createSpy: vi.fn })], stubs: { teleport: true } },
    });
    await flushPromises();

    const vm = wrapper.vm as any;
    const y = Object.fromEntries(vm.nodes.map((n: any) => [n.id, n.position.y]));
    expect(y.web).toBeLessThan(y.api);
    expect(y.api).toBe(y.worker);
    expect(y.worker).toBeLessThan(y.db);
    expect(vm.edges.map((e: any) => e.id)).toEqual(["api->db", "web->api", "worker->db"]);
  });

  it("opens a service's logs and settings", async () => {
    const wrapper = mount(ServiceCanvas, {
      props: { deploymentName: "phase-demo" },
      global: { plugins: [createTestingPinia({ createSpy: vi.fn })], stubs: { teleport: true } },
    });
    await flushPromises();
    (wrapper.vm as any).selected = "db";
    await flushPromises();

    expect(deploymentsApi.logs).toHaveBeenCalledWith("phase-demo", { service: "db", tail: 300 });
    const panel = wrapper.findComponent(ServicePanel);
    await panel.findAll(".panel-tab")[1].trigger("click");
    expect(panel.text()).toContain("postgres:16-alpine");
    expect(panel.text()).toContain("./data → /var/lib/postgresql/data");
    expect(panel.text()).toContain("1 of 1 running");
    await flushPromises();
    expect(deploymentsApi.getServiceSettings).toHaveBeenCalledWith("phase-demo", "db");
  });

  it("marks a service that sleeps on its own as asleep", async () => {
    const stopped = structuredClone(servicesFixture);
    stopped.services.find((s: any) => s.name === "worker")!.status = "exited";
    vi.mocked(deploymentsApi.getServices).mockResolvedValue({ data: stopped } as any);
    const wrapper = mount(ServiceCanvas, {
      props: { deploymentName: "shop", metadata: sleepingDeployment.deployment.metadata as any },
      global: { plugins: [createTestingPinia({ createSpy: vi.fn })], stubs: { teleport: true } },
    });
    await flushPromises();

    const asleep = Object.fromEntries((wrapper.vm as any).nodes.map((n: any) => [n.id, n.data.asleep]));
    expect(asleep).toEqual({ web: false, api: false, worker: true, db: false });
  });
});
