import { describe, it, expect, vi, beforeEach } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";
import { createTestingPinia } from "@pinia/testing";
import LogsView from "./LogsView.vue";
import { useAuthStore } from "@/stores/auth";

const mockRoute = { query: {} as Record<string, string> };
const replace = vi.fn();

vi.mock("vue-router", () => ({
  useRoute: vi.fn(() => mockRoute),
  useRouter: vi.fn(() => ({ replace })),
}));

vi.mock("@/services/api", () => ({
  deploymentsApi: {
    list: vi.fn().mockResolvedValue({ data: { deployments: [{ name: "shop" }, { name: "blog" }] } }),
    logs: vi.fn().mockResolvedValue({ data: { logs: "deployment line", records: [] } }),
    deleteLogs: vi.fn().mockResolvedValue({ data: { message: "Log cleared" } }),
    logSources: vi.fn().mockResolvedValue({ data: { sources: [] } }),
    getServices: vi.fn().mockResolvedValue({ data: { services: [{ name: "web" }] } }),
  },
  systemLogsApi: {
    sources: vi.fn().mockResolvedValue({
      data: {
        sources: [
          { id: "nginx-access", name: "nginx access", service: "nginx", stream: "stdout", by_deployment: true },
          { id: "nginx-error", name: "nginx error", service: "nginx", stream: "stderr", by_deployment: false },
        ],
      },
    }),
    logs: vi.fn().mockResolvedValue({ data: { source: "nginx-access", logs: "access line", records: [] } }),
    deleteLogs: vi.fn().mockResolvedValue({ data: { message: "Log cleared" } }),
  },
  systemLogsWsUrl: vi.fn(() => "ws://localhost/api/system/logs/stream"),
  deploymentLogsWsUrl: vi.fn(() => "ws://localhost/api/deployments/shop/logs/stream"),
}));

describe("LogsView", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRoute.query = {};
    // The confirmation teleports to body, which outlives the wrapper.
    document.body.innerHTML = "";
  });

  const clickConfirm = async () => {
    const button = [...document.body.querySelectorAll("button")].find((b) => b.textContent?.includes("Delete logs"));
    if (!button) throw new Error("the confirmation was not shown");
    button.click();
    await flushPromises();
  };

  const mountView = (canReadSystem = true) => {
    const pinia = createTestingPinia({ createSpy: vi.fn });
    const authStore = useAuthStore(pinia);
    (authStore.hasPermission as ReturnType<typeof vi.fn>).mockReturnValue(canReadSystem);
    return mount(LogsView, {
      global: {
        plugins: [pinia],
        stubs: {
          LogViewer: { name: "LogViewer", template: '<div class="log-viewer"><slot name="filters" /></div>' },
        },
      },
    });
  };

  const openSystemTab = async (wrapper: ReturnType<typeof mountView>) => {
    const tab = wrapper.findAll(".tab-btn").find((t) => t.text().includes("System"));
    await tab!.trigger("click");
    await flushPromises();
  };

  const selectWithOption = (wrapper: ReturnType<typeof mountView>, option: string) =>
    wrapper.findAll("select").find((s) => s.text().includes(option));

  it("reads the proxy's own log once the viewer switches to system", async () => {
    const { systemLogsApi } = await import("@/services/api");
    const wrapper = mountView();
    await flushPromises();

    await openSystemTab(wrapper);

    expect(systemLogsApi.sources).toHaveBeenCalled();
    expect(systemLogsApi.logs).toHaveBeenCalledWith(expect.objectContaining({ source: "nginx-access" }));
  });

  it("narrows the access log to one deployment", async () => {
    const { systemLogsApi } = await import("@/services/api");
    const wrapper = mountView();
    await flushPromises();
    await openSystemTab(wrapper);

    const select = selectWithOption(wrapper, "All deployments");
    expect(select).toBeDefined();

    vi.mocked(systemLogsApi.logs).mockClear();
    await select!.setValue("shop");
    await flushPromises();

    expect(systemLogsApi.logs).toHaveBeenCalledWith(expect.objectContaining({ deployment: "shop" }));
  });

  it("offers no deployment filter on a source that cannot say which deployment a line is from", async () => {
    const wrapper = mountView();
    await flushPromises();
    await openSystemTab(wrapper);

    const sourceSelect = selectWithOption(wrapper, "nginx error");
    await sourceSelect!.setValue("nginx-error");
    await flushPromises();

    const deploymentSelect = selectWithOption(wrapper, "All deployments");
    expect(deploymentSelect!.attributes("disabled")).toBeDefined();
  });

  it("drops a deployment filter carried over from the access log", async () => {
    const { systemLogsApi } = await import("@/services/api");
    const wrapper = mountView();
    await flushPromises();
    await openSystemTab(wrapper);

    await selectWithOption(wrapper, "All deployments")!.setValue("shop");
    await flushPromises();

    vi.mocked(systemLogsApi.logs).mockClear();
    await selectWithOption(wrapper, "nginx error")!.setValue("nginx-error");
    await flushPromises();

    expect(systemLogsApi.logs).toHaveBeenCalledWith(expect.objectContaining({ deployment: undefined }));
  });

  it("hides the system tab from someone who cannot read infrastructure", async () => {
    const wrapper = mountView(false);
    await flushPromises();

    expect(wrapper.findAll(".tab-btn").some((t) => t.text().includes("System"))).toBe(false);
  });

  it("still reads a deployment's own logs on the deployments tab", async () => {
    const { deploymentsApi } = await import("@/services/api");
    const wrapper = mountView();
    await flushPromises();

    const select = selectWithOption(wrapper, "Select a deployment");
    await select!.setValue("shop");
    await flushPromises();

    expect(deploymentsApi.logs).toHaveBeenCalledWith("shop", expect.objectContaining({ service: "all" }));
  });

  // Emptying a log on the server is not something a stray click should do.
  it("does not delete anything until the confirmation is accepted", async () => {
    const { deploymentsApi } = await import("@/services/api");
    const wrapper = mountView();
    await flushPromises();
    await selectWithOption(wrapper, "Select a deployment")!.setValue("shop");
    await flushPromises();

    wrapper.findComponent({ name: "LogViewer" }).vm.$emit("delete");
    await flushPromises();

    expect(deploymentsApi.deleteLogs).not.toHaveBeenCalled();

    await clickConfirm();

    expect(deploymentsApi.deleteLogs).toHaveBeenCalledWith("shop", expect.objectContaining({ source: "stdout" }));
  });

  it("deletes the system source that is on screen", async () => {
    const { systemLogsApi } = await import("@/services/api");
    const wrapper = mountView();
    await flushPromises();
    await openSystemTab(wrapper);

    wrapper.findComponent({ name: "LogViewer" }).vm.$emit("delete");
    await flushPromises();
    await clickConfirm();

    expect(systemLogsApi.deleteLogs).toHaveBeenCalledWith("nginx-access");
  });
});
