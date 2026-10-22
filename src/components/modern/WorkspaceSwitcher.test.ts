import { flushPromises, mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { createMemoryHistory, createRouter } from "vue-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { defineComponent } from "vue";
import WorkspaceSwitcher from "./WorkspaceSwitcher.vue";
import workspacesFixture from "@/model/fixtures/workspaces.json";
import { workspacesApi } from "@/services/api";
import { useAuthStore } from "@/stores/auth";
import { useWorkspaceStore } from "@/stores/workspace";
import { workspaceHeader } from "@/services/workspaceScope";

vi.mock("@/services/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/services/api")>();
  return { ...actual, workspacesApi: { list: vi.fn(), create: vi.fn() } };
});

const Page = defineComponent({ template: "<div />" });

async function mountSwitcher() {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: "/", component: Page },
      { path: "/workspace", component: Page },
    ],
  });
  await router.push("/");
  const pinia = createPinia();
  setActivePinia(pinia);
  vi.spyOn(useAuthStore(), "hasPermission").mockReturnValue(true);
  const wrapper = mount(WorkspaceSwitcher, { global: { plugins: [router, pinia] }, attachTo: document.body });
  await flushPromises();
  return wrapper;
}

describe("WorkspaceSwitcher", () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.setAttribute("data-style", "modern");
    vi.mocked(workspacesApi.list).mockResolvedValue({ data: workspacesFixture } as any);
  });

  it("scopes requests to the picked workspace", async () => {
    const wrapper = await mountSwitcher();
    expect(wrapper.get(".crumb").text()).toContain("All workspaces");
    expect(workspaceHeader()).toBe("");

    await wrapper.get(".crumb").trigger("click");
    await flushPromises();
    expect(wrapper.findAll(".row-name").map((r) => r.text())).toEqual([
      "All workspaces",
      "shots's workspace",
      "Default",
      "admin's workspace",
    ]);
    await wrapper.findAll(".row-main")[2].trigger("click");
    await flushPromises();

    expect(wrapper.get(".crumb").text()).toContain("Default");
    expect(workspaceHeader()).toBe("default");
    wrapper.unmount();
  });

  it("sends no workspace under Classic", async () => {
    const wrapper = await mountSwitcher();
    useWorkspaceStore().select("default");
    document.documentElement.setAttribute("data-style", "classic");
    expect(workspaceHeader()).toBe("");
    wrapper.unmount();
  });

  it("forgets a workspace the user can no longer see", async () => {
    localStorage.setItem("flatrun.workspace", "gone");
    const wrapper = await mountSwitcher();
    expect(useWorkspaceStore().slug).toBe("");
    expect(wrapper.get(".crumb").text()).toContain("All workspaces");
    wrapper.unmount();
  });

  it("creates a workspace and switches to it", async () => {
    vi.mocked(workspacesApi.create).mockResolvedValue({
      data: { id: 4, slug: "acme-shop", name: "Acme Shop", personal: false, created_at: "", role: "owner" },
    } as any);
    const wrapper = await mountSwitcher();
    await wrapper.get(".crumb").trigger("click");
    await flushPromises();
    await wrapper.get(".footer .link").trigger("click");
    await wrapper.get(".create input").setValue("Acme Shop");
    await wrapper.get(".create").trigger("submit");
    await flushPromises();

    expect(workspacesApi.create).toHaveBeenCalledWith("Acme Shop");
    expect(wrapper.get(".crumb").text()).toContain("Acme Shop");
    expect(workspaceHeader()).toBe("acme-shop");
    wrapper.unmount();
  });
});
