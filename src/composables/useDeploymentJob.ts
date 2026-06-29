import { reactive, onScopeDispose } from "vue";
import { deploymentsApi, deploymentJobWsUrl, type DeploymentActionStatus } from "@/services/api";

export type DeploymentOperation = "start" | "stop" | "restart" | "rebuild";

export interface DeploymentJobState {
  visible: boolean;
  operation: DeploymentOperation;
  deploymentName: string;
  jobId: string;
  output: string;
  isRunning: boolean;
  isSuccess: boolean | null;
}

interface PersistedJob {
  jobId: string;
  operation: DeploymentOperation;
}

const STORAGE_KEY = "deployment_active_jobs";

function loadPersisted(): Record<string, PersistedJob> {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
  } catch {
    return {};
  }
}

function persist(name: string, job: PersistedJob) {
  const all = loadPersisted();
  all[name] = job;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
}

function clearPersisted(name: string) {
  const all = loadPersisted();
  delete all[name];
  localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
}

// useDeploymentJob drives one deployment action at a time: it enqueues the
// action, streams output over a websocket, falls back to polling if the socket
// drops, and can resume a job left running across a page reload.
export function useDeploymentJob(onSettled?: (state: DeploymentJobState) => void) {
  const state = reactive<DeploymentJobState>({
    visible: false,
    operation: "start",
    deploymentName: "",
    jobId: "",
    output: "",
    isRunning: false,
    isSuccess: null,
  });

  let socket: WebSocket | null = null;
  let pollTimer: ReturnType<typeof setTimeout> | null = null;
  let settled = false;

  function teardown() {
    if (socket) {
      socket.onclose = null;
      socket.close();
      socket = null;
    }
    if (pollTimer) {
      clearTimeout(pollTimer);
      pollTimer = null;
    }
  }

  function begin(operation: DeploymentOperation, name: string) {
    teardown();
    settled = false;
    state.visible = true;
    state.operation = operation;
    state.deploymentName = name;
    state.jobId = "";
    state.output = "";
    state.isRunning = true;
    state.isSuccess = null;
  }

  function appendLine(line: string) {
    state.output = state.output ? `${state.output}\n${line}` : line;
  }

  function settle(status: DeploymentActionStatus, error?: string) {
    if (settled) return;
    settled = true;
    teardown();
    state.isRunning = false;
    state.isSuccess = status === "succeeded";
    if (!state.output && error) {
      appendLine(error);
    }
    clearPersisted(state.deploymentName);
    onSettled?.(state);
  }

  async function enqueue(operation: DeploymentOperation, name: string) {
    switch (operation) {
      case "start":
        return deploymentsApi.start(name);
      case "stop":
        return deploymentsApi.stop(name);
      case "restart":
        return deploymentsApi.restart(name);
      case "rebuild":
        return deploymentsApi.rebuild(name);
    }
  }

  async function run(operation: DeploymentOperation, name: string) {
    begin(operation, name);
    try {
      const res = await enqueue(operation, name);
      attach(res.data.job_id);
    } catch (e: any) {
      const activeId = e?.response?.data?.active_job_id;
      if (e?.response?.status === 409 && activeId) {
        attach(activeId);
        return;
      }
      settle("failed", e?.response?.data?.error || e?.message || "Request failed");
    }
  }

  function attach(jobId: string) {
    state.jobId = jobId;
    persist(state.deploymentName, { jobId, operation: state.operation });
    openStream(jobId);
  }

  function openStream(jobId: string) {
    let authed = false;
    const token = localStorage.getItem("auth_token");

    try {
      socket = new WebSocket(deploymentJobWsUrl(state.deploymentName, jobId));
    } catch {
      pollUntilDone(jobId);
      return;
    }

    socket.onopen = () => {
      if (token) {
        socket?.send(JSON.stringify({ type: "auth", token }));
      } else {
        authed = true;
      }
    };

    socket.onmessage = (ev) => {
      let frame: any;
      try {
        frame = JSON.parse(ev.data);
      } catch {
        return;
      }

      if (!authed) {
        if (frame.type === "auth_success") {
          authed = true;
          return;
        }
        if (frame.type === "error") {
          socket?.close();
          pollUntilDone(jobId);
          return;
        }
      }

      if (frame.type === "line") {
        appendLine(frame.data ?? "");
      } else if (frame.type === "result") {
        settle(frame.status, frame.error);
      } else if (frame.type === "error") {
        socket?.close();
        pollUntilDone(jobId);
      }
    };

    socket.onclose = () => {
      if (!settled) {
        pollUntilDone(jobId);
      }
    };
  }

  function pollUntilDone(jobId: string) {
    if (settled) return;

    const tick = async () => {
      try {
        const { data } = await deploymentsApi.getJob(state.deploymentName, jobId);
        if (data.output) {
          state.output = data.output;
        }
        if (data.status === "succeeded" || data.status === "failed") {
          settle(data.status, data.error);
          return;
        }
      } catch (e: any) {
        if (e?.response?.status === 404) {
          settle("failed", "Job is no longer available");
          return;
        }
      }
      pollTimer = setTimeout(tick, 1500);
    };

    tick();
  }

  async function resume(name: string): Promise<boolean> {
    const persisted = loadPersisted()[name];
    if (!persisted) return false;

    begin(persisted.operation, name);
    state.jobId = persisted.jobId;

    try {
      const { data } = await deploymentsApi.getJob(name, persisted.jobId);
      state.output = data.output || "";
      if (data.status === "succeeded" || data.status === "failed") {
        settle(data.status, data.error);
        return true;
      }
      openStream(persisted.jobId);
      return true;
    } catch {
      clearPersisted(name);
      state.visible = false;
      teardown();
      return false;
    }
  }

  function close() {
    state.visible = false;
    teardown();
  }

  onScopeDispose(teardown);

  return { state, run, resume, close };
}
