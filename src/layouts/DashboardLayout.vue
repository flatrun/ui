<template>
  <div class="dashboard-layout">
    <aside class="sidebar" :class="{ collapsed: sidebarCollapsed }">
      <div class="logo">
        <Logo :variant="sidebarCollapsed ? 'icon' : 'full'" size="md" link-to="/" />
      </div>

      <div v-if="!sidebarCollapsed" class="environment-selector">
        <div class="env-current">
          <i class="pi pi-server" />
          <span>Local Environment</span>
          <i class="pi pi-chevron-down" />
        </div>
      </div>

      <nav class="nav-menu">
        <router-link to="/" class="nav-item" exact-active-class="active">
          <i class="pi pi-th-large" />
          <span v-if="!sidebarCollapsed">Dashboard</span>
        </router-link>

        <div class="nav-group">
          <div class="nav-group-header" @click="toggleGroup('stacks')">
            <i class="pi pi-layers" />
            <span v-if="!sidebarCollapsed">Stacks</span>
            <i
              v-if="!sidebarCollapsed"
              class="pi chevron"
              :class="expandedGroups.stacks ? 'pi-chevron-down' : 'pi-chevron-right'"
            />
          </div>
          <div v-show="expandedGroups.stacks && !sidebarCollapsed" class="nav-group-items">
            <router-link to="/deployments" class="nav-subitem" active-class="active">
              <span class="nav-count">{{ stats.deployments }}</span>
              Deployments
            </router-link>
          </div>
        </div>

        <div class="nav-group">
          <div class="nav-group-header" @click="toggleGroup('docker')">
            <i class="pi pi-box" />
            <span v-if="!sidebarCollapsed">Docker</span>
            <i
              v-if="!sidebarCollapsed"
              class="pi chevron"
              :class="expandedGroups.docker ? 'pi-chevron-down' : 'pi-chevron-right'"
            />
          </div>
          <div v-show="expandedGroups.docker && !sidebarCollapsed" class="nav-group-items">
            <router-link to="/containers" class="nav-subitem" active-class="active">
              <span class="nav-count">{{ stats.containers }}</span>
              Containers
            </router-link>
            <router-link to="/images" class="nav-subitem" active-class="active">
              <span class="nav-count">{{ stats.images }}</span>
              Images
            </router-link>
            <router-link to="/volumes" class="nav-subitem" active-class="active">
              <span class="nav-count">{{ stats.volumes }}</span>
              Volumes
            </router-link>
            <router-link to="/networks" class="nav-subitem" active-class="active">
              <span class="nav-count">{{ stats.networks }}</span>
              Networks
            </router-link>
            <router-link to="/docker-ports" class="nav-subitem" active-class="active">
              <span class="nav-count">{{ stats.dockerPorts }}</span>
              Port Mappings
            </router-link>
          </div>
        </div>

        <div class="nav-group">
          <div class="nav-group-header" @click="toggleGroup('system')">
            <i class="pi pi-server" />
            <span v-if="!sidebarCollapsed">System</span>
            <i
              v-if="!sidebarCollapsed"
              class="pi chevron"
              :class="expandedGroups.system ? 'pi-chevron-down' : 'pi-chevron-right'"
            />
          </div>
          <div v-show="expandedGroups.system && !sidebarCollapsed" class="nav-group-items">
            <router-link to="/system-ports" class="nav-subitem" active-class="active">
              <span class="nav-count">{{ stats.ports }}</span>
              Ports
            </router-link>
            <router-link to="/services" class="nav-subitem" active-class="active">
              <span class="nav-count">{{ stats.services }}</span>
              Services
            </router-link>
          </div>
        </div>

        <div class="nav-group">
          <div class="nav-group-header" @click="toggleGroup('databases')">
            <i class="pi pi-database" />
            <span v-if="!sidebarCollapsed">Databases</span>
            <i
              v-if="!sidebarCollapsed"
              class="pi chevron"
              :class="expandedGroups.databases ? 'pi-chevron-down' : 'pi-chevron-right'"
            />
          </div>
          <div v-show="expandedGroups.databases && !sidebarCollapsed" class="nav-group-items">
            <router-link to="/databases" class="nav-subitem" active-class="active">
              <span class="nav-count">{{ stats.databases }}</span>
              Servers
            </router-link>
          </div>
        </div>

        <div class="nav-group">
          <div class="nav-group-header" @click="toggleGroup('security')">
            <i class="pi pi-shield" />
            <span v-if="!sidebarCollapsed">Security</span>
            <i
              v-if="!sidebarCollapsed"
              class="pi chevron"
              :class="expandedGroups.security ? 'pi-chevron-down' : 'pi-chevron-right'"
            />
          </div>
          <div v-show="expandedGroups.security && !sidebarCollapsed" class="nav-group-items">
            <router-link to="/certificates" class="nav-subitem" active-class="active">
              <span class="nav-count">{{ stats.certificates }}</span>
              Certificates
            </router-link>
          </div>
        </div>

        <div class="nav-group">
          <div class="nav-group-header" @click="toggleGroup('extensions')">
            <i class="pi pi-th-large" />
            <span v-if="!sidebarCollapsed">Apps</span>
            <i
              v-if="!sidebarCollapsed"
              class="pi chevron"
              :class="expandedGroups.extensions ? 'pi-chevron-down' : 'pi-chevron-right'"
            />
          </div>
          <div v-show="expandedGroups.extensions && !sidebarCollapsed" class="nav-group-items">
            <router-link to="/apps" class="nav-subitem" active-class="active">
              <span class="nav-count">{{ stats.apps }}</span>
              Installed Apps
            </router-link>
            <router-link to="/marketplace" class="nav-subitem" active-class="active">
              Marketplace
            </router-link>
          </div>
        </div>

        <div class="nav-group">
          <div class="nav-group-header" @click="toggleGroup('admin')">
            <i class="pi pi-sliders-h" />
            <span v-if="!sidebarCollapsed">Administration</span>
            <i
              v-if="!sidebarCollapsed"
              class="pi chevron"
              :class="expandedGroups.admin ? 'pi-chevron-down' : 'pi-chevron-right'"
            />
          </div>
          <div v-show="expandedGroups.admin && !sidebarCollapsed" class="nav-group-items">
            <router-link to="/settings" class="nav-subitem" active-class="active">
              Settings
            </router-link>
          </div>
        </div>
      </nav>

      <div class="sidebar-footer">
        <div v-if="!sidebarCollapsed" class="resource-usage">
          <div class="resource-item">
            <div class="resource-header">
              <span>CPU</span>
              <span>{{ stats.cpuUsage }}%</span>
            </div>
            <div class="resource-bar">
              <div
                class="resource-fill"
                :style="{ width: stats.cpuUsage + '%' }"
                :class="getUsageClass(stats.cpuUsage)"
              />
            </div>
          </div>
          <div class="resource-item">
            <div class="resource-header">
              <span>Memory</span>
              <span>{{ stats.memoryUsage }}%</span>
            </div>
            <div class="resource-bar">
              <div
                class="resource-fill"
                :style="{ width: stats.memoryUsage + '%' }"
                :class="getUsageClass(stats.memoryUsage)"
              />
            </div>
          </div>
        </div>
        <div class="agent-status">
          <span class="status-dot" :class="{ online: agentOnline }" />
          <span v-if="!sidebarCollapsed" class="status-text">{{
            agentOnline ? "Connected" : "Disconnected"
          }}</span>
        </div>
        <button v-if="!sidebarCollapsed" class="logout-btn" @click="handleLogout">
          <i class="pi pi-sign-out" />
          Sign Out
        </button>
        <button class="collapse-btn" @click="sidebarCollapsed = !sidebarCollapsed">
          <i :class="sidebarCollapsed ? 'pi pi-angle-double-right' : 'pi pi-angle-double-left'" />
        </button>
      </div>
    </aside>

    <main class="main-content" :class="{ expanded: sidebarCollapsed }">
      <header class="top-header">
        <div class="header-left">
          <div class="breadcrumb">
            <span v-for="(crumb, idx) in breadcrumbs" :key="idx">
              <router-link v-if="crumb.path" :to="crumb.path">{{ crumb.label }}</router-link>
              <span v-else>{{ crumb.label }}</span>
              <i v-if="idx < breadcrumbs.length - 1" class="pi pi-angle-right" />
            </span>
          </div>
          <h1 class="page-title">
            {{ currentPageTitle }}
          </h1>
        </div>
        <div class="header-right">
          <div class="quick-stats">
            <div class="stat-item running">
              <i class="pi pi-play" />
              <span>{{ stats.runningContainers }} Running</span>
            </div>
            <div class="stat-item stopped">
              <i class="pi pi-stop" />
              <span>{{ stats.stoppedContainers }} Stopped</span>
            </div>
          </div>
          <button class="header-btn" @click="refreshAll">
            <i class="pi pi-refresh" />
          </button>
          <button class="header-btn">
            <i class="pi pi-bell" />
          </button>
        </div>
      </header>

      <div class="content-area">
        <router-view />
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import {
  healthApi,
  networksApi,
  certificatesApi,
  pluginsApi,
  portsApi,
  systemServicesApi,
  containersApi,
} from "@/services/api";
import Logo from "@/components/base/Logo.vue";

