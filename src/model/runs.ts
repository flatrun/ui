import type { Run, RunStatus } from "@/services/api";
import { duration } from "@/utils/time";

export const runStatuses: RunStatus[] = [
  "queued",
  "starting",
  "running",
  "succeeded",
  "failed",
  "timed_out",
  "cancelled",
];

const labels: Record<RunStatus, string> = {
  queued: "Queued",
  starting: "Starting",
  running: "Running",
  succeeded: "Succeeded",
  failed: "Failed",
  timed_out: "Timed out",
  cancelled: "Cancelled",
};

const tones: Record<RunStatus, string> = {
  queued: "badge-info",
  starting: "badge-info",
  running: "badge-info",
  succeeded: "badge-success",
  failed: "badge-danger",
  timed_out: "badge-warning",
  cancelled: "badge-neutral",
};

export function statusLabel(status: RunStatus): string {
  return labels[status] ?? status;
}

export function statusTone(status: RunStatus): string {
  return tones[status] ?? "badge-neutral";
}

export function isActive(run: Run): boolean {
  return run.status === "queued" || run.status === "starting" || run.status === "running";
}

export function commandText(run: Run): string {
  const command = run.spec.command ?? [];
  if (command.length === 3 && command[0] === "sh" && command[1] === "-c") return command[2];
  return command.join(" ");
}

export function runDuration(run: Run, now: number = Date.now()): string {
  if (!run.started_at) return run.status === "queued" ? "Waiting" : "";
  return duration(run.started_at, run.finished_at ?? new Date(now).toISOString());
}

export function limitsText(run: Run): string {
  const parts = [];
  if (run.spec.cpus) parts.push(`${run.spec.cpus} CPU`);
  if (run.spec.memory_bytes) parts.push(`${Math.round(run.spec.memory_bytes / 1024 / 1024)} MB`);
  return parts.length ? parts.join(", ") : "None";
}

export function outputEmptyMessage(run: Run): string {
  if (run.status === "queued" || run.status === "starting") return "Waiting for the run to start...";
  if (run.status === "running") return "Waiting for output...";
  return "This run wrote no output.";
}
