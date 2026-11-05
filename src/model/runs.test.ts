import { describe, it, expect } from "vitest";
import type { Run } from "@/services/api";
import { commandText, isActive, limitsText, outputEmptyMessage, runDuration, runStatuses, statusTone } from "./runs";
import running from "@/views/fixtures/runs/run-running.json";
import succeeded from "@/views/fixtures/runs/run-succeeded.json";
import failed from "@/views/fixtures/runs/run-failed.json";

const asRun = (r: unknown) => r as Run;

describe("runs model", () => {
  it("gives every status a shared badge tone", () => {
    for (const status of runStatuses) expect(statusTone(status)).toMatch(/^badge-/);
    expect(statusTone("succeeded")).toBe("badge-success");
    expect(statusTone("failed")).toBe("badge-danger");
    expect(statusTone("timed_out")).toBe("badge-warning");
  });

  it("treats only unfinished runs as active", () => {
    expect(isActive(asRun(running))).toBe(true);
    expect(isActive(asRun(succeeded))).toBe(false);
    expect(isActive(asRun(failed))).toBe(false);
  });

  it("shows a shell command as the script it runs", () => {
    expect(commandText(asRun({ spec: { command: ["sh", "-c", "echo hi; exit 1"] } }))).toBe("echo hi; exit 1");
    expect(commandText(asRun({ spec: { command: ["echo", "hi"] } }))).toBe("echo hi");
    expect(commandText(asRun({ spec: {} }))).toBe("");
  });

  it("measures a finished run to its end and an active one to now", () => {
    const start = "2026-11-05T10:00:00Z";
    expect(runDuration(asRun({ status: "succeeded", started_at: start, finished_at: "2026-11-05T10:01:05Z" }))).toBe(
      "1m 5s",
    );
    expect(runDuration(asRun({ status: "running", started_at: start }), Date.parse("2026-11-05T10:00:12Z"))).toBe(
      "12s",
    );
    expect(runDuration(asRun({ status: "queued" }))).toBe("Waiting");
  });

  it("describes limits, or none", () => {
    expect(limitsText(asRun({ spec: { cpus: 1.5, memory_bytes: 268435456 } }))).toBe("1.5 CPU, 256 MB");
    expect(limitsText(asRun({ spec: {} }))).toBe("None");
  });

  it("explains empty output by where the run is", () => {
    expect(outputEmptyMessage(asRun({ status: "queued" }))).toMatch(/start/);
    expect(outputEmptyMessage(asRun({ status: "running" }))).toMatch(/Waiting for output/);
    expect(outputEmptyMessage(asRun({ status: "succeeded" }))).toMatch(/no output/);
  });
});
