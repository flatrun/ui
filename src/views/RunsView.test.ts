import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";
import { createTestingPinia } from "@pinia/testing";
import RunsView from "./RunsView.vue";
import { useAuthStore } from "@/stores/auth";
import { useNotificationsStore } from "@/stores/notifications";
import { runsApi } from "@/services/api";
import runsList from "./fixtures/runs/runs-list.json";
import succeeded from "./fixtures/runs/run-succeeded.json";
import failed from "./fixtures/runs/run-failed.json";
import cancelResponse from "./fixtures/runs/run-cancel-response.json";
import running from "./fixtures/runs/run-running.json";
import cancelled from "./fixtures/runs/run-cancelled.json";
import unavailable from "./fixtures/runs/runs-unavailable.json";
import notFound from "./fixtures/runs/run-not-found.json";
import logs from "./fixtures/runs/run-logs.txt?raw";

vi.mock("@/services/api", () => ({
  runsApi: {
    list: vi.fn(),
    get: vi.fn(),
    logs: vi.fn(),
    cancel: vi.fn(),
    create: vi.fn(),
    artifact: vi.fn(),
  },
}));

const api = runsApi as unknown as Record<keyof typeof runsApi, ReturnType<typeof vi.fn>>;

function mountView(permissions: string[] = ["runs:read", "runs:write"]) {
  const pinia = createTestingPinia({ createSpy: vi.fn });
  const auth = useAuthStore(pinia);
  (auth.hasPermission as ReturnType<typeof vi.fn>).mockImplementation((p: string) => permissions.includes(p));
  const wrapper = mount(RunsView, {
    global: { plugins: [pinia], stubs: { Teleport: true, Transition: false } },
  });
  return Object.assign(wrapper, { notifications: useNotificationsStore(pinia) });
}

async function openDetails(wrapper: ReturnType<typeof mountView>) {
  const details = wrapper.findAll("button").find((b) => b.text() === "Details");
  await details!.trigger("click");
  await flushPromises();
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((r) => (resolve = r));
  return { promise, resolve };
}

function runRow(wrapper: ReturnType<typeof mountView>, image: string) {
  const row = wrapper.findAll("tbody tr").find((r) => r.text().includes(image));
  if (!row) throw new Error(`no row for ${image}`);
  return row;
}

