import type { Permission } from "@/types";

export interface NavItem {
  id: string;
  label: string;
  path: string;
  icon: string;
  group: string;
  permission?: Permission;
  // Shown directly in the Modern top bar; everything else sits under "More".
  primary?: boolean;
}

export const NAV_GROUPS = ["Projects", "Docker", "Storage", "Monitoring", "Apps", "System", "DNS", "Administration"];

export const NAV_ITEMS: NavItem[] = [
  {
    id: "canvas",
    label: "Canvas",
    path: "/canvas",
    icon: "workflow",
    group: "Projects",
    permission: "deployments:read",
    primary: true,
  },
  {
    id: "deployments",
    label: "Deployments",
    path: "/deployments",
    icon: "layers",
    group: "Projects",
    permission: "deployments:read",
    primary: true,
  },
  { id: "home", label: "Overview", path: "/overview", icon: "layout-dashboard", group: "Projects" },
  { id: "agents", label: "Agents", path: "/agents", icon: "bot", group: "Projects", permission: "deployments:read" },
  { id: "cluster", label: "Fleet", path: "/cluster", icon: "boxes", group: "Projects", permission: "cluster:read" },
  {
    id: "containers",
    label: "Containers",
    path: "/containers",
    icon: "box",
    group: "Docker",
    permission: "containers:read",
  },
  { id: "images", label: "Images", path: "/images", icon: "disc", group: "Docker", permission: "images:read" },
  {
    id: "volumes",
    label: "Volumes",
    path: "/volumes",
    icon: "hard-drive",
    group: "Docker",
    permission: "volumes:read",
  },
  {
    id: "networks",
    label: "Networks",
    path: "/networks",
    icon: "network",
    group: "Docker",
    permission: "networks:read",
  },
  {
    id: "docker-ports",
    label: "Port Mappings",
    path: "/docker-ports",
    icon: "cable",
    group: "Docker",
    permission: "containers:read",
  },
  {
    id: "databases",
    label: "Databases",
    path: "/databases",
    icon: "database",
    group: "Storage",
    permission: "databases:read",
    primary: true,
  },
  {
    id: "object-stores",
    label: "Object Storage",
    path: "/storage/object-stores",
    icon: "container",
    group: "Storage",
    permission: "storage:read",
  },
  {
    id: "observability",
    label: "Observability",
    path: "/observability",
    icon: "activity",
    group: "Monitoring",
    permission: "deployments:read",
    primary: true,
  },
  {
    id: "security",
    label: "Security",
    path: "/security",
    icon: "shield-alert",
    group: "Monitoring",
    permission: "security:read",
  },
  {
    id: "certificates",
    label: "Certificates",
    path: "/certificates",
    icon: "award",
    group: "Monitoring",
    permission: "certificates:read",
  },
  {
    id: "apps",
    label: "Installed Apps",
    path: "/apps",
    icon: "layout-grid",
    group: "Apps",
    permission: "templates:read",
  },
  {
    id: "marketplace",
    label: "Marketplace",
    path: "/marketplace",
    icon: "store",
    group: "Apps",
    permission: "templates:read",
  },
  {
    id: "server-info",
    label: "Server Info",
    path: "/server-info",
    icon: "server",
    group: "System",
    permission: "system:read",
  },
  {
    id: "system-terminal",
    label: "Terminal",
    path: "/system-terminal",
    icon: "terminal",
    group: "System",
    permission: "system:write",
  },
  {
    id: "system-files",
    label: "Files",
    path: "/system/files",
    icon: "folder",
    group: "System",
    permission: "system:files",
  },
  {
    id: "infrastructure",
    label: "Infrastructure",
    path: "/infrastructure",
    icon: "cpu",
    group: "System",
    permission: "infrastructure:read",
  },
  {
    id: "system-ports",
    label: "System Ports",
    path: "/system-ports",
    icon: "plug",
    group: "System",
    permission: "system:read",
  },
  { id: "services", label: "Services", path: "/services", icon: "cog", group: "System", permission: "system:read" },
  {
    id: "cron-jobs",
    label: "Cron Jobs",
    path: "/cron-jobs",
    icon: "clock",
    group: "System",
    permission: "scheduler:read",
  },
  { id: "dns-zones", label: "DNS Zones", path: "/dns/zones", icon: "globe", group: "DNS", permission: "dns:read" },
  {
    id: "dns-external",
    label: "External DNS",
    path: "/dns/external",
    icon: "cloud",
    group: "DNS",
    permission: "dns:read",
  },
  {
    id: "settings",
    label: "Settings",
    path: "/settings",
    icon: "settings",
    group: "Administration",
    permission: "settings:read",
  },
  {
    id: "updates",
    label: "Updates",
    path: "/updates",
    icon: "download",
    group: "Administration",
    permission: "updates:read",
  },
  {
    id: "notifications",
    label: "Notifications",
    path: "/notifications",
    icon: "bell",
    group: "Administration",
    permission: "notifications:read",
  },
  { id: "users", label: "Users", path: "/users", icon: "users", group: "Administration", permission: "users:read" },
  {
    id: "api-keys",
    label: "API Keys",
    path: "/api-keys",
    icon: "key-round",
    group: "Administration",
    permission: "apikeys:read",
  },
];

export function visibleNavItems(can: (p: Permission) => boolean): NavItem[] {
  return NAV_ITEMS.filter((item) => !item.permission || can(item.permission));
}