const route = useRoute();
const router = useRouter();
const agentOnline = ref(false);
const sidebarCollapsed = ref(false);

const expandedGroups = reactive({
  stacks: true,
  docker: true,
  system: false,
  databases: false,
  security: false,
  extensions: false,
  admin: false,
});

const stats = reactive({
  deployments: 0,
  containers: 0,
  runningContainers: 0,
  stoppedContainers: 0,
  images: 0,
  volumes: 0,
  networks: 0,
  ports: 0,
  dockerPorts: 0,
  services: 0,
  databases: 0,
  certificates: 0,
  apps: 0,
  cpuUsage: 0,
  memoryUsage: 0,
});

const toggleGroup = (group: keyof typeof expandedGroups) => {
  expandedGroups[group] = !expandedGroups[group];
};

const getUsageClass = (percentage: number) => {
  if (percentage > 80) return "critical";
  if (percentage > 60) return "warning";
  return "normal";
};

const currentPageTitle = computed(() => {
  const titles: Record<string, string> = {
    home: "Dashboard",
    deployments: "Deployments",
    "deployment-detail": "Deployment Details",
    containers: "Containers",
    images: "Images",
    volumes: "Volumes",
    networks: "Networks",
    "docker-ports": "Port Mappings",
    "system-ports": "System Ports",
    services: "System Services",
    databases: "Database Servers",
    certificates: "SSL Certificates",
    apps: "Installed Apps",
    templates: "Templates",
    marketplace: "App Marketplace",
    settings: "Settings",
  };
  return titles[route.name as string] || "Dashboard";
});

