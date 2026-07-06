<template>
  <div class="dashboard-layout">
    <aside class="sidebar" :class="{ collapsed: sidebarCollapsed }">
      <div class="logo">
        <Logo :variant="sidebarCollapsed ? 'icon' : 'full'" size="md" link-to="/" />
      </div>

      <div v-if="!sidebarCollapsed" class="environment-selector">
        <div class="env-current" @click="envDropdownOpen = !envDropdownOpen">
          <Icon name="server" :size="16" />
          <span>{{ currentServerName }}</span>
          <Icon class="env-caret" :name="envDropdownOpen ? 'chevron-up' : 'chevron-down'" :size="14" />
        </div>
        <div v-if="envDropdownOpen" class="env-dropdown">
          <div class="env-option active" @click="envDropdownOpen = false">
            <Icon name="server" :size="16" />
            <div class="env-option-info">
              <span class="env-option-name">{{ currentServerName }}</span>
              <span class="env-option-hint">Current server</span>
            </div>
            <Icon name="check" :size="16" />
          </div>
          <div v-for="peer in clusterPeers" :key="peer.id" class="env-option" @click="envDropdownOpen = false">
            <Icon name="server" :size="16" />
            <div class="env-option-info">
              <span class="env-option-name">{{ peer.name }}</span>
              <span class="env-option-hint">{{ peer.status }}</span>
            </div>
          </div>
          <router-link
            v-if="authStore.hasPermission('cluster:read')"
            to="/cluster"
            class="env-option env-manage"
            @click="envDropdownOpen = false"
          >
            <Icon name="settings" :size="16" />
            <span class="env-option-name">Manage Cluster</span>
          </router-link>
        </div>
      </div>

      <nav class="nav-menu">
        <router-link to="/" class="nav-item" exact-active-class="active">
          <Icon name="layout-dashboard" :size="18" />
          <span v-if="!sidebarCollapsed">Dashboard</span>
        </router-link>

        <div v-if="authStore.hasPermission('deployments:read')" class="nav-group">
          <div class="nav-group-header" @click="toggleGroup('stacks')">
            <Icon name="layers" :size="17" />
            <span v-if="!sidebarCollapsed">Stacks</span>
            <Icon
              v-if="!sidebarCollapsed"
              class="chevron"
              :size="14"
              :name="expandedGroups.stacks ? 'chevron-down' : 'chevron-right'"
            />
          </div>
          <div v-show="expandedGroups.stacks && !sidebarCollapsed" class="nav-group-items">
            <router-link to="/deployments" class="nav-subitem" active-class="active">
              Deployments
              <span class="nav-count">{{ stats.deployments }}</span>
            </router-link>
          </div>
        </div>

        <div
          v-if="
            authStore.hasPermission('containers:read') ||
            authStore.hasPermission('images:read') ||
            authStore.hasPermission('volumes:read') ||
            authStore.hasPermission('networks:read')
          "
          class="nav-group"
        >
          <div class="nav-group-header" @click="toggleGroup('docker')">
            <Icon name="box" :size="17" />
            <span v-if="!sidebarCollapsed">Docker</span>
            <Icon
              v-if="!sidebarCollapsed"
              class="chevron"
              :size="14"
              :name="expandedGroups.docker ? 'chevron-down' : 'chevron-right'"
            />
          </div>
          <div v-show="expandedGroups.docker && !sidebarCollapsed" class="nav-group-items">
            <router-link
              v-if="authStore.hasPermission('containers:read')"
              to="/containers"
              class="nav-subitem"
              active-class="active"
            >
              Containers
              <span class="nav-count">{{ stats.containers }}</span>
            </router-link>
            <router-link
              v-if="authStore.hasPermission('images:read')"
              to="/images"
              class="nav-subitem"
              active-class="active"
            >
              Images
              <span class="nav-count">{{ stats.images }}</span>
            </router-link>
            <router-link
              v-if="authStore.hasPermission('volumes:read')"
              to="/volumes"
              class="nav-subitem"
              active-class="active"
            >
              Volumes
              <span class="nav-count">{{ stats.volumes }}</span>
            </router-link>
            <router-link
              v-if="authStore.hasPermission('networks:read')"
              to="/networks"
              class="nav-subitem"
              active-class="active"
            >
              Networks
              <span class="nav-count">{{ stats.networks }}</span>
            </router-link>
            <router-link
              v-if="authStore.hasPermission('containers:read')"
              to="/docker-ports"
              class="nav-subitem"
              active-class="active"
            >
              Port Mappings
              <span class="nav-count">{{ stats.dockerPorts }}</span>
            </router-link>
          </div>
        </div>

        <div
          v-if="
            authStore.hasPermission('system:read') ||
            authStore.hasPermission('infrastructure:read') ||
            authStore.hasPermission('scheduler:read') ||
            authStore.hasPermission('cluster:read')
          "
          class="nav-group"
        >
          <div class="nav-group-header" @click="toggleGroup('system')">
            <Icon name="server" :size="16" />
            <span v-if="!sidebarCollapsed">System</span>
            <Icon
              v-if="!sidebarCollapsed"
              class="chevron"
              :size="14"
              :name="expandedGroups.system ? 'chevron-down' : 'chevron-right'"
            />
          </div>
          <div v-show="expandedGroups.system && !sidebarCollapsed" class="nav-group-items">
            <router-link
              v-if="authStore.hasPermission('system:read')"
              to="/server-info"
              class="nav-subitem"
              active-class="active"
            >
              Server Info
            </router-link>
            <router-link
              v-if="authStore.hasPermission('system:write')"
              to="/system-terminal"
              class="nav-subitem"
              active-class="active"
            >
              Terminal
            </router-link>
            <router-link
              v-if="authStore.hasPermission('system:files')"
              to="/system/files"
              class="nav-subitem"
              active-class="active"
            >
              Files
            </router-link>
            <router-link
              v-if="authStore.hasPermission('cluster:read')"
              to="/cluster"
              class="nav-subitem"
              active-class="active"
            >
              Cluster
              <span v-if="clusterPeers.length" class="nav-count">{{ clusterPeers.length + 1 }}</span>
            </router-link>
            <router-link
              v-if="authStore.hasPermission('infrastructure:read')"
              to="/infrastructure"
              class="nav-subitem"
              active-class="active"
            >
              Infrastructure
              <span class="nav-count">{{ stats.infrastructure }}</span>
            </router-link>
            <router-link
              v-if="authStore.hasPermission('system:read')"
              to="/system-ports"
              class="nav-subitem"
              active-class="active"
            >
              Ports
              <span class="nav-count">{{ stats.ports }}</span>
            </router-link>
            <router-link
              v-if="authStore.hasPermission('system:read')"
              to="/services"
              class="nav-subitem"
              active-class="active"
            >
              Services
              <span class="nav-count">{{ stats.services }}</span>
            </router-link>
            <router-link
              v-if="authStore.hasPermission('scheduler:read')"
              to="/cron-jobs"
              class="nav-subitem"
              active-class="active"
            >
              Cron Jobs
            </router-link>
          </div>
        </div>

        <div v-if="authStore.hasPermission('databases:read')" class="nav-group">
          <div class="nav-group-header" @click="toggleGroup('databases')">
            <Icon name="database" :size="17" />
            <span v-if="!sidebarCollapsed">Databases</span>
            <Icon
              v-if="!sidebarCollapsed"
              class="chevron"
              :size="14"
              :name="expandedGroups.databases ? 'chevron-down' : 'chevron-right'"
            />
          </div>
          <div v-show="expandedGroups.databases && !sidebarCollapsed" class="nav-group-items">
            <router-link to="/databases" class="nav-subitem" active-class="active">
              Servers
              <span class="nav-count">{{ stats.databases }}</span>
            </router-link>
          </div>
        </div>

        <div v-if="authStore.hasPermission('dns:read')" class="nav-group">
          <div class="nav-group-header" @click="toggleGroup('dns')">
            <Icon name="globe" :size="17" />
            <span v-if="!sidebarCollapsed">DNS</span>
            <Icon
              v-if="!sidebarCollapsed"
              class="chevron"
              :size="14"
              :name="expandedGroups.dns ? 'chevron-down' : 'chevron-right'"
            />
          </div>
          <div v-show="expandedGroups.dns && !sidebarCollapsed" class="nav-group-items">
            <router-link to="/dns/zones" class="nav-subitem" active-class="active"> Zones </router-link>
            <router-link to="/dns/external" class="nav-subitem" active-class="active"> External Providers </router-link>
          </div>
        </div>

        <div
          v-if="
            authStore.hasPermission('deployments:read') ||
            authStore.hasPermission('security:read') ||
            authStore.hasPermission('certificates:read')
          "
          class="nav-group"
        >
          <div class="nav-group-header" @click="toggleGroup('security')">
            <Icon name="activity" :size="17" />
            <span v-if="!sidebarCollapsed">Monitoring & Security</span>
            <Icon
              v-if="!sidebarCollapsed"
              class="chevron"
              :size="14"
              :name="expandedGroups.security ? 'chevron-down' : 'chevron-right'"
            />
          </div>
          <div v-show="expandedGroups.security && !sidebarCollapsed" class="nav-group-items">
            <router-link
              v-if="authStore.hasPermission('deployments:read')"
              to="/observability"
              class="nav-subitem"
              active-class="active"
            >
              Observability
            </router-link>
            <router-link
              v-if="authStore.hasPermission('security:read')"
              to="/security"
              class="nav-subitem"
              active-class="active"
            >
              Security
            </router-link>
            <router-link
              v-if="authStore.hasPermission('certificates:read')"
              to="/certificates"
              class="nav-subitem"
              active-class="active"
            >
              Certificates
              <span class="nav-count">{{ stats.certificates }}</span>
            </router-link>
          </div>
        </div>

        <div v-if="authStore.hasPermission('templates:read')" class="nav-group">
          <div class="nav-group-header" @click="toggleGroup('extensions')">
            <Icon name="layout-grid" :size="17" />
            <span v-if="!sidebarCollapsed">Apps</span>
            <Icon
              v-if="!sidebarCollapsed"
              class="chevron"
              :size="14"
              :name="expandedGroups.extensions ? 'chevron-down' : 'chevron-right'"
            />
          </div>
          <div v-show="expandedGroups.extensions && !sidebarCollapsed" class="nav-group-items">
            <router-link to="/apps" class="nav-subitem" active-class="active">
              Installed Apps
              <span class="nav-count">{{ stats.apps }}</span>
            </router-link>
            <router-link to="/marketplace" class="nav-subitem" active-class="active"> Marketplace </router-link>
          </div>
        </div>

        <div
          v-if="
            authStore.hasPermission('settings:read') ||
            authStore.hasPermission('users:read') ||
            authStore.hasPermission('apikeys:read')
          "
          class="nav-group"
        >
          <div class="nav-group-header" @click="toggleGroup('admin')">
            <Icon name="sliders-horizontal" :size="17" />
            <span v-if="!sidebarCollapsed">Administration</span>
            <Icon
              v-if="!sidebarCollapsed"
              class="chevron"
              :size="14"
              :name="expandedGroups.admin ? 'chevron-down' : 'chevron-right'"
            />
          </div>
          <div v-show="expandedGroups.admin && !sidebarCollapsed" class="nav-group-items">
            <router-link
              v-if="authStore.hasPermission('settings:read')"
              to="/settings"
              class="nav-subitem"
              active-class="active"
            >
              Settings
            </router-link>
            <router-link
              v-if="authStore.hasPermission('users:read')"
              to="/users"
              class="nav-subitem"
              active-class="active"
            >
              Users
            </router-link>
            <router-link
              v-if="authStore.hasPermission('apikeys:read')"
              to="/api-keys"
              class="nav-subitem"
              active-class="active"
            >
              API Keys
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
        <div v-if="!sidebarCollapsed && authStore.currentUser" class="user-info">
          <div class="user-avatar">
            <Icon name="user" :size="16" />
          </div>
          <div class="user-details">
            <span class="user-name">{{ authStore.currentUser.username }}</span>
            <span class="user-role">{{ authStore.currentUser.role }}</span>
          </div>
        </div>
        <div class="agent-status">
          <span class="status-dot" :class="{ online: agentOnline }" />
          <span v-if="!sidebarCollapsed" class="status-text">{{ agentOnline ? "Connected" : "Disconnected" }}</span>
        </div>
        <button v-if="!sidebarCollapsed" class="logout-btn" @click="handleLogout">
          <Icon name="log-out" :size="16" />
          Sign Out
        </button>
        <button class="collapse-btn" @click="sidebarCollapsed = !sidebarCollapsed">
          <Icon :name="sidebarCollapsed ? 'chevrons-right' : 'chevrons-left'" :size="16" />
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
              <Icon v-if="idx < breadcrumbs.length - 1" name="chevron-right" :size="13" />
            </span>
          </div>
          <h1 class="page-title">
            {{ currentPageTitle }}
          </h1>
        </div>
        <GlobalSearch />
        <div class="header-right">
          <div class="quick-stats">
            <div class="stat-item running">
              <Icon name="play" :size="13" />
              <span>{{ stats.runningContainers }} Running</span>
            </div>
            <div class="stat-item stopped">
              <Icon name="square" :size="13" />
              <span>{{ stats.stoppedContainers }} Stopped</span>
            </div>
          </div>
          <button
            class="header-btn"
            :title="theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'"
            @click="toggleTheme"
          >
            <Icon :name="theme === 'dark' ? 'sun' : 'moon'" :size="16" />
          </button>
          <button class="header-btn" :disabled="isRefreshing" @click="refreshAll">
            <Icon name="refresh-cw" :spin="isRefreshing" :size="16" />
          </button>
        </div>
      </header>

      <div v-if="!statsStore.agentCompatible && !statsStore.versionWarningDismissed" class="version-warning">
        <Icon name="triangle-alert" :size="16" />
        <span>{{ statsStore.agentCompatibilityMessage }}</span>
        <span class="version-details">UI v{{ uiVersion }} / Agent v{{ statsStore.agentVersion }}</span>
        <button v-if="statsStore.agentDevBuild" class="dismiss-btn" @click="statsStore.versionWarningDismissed = true">
          <Icon name="x" :size="16" />
        </button>
      </div>

      <div class="content-area">
        <router-view />
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useStatsStore } from "@/stores/stats";
import { useAuthStore } from "@/stores/auth";
import { useAIStore } from "@/stores/ai";
import { clusterApi, type ClusterPeer } from "@/services/api";
import Logo from "@/components/base/Logo.vue";
import Icon from "@/components/base/Icon.vue";
import GlobalSearch from "@/components/GlobalSearch.vue";
import { useTheme } from "@/composables/useTheme";

