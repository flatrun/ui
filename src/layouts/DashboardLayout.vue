<template>
  <div class="dashboard-layout">
    <aside class="sidebar" :class="{ collapsed: sidebarCollapsed }">
      <div class="logo">
        <Logo :variant="sidebarCollapsed ? 'icon' : 'full'" size="md" link-to="/" />
      </div>

      <div v-if="!sidebarCollapsed" class="environment-selector">
        <div class="env-current" @click="envDropdownOpen = !envDropdownOpen">
          <i class="pi pi-server" />
          <span>{{ currentServerName }}</span>
          <i class="pi" :class="envDropdownOpen ? 'pi-chevron-up' : 'pi-chevron-down'" />
        </div>
        <div v-if="envDropdownOpen" class="env-dropdown">
          <div class="env-option active" @click="envDropdownOpen = false">
            <i class="pi pi-server" />
            <div class="env-option-info">
              <span class="env-option-name">{{ currentServerName }}</span>
              <span class="env-option-hint">Current server</span>
            </div>
            <i class="pi pi-check" />
          </div>
          <div v-for="peer in clusterPeers" :key="peer.id" class="env-option" @click="envDropdownOpen = false">
            <i class="pi pi-server" />
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
            <i class="pi pi-cog" />
            <span class="env-option-name">Manage Cluster</span>
          </router-link>
        </div>
      </div>

      <nav class="nav-menu">
        <router-link to="/" class="nav-item" exact-active-class="active">
          <i class="pi pi-th-large" />
          <span v-if="!sidebarCollapsed">Dashboard</span>
        </router-link>

        <div v-if="authStore.hasPermission('deployments:read')" class="nav-group">
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
            <i class="pi pi-box" />
            <span v-if="!sidebarCollapsed">Docker</span>
            <i
              v-if="!sidebarCollapsed"
              class="pi chevron"
              :class="expandedGroups.docker ? 'pi-chevron-down' : 'pi-chevron-right'"
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
            <i class="pi pi-server" />
            <span v-if="!sidebarCollapsed">System</span>
            <i
              v-if="!sidebarCollapsed"
              class="pi chevron"
              :class="expandedGroups.system ? 'pi-chevron-down' : 'pi-chevron-right'"
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
              Servers
              <span class="nav-count">{{ stats.databases }}</span>
            </router-link>
          </div>
        </div>

        <div v-if="authStore.hasPermission('dns:read')" class="nav-group">
          <div class="nav-group-header" @click="toggleGroup('dns')">
            <i class="pi pi-globe" />
            <span v-if="!sidebarCollapsed">DNS</span>
            <i
              v-if="!sidebarCollapsed"
              class="pi chevron"
              :class="expandedGroups.dns ? 'pi-chevron-down' : 'pi-chevron-right'"
            />
          </div>
          <div v-show="expandedGroups.dns && !sidebarCollapsed" class="nav-group-items">
            <router-link to="/dns/zones" class="nav-subitem" active-class="active"> Zones </router-link>
            <router-link to="/dns/external" class="nav-subitem" active-class="active"> External Providers </router-link>
          </div>
        </div>

        <div
          v-if="authStore.hasPermission('security:read') || authStore.hasPermission('certificates:read')"
          class="nav-group"
        >
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
            <router-link
              v-if="authStore.hasPermission('security:read')"
              to="/security"
              class="nav-subitem"
              active-class="active"
            >
              Security & Monitoring
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
            <i class="pi pi-sliders-h" />
            <span v-if="!sidebarCollapsed">Administration</span>
            <i
              v-if="!sidebarCollapsed"
              class="pi chevron"
              :class="expandedGroups.admin ? 'pi-chevron-down' : 'pi-chevron-right'"
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
            <i class="pi pi-user" />
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
        <button v-if="aiStore.status?.enabled" class="ai-ask-launcher" @click="openGlobalAssist">
          <Sparkles :size="15" />
          <span>Ask AI about this instance</span>
        </button>
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
          <button class="header-btn" :disabled="isRefreshing" @click="refreshAll">
            <i :class="isRefreshing ? 'pi pi-spinner pi-spin' : 'pi pi-refresh'" />
          </button>
        </div>
      </header>

      <div v-if="!statsStore.agentCompatible && !statsStore.versionWarningDismissed" class="version-warning">
        <i class="pi pi-exclamation-triangle" />
        <span>{{ statsStore.agentCompatibilityMessage }}</span>
        <span class="version-details">UI v{{ uiVersion }} / Agent v{{ statsStore.agentVersion }}</span>
        <button v-if="statsStore.agentDevBuild" class="dismiss-btn" @click="statsStore.versionWarningDismissed = true">
          <i class="pi pi-times" />
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
import { Sparkles } from "lucide-vue-next";
import { useStatsStore } from "@/stores/stats";
import { useAuthStore } from "@/stores/auth";
import { useAIStore } from "@/stores/ai";
import { useAssistStore } from "@/stores/assist";
import { clusterApi, type ClusterPeer } from "@/services/api";
import Logo from "@/components/base/Logo.vue";

const route = useRoute();
const router = useRouter();
const statsStore = useStatsStore();
const authStore = useAuthStore();
const aiStore = useAIStore();
const assistStore = useAssistStore();

const openGlobalAssist = () => {
  assistStore.open({ scope: "system", subject: "this instance" });
};
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
  background: #1e293b;
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
  color: #94a3b8;
  font-size: 0.8125rem;
  text-decoration: none;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}

.env-option:last-child {
  border-bottom: none;
}

.env-option:hover {
  background: rgba(255, 255, 255, 0.08);
  color: white;
}

.env-option.active {
  color: #60a5fa;
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
  color: #94a3b8;
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
  color: #94a3b8;
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
  background: #22c55e;
}

.resource-fill.warning {
  background: #f59e0b;
}

.resource-fill.critical {
  background: #ef4444;
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
  background: #3b82f6;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.user-avatar i {
  font-size: 0.875rem;
  color: white;
}

.user-details {
  display: flex;
  flex-direction: column;
}

.user-name {
  font-size: 0.875rem;
  font-weight: 500;
  color: white;
}

.user-role {
  font-size: 0.75rem;
  color: #94a3b8;
  text-transform: capitalize;
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

.ai-ask-launcher {
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  padding: 0.45rem 1rem;
  border: 1px solid #dbeafe;
  border-radius: 999px;
  background: linear-gradient(180deg, #eff6ff, #f5f9ff);
  color: #2563eb;
  font-size: 0.82rem;
  font-weight: 500;
  cursor: pointer;
  transition:
    box-shadow 0.15s ease,
    border-color 0.15s ease;
}

.ai-ask-launcher:hover {
  border-color: #bfdbfe;
  box-shadow: 0 2px 8px rgba(37, 99, 235, 0.15);
}

@media (max-width: 900px) {
  .ai-ask-launcher span {
    display: none;
  }
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
  border-radius: var(--radius-sm);
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
  border-radius: var(--radius-md);
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