describe("RunsView", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    api.list.mockResolvedValue({ data: runsList });
    api.logs.mockResolvedValue({ data: logs });
    api.cancel.mockResolvedValue({ data: cancelResponse });
  });

  it("lists every run the agent returns with its status", async () => {
    const wrapper = mountView();
    await flushPromises();

    const rows = wrapper.findAll("tbody tr");
    expect(rows).toHaveLength(runsList.items.length);
    expect(runRow(wrapper, "busybox:flatrun-no-such-tag").text()).toContain("Failed");
    expect(runRow(wrapper, "busybox:latest").text()).toMatch(/Running|Succeeded/);
  });

  it("hides start and cancel controls without runs:write", async () => {
    const wrapper = mountView(["runs:read"]);
    await flushPromises();

    expect(wrapper.text()).not.toContain("New run");
    expect(wrapper.findAll("button").some((b) => b.text() === "Cancel")).toBe(false);
  });

  it("cancels an active run", async () => {
    const wrapper = mountView();
    await flushPromises();

    const active = runsList.items.find((r) => r.status === "running");
    expect(active).toBeDefined();
    const cancel = wrapper.findAll("button").find((b) => b.text() === "Cancel");
    await cancel!.trigger("click");
    await flushPromises();

    expect(api.cancel).toHaveBeenCalledWith(active!.id);
  });

  it("shows output, kept files and a missing file as a note on a succeeded run", async () => {
    api.list.mockResolvedValue({ data: { items: [succeeded] } });
    const wrapper = mountView();
    await flushPromises();

    await openDetails(wrapper);

    expect(api.logs).toHaveBeenCalledWith(succeeded.id);
    expect(wrapper.find(".run-logs").text()).toContain("token=[REDACTED]");
    expect(wrapper.find(".artifact-list").text()).toContain("report.txt.tar");
    const note = wrapper.find(".run-error");
    expect(note.classes()).toContain("run-note");
    expect(note.attributes("role")).toBe("status");
    expect(note.text()).toContain("/out/missing.json");
  });

  it("shows why a failed run failed", async () => {
    api.list.mockResolvedValue({ data: { items: [failed] } });
    const wrapper = mountView();
    await flushPromises();

    await openDetails(wrapper);

    const alert = wrapper.find(".run-error");
    expect(alert.attributes("role")).toBe("alert");
    expect(alert.classes()).not.toContain("run-note");
    expect(alert.text()).toContain("busybox:flatrun-no-such-tag");
  });

  it("shows a failed output request with a retry instead of empty output", async () => {
    api.list.mockResolvedValue({ data: { items: [succeeded] } });
    api.logs.mockRejectedValueOnce({ message: "Network Error" });
    const wrapper = mountView();
    await flushPromises();

    await openDetails(wrapper);
    expect(wrapper.text()).toContain("Could not load the output: Network Error");
    expect(wrapper.find(".run-logs").text()).not.toContain("No output.");

    await wrapper
      .findAll("button")
      .find((b) => b.text() === "Retry")!
      .trigger("click");
    await flushPromises();
    expect(wrapper.find(".run-logs").text()).toContain("token=[REDACTED]");
    expect(wrapper.text()).not.toContain("Could not load the output");
  });

  it("shows the agent's reason when output cannot be loaded", async () => {
    api.list.mockResolvedValue({ data: { items: [succeeded] } });
    api.logs.mockRejectedValueOnce({
      message: "Request failed with status code 404",
      response: { status: 404, data: JSON.stringify(notFound) },
    });
    const wrapper = mountView();
    await flushPromises();

    await openDetails(wrapper);
    expect(wrapper.text()).toContain(`Could not load the output: ${notFound.error}`);
  });

  it("shows the agent's reason when a kept file cannot be downloaded", async () => {
    api.list.mockResolvedValue({ data: { items: [succeeded] } });
    api.artifact.mockRejectedValueOnce({
      message: "Request failed with status code 404",
      response: { status: 404, data: new Blob([JSON.stringify(notFound)], { type: "application/json" }) },
    });
    const wrapper = mountView();
    await flushPromises();
    await openDetails(wrapper);

    await wrapper.find(".artifact-list button").trigger("click");
    await flushPromises();
    expect(wrapper.notifications.error).toHaveBeenCalledWith("Download failed", notFound.error);
  });

  it("reports a failed refresh", async () => {
    const wrapper = mountView();
    await flushPromises();

    api.list.mockRejectedValueOnce({ message: "Network Error" });
    await wrapper
      .findAll("button")
      .find((b) => b.text() === "Refresh")!
      .trigger("click");
    await flushPromises();
    expect(wrapper.notifications.error).toHaveBeenCalledWith("Could not load runs", "Network Error");
  });

  describe("while a run is active", () => {
    beforeEach(() => vi.useFakeTimers());
    afterEach(() => vi.useRealTimers());

    it("refreshes the open run directly, even when it is no longer in the list", async () => {
      api.list.mockResolvedValueOnce({ data: { items: [running] } });
      const wrapper = mountView();
      await flushPromises();
      await openDetails(wrapper);

      api.list.mockResolvedValue({ data: { items: [] } });
      api.get.mockResolvedValue({ data: cancelled });
      await vi.advanceTimersByTimeAsync(2000);
      await flushPromises();

      expect(api.get).toHaveBeenCalledWith(running.id);
      expect(wrapper.find(".panel .status-pill").text()).toBe("Cancelled");
    });

    it("does not raise an error toast on every failed poll", async () => {
      api.list.mockResolvedValueOnce({ data: { items: [running] } });
      const wrapper = mountView();
      await flushPromises();

      api.list.mockRejectedValue({ message: "Network Error" });
      await vi.advanceTimersByTimeAsync(2000);
      await vi.advanceTimersByTimeAsync(2000);
      await flushPromises();

      expect(api.list).toHaveBeenCalledTimes(3);
      expect(wrapper.notifications.error).not.toHaveBeenCalled();
    });

    it("does not start a poll while the previous one is pending", async () => {
      api.list.mockResolvedValueOnce({ data: { items: [running] } });
      mountView();
      await flushPromises();

      const slow = deferred<{ data: { items: unknown[] } }>();
      api.list.mockReturnValue(slow.promise);
      await vi.advanceTimersByTimeAsync(2000);
      await vi.advanceTimersByTimeAsync(2000);
      await vi.advanceTimersByTimeAsync(2000);
      expect(api.list).toHaveBeenCalledTimes(2);

      slow.resolve({ data: { items: [cancelled] } });
      await flushPromises();
    });

    it("ignores a list response that arrives after a newer one", async () => {
      api.list.mockResolvedValueOnce({ data: { items: [running] } });
      const wrapper = mountView();
      await flushPromises();

      const stale = deferred<{ data: { items: unknown[] } }>();
      api.list.mockReturnValueOnce(stale.promise).mockResolvedValueOnce({ data: { items: [cancelled] } });
      await vi.advanceTimersByTimeAsync(2000);
      await wrapper
        .findAll("button")
        .find((b) => b.text() === "Cancel")!
        .trigger("click");
      await flushPromises();
      stale.resolve({ data: { items: [running] } });
      await flushPromises();

      expect(wrapper.find("tbody tr").text()).toContain("Cancelled");
    });
  });

  it("explains when runs are unavailable on the agent", async () => {
    api.list.mockRejectedValue({ response: { status: 503, data: unavailable } });
    const wrapper = mountView();
    await flushPromises();

    expect(wrapper.find(".notice").text()).toContain(unavailable.error);
    expect(wrapper.find("table").exists()).toBe(false);
  });
});
