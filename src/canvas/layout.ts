import type { Deployment } from "@/types";

export interface Point {
  x: number;
  y: number;
}

export const NODE_WIDTH = 240;
export const NODE_HEIGHT = 96;
const GAP_X = 180;
const GAP_Y = 70;
const STORAGE_KEY = "flatrun-canvas-positions";

export function readSavedPositions(key = STORAGE_KEY): Record<string, Point> {
  try {
    return JSON.parse(localStorage.getItem(key) || "{}");
  } catch {
    return {};
  }
}

export function savePosition(name: string, point: Point, key = STORAGE_KEY) {
  try {
    const all = readSavedPositions(key);
    all[name] = point;
    localStorage.setItem(key, JSON.stringify(all));
  } catch {
    // Storage can be unavailable; positions then last for this visit only.
  }
}

// layoutDeployments places deployments in columns so that a deployment sits to
// the right of every deployment it depends on, keeping any position the viewer
// dragged a node to earlier.
export function layoutDeployments(
  deployments: Deployment[],
  dependencies: { source: string; target: string }[] = [],
  saved: Record<string, Point> = readSavedPositions(),
  size: { width: number; height: number } = { width: NODE_WIDTH, height: NODE_HEIGHT },
) {
  const column = new Map(deployments.map((d) => [d.name, 0]));
  // Bounded relaxation: a cycle simply stops deepening after n passes.
  for (let pass = 0; pass < deployments.length; pass++) {
    let changed = false;
    for (const { source, target } of dependencies) {
      if (!column.has(source) || !column.has(target) || source === target) continue;
      const next = column.get(source)! + 1;
      if (next > column.get(target)! && next < deployments.length) {
        column.set(target, next);
        changed = true;
      }
    }
    if (!changed) break;
  }

  const rows = new Map<number, number>();
  return deployments.map((d) => {
    const col = column.get(d.name)!;
    const row = rows.get(col) ?? 0;
    rows.set(col, row + 1);
    return {
      name: d.name,
      position: saved[d.name] ?? {
        x: col * (size.width + GAP_X),
        // Odd columns drop by a full row so an edge that skips a column passes
        // between that column's cards instead of through them.
        y: row * (size.height + GAP_Y) + (col % 2) * (size.height + GAP_Y / 2),
      },
    };
  });
}

export const PRODUCTION = "production";

// environmentOf names the environment a deployment belongs to; deployments
// that are not an environment of another one make up production.
export function environmentOf(d: Deployment): string {
  return d.metadata?.environment?.name || PRODUCTION;
}

export function environmentNames(deployments: Deployment[]): string[] {
  const names = new Set(deployments.map(environmentOf));
  names.delete(PRODUCTION);
  return [PRODUCTION, ...[...names].sort()];
}
