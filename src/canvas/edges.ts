import type { Deployment } from "@/types";
import { deploymentsApi } from "@/services/api";
import { parseReferences } from "@/utils/envref";

export interface CanvasEdge {
  id: string;
  source: string;
  target: string;
  kind: string;
  label?: string;
}

// An edge source explains one way deployments relate. The canvas draws the
// union of every registered source, so a new relationship is a new source.
export interface CanvasEdgeSource {
  kind: string;
  label: string;
  load(deployments: Deployment[]): Promise<CanvasEdge[]>;
}

const sources = new Map<string, CanvasEdgeSource>();

export function registerEdgeSource(source: CanvasEdgeSource) {
  sources.set(source.kind, source);
}

export function listEdgeSources(): CanvasEdgeSource[] {
  return [...sources.values()];
}

export async function loadEdges(deployments: Deployment[]): Promise<CanvasEdge[]> {
  const results = await Promise.allSettled(listEdgeSources().map((s) => s.load(deployments)));
  return results.flatMap((r) => (r.status === "fulfilled" ? r.value : []));
}

type EnvLoader = (name: string) => Promise<{ key: string; value: string }[]>;

const loadEnv: EnvLoader = async (name) => (await deploymentsApi.getEnvVars(name)).data.env_vars || [];

// referenceEdges links a deployment to every deployment its variables read
// from, one edge per pair labelled with the keys involved.
export function referenceEdges(load: EnvLoader = loadEnv): CanvasEdgeSource {
  return {
    kind: "reference",
    label: "Variable references",
    async load(deployments) {
      const names = new Set(deployments.map((d) => d.name));
      const perDeployment = await Promise.allSettled(
        deployments.map(async (d) => ({ name: d.name, vars: await load(d.name) })),
      );
      const keys = new Map<string, Set<string>>();
      for (const result of perDeployment) {
        if (result.status !== "fulfilled") continue;
        const { name, vars } = result.value;
        for (const v of vars) {
          for (const ref of parseReferences(v.value)) {
            if (ref.deployment === name || !names.has(ref.deployment)) continue;
            const id = `${ref.deployment}->${name}`;
            if (!keys.has(id)) keys.set(id, new Set());
            keys.get(id)!.add(ref.key);
          }
        }
      }
      return [...keys.entries()].map(([id, used]) => {
        const [source, target] = id.split("->");
        return { id: `reference:${id}`, source, target, kind: "reference", label: [...used].sort().join(", ") };
      });
    },
  };
}

// Networks every deployment joins say nothing about how two of them relate.
export const SHARED_INFRA_NETWORKS = new Set(["proxy", "web", "database", "bridge", "host", "default"]);

// networkEdges links deployments whose services share a private network.
export function networkEdges(): CanvasEdgeSource {
  return {
    kind: "network",
    label: "Shared networks",
    async load(deployments) {
      const members = new Map<string, Set<string>>();
      for (const d of deployments) {
        for (const svc of d.services || []) {
          for (const net of svc.networks || []) {
            if (SHARED_INFRA_NETWORKS.has(net) || net.endsWith("_default")) continue;
            if (!members.has(net)) members.set(net, new Set());
            members.get(net)!.add(d.name);
          }
        }
      }
      const edges: CanvasEdge[] = [];
      for (const [net, set] of members) {
        const list = [...set].sort();
        for (let i = 0; i < list.length; i++) {
          for (let j = i + 1; j < list.length; j++) {
            edges.push({
              id: `network:${net}:${list[i]}:${list[j]}`,
              source: list[i],
              target: list[j],
              kind: "network",
              label: net,
            });
          }
        }
      }
      return edges;
    },
  };
}

registerEdgeSource(referenceEdges());
registerEdgeSource(networkEdges());