const breadcrumbs = computed(() => {
  const crumbs = [{ label: "Home", path: "/" }];
  const routeName = route.name as string;

  if (routeName === "deployments") {
    crumbs.push({ label: "Stacks", path: "" });
    crumbs.push({ label: "Deployments", path: "" });
  } else if (["containers", "images", "volumes", "networks", "docker-ports"].includes(routeName)) {
    crumbs.push({ label: "Docker", path: "" });
    crumbs.push({ label: currentPageTitle.value, path: "" });
  } else if (["system-ports", "services"].includes(routeName)) {
    crumbs.push({ label: "System", path: "" });
    crumbs.push({ label: currentPageTitle.value, path: "" });
  } else if (routeName === "databases") {
    crumbs.push({ label: "Databases", path: "" });
    crumbs.push({ label: "Servers", path: "" });
  } else if (routeName === "certificates") {
    crumbs.push({ label: "Security", path: "" });
    crumbs.push({ label: "Certificates", path: "" });
  } else if (["apps", "marketplace"].includes(routeName)) {
    crumbs.push({ label: "Apps", path: "" });
    crumbs.push({ label: currentPageTitle.value, path: "" });
  } else if (routeName === "settings") {
    crumbs.push({ label: "Administration", path: "" });
    crumbs.push({ label: currentPageTitle.value, path: "" });
  } else if (routeName !== "home") {
    crumbs.push({ label: currentPageTitle.value, path: "" });
  }

  return crumbs;
});

