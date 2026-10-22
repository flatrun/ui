export type BirchSectionId =
  | "architecture"
  | "deploys"
  | "logs"
  | "variables"
  | "metrics"
  | "settings"
  | "files"
  | "terminal"
  | "migration";

export interface BirchSection {
  id: BirchSectionId;
  label: string;
  icon: string;
  group: "main" | "tools";
  // The deployment page blocks shown in this section, in page order.
  tabs: string[];
  // Hidden when this block is unavailable (permission or a remote deployment).
  requiresTab?: string;
}

export const BIRCH_SECTIONS: BirchSection[] = [
  { id: "architecture", label: "Architecture", icon: "workflow", group: "main", tabs: [] },
  { id: "deploys", label: "Deployments", icon: "rocket", group: "main", tabs: ["deploys"] },
  { id: "logs", label: "Logs", icon: "scroll-text", group: "main", tabs: ["logs"] },
  { id: "variables", label: "Variables", icon: "braces", group: "main", tabs: ["environment"] },
  { id: "metrics", label: "Metrics", icon: "chart-line", group: "main", tabs: [] },
  {
    id: "settings",
    label: "Settings",
    icon: "settings",
    group: "main",
    tabs: ["overview", "databases", "actions", "backups", "security", "config"],
  },
  { id: "files", label: "Files", icon: "folder", group: "tools", tabs: ["files"] },
  { id: "terminal", label: "Terminal", icon: "terminal", group: "tools", tabs: ["terminal"], requiresTab: "terminal" },
  { id: "migration", label: "Migration", icon: "arrow-right-left", group: "tools", tabs: ["migration"] },
];

// Maps an Oak tab id (from links such as ?tab=environment) to the Birch
// section that shows it. Plugin tabs are their own section.
export function sectionForTab(tab: string): BirchSectionId | string {
  if (tab.startsWith("plugin:")) return tab;
  if (BIRCH_SECTIONS.some((s) => s.id === tab && !s.tabs.length)) return tab;
  return BIRCH_SECTIONS.find((s) => s.tabs.includes(tab))?.id ?? "deploys";
}
