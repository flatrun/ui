import { describe, expect, it } from "vitest";
import deploymentsFixture from "./fixtures/deployments.json";
import deploysFixture from "./fixtures/deploys.json";
import type { DeployRecord, Deployment, Service } from "@/types";
import logsFixture from "@/components/deploys/fixtures/logs.json";
import historyFixture from "@/components/deploys/fixtures/history.json";
import servicesFixture from "./fixtures/services.json";
import {
  deploySteps,
  deploysFrom,
  projectsFrom,
  serviceGraph,
  serviceState,
  splitLog,
  variableKind,
  type PhaseStart,
} from "./project";

const deployments = deploymentsFixture.items as unknown as Deployment[];

describe("project model", () => {
  it("groups an environment under the deployment it was made from", () => {
    const projects = projectsFrom(deployments);
    expect(projects.map((p) => p.name)).toEqual(["hello-web", "orders-db", "orders-worker", "storefront"]);
    const hello = projects.find((p) => p.name === "hello-web")!;
    expect(hello.environments.map((e) => [e.name, e.deployment.name])).toEqual([
      ["production", "hello-web"],
      ["staging", "hello-web-staging"],
    ]);
    expect(hello.environments[1].deployment.metadata?.source?.branch).toBe("main");
  });

  it("keeps only the requested workspace", () => {
    const moved = deployments.map((d) => (d.name === "storefront" ? { ...d, workspace: "shop" } : d));
    expect(projectsFrom(moved, "shop").map((p) => p.name)).toEqual(["storefront"]);
  });

  it("gives an environment its own project when its base is elsewhere", () => {
    const staging = deployments.filter((d) => d.name === "hello-web-staging");
    expect(projectsFrom(staging).map((p) => [p.name, p.environments[0].name])).toEqual([["hello-web", "staging"]]);
  });

  it("reads deploy records as deploys", () => {
    const deploys = deploysFrom(deploysFixture.deploys as DeployRecord[]);
    expect(deploys.map((d) => [d.phase, d.shortRevision])).toEqual([
      ["active", "26fd803"],
      ["removed", "5d89c15"],
    ]);
    expect(deploys[0].durationMs).toBeGreaterThan(0);
  });

  it("tells secrets and references apart from plain values", () => {
    expect(variableKind("${{ secret.DB_PASSWORD }}")).toBe("secret");
    expect(variableKind("postgres://${{ orders-db.DB_USER }}@db")).toBe("reference");
    expect(variableKind("8080")).toBe("plain");
  });
});

describe("deploy logs", () => {
  it("splits a stored log into build and deploy output", () => {
    const log = splitLog(logsFixture.output, logsFixture.phases as PhaseStart[]);
    expect(log.build.split("\n")).toHaveLength(3);
    expect(log.build).toContain("Source 59c64a8 synced, rebuilding");
    expect(log.deploy.split("\n")[0]).toContain("Network phase-demo_default Creating");
    expect(log.deploy).toContain("Container phase-demo-worker-2 Started");
  });

  it("treats output without phases as deploy output", () => {
    expect(splitLog("Started", [])).toEqual({ build: "", deploy: "Started" });
  });

  it("lays out the steps of a finished, running and failed deploy", () => {
    const states = (phase: any, phases: PhaseStart[]) => deploySteps(phase, phases).map((s) => s.state);
    expect(states("active", logsFixture.phases as PhaseStart[])).toEqual(["done", "done", "done", "done"]);
    expect(
      states("building", [
        { phase: "queued", from: 0 },
        { phase: "building", from: 0 },
      ]),
    ).toEqual(["done", "current", "pending", "pending"]);
    expect(
      states("failed", [
        { phase: "queued", from: 0 },
        { phase: "building", from: 0 },
      ]),
    ).toEqual(["done", "failed", "pending", "pending"]);
    const failed = historyFixture.deploys[1];
    expect(states(failed.phase, [])).toEqual(["failed", "pending", "pending", "pending"]);
  });
});

describe("service graph", () => {
  const services = servicesFixture.services as unknown as Service[];

  it("puts a service above the ones it depends on", () => {
    expect(serviceGraph(services)).toEqual({
      rows: [["web"], ["api", "worker"], ["db"]],
      links: [
        { from: "api", to: "db" },
        { from: "web", to: "api" },
        { from: "worker", to: "db" },
      ],
    });
  });

  it("survives a dependency cycle", () => {
    const cyclic = [
      { name: "a", depends_on: ["b"] },
      { name: "b", depends_on: ["a"] },
    ] as Service[];
    const graph = serviceGraph(cyclic);
    expect(graph.rows.flat().sort()).toEqual(["a", "b"]);
  });

  it("shows a service stopped by sleep as asleep, not crashed", () => {
    const worker = { ...(servicesFixture.services as unknown as Service[])[0], status: "exited" };
    expect(serviceState(worker)).toEqual({ state: "crashed", label: "Crashed" });
    expect(serviceState(worker, true)).toEqual({ state: "asleep", label: "Asleep" });
    expect(serviceState({ ...worker, status: "running" }, true).state).toBe("online");
  });
});