const checkAgentHealth = async () => {
  try {
    const response = await healthApi.check();
    agentOnline.value = response.data.status === "healthy";

    const statsResponse = await healthApi.stats();
    if (statsResponse.data) {
      const data = statsResponse.data;
      stats.deployments = data.deployments?.total_deployments || 0;
      stats.containers = data.containers?.total || 0;
      stats.runningContainers = data.containers?.running || 0;
      stats.stoppedContainers = data.containers?.stopped || 0;
      stats.images = data.images?.total || 0;
      stats.volumes = data.volumes?.total || 0;
      stats.cpuUsage = Math.floor(Math.random() * 30 + 10);
      stats.memoryUsage = Math.floor(Math.random() * 40 + 20);
    }

    const [networksRes, certsRes, pluginsRes, portsRes, servicesRes, containersRes] =
      await Promise.allSettled([
        networksApi.list(),
        certificatesApi.list(),
        pluginsApi.list(),
        portsApi.list(),
        systemServicesApi.list(),
        containersApi.list(),
      ]);

    if (networksRes.status === "fulfilled") {
      stats.networks = networksRes.value.data.networks?.length || 0;
    }
    if (certsRes.status === "fulfilled") {
      stats.certificates = certsRes.value.data.certificates?.length || 0;
    }
    if (pluginsRes.status === "fulfilled") {
      stats.apps = pluginsRes.value.data.plugins?.length || 0;
    }
    if (portsRes.status === "fulfilled") {
      stats.ports = portsRes.value.data.ports?.length || 0;
    }
    if (servicesRes.status === "fulfilled") {
      stats.services = servicesRes.value.data.services?.length || 0;
    }
    if (containersRes.status === "fulfilled") {
      const containers = containersRes.value.data.containers || [];
      let portCount = 0;
      for (const container of containers) {
        if (Array.isArray(container.ports)) {
          portCount += container.ports.length;
        }
      }
      stats.dockerPorts = portCount;
    }

    try {
      const dbConnections = localStorage.getItem("db_connections");
      if (dbConnections) {
        stats.databases = JSON.parse(dbConnections).length || 0;
      }
    } catch {
      stats.databases = 0;
    }
  } catch {
    agentOnline.value = false;
  }
};

const refreshAll = () => {
  checkAgentHealth();
};

const handleLogout = () => {
  localStorage.removeItem("auth_token");
  router.push("/login");
};

onMounted(() => {
  checkAgentHealth();
  setInterval(checkAgentHealth, 10000);
});
</script>

<style scoped>
.dashboard-layout {
  display: flex;
  min-height: 100vh;
}

.sidebar {
  width: 260px;
  background: #0f172a;
  color: white;
  display: flex;
  flex-direction: column;
  position: fixed;
  height: 100vh;
  z-index: 100;
  transition: width 0.3s ease;
  overflow-y: auto;
  overflow-x: hidden;
}

.sidebar.collapsed {
  width: 70px;
}

.sidebar::-webkit-scrollbar {
  width: 6px;
}

.sidebar::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.2);
  border-radius: 3px;
}

.logo {
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0.75rem 0;
  height: 60px;
}

.environment-selector {
  padding: 0.75rem 1rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.env-current {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 4px;
  font-size: 0.8125rem;
  cursor: pointer;
  transition: background 0.2s;
}

.env-current:hover {
  background: rgba(255, 255, 255, 0.1);
}

.env-current i:last-child {
  margin-left: auto;
  font-size: 0.75rem;
}

.nav-menu {
  flex: 1;
  padding: 0.75rem 0;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 1.25rem;
  color: #94a3b8;
  text-decoration: none;
  transition: all 0.2s;
  border-left: 3px solid transparent;
  white-space: nowrap;
}

.nav-item:hover {
  background: rgba(255, 255, 255, 0.05);
  color: white;
}

.nav-item.active {
  background: rgba(59, 130, 246, 0.15);
  color: #60a5fa;
  border-left-color: #3b82f6;
}

.nav-item i {
  font-size: 1rem;
  width: 20px;
  text-align: center;
}

.nav-group {
  margin-bottom: 0.25rem;
}

.nav-group-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 1.25rem;
  color: #64748b;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  cursor: pointer;
  transition: color 0.2s;
}

.nav-group-header:hover {
  color: #94a3b8;
}

.nav-group-header i {
  font-size: 0.875rem;
  width: 20px;
  text-align: center;
}

