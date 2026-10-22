import { describe, expect, it } from "vitest";
import deploymentsFixture from "./fixtures/deployments.json";
import deploysFixture from "./fixtures/deploys.json";
import type { DeployRecord, Deployment } from "@/types";
import { deploysFrom, projectsFrom, variableKind } from "./project";

const deployments = deploymentsFixture.items as unknown as Deployment[];

describe("project model", () => {
  it("groups an environment under the deployment it was made from", () => {
    const projects = projectsFrom(deployments);
    expect(projects.map((p) => p.name)).toEqual(["hello-web", "orders-db", "orders-worker", "storefront"]);
    const hello = projects.find((p) => p.name === "hello-web")!;
    expect(hello.environments.map((e) => [e.name, e.deployment])).toEqual([
      ["production", "hello-web"],
      ["staging", "hello-web-staging"],
    ]);
    expect(hello.environments[1].branch).toBe("main");
  });

  it("describes each compose service with its replicas", () => {
    const hello = projectsFrom(deployments).find((p) => p.name === "hello-web")!;
    expect(hello.environments[0].services).toEqual([
      expect.objectContaining({ name: "app", replicas: 1, running: 0, domains: [], mounts: [] }),
    ]);
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