const { theme, toggleTheme } = useTheme();

const route = useRoute();
const router = useRouter();
const statsStore = useStatsStore();
const authStore = useAuthStore();
const aiStore = useAIStore();

const uiVersion = __APP_VERSION__;
const sidebarCollapsed = ref(false);
const isRefreshing = ref(false);
const envDropdownOpen = ref(false);
const currentServerName = ref("Local Server");
const clusterPeers = ref<ClusterPeer[]>([]);

const expandedGroups = reactive({
  stacks: true,
  docker: true,
  system: false,
  databases: false,
  dns: false,
  security: false,
  extensions: false,
  admin: false,
});

const agentOnline = computed(() => statsStore.agentOnline);

const stats = computed(() => ({
  deployments: statsStore.deployments.total,
  containers: statsStore.containers.total,
  runningContainers: statsStore.containers.running,
  stoppedContainers: statsStore.containers.stopped,
  images: statsStore.docker.images,
  volumes: statsStore.docker.volumes,
  networks: statsStore.docker.networks,
  ports: statsStore.system.ports,
  dockerPorts: statsStore.docker.ports,
  services: statsStore.system.services,
  infrastructure: statsStore.system.infrastructure,
  databases: statsStore.system.databases,
  certificates: statsStore.system.certificates,
  apps: statsStore.system.apps,
  cpuUsage: statsStore.resources.cpu,
  memoryUsage: statsStore.resources.memory,
}));

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
    observability: "Observability",
    deployments: "Deployments",
    "deployment-detail": "Deployment Details",
    containers: "Containers",
    images: "Images",
    volumes: "Volumes",
    networks: "Networks",
    "docker-ports": "Port Mappings",
    infrastructure: "Infrastructure",
    "system-ports": "System Ports",
    services: "System Services",
    "cron-jobs": "Cron Jobs",
    "server-info": "Server Info",
    "system-terminal": "System Terminal",
    "system-files": "System Files",
    cluster: "Cluster",
    databases: "Database Servers",
    security: "Security & Monitoring",
    certificates: "SSL Certificates",
    "dns-zones": "DNS Zones",
    "dns-external": "External DNS Providers",
    apps: "Installed Apps",
    templates: "Templates",
    marketplace: "App Marketplace",
    settings: "Settings",
    users: "Users",
    "api-keys": "API Keys",
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
  } else if (
    [
      "infrastructure",
      "system-ports",
      "services",
      "cron-jobs",
      "server-info",
      "system-terminal",
      "system-files",
      "cluster",
    ].includes(routeName)
  ) {
    crumbs.push({ label: "System", path: "" });
    crumbs.push({ label: currentPageTitle.value, path: "" });
  } else if (routeName === "databases") {
    crumbs.push({ label: "Databases", path: "" });
    crumbs.push({ label: "Servers", path: "" });
  } else if (routeName === "security") {
    crumbs.push({ label: "Security", path: "" });
    crumbs.push({ label: "Security & Monitoring", path: "" });
  } else if (routeName === "certificates") {
    crumbs.push({ label: "Security", path: "" });
    crumbs.push({ label: "Certificates", path: "" });
  } else if (routeName === "dns-zones") {
    crumbs.push({ label: "DNS", path: "" });
    crumbs.push({ label: "Zones", path: "" });
  } else if (routeName === "dns-external") {
    crumbs.push({ label: "DNS", path: "" });
    crumbs.push({ label: "External Providers", path: "" });
  } else if (["apps", "marketplace"].includes(routeName)) {
    crumbs.push({ label: "Apps", path: "" });
    crumbs.push({ label: currentPageTitle.value, path: "" });
  } else if (["settings", "users", "api-keys"].includes(routeName)) {
    crumbs.push({ label: "Administration", path: "" });
    crumbs.push({ label: currentPageTitle.value, path: "" });
  } else if (routeName !== "home") {
    crumbs.push({ label: currentPageTitle.value, path: "" });
  }

  return crumbs;
});

