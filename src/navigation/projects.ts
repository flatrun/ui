import type { ShellLayout } from "@/themes/registry";

export function projectPath(name?: string): string {
  return name ? `/projects/${encodeURIComponent(name)}` : "/projects";
}

// Birch calls a deployment a project and serves it under /projects; Oak keeps /deployments.
export function pathForLayout(path: string, layout: ShellLayout): string | null {
  const [from, to] = layout === "birch" ? ["/deployments", "/projects"] : ["/projects", "/deployments"];
  if (path === from || path.startsWith(`${from}/`)) return to + path.slice(from.length);
  if (layout === "birch" && path === "/canvas") return "/projects";
  return null;
}
