import { flushPromises, mount, RouterLinkStub } from "@vue/test-utils";
import { createTestingPinia } from "@pinia/testing";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { defineComponent, h } from "vue";
import CanvasView from "./CanvasView.vue";
import listFixture from "@/components/env/fixtures/list.json";
import envFixture from "@/components/env/fixtures/env.json";
import { deploymentsApi } from "@/services/api";

vi.mock("@/services/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/services/api")>();
  return { ...actual, deploymentsApi: { list: vi.fn(), getEnvVars: vi.fn() } };
});

const FlowStub = defineComponent({
  name: "VueFlow",
  props: { nodes: { type: Array, default: () => [] }, edges: { type: Array, default: () => [] } },
  setup: () => () => h("div", { class: "flow-stub" }),
});

const staging = {
  name: "hello-web-staging",
  status: "running",
  metadata: { environment: { base: "hello-web", name: "staging" } },
};

function mountView() {
  return mount(CanvasView, {
    global: {
      plugins: [createTestingPinia({ createSpy: vi.fn })],
      stubs: { VueFlow: FlowStub, RouterLink: RouterLinkStub, DeploymentPanel: true },
    },
  });
}

describe("CanvasView", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.mocked(deploymentsApi.list).mockResolvedValue({
      data: { deployments: [...listFixture.deployments, staging] },
    } as any);
    vi.mocked(deploymentsApi.getEnvVars).mockImplementation(
      async (name: string) =>
        ({
          data: name === "hello-web" ? envFixture : { env_vars: [] },
        }) as any,
    );
  });

  it("draws production deployments joined by their variable references", async () => {
    const wrapper = mountView();
    await flushPromises();

    const flow = wrapper.getComponent(FlowStub);
    expect((flow.props("nodes") as any[]).map((n: any) => n.id)).toEqual(["hello-web", "orders-db"]);
    expect(flow.props("edges")).toEqual([
      expect.objectContaining({ source: "orders-db", target: "hello-web", label: "3 variables" }),
    ]);
  });

  it("switches to an environment and shows only its deployments", async () => {
    const wrapper = mountView();
    await flushPromises();

    const tabs = wrapper.findAll(".env-switch button");
    expect(tabs.map((t) => t.text())).toEqual(["production", "staging"]);
    await tabs[1].trigger("click");
    await flushPromises();

    const flow = wrapper.getComponent(FlowStub);
    expect((flow.props("nodes") as any[]).map((n: any) => n.id)).toEqual(["hello-web-staging"]);
    expect(flow.props("edges")).toEqual([]);
    expect(localStorage.getItem("flatrun-canvas-environment")).toBe("staging");
  });
});
