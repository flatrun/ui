import { createRouter, createWebHistory } from "vue-router";
import type { RouteRecordRaw } from "vue-router";
import type { Permission } from "@/types";
import { useAuthStore } from "@/stores/auth";
import DashboardLayout from "@/layouts/DashboardLayout.vue";

const routes: RouteRecordRaw[] = [
  {
    path: "/login",
    name: "login",
    component: () => import("@/views/LoginView.vue"),
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
