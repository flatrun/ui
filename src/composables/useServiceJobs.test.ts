import { describe, it, expect, vi, beforeEach } from "vitest";
import { flushPromises } from "@vue/test-utils";
import { effectScope } from "vue";

vi.mock("@/services/api", () => ({
  deploymentsApi: {
    serviceActionJob: vi.fn(),
    getJob: vi.fn(),
  },
  deploymentJobWsUrl: vi.fn().mockReturnValue("ws://localhost/stream"),
}));

import { deploymentsApi } from "@/services/api";
import { useServiceJobs } from "./useServiceJobs";

const serviceActionJob = deploymentsApi.serviceActionJob as ReturnType<typeof vi.fn>;
const getJob = deploymentsApi.getJob as ReturnType<typeof vi.fn>;

// Force the websocket constructor to throw so the composable falls back to
// polling deterministically, the path available in a jsdom environment.
function disableWebSocket() {
  vi.stubGlobal("WebSocket", function () {
    throw new Error("no websocket in test");
  });
}

function withScope<T>(fn: () => T): T {
  const scope = effectScope();
  return scope.run(fn) as T;
}

describe("useServiceJobs", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    disableWebSocket();
  });

  it("streams a per-service action and settles via the poll fallback", async () => {
    serviceActionJob.mockResolvedValue({ data: { job_id: "job-1", status: "pending" } });
    getJob.mockResolvedValue({ data: { status: "succeeded", output: "Recreated web", lines: [] } });

    const settled = vi.fn();
    const { states, run } = withScope(() => useServiceJobs(() => "app", settled));

    await run("web", "rebuild");
    await flushPromises();

    expect(serviceActionJob).toHaveBeenCalledWith("app", "web", "rebuild");
    expect(getJob).toHaveBeenCalledWith("app", "job-1");
    expect(states.web.action).toBe("rebuild");
    expect(states.web.isRunning).toBe(false);
    expect(states.web.isSuccess).toBe(true);
    expect(states.web.output).toBe("Recreated web");
    expect(settled).toHaveBeenCalledTimes(1);
  });

  it("tracks services independently", async () => {
    serviceActionJob.mockImplementation((_n: string, service: string) =>
      Promise.resolve({ data: { job_id: `job-${service}`, status: "pending" } }),
    );
    getJob.mockResolvedValue({ data: { status: "succeeded", output: "ok", lines: [] } });

    const { states, run } = withScope(() => useServiceJobs(() => "app"));

    await run("web", "restart");
    await run("db", "stop");
    await flushPromises();

    expect(states.web.action).toBe("restart");
    expect(states.db.action).toBe("stop");
    expect(states.web.isSuccess).toBe(true);
    expect(states.db.isSuccess).toBe(true);
  });

  it("surfaces a failed action and can be dismissed", async () => {
    serviceActionJob.mockResolvedValue({ data: { job_id: "job-2", status: "pending" } });
    getJob.mockResolvedValue({ data: { status: "failed", output: "boom", error: "exit 1", lines: [] } });

    const { states, run, dismiss } = withScope(() => useServiceJobs(() => "app"));

    await run("web", "start");
    await flushPromises();

    expect(states.web.isSuccess).toBe(false);
    expect(states.web.output).toBe("boom");

    dismiss("web");
    expect(states.web).toBeUndefined();
  });

  it("attaches to the in-flight job when rejected as concurrent", async () => {
    serviceActionJob.mockRejectedValue({ response: { status: 409, data: { active_job_id: "job-running" } } });
    getJob.mockResolvedValue({ data: { status: "succeeded", output: "ok", lines: [] } });

    const { states, run } = withScope(() => useServiceJobs(() => "app"));

    await run("web", "restart");
    await flushPromises();

    expect(getJob).toHaveBeenCalledWith("app", "job-running");
    expect(states.web.isSuccess).toBe(true);
  });
});
