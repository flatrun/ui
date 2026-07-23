import { createRouter, createWebHistory } from "vue-router";
import type { RouteRecordRaw } from "vue-router";
import type { Permission } from "@/types";
import { useAuthStore } from "@/stores/auth";
import { useSetupStore } from "@/stores/setup";
import DashboardLayout from "@/layouts/DashboardLayout.vue";

const routes: RouteRecordRaw[] = [
  {
    path: "/login",
    name: "login",
    component: () => import("@/views/LoginView.vue"),
    meta: { requiresAuth: false },
  },
  {
    path: "/setup",
    name: "setup",
    component: () => import("@/views/SetupView.vue"),
    meta: { requiresAuth: false },
  },
  {
    path: "/",
    component: DashboardLayout,
    meta: { requiresAuth: true },
    children: [
      {
        path: "",
        name: "home",
        component: () => import("@/views/HomeView.vue"),
      },
      {
        path: "deployments",
        name: "deployments",
        component: () => import("@/views/DeploymentsView.vue"),
        meta: { permission: "deployments:read" },
      },
      {
        path: "deployments/:name",
        name: "deployment-detail",
        component: () => import("@/views/DeploymentDetailView.vue"),
        meta: { permission: "deployments:read" },
      },
      {
        path: "containers",
        name: "containers",
        component: () => import("@/views/ContainersView.vue"),
        meta: { permission: "containers:read" },
      },
      {
        path: "images",
        name: "images",
        component: () => import("@/views/ImagesView.vue"),
        meta: { permission: "images:read" },
      },
      {
        path: "volumes",
        name: "volumes",
        component: () => import("@/views/VolumesView.vue"),
        meta: { permission: "volumes:read" },
      },
      {
        path: "networks",
        name: "networks",
        component: () => import("@/views/NetworksView.vue"),
        meta: { permission: "networks:read" },
      },
      {
        path: "docker-ports",
        name: "docker-ports",
        component: () => import("@/views/DockerPortsView.vue"),
        meta: { permission: "containers:read" },
      },
      {
        path: "system-ports",
        name: "system-ports",
        component: () => import("@/views/SystemPortsView.vue"),
        meta: { permission: "system:read" },
      },
      {
        path: "services",
        name: "services",
        component: () => import("@/views/ServicesView.vue"),
        meta: { permission: "system:read" },
      },
      {
        path: "databases",
        name: "databases",
        component: () => import("@/views/DatabasesView.vue"),
        meta: { permission: "databases:read" },
      },
      {
        path: "databases/:id",
        name: "database-manager",
        component: () => import("@/views/DatabaseManagerView.vue"),
        meta: { permission: "databases:read" },
      },
      {
        path: "storage/object-stores",
        name: "object-stores",
        component: () => import("@/views/ObjectStoresView.vue"),
        meta: { permission: "backups:read" },
      },
      {
        path: "certificates",
        name: "certificates",
        component: () => import("@/views/CertificatesView.vue"),
        meta: { permission: "certificates:read" },
      },
      {
        path: "apps",
        name: "apps",
        component: () => import("@/views/PluginsView.vue"),
        meta: { permission: "templates:read" },
      },
      {
        path: "dashboards",
        name: "dashboards",
        component: () => import("@/views/DashboardsView.vue"),
        meta: { permission: "deployments:read" },
      },
      {
        path: "dashboards/:id",
        name: "dashboard-detail",
        component: () => import("@/views/DashboardDetailView.vue"),
        meta: { permission: "deployments:read" },
      },
      {
        path: "observability",
        name: "observability",
        component: () => import("@/views/ObservabilityView.vue"),
        meta: { permission: "deployments:read" },
      },
      {
        path: "observability/alerts",
        name: "alerts",
        component: () => import("@/views/AlertsView.vue"),
        meta: { permission: "deployments:read" },
      },
      {
        path: "templates",
        name: "templates",
        component: () => import("@/views/TemplatesView.vue"),
        meta: { permission: "templates:read" },
      },
      {
        path: "marketplace",
        name: "marketplace",
        component: () => import("@/views/MarketplaceView.vue"),
        meta: { permission: "templates:read" },
      },
      {
        path: "agents",
        name: "agents",
        component: () => import("@/views/AgentsView.vue"),
        meta: { permission: "deployments:read" },
      },
      {
        path: "settings",
        name: "settings",
        component: () => import("@/views/SettingsView.vue"),
        meta: { permission: "settings:read" },
      },
      {
        path: "infrastructure",
        name: "infrastructure",
        component: () => import("@/views/InfrastructureView.vue"),
        meta: { permission: "infrastructure:read" },
      },
      {
        path: "server-info",
        name: "server-info",
        component: () => import("@/views/ServerInfoView.vue"),
        meta: { permission: "system:read" },
      },
      {
        path: "system-terminal",
        name: "system-terminal",
        component: () => import("@/views/SystemTerminalView.vue"),
        meta: { permission: "system:write" },
      },
      {
        path: "system/files",
        name: "system-files",
        component: () => import("@/views/SystemFilesView.vue"),
        meta: { permission: "system:files" },
      },
      {
        path: "cluster",
        name: "cluster",
        component: () => import("@/views/ClusterView.vue"),
        meta: { permission: "cluster:read" },
      },
      {
        path: "security",
        name: "security",
        component: () => import("@/views/SecurityView.vue"),
        meta: { permission: "security:read" },
      },
      {
        path: "cron-jobs",
        name: "cron-jobs",
        component: () => import("@/views/CronJobsView.vue"),
        meta: { permission: "scheduler:read" },
      },
      {
        path: "dns/zones",
        name: "dns-zones",
        component: () => import("@/views/DnsZonesView.vue"),
        meta: { permission: "dns:read" },
      },
      {
        path: "dns/external",
        name: "dns-external",
        component: () => import("@/views/DnsExternalView.vue"),
        meta: { permission: "dns:read" },
      },
      {
        path: "users",
        name: "users",
        component: () => import("@/views/UsersView.vue"),
        meta: { permission: "users:read" },
      },
      {
        path: "api-keys",
        name: "api-keys",
        component: () => import("@/views/APIKeysView.vue"),
        meta: { permission: "apikeys:read" },
      },
    ],
  },
];

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
});

router.beforeEach((to, _from, next) => {
  const setup = useSetupStore();

  if (setup.initialized === false && to.path !== "/setup") {
    next("/setup");
    return;
  }

  if (setup.initialized === true && to.path === "/setup") {
    next("/login");
    return;
  }

  const token = localStorage.getItem("auth_token");
  const requiresAuth = to.matched.some((record) => record.meta.requiresAuth !== false);

  if (requiresAuth && !token) {
    next("/login");
    return;
  }

  if (to.path === "/login" && token) {
    next("/");
    return;
  }

  const permission = to.meta.permission as Permission | undefined;
  if (permission && token) {
    const auth = useAuthStore();
    if (!auth.hasPermission(permission)) {
      next("/");
      return;
    }
  }

  next();
});

export default router;
