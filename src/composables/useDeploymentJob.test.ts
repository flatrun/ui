import { describe, it, expect, vi, beforeEach } from "vitest";
import { flushPromises } from "@vue/test-utils";
import { effectScope } from "vue";

vi.mock("@/services/api", () => ({
  deploymentsApi: {
    start: vi.fn(),
    stop: vi.fn(),
    restart: vi.fn(),
    rebuild: vi.fn(),
    getJob: vi.fn(),
  },
  deploymentJobWsUrl: vi.fn().mockReturnValue("ws://localhost/stream"),
}));

import { deploymentsApi } from "@/services/api";
import { useDeploymentJob } from "./useDeploymentJob";

const start = deploymentsApi.start as ReturnType<typeof vi.fn>;
const restart = deploymentsApi.restart as ReturnType<typeof vi.fn>;
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

describe("useDeploymentJob", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    disableWebSocket();
  });

  it("enqueues an action and settles to success via the poll fallback", async () => {
    start.mockResolvedValue({ data: { job_id: "job-1", status: "pending" } });
    getJob.mockResolvedValue({ data: { status: "succeeded", output: "Started", lines: [] } });

    const settled = vi.fn();
    const { state, run } = withScope(() => useDeploymentJob(settled));

    await run("start", "app");
    await flushPromises();

    expect(start).toHaveBeenCalledWith("app");
    expect(getJob).toHaveBeenCalledWith("app", "job-1");
    expect(state.isRunning).toBe(false);
    expect(state.isSuccess).toBe(true);
    expect(state.output).toBe("Started");
    expect(settled).toHaveBeenCalledTimes(1);
    expect(localStorage.getItem("deployment_active_jobs")).toBe("{}");
  });

  it("surfaces a failed job", async () => {
    restart.mockResolvedValue({ data: { job_id: "job-2", status: "pending" } });
    getJob.mockResolvedValue({ data: { status: "failed", output: "boom", error: "exit 1", lines: [] } });

    const { state, run } = withScope(() => useDeploymentJob());
    await run("restart", "app");
    await flushPromises();

    expect(state.isSuccess).toBe(false);
    expect(state.output).toBe("boom");
  });

  it("attaches to the in-flight job when the action is rejected as concurrent", async () => {
    start.mockRejectedValue({ response: { status: 409, data: { active_job_id: "job-running" } } });
    getJob.mockResolvedValue({ data: { status: "succeeded", output: "ok", lines: [] } });

    const { state, run } = withScope(() => useDeploymentJob());
    await run("start", "app");
    await flushPromises();

    expect(getJob).toHaveBeenCalledWith("app", "job-running");
    expect(state.isSuccess).toBe(true);
  });

  it("resumes a persisted job after a reload", async () => {
    localStorage.setItem("deployment_active_jobs", JSON.stringify({ app: { jobId: "job-3", operation: "restart" } }));
    getJob.mockResolvedValue({ data: { status: "succeeded", output: "resumed", lines: [] } });

    const { state, resume } = withScope(() => useDeploymentJob());
    const found = await resume("app");
    await flushPromises();

    expect(found).toBe(true);
    expect(state.visible).toBe(true);
    expect(state.operation).toBe("restart");
    expect(state.isSuccess).toBe(true);
    expect(state.output).toBe("resumed");
  });

  it("reports no job to resume when none was persisted", async () => {
    const { resume } = withScope(() => useDeploymentJob());
    expect(await resume("app")).toBe(false);
  });
});
