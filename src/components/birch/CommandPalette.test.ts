import { flushPromises, mount } from "@vue/test-utils";
import { createTestingPinia } from "@pinia/testing";
import { createMemoryHistory, createRouter } from "vue-router";
import { describe, expect, it, vi } from "vitest";
import { defineComponent } from "vue";
import CommandPalette from "./CommandPalette.vue";
import deploymentsFixture from "./fixtures/deployments.json";
import { deploymentsApi } from "@/services/api";
import { useAuthStore } from "@/stores/auth";

vi.mock("@/services/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/services/api")>();
  return { ...actual, deploymentsApi: { list: vi.fn() } };
});

describe("CommandPalette", () => {
  it("jumps to a deployment found by name and runs actions", async () => {
    vi.mocked(deploymentsApi.list).mockResolvedValue({ data: deploymentsFixture } as any);
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [{ path: "/:p(.*)*", component: defineComponent({ template: "<div />" }) }],
    });
    const pinia = createTestingPinia({ createSpy: vi.fn });
    const auth = useAuthStore(pinia);
    vi.mocked(auth.hasPermission).mockImplementation((p) => p === "deployments:read");
    const toggle = vi.fn();

    const wrapper = mount(CommandPalette, {
      props: { open: false, actions: [{ key: "dark", label: "Switch to dark appearance", icon: "moon", run: toggle }] },
      global: { plugins: [router, pinia] },
      attachTo: document.body,
    });
    await wrapper.setProps({ open: true });
    await flushPromises();

    const input = document.querySelector<HTMLInputElement>(".palette input")!;
    input.value = "staging";
    input.dispatchEvent(new Event("input"));
    await flushPromises();
    const labels = [...document.querySelectorAll(".palette-results .label")].map((n) => n.textContent);
    expect(labels).toEqual(["hello-web-staging"]);

    input.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter" }));
    await flushPromises();
    expect(router.currentRoute.value.fullPath).toBe("/deployments/hello-web-staging");
    expect(wrapper.emitted("update:open")?.slice(-1)).toEqual([[false]]);

    await wrapper.setProps({ open: false });
    await wrapper.setProps({ open: true });
    await flushPromises();
    const fresh = document.querySelector<HTMLInputElement>(".palette input")!;
    fresh.value = "dark";
    fresh.dispatchEvent(new Event("input"));
    await flushPromises();
    (document.querySelector(".palette-results li") as HTMLElement).click();
    expect(toggle).toHaveBeenCalled();
    wrapper.unmount();
  });

  it("lists projects as soon as it opens", async () => {
    vi.mocked(deploymentsApi.list).mockResolvedValue({ data: deploymentsFixture } as any);
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [{ path: "/:p(.*)*", component: defineComponent({ template: "<div />" }) }],
    });
    const pinia = createTestingPinia({ createSpy: vi.fn });
    vi.mocked(useAuthStore(pinia).hasPermission).mockImplementation((p) => p === "deployments:read");

    const wrapper = mount(CommandPalette, {
      props: { open: false, actions: [] },
      global: { plugins: [router, pinia] },
      attachTo: document.body,
    });
    await wrapper.setProps({ open: true });
    await flushPromises();

    expect(document.querySelector<HTMLInputElement>(".palette input")!.placeholder).toMatch(/projects/i);
    const first = document.querySelector(".palette-results li .label")?.textContent;
    const names = deploymentsFixture.deployments.map((d: { name: string }) => d.name);
    expect(names).toContain(first);
    wrapper.unmount();
  });
});