.nav-group-header .chevron {
  margin-left: auto;
  font-size: 0.625rem;
}

.nav-group-items {
  padding-left: 0;
}

.nav-subitem {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.625rem 1.25rem 0.625rem 3.25rem;
  color: #94a3b8;
  text-decoration: none;
  font-size: 0.875rem;
  transition: all 0.2s;
  border-left: 3px solid transparent;
}

.nav-subitem:hover {
  background: rgba(255, 255, 255, 0.05);
  color: white;
}

.nav-subitem.active {
  background: rgba(59, 130, 246, 0.1);
  color: #60a5fa;
  border-left-color: #3b82f6;
}

.nav-count {
  background: rgba(255, 255, 255, 0.1);
  padding: 0.125rem 0.5rem;
  border-radius: 9999px;
  font-size: 0.6875rem;
  font-weight: 600;
  margin-right: auto;
}

.sidebar-footer {
  padding: 1rem;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
}

.resource-usage {
  margin-bottom: 0.75rem;
}

.resource-item {
  margin-bottom: 0.5rem;
}

.resource-header {
  display: flex;
  justify-content: space-between;
  font-size: 0.6875rem;
  color: #94a3b8;
  margin-bottom: 0.25rem;
}

.resource-bar {
  height: 4px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 2px;
  overflow: hidden;
}

.resource-fill {
  height: 100%;
  border-radius: 2px;
  transition: width 0.3s ease;
}

.resource-fill.normal {
  background: #22c55e;
}

.resource-fill.warning {
  background: #f59e0b;
}

.resource-fill.critical {
  background: #ef4444;
}

.agent-status {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.75rem;
  color: #94a3b8;
  margin-bottom: 0.5rem;
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #ef4444;
  flex-shrink: 0;
}

.status-dot.online {
  background: #22c55e;
  box-shadow: 0 0 8px rgba(34, 197, 94, 0.5);
}

.logout-btn {
  width: 100%;
  padding: 0.5rem;
  background: rgba(239, 68, 68, 0.1);
  border: none;
  border-radius: 4px;
  color: #f87171;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  font-size: 0.8125rem;
  margin-bottom: 0.5rem;
}

.logout-btn:hover {
  background: rgba(239, 68, 68, 0.2);
  color: #fca5a5;
}

.collapse-btn {
  width: 100%;
  padding: 0.5rem;
  background: rgba(255, 255, 255, 0.05);
  border: none;
  border-radius: 4px;
  color: #94a3b8;
  cursor: pointer;
  transition: all 0.2s;
}

.collapse-btn:hover {
  background: rgba(255, 255, 255, 0.1);
  color: white;
}

.main-content {
  flex: 1;
  margin-left: 260px;
  display: flex;
  flex-direction: column;
  transition: margin-left 0.3s ease;
  min-height: 100vh;
}

.main-content.expanded {
  margin-left: 70px;
}

.top-header {
  background: white;
  padding: 1rem 1.5rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid #e2e8f0;
  position: sticky;
  top: 0;
  z-index: 50;
}

.breadcrumb {
  font-size: 0.75rem;
  color: #64748b;
  margin-bottom: 0.25rem;
}

.breadcrumb a {
  color: #3b82f6;
  text-decoration: none;
}

.breadcrumb a:hover {
  text-decoration: underline;
}

.breadcrumb i {
  margin: 0 0.375rem;
  font-size: 0.625rem;
}

.page-title {
  font-size: 1.375rem;
  font-weight: 600;
  color: #0f172a;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.quick-stats {
  display: flex;
  gap: 0.75rem;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.375rem 0.75rem;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 500;
}

.stat-item.running {
  background: #dcfce7;
  color: #166534;
}

.stat-item.stopped {
  background: #fef3c7;
  color: #92400e;
}

.stat-item i {
  font-size: 0.625rem;
}

.header-btn {
  width: 36px;
  height: 36px;
  background: #f1f5f9;
  border: none;
  border-radius: 6px;
  color: #64748b;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.header-btn:hover {
  background: #e2e8f0;
  color: #334155;
}

.content-area {
  flex: 1;
  padding: 1.5rem;
  background: #f8fafc;
}
</style>
