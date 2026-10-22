export type ModernSectionId =
  | "architecture"
  | "deploys"
  | "logs"
  | "variables"
  | "metrics"
  | "settings"
  | "files"
  | "terminal"
  | "migration";

export interface ModernSection {
  id: ModernSectionId;
  label: string;
  icon: string;
  group: "main" | "tools";
  // The deployment page blocks shown in this section, in page order.
  tabs: string[];
  // Hidden when this block is unavailable (permission or a remote deployment).
  requiresTab?: string;
}

export const MODERN_SECTIONS: ModernSection[] = [
  { id: "architecture", label: "Architecture", icon: "workflow", group: "main", tabs: [] },
  { id: "deploys", label: "Deploys", icon: "rocket", group: "main", tabs: ["deploys"] },
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

// Maps a Classic tab id (from links such as ?tab=environment) to the Modern
// section that shows it. Plugin tabs are their own section.
export function sectionForTab(tab: string): ModernSectionId | string {
  if (tab.startsWith("plugin:")) return tab;
  if (MODERN_SECTIONS.some((s) => s.id === tab && !s.tabs.length)) return tab;
  return MODERN_SECTIONS.find((s) => s.tabs.includes(tab))?.id ?? "deploys";
}
