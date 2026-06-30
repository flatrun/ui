import { reactive, onScopeDispose } from "vue";
import { deploymentsApi, deploymentJobWsUrl, type DeploymentActionStatus, type ActionOptions } from "@/services/api";

export type ServiceAction = "start" | "stop" | "restart" | "rebuild" | "pull";

export interface ServiceJobState {
  service: string;
  action: ServiceAction;
  output: string;
  isRunning: boolean;
  isSuccess: boolean | null;
}

interface Controller {
  socket: WebSocket | null;
  timer: ReturnType<typeof setTimeout> | null;
  settled: boolean;
}

// useServiceJobs streams per-service action output inline, keyed by service
// name, reusing the deployment job endpoints. Several services can run at once.
export function useServiceJobs(getDeployment: () => string, onSettled?: (s: ServiceJobState) => void) {
  const states = reactive<Record<string, ServiceJobState>>({});
  const controllers: Record<string, Controller> = {};

  function ensure(service: string, action: ServiceAction = "restart"): ServiceJobState {
    if (!states[service]) {
      states[service] = { service, action, output: "", isRunning: false, isSuccess: null };
    }
    return states[service];
  }

  function teardown(service: string) {
    const c = controllers[service];
    if (!c) return;
    if (c.socket) {
      c.socket.onclose = null;
      c.socket.close();
      c.socket = null;
    }
    if (c.timer) {
      clearTimeout(c.timer);
      c.timer = null;
    }
  }

  function append(service: string, line: string) {
    const s = ensure(service);
    s.output = s.output ? `${s.output}\n${line}` : line;
  }

  function settle(service: string, status: DeploymentActionStatus, error?: string) {
    const c = controllers[service];
    if (c?.settled) return;
    if (c) c.settled = true;
    teardown(service);
    const s = ensure(service);
    s.isRunning = false;
    s.isSuccess = status === "succeeded";
    if (!s.output && error) append(service, error);
    onSettled?.(s);
  }

  async function run(service: string, action: ServiceAction, opts?: ActionOptions) {
    const name = getDeployment();
    teardown(service);
    controllers[service] = { socket: null, timer: null, settled: false };
    const s = ensure(service, action);
    s.action = action;
    s.output = "";
    s.isRunning = true;
    s.isSuccess = null;

    try {
      const res = await deploymentsApi.serviceActionJob(name, service, action, opts);
      openStream(service, res.data.job_id);
    } catch (e: any) {
      const activeId = e?.response?.data?.active_job_id;
      if (e?.response?.status === 409 && activeId) {
        openStream(service, activeId);
        return;
      }
      settle(service, "failed", e?.response?.data?.error || e?.message || "Request failed");
    }
  }

  function openStream(service: string, jobId: string) {
    const name = getDeployment();
    const c = controllers[service];
    if (!c) return;

    let authed = false;
    const token = localStorage.getItem("auth_token");

    try {
      c.socket = new WebSocket(deploymentJobWsUrl(name, jobId));
    } catch {
      pollUntilDone(service, jobId);
      return;
    }

    c.socket.onopen = () => {
      if (token) {
        c.socket?.send(JSON.stringify({ type: "auth", token }));
      } else {
        authed = true;
      }
    };

    c.socket.onmessage = (ev) => {
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
          c.socket?.close();
          pollUntilDone(service, jobId);
          return;
        }
      }

      if (frame.type === "line") {
        append(service, frame.data ?? "");
      } else if (frame.type === "result") {
        settle(service, frame.status, frame.error);
      } else if (frame.type === "error") {
        c.socket?.close();
        pollUntilDone(service, jobId);
      }
    };

    c.socket.onclose = () => {
      if (!c.settled) {
        pollUntilDone(service, jobId);
      }
    };
  }

  function pollUntilDone(service: string, jobId: string) {
    const c = controllers[service];
    if (!c || c.settled) return;
    const name = getDeployment();

    const tick = async () => {
      try {
        const { data } = await deploymentsApi.getJob(name, jobId);
        if (data.output) {
          ensure(service).output = data.output;
        }
        if (data.status === "succeeded" || data.status === "failed") {
          settle(service, data.status, data.error);
          return;
        }
      } catch (e: any) {
        if (e?.response?.status === 404) {
          settle(service, "failed", "Job is no longer available");
          return;
        }
      }
      c.timer = setTimeout(tick, 1500);
    };

    tick();
  }

  function dismiss(service: string) {
    teardown(service);
    delete states[service];
    delete controllers[service];
  }

  onScopeDispose(() => {
    Object.keys(controllers).forEach(teardown);
  });

  return { states, run, dismiss };
}
