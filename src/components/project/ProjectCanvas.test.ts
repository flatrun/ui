import { flushPromises, mount } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ProjectCanvas from "./ProjectCanvas.vue";
import deploymentsFixture from "@/model/fixtures/deployments.json";
import { projectsFrom, projectState } from "@/model/project";
import type { Deployment } from "@/types";

vi.mock("@/services/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/services/api")>();
  return { ...actual, deploymentsApi: { getEnvVars: vi.fn().mockRejectedValue(new Error("offline")) } };
});

const deployments = deploymentsFixture.items as unknown as Deployment[];

describe("ProjectCanvas", () => {
  beforeEach(() => localStorage.clear());

  const mountCanvas = async () => {
    const wrapper = mount(ProjectCanvas, { props: { projects: projectsFrom(deployments) } });
    await flushPromises();
    return wrapper;
  };

  it("shows each project's production deployment, then another environment on request", async () => {
    const wrapper = await mountCanvas();
    const vm = wrapper.vm as any;
    expect(vm.nodes.map((n: any) => n.id).sort()).toEqual(["hello-web", "orders-db", "orders-worker", "storefront"]);

    const tabs = wrapper.findAll(".env-switch button");
    expect(tabs.map((t) => t.text())).toEqual(["production", "staging"]);
    await tabs[1].trigger("click");
    expect(vm.nodes.map((n: any) => n.id)).toEqual(["hello-web-staging"]);
  });

  it("keeps cards from overlapping", async () => {
    const vm = (await mountCanvas()).vm as any;
    const spots = vm.nodes.map((n: any) => `${n.position.x},${n.position.y}`);
    expect(new Set(spots).size).toBe(spots.length);
    const xs = [...new Set(vm.nodes.map((n: any) => n.position.x))].sort((a: any, b: any) => a - b) as number[];
    for (let i = 1; i < xs.length; i++) expect(xs[i] - xs[i - 1]).toBeGreaterThanOrEqual(300);
  });
});

describe("projectState", () => {
  const byName = (name: string) => deployments.find((d) => d.name === name)!;

  it("names how each captured deployment is doing", () => {
    expect(deployments.map((d) => [d.name, projectState(d).label])).toEqual([
      ["hello-web", "Online"],
      ["hello-web-staging", "Online"],
      ["orders-db", "Online"],
      ["orders-worker", "Offline"],
      ["storefront", "Online"],
    ]);
  });

  it("calls a stopped deployment offline and a sleeping one asleep", () => {
    const d = byName("hello-web");
    expect(projectState({ ...d, status: "stopped", services: [] }).state).toBe("offline");
    expect(projectState({ ...d, metadata: { ...d.metadata!, sleep: { sleeping: true } as any } }).state).toBe("asleep");
  });
});