const refreshAll = async () => {
  if (isRefreshing.value) return;
  isRefreshing.value = true;
  try {
    await statsStore.fetchAll();
  } finally {
    setTimeout(() => {
      isRefreshing.value = false;
    }, 500);
  }
};

const handleLogout = () => {
  authStore.logout();
  router.push("/login");
};

const fetchClusterInfo = async () => {
  try {
    const res = await clusterApi.getStatus();
    if (res.data.enabled && res.data.server_name) {
      currentServerName.value = res.data.server_name;
      const peersRes = await clusterApi.listPeers();
      clusterPeers.value = peersRes.data.peers || [];
    }
  } catch {
    // cluster not available
  }
};

onMounted(() => {
  statsStore.fetchAll();
  authStore.fetchCurrentUser();
  fetchClusterInfo();
  aiStore.fetchStatus();
  setInterval(() => statsStore.fetchAll(), 15000);
});
</script>

<style scoped>
.dashboard-layout {
  display: flex;
  min-height: 100vh;
}

.sidebar {
  width: 260px;
  background: var(--sidebar-bg);
  color: var(--sidebar-text-hover);
  border-right: 1px solid var(--border);
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
  border-radius: var(--radius-sm);
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
  border-radius: var(--radius-sm);
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

.env-dropdown {
  margin-top: 0.375rem;
  background: var(--sidebar-surface);
  border-radius: var(--radius-sm);
  border: 1px solid rgba(255, 255, 255, 0.1);
  overflow: hidden;
}

.env-option {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.625rem;
  cursor: pointer;
  transition: background 0.15s;
  color: var(--sidebar-text);
  font-size: 0.8125rem;
  text-decoration: none;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}

.env-option:last-child {
  border-bottom: none;
}

.env-option:hover {
  background: rgba(255, 255, 255, 0.08);
  color: var(--sidebar-text-hover);
}

.env-option.active {
  color: var(--sidebar-text-active);
}

.env-option.active .pi-check {
  margin-left: auto;
  font-size: 0.6875rem;
}

.env-option i:first-child {
  font-size: 0.8125rem;
  width: 16px;
  text-align: center;
}

.env-option-info {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-width: 0;
}

.env-option-name {
  font-size: 0.8125rem;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.env-option-hint {
  font-size: 0.625rem;
  color: #64748b;
}

.env-manage {
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  color: #64748b;
}

.env-manage:hover {
  color: var(--sidebar-text);
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
  color: var(--sidebar-text);
  text-decoration: none;
  transition: all 0.2s;
  border-left: 3px solid transparent;
  white-space: nowrap;
}

.nav-item:hover {
  background: rgba(255, 255, 255, 0.05);
  color: var(--sidebar-text-hover);
}

.nav-item.active {
  background: rgba(59, 130, 246, 0.15);
  color: var(--sidebar-text-active);
  border-left-color: var(--accent);
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
  color: var(--sidebar-text);
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
  color: var(--sidebar-text);
  text-decoration: none;
  font-size: 0.875rem;
  transition: all 0.2s;
  border-left: 3px solid transparent;
}

.nav-subitem:hover {
  background: rgba(255, 255, 255, 0.05);
  color: var(--sidebar-text-hover);
}

.nav-subitem.active {
  background: rgba(59, 130, 246, 0.1);
  color: var(--sidebar-text-active);
  border-left-color: var(--accent);
}

.nav-count {
  background: rgba(255, 255, 255, 0.1);
  padding: 0.125rem 0.5rem;
  border-radius: 9999px;
  font-size: 0.6875rem;
  font-weight: 600;
  margin-left: auto;
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
  color: var(--sidebar-text);
  margin-bottom: 0.25rem;
}

.resource-bar {
  height: 4px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: var(--radius-xs);
  overflow: hidden;
}

.resource-fill {
  height: 100%;
  border-radius: var(--radius-xs);
  transition: width 0.3s ease;
}

.resource-fill.normal {
  background: var(--c-green);
}

.resource-fill.warning {
  background: var(--c-amber);
}

.resource-fill.critical {
  background: var(--c-red);
}

.user-info {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 6px;
  margin-bottom: 0.75rem;
}

.user-avatar {
  width: 32px;
  height: 32px;
  background: var(--accent);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.user-avatar i {
  font-size: 0.875rem;
  color: var(--sidebar-text-hover);
}

.user-details {
  display: flex;
  flex-direction: column;
}

.user-name {
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--sidebar-text-hover);
}

.user-role {
  font-size: 0.75rem;
  color: var(--sidebar-text);
  text-transform: capitalize;
}

.agent-status {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.75rem;
  color: var(--sidebar-text);
  margin-bottom: 0.5rem;
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--c-red);
  flex-shrink: 0;
}

.status-dot.online {
  background: var(--c-green);
  box-shadow: 0 0 8px rgba(34, 197, 94, 0.5);
}

.logout-btn {
  width: 100%;
  padding: 0.5rem;
  background: rgba(239, 68, 68, 0.1);
  border: none;
  border-radius: var(--radius-sm);
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
  border-radius: var(--radius-sm);
  color: var(--sidebar-text);
  cursor: pointer;
  transition: all 0.2s;
}

.collapse-btn:hover {
  background: rgba(255, 255, 255, 0.1);
  color: var(--sidebar-text-hover);
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
  background: var(--surface);
  padding: 1rem 1.5rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid var(--border);
  box-shadow: var(--shadow-xs);
  position: sticky;
  top: 0;
  z-index: 50;
}

.breadcrumb {
  font-size: 0.75rem;
  color: var(--text-muted);
  margin-bottom: 0.25rem;
}

.breadcrumb a {
  color: var(--accent);
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
  color: var(--text);
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
  border-radius: var(--radius-sm);
  font-size: 0.75rem;
  font-weight: 500;
}

.stat-item.running {
  background: rgba(34, 197, 94, 0.12);
  color: var(--c-green);
}

.stat-item.stopped {
  background: rgba(245, 158, 11, 0.14);
  color: var(--c-amber);
}

.stat-item i {
  font-size: 0.625rem;
}

.header-btn {
  width: 36px;
  height: 36px;
  background: var(--surface-sunken);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  color: var(--text-muted);
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.header-btn:hover {
  background: var(--surface-inset);
  color: var(--text);
}

.content-area {
  flex: 1;
  padding: 1.5rem;
  background: var(--app-bg);
}

.version-warning {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.5rem;
  background: var(--color-warning-50);
  border-bottom: 1px solid var(--color-warning-500);
  color: var(--color-warning-700);
  font-size: var(--text-sm);
}

.version-warning .pi {
  color: var(--color-warning-600);
}

.version-warning .version-details {
  margin-left: auto;
  font-size: var(--text-xs);
  color: var(--color-warning-600);
}

.version-warning .dismiss-btn {
  background: none;
  border: none;
  color: var(--color-warning-700);
  cursor: pointer;
  padding: 0.25rem;
  margin-left: 0.5rem;
  border-radius: var(--radius-sm);
}

.version-warning .dismiss-btn:hover {
  background: var(--color-warning-100);
}
</style>
