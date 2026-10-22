import type { ShellLayout } from "@/themes/registry";

const LAST_KEY = "flatrun-last-project";

export function projectPath(name?: string): string {
  return name ? `/projects/${encodeURIComponent(name)}` : "/projects";
}

// Modern calls a deployment a project and serves it under /projects; Classic keeps /deployments.
export function pathForLayout(path: string, layout: ShellLayout): string | null {
  const [from, to] = layout === "modern" ? ["/deployments", "/projects"] : ["/projects", "/deployments"];
  if (path === from || path.startsWith(`${from}/`)) return to + path.slice(from.length);
  if (layout === "modern" && path === "/canvas") return "/projects";
  return null;
}

function key(workspace: string): string {
  return workspace ? `${LAST_KEY}:${workspace}` : LAST_KEY;
}

export function rememberProject(workspace: string, name: string) {
  try {
    localStorage.setItem(key(workspace), name);
  } catch {
    // Without storage the landing page falls back to the project list.
  }
}

export function lastProject(workspace: string): string {
  try {
    return localStorage.getItem(key(workspace)) ?? "";
  } catch {
    return "";
  }
}

export function forgetProject(workspace: string, name: string) {
  if (lastProject(workspace) !== name) return;
  try {
    localStorage.removeItem(key(workspace));
  } catch {
    // Nothing stored to clear.
  }
}
