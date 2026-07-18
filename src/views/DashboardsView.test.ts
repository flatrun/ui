import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { mount, flushPromises, type VueWrapper } from "@vue/test-utils";
import DashboardsView from "./DashboardsView.vue";
import { dashboardsApi } from "@/services/api";

const push = vi.fn();
vi.mock("vue-router", () => ({ useRouter: () => ({ push }) }));
vi.mock("@/services/api", () => ({
  dashboardsApi: { list: vi.fn(), save: vi.fn(), remove: vi.fn() },
}));

let wrapper: VueWrapper;
const mountView = () => {
  wrapper = mount(DashboardsView, { attachTo: document.body, global: { stubs: { Icon: true } } });
  return wrapper;
};

describe("DashboardsView", () => {
  beforeEach(() => vi.clearAllMocks());
  afterEach(() => {
    wrapper?.unmount();
    document.body.innerHTML = "";
  });

  it("lists the stored dashboards", async () => {
    vi.mocked(dashboardsApi.list).mockResolvedValue({
      data: { dashboards: [{ id: "a", name: "Prod overview", panels: [{}, {}] }] },
    } as any);

    const wrapper = mountView();
    await flushPromises();

    expect(wrapper.text()).toContain("Prod overview");
    expect(wrapper.text()).toContain("2 panels");
  });

  it("creates a dashboard and navigates to it", async () => {
    vi.mocked(dashboardsApi.list).mockResolvedValue({ data: { dashboards: [] } } as any);
    vi.mocked(dashboardsApi.save).mockResolvedValue({ data: { id: "new1", name: "Fresh", panels: [] } } as any);

    const w = mountView();
    await flushPromises();

    await w.find(".btn-primary").trigger("click"); // open create modal (teleported to body)

    const input = document.querySelector<HTMLInputElement>(".modal-dialog input")!;
    input.value = "Fresh";
    input.dispatchEvent(new Event("input"));
    await flushPromises();

    const buttons = Array.from(document.querySelectorAll<HTMLButtonElement>(".modal-footer .btn-primary"));
    buttons[buttons.length - 1].click(); // confirm create
    await flushPromises();

    expect(dashboardsApi.save).toHaveBeenCalledWith({ name: "Fresh", panels: [] });
    expect(push).toHaveBeenCalledWith("/dashboards/new1");
  });
});
