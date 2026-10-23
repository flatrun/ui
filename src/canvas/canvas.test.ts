import { describe, expect, it } from "vitest";
import listFixture from "@/components/env/fixtures/list.json";
import envFixture from "@/components/env/fixtures/env.json";
import type { Deployment } from "@/types";
import { networkEdges, referenceEdges } from "./edges";
import { NODE_HEIGHT, environmentNames, environmentOf, layoutDeployments } from "./layout";

const deployments = listFixture.deployments as unknown as Deployment[];

describe("canvas edges", () => {
  it("links a deployment to the deployments its variables reference", async () => {
    const envs: Record<string, { key: string; value: string }[]> = {
      "hello-web": envFixture.env_vars,
      "orders-db": [],
    };
    const edges = await referenceEdges(async (name) => envs[name]).load(deployments);
    expect(edges).toEqual([
      {
        id: "reference:orders-db->hello-web",
        source: "orders-db",
        target: "hello-web",
        kind: "reference",
        label: "DB_PASSWORD, DB_USER, FLATRUN_HOST",
      },
    ]);
  });

  it("skips references to deployments that are not on the canvas", async () => {
    const edges = await referenceEdges(async () => [{ key: "X", value: "${{ elsewhere.KEY }}" }]).load(deployments);
    expect(edges).toEqual([]);
  });

  it("links deployments sharing a private network but not the shared infrastructure ones", async () => {
    const withNets = [
      { name: "api", services: [{ networks: ["proxy", "orders"] }] },
      { name: "worker", services: [{ networks: ["orders", "worker_default"] }] },
      { name: "site", services: [{ networks: ["proxy"] }] },
    ] as unknown as Deployment[];
    const edges = await networkEdges().load(withNets);
    expect(edges.map((e) => [e.source, e.target, e.label])).toEqual([["api", "worker", "orders"]]);
  });
});

describe("canvas layout", () => {
  it("places a deployment to the right of what it depends on", () => {
    const placed = layoutDeployments(deployments, [{ source: "orders-db", target: "hello-web" }], {});
    const x = Object.fromEntries(placed.map((p) => [p.name, p.position.x]));
    expect(x["orders-db"]).toBe(0);
    expect(x["hello-web"]).toBeGreaterThan(0);
  });

  it("keeps an edge that skips a column clear of the cards in that column", () => {
    const three = [{ name: "db" }, { name: "web" }, { name: "worker" }] as unknown as Deployment[];
    const deps = [
      { source: "db", target: "web" },
      { source: "web", target: "worker" },
      { source: "db", target: "worker" },
    ];
    const at = Object.fromEntries(layoutDeployments(three, deps, {}).map((p) => [p.name, p.position]));
    expect(at.db.y).toBe(at.worker.y);
    expect(Math.abs(at.web.y - at.db.y)).toBeGreaterThanOrEqual(NODE_HEIGHT);
  });

  it("survives a reference cycle and keeps saved positions", () => {
    const cycle = [
      { source: "hello-web", target: "orders-db" },
      { source: "orders-db", target: "hello-web" },
    ];
    const placed = layoutDeployments(deployments, cycle, { "hello-web": { x: 5, y: 7 } });
    expect(placed.find((p) => p.name === "hello-web")!.position).toEqual({ x: 5, y: 7 });
    expect(placed).toHaveLength(2);
  });

  it("groups environments with production first", () => {
    const mixed = [
      { name: "app" },
      { name: "app-staging", metadata: { environment: { base: "app", name: "staging" } } },
      { name: "app-pr-3", metadata: { environment: { base: "app", name: "pr-3", pr: 3 } } },
    ] as unknown as Deployment[];
    expect(environmentNames(mixed)).toEqual(["production", "pr-3", "staging"]);
    expect(environmentOf(mixed[1])).toBe("staging");
  });
});
