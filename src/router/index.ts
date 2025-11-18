import { createRouter, createWebHistory } from "vue-router";
import type { RouteRecordRaw } from "vue-router";
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
      },
      {
        path: "deployments/:name",
        name: "deployment-detail",
        component: () => import("@/views/DeploymentDetailView.vue"),
      },
      {
        path: "containers",
        name: "containers",
        component: () => import("@/views/ContainersView.vue"),
      },
      {
        path: "images",
        name: "images",
        component: () => import("@/views/ImagesView.vue"),
      },
      {
        path: "volumes",
        name: "volumes",
        component: () => import("@/views/VolumesView.vue"),
      },
      {
        path: "networks",
        name: "networks",
        component: () => import("@/views/NetworksView.vue"),
      },
      {
        path: "ports",
        name: "ports",
        component: () => import("@/views/PortsView.vue"),
      },
      {
        path: "certificates",
        name: "certificates",
        component: () => import("@/views/CertificatesView.vue"),
      },
      {
        path: "apps",
        name: "apps",
        component: () => import("@/views/PluginsView.vue"),
      },
      {
        path: "marketplace",
        name: "marketplace",
        component: () => import("@/views/MarketplaceView.vue"),
      },
      {
        path: "settings",
        name: "settings",
        component: () => import("@/views/SettingsView.vue"),
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
  const requiresAuth = to.matched.some(
    (record) => record.meta.requiresAuth !== false,
  );

  if (requiresAuth && !token) {
    next("/login");
  } else if (to.path === "/login" && token) {
    next("/");
  } else {
    next();
  }
});

export default router;
