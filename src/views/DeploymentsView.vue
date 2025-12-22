<template>
  <div class="deployments-view">
    <DataTable
      :items="deployments"
      :columns="columns"
      :loading="loading"
      :searchable="true"
      search-placeholder="Search deployments..."
      :search-fields="['name', 'path', 'status']"
      item-key="name"
      :empty-icon="Inbox"
      empty-title="No Deployments Found"
      empty-text="Create your first deployment to get started"
      loading-text="Loading deployments..."
      :default-page-size="12"
      :toggleable="true"
      default-view-mode="grid"
    >
      <template #actions>
        <button class="btn btn-primary" @click="showNewDeploymentModal = true">
          <Plus :size="16" />
          New Deployment
        </button>
        <button class="btn btn-secondary" :disabled="loading" @click="refreshDeployments">
          <RefreshCw :size="16" :class="{ spinning: loading }" />
          Refresh
        </button>
      </template>

      <template #cell-status="{ item }">
        <span class="status-indicator" :class="item.status" :title="item.status" />
      </template>

      <template #cell-name="{ item }">
        <div class="deployment-info clickable" @click="goToDeployment(item.name)">
          <span class="deployment-name">{{ item.name }}</span>
          <span v-if="item.metadata?.networking?.domain" class="deployment-domain">
            {{ item.metadata.networking.domain }}
          </span>
          <span v-else-if="getMainImage(item)" class="deployment-image">
            {{ getMainImage(item) }}
          </span>
        </div>
      </template>

      <template #cell-services="{ item }">
        <div class="table-services">
          <span
            v-for="service in (item.services || []).slice(0, 3)"
            :key="service.name"
            class="table-service-tag"
            :class="getServiceClass(service)"
          >
            {{ service.name }}
          </span>
          <span v-if="(item.services || []).length > 3" class="table-service-tag more">
            +{{ item.services.length - 3 }}
          </span>
          <span v-if="!item.services?.length" class="no-services"> — </span>
        </div>
      </template>

      <template #cell-ports="{ item }">
        <div class="table-ports">
          <a
            v-for="mapping in getPortMappings(item)"
            :key="mapping.host"
            :href="`http://localhost:${mapping.host}`"
            target="_blank"
            class="table-port-link"
            @click.stop
          >
            :{{ mapping.host }}
          </a>
          <span v-if="!getPortMappings(item).length" class="no-ports"> — </span>
        </div>
      </template>

      <template #cell-updated="{ item }">
        <span class="updated-time">{{ formatRelativeTime(item.updated_at) }}</span>
      </template>

      <template #cell-actions="{ item }">
        <div class="action-buttons">
          <button
            class="action-btn start"
            title="Start"
            :disabled="item.status === 'running'"
            @click.stop="handleOperation('start', item.name)"
          >
            <Play :size="14" />
          </button>
          <button
            class="action-btn stop"
            title="Stop"
            :disabled="item.status === 'stopped'"
            @click.stop="handleOperation('stop', item.name)"
          >
            <Square :size="14" />
          </button>
          <button
            class="action-btn restart"
            title="Restart"
            :disabled="item.status === 'stopped'"
            @click.stop="handleOperation('restart', item.name)"
          >
            <RotateCw :size="14" />
          </button>
          <button class="action-btn logs" title="Logs" @click.stop="viewLogs(item.name)">
            <FileText :size="14" />
          </button>
        </div>
      </template>

      <template #grid="{ items }">
        <div class="deployments-grid">
          <DeploymentCard
            v-for="deployment in items"
            :key="deployment.name"
            :name="deployment.name"
            :status="deployment.status"
            :logo="getDeploymentLogo(deployment)"
            :icon="getDeploymentIcon(deployment)"
            :icon-class="getDeploymentIconClass(deployment)"
            :clickable="true"
            @click="goToDeployment(deployment.name)"
          >
            <!-- Domain Link -->
            <div
              v-if="deployment.metadata?.networking?.expose && deployment.metadata?.networking?.domain"
              class="domain-link"
              @click.stop
            >
              <Globe :size="14" />
              <a
                :href="
                  (deployment.metadata?.ssl?.enabled ? 'https://' : 'http://') + deployment.metadata.networking.domain
                "
                target="_blank"
                class="app-link"
              >
                {{ deployment.metadata.networking.domain }}
                <ExternalLink :size="12" />
              </a>
              <span v-if="deployment.metadata?.ssl?.enabled" class="ssl-badge"> SSL </span>
            </div>

            <!-- Port Links (shown when no domain but has port mappings) -->
            <div v-else-if="getPortMappings(deployment).length" class="port-links" @click.stop>
              <a
                v-for="mapping in getPortMappings(deployment)"
                :key="mapping.host"
                :href="`http://localhost:${mapping.host}`"
                target="_blank"
                class="port-link"
              >
                <Plug :size="14" />
                <span class="port-url">localhost:{{ mapping.host }}</span>
                <span class="port-mapping">{{ mapping.host }}:{{ mapping.container }}</span>
                <ExternalLink :size="12" />
              </a>
            </div>

            <!-- Image Info (shown when no domain and no ports) -->
            <div v-else-if="getMainImage(deployment)" class="image-info">
              <Container :size="14" />
              <span class="image-name">{{ getMainImage(deployment) }}</span>
              <span v-if="getImageVersion(deployment)" class="image-version">
                {{ getImageVersion(deployment) }}
              </span>
            </div>

            <!-- Service Tags -->
            <div v-if="deployment.services?.length" class="service-tags">
              <span
                v-for="service in deployment.services.slice(0, 4)"
                :key="service.name"
                class="service-tag"
                :class="getServiceClass(service)"
              >
                <span class="service-dot" :class="service.status" />
                {{ service.name }}
              </span>
              <span v-if="deployment.services.length > 4" class="service-tag more">
                +{{ deployment.services.length - 4 }}
              </span>
            </div>

            <!-- Info Pills -->
            <div class="info-pills">
              <div v-if="getMainImage(deployment)" class="info-pill image">
                <Layers :size="12" />
                {{ getMainImage(deployment) }}
              </div>
              <div v-if="hasDatabase(deployment)" class="info-pill database">
                <Database :size="12" />
                {{ getDatabaseType(deployment) }}
              </div>
              <div v-if="getNetworks(deployment).length" class="info-pill network">
                <Network :size="12" />
                {{ getNetworks(deployment)[0] }}
              </div>
              <div v-for="mapping in getPortMappings(deployment)" :key="mapping.host" class="info-pill port">
                <Plug :size="12" />
                {{ mapping.host }}:{{ mapping.container }}
              </div>
              <div v-if="deployment.metadata?.type" class="info-pill type">
                <Box :size="12" />
                {{ deployment.metadata.type }}
              </div>
            </div>

            <!-- Card Meta -->
            <div class="card-meta">
              <div class="meta-item">
                <Heart :size="12" />
                <span class="meta-value health">
                  {{ getHealthyCount(deployment).healthy }}/{{ getHealthyCount(deployment).total }}
                </span>
              </div>
              <div class="meta-item">
                <Layers :size="12" />
                <span class="meta-value">{{ deployment.services?.length || 0 }} services</span>
              </div>
              <div class="meta-item">
                <Clock :size="12" />
                <span class="meta-value">{{ formatRelativeTime(deployment.updated_at) }}</span>
              </div>
            </div>

            <template #footer>
              <button
                class="icon-btn start"
                title="Start"
                :disabled="deployment.status === 'running'"
                @click="handleOperation('start', deployment.name)"
              >
                <Play :size="14" />
              </button>
              <button
                class="icon-btn stop"
                title="Stop"
                :disabled="deployment.status === 'stopped'"
                @click="handleOperation('stop', deployment.name)"
              >
                <Square :size="14" />
              </button>
              <button
                class="icon-btn restart"
                title="Restart"
                :disabled="deployment.status === 'stopped'"
                @click="handleOperation('restart', deployment.name)"
              >
                <RotateCw :size="14" />
              </button>
              <button class="icon-btn logs" title="Logs" @click="viewLogs(deployment.name)">
                <FileText :size="14" />
              </button>
              <button class="icon-btn settings" title="Settings" @click="goToDeployment(deployment.name)">
                <Settings :size="14" />
              </button>
            </template>
          </DeploymentCard>
        </div>
      </template>
    </DataTable>

    <OperationModal
      :visible="operationModal.visible"
      :operation="operationModal.operation"
      :deployment-name="operationModal.deploymentName"
      :output="operationModal.output"
      :is-running="operationModal.isRunning"
      :is-success="operationModal.isSuccess"
      @close="closeOperationModal"
    />

    <LogsModal
      :visible="logsModal.visible"
      :title="logsModal.deploymentName"
      :logs="logsModal.logs"
      @close="logsModal.visible = false"
    />

    <NewDeploymentModal
      :visible="showNewDeploymentModal"
      @close="showNewDeploymentModal = false"
      @created="onDeploymentCreated"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useRouter } from "vue-router";
import { deploymentsApi } from "@/services/api";
import { useNotificationsStore } from "@/stores/notifications";
import type { Deployment } from "@/types";
import DataTable from "@/components/DataTable.vue";
import DeploymentCard from "@/components/DeploymentCard.vue";
import OperationModal from "@/components/OperationModal.vue";
import LogsModal from "@/components/LogsModal.vue";
import NewDeploymentModal from "@/components/NewDeploymentModal.vue";
import {
  Plus,
  RefreshCw,
  Play,
  Square,
  RotateCw,
  FileText,
  Inbox,
  Settings,
  ExternalLink,
  Globe,
  Database,
  Network,
  Plug,
  Box,
  Container,
  Clock,
  Heart,
  Layers,
} from "lucide-vue-next";
import type { Service } from "@/types";

const router = useRouter();
const notifications = useNotificationsStore();
const deployments = ref<Deployment[]>([]);
const loading = ref(true);
const showNewDeploymentModal = ref(false);

const operationModal = ref({
  visible: false,
  operation: "start" as "start" | "stop" | "restart",
  deploymentName: "",
  output: "",
  isRunning: false,
  isSuccess: null as boolean | null,
});

const logsModal = ref({
  visible: false,
  deploymentName: "",
  logs: "",
});

const columns = [
  { key: "status", label: "", width: "40px" },
  { key: "name", label: "Deployment", sortable: true },
  { key: "services", label: "Services", width: "180px" },
  { key: "ports", label: "Ports", width: "140px" },
  { key: "updated", label: "Updated", sortable: true, width: "120px" },
  { key: "actions", label: "", width: "140px" },
];

const fetchDeployments = async () => {
  loading.value = true;
  try {
    const response = await deploymentsApi.list();
    deployments.value = response.data.deployments || [];
  } catch (e: any) {
    notifications.error("Failed to load deployments", e.message);
  } finally {
    loading.value = false;
  }
};

const refreshDeployments = () => {
  fetchDeployments();
  notifications.info("Refreshing", "Fetching latest deployment status");
};

const handleOperation = async (op: "start" | "stop" | "restart", name: string) => {
  operationModal.value = {
    visible: true,
    operation: op,
    deploymentName: name,
    output: "",
    isRunning: true,
    isSuccess: null,
  };

  try {
    let response;
    if (op === "start") {
      response = await deploymentsApi.start(name);
    } else if (op === "stop") {
      response = await deploymentsApi.stop(name);
    } else {
      response = await deploymentsApi.restart(name);
    }

    operationModal.value.output = response?.data?.output || "Operation completed";
    operationModal.value.isSuccess = true;
    operationModal.value.isRunning = false;

    notifications.success(`${op} successful`, `${name} ${op}ed successfully`);
    await fetchDeployments();
  } catch (e: any) {
    const errorMsg = e.response?.data?.output || e.response?.data?.error || e.message;
    operationModal.value.output = errorMsg;
    operationModal.value.isSuccess = false;
    operationModal.value.isRunning = false;

    notifications.error(`${op} failed`, errorMsg);
  }
};

const closeOperationModal = () => {
  operationModal.value.visible = false;
};

const viewLogs = async (name: string) => {
  logsModal.value = {
    visible: true,
    deploymentName: name,
    logs: "Loading...",
  };

  try {
    const response = await deploymentsApi.logs(name);
    logsModal.value.logs = response.data.logs || "No logs available";
  } catch (e: any) {
    logsModal.value.logs = `Error: ${e.message}`;
    notifications.error("Failed to load logs", e.message);
  }
};

const onDeploymentCreated = () => {
  showNewDeploymentModal.value = false;
  fetchDeployments();
  notifications.success("Deployment created", "New deployment folder created successfully");
};

const goToDeployment = (name: string) => {
  router.push(`/deployments/${name}`);
};

const getServiceClass = (service: Service) => {
  const image = service.image?.toLowerCase() || "";
  if (image.includes("mysql") || image.includes("mariadb")) return "database";
  if (image.includes("postgres")) return "database";
  if (image.includes("mongo")) return "database";
  if (image.includes("redis")) return "cache";
  if (image.includes("nginx") || image.includes("traefik")) return "proxy";
  return "app";
};

const appLogos: Record<string, string> = {
  wordpress: "https://cdn.simpleicons.org/wordpress/ffffff",
  node: "https://cdn.simpleicons.org/nodedotjs/ffffff",
  ghost: "https://cdn.simpleicons.org/ghost/ffffff",
  nextcloud: "https://cdn.simpleicons.org/nextcloud/ffffff",
  grafana: "https://cdn.simpleicons.org/grafana/ffffff",
  prometheus: "https://cdn.simpleicons.org/prometheus/ffffff",
  redis: "https://cdn.simpleicons.org/redis/ffffff",
  postgres: "https://cdn.simpleicons.org/postgresql/ffffff",
  mysql: "https://cdn.simpleicons.org/mysql/ffffff",
  mariadb: "https://cdn.simpleicons.org/mariadb/ffffff",
  mongo: "https://cdn.simpleicons.org/mongodb/ffffff",
  nginx: "https://cdn.simpleicons.org/nginx/ffffff",
  python: "https://cdn.simpleicons.org/python/ffffff",
  django: "https://cdn.simpleicons.org/django/ffffff",
  php: "https://cdn.simpleicons.org/php/ffffff",
  laravel: "https://cdn.simpleicons.org/laravel/ffffff",
  astro: "https://cdn.simpleicons.org/astro/ffffff",
  nextjs: "https://cdn.simpleicons.org/nextdotjs/ffffff",
  html: "https://cdn.simpleicons.org/html5/ffffff",
};

const getDeploymentLogo = (deployment: Deployment) => {
  const mainImage = getMainImage(deployment)?.toLowerCase() || "";
  const firstServiceImage = deployment.services?.[0]?.image?.toLowerCase() || "";
  const name = deployment.name.toLowerCase();

  // Check name first for custom app logos
  if (appLogos[name]) {
    return appLogos[name];
  }

  // Then check images
  for (const [key, url] of Object.entries(appLogos)) {
    if (mainImage.includes(key) || firstServiceImage.includes(key)) {
      return url;
    }
  }
  return undefined;
};

const getDeploymentIcon = (deployment: Deployment) => {
  const mainImage = getMainImage(deployment)?.toLowerCase() || "";
  const type = deployment.metadata?.type?.toLowerCase() || "";
  const firstServiceImage = deployment.services?.[0]?.image?.toLowerCase() || "";

  if (mainImage.includes("nginx") || type === "nginx") return "pi pi-server";
  if (mainImage.includes("node") || mainImage.includes("express")) return "pi pi-code";
  if (mainImage.includes("php") || mainImage.includes("laravel")) return "pi pi-code";
  if (mainImage.includes("python") || mainImage.includes("django") || mainImage.includes("flask")) return "pi pi-code";
  if (mainImage.includes("wordpress")) return "pi pi-pencil";
  if (mainImage.includes("ghost")) return "pi pi-pencil";
  if (mainImage.includes("nextcloud")) return "pi pi-cloud";
  if (mainImage.includes("grafana")) return "pi pi-chart-bar";
  if (mainImage.includes("prometheus")) return "pi pi-chart-line";
  if (firstServiceImage.includes("redis")) return "pi pi-bolt";
  if (
    firstServiceImage.includes("postgres") ||
    firstServiceImage.includes("mysql") ||
    firstServiceImage.includes("mongo")
  )
    return "pi pi-database";
  if (hasDatabase(deployment)) return "pi pi-database";
  return "pi pi-box";
};

const getDeploymentIconClass = (deployment: Deployment) => {
  const mainImage = getMainImage(deployment)?.toLowerCase() || "";
  const type = deployment.metadata?.type?.toLowerCase() || "";
  const firstServiceImage = deployment.services?.[0]?.image?.toLowerCase() || "";

  if (mainImage.includes("nginx") || type === "nginx") return "icon-nginx";
  if (mainImage.includes("node") || mainImage.includes("express")) return "icon-node";
  if (mainImage.includes("php") || mainImage.includes("laravel")) return "icon-php";
  if (mainImage.includes("python") || mainImage.includes("django") || mainImage.includes("flask")) return "icon-python";
  if (mainImage.includes("wordpress")) return "icon-wordpress";
  if (mainImage.includes("ghost")) return "icon-ghost";
  if (mainImage.includes("nextcloud")) return "icon-nextcloud";
  if (mainImage.includes("grafana")) return "icon-grafana";
  if (mainImage.includes("prometheus")) return "icon-prometheus";
  if (firstServiceImage.includes("redis")) return "icon-redis";
  if (
    firstServiceImage.includes("postgres") ||
    firstServiceImage.includes("mysql") ||
    firstServiceImage.includes("mongo")
  )
    return "icon-database";
  if (hasDatabase(deployment)) return "icon-database";
  return "icon-default";
};

const hasDatabase = (deployment: Deployment) => {
  return deployment.services?.some((s) => {
    const image = s.image?.toLowerCase() || "";
    return (
      image.includes("mysql") ||
      image.includes("mariadb") ||
      image.includes("postgres") ||
      image.includes("mongo") ||
      image.includes("redis")
    );
  });
};

const getDatabaseType = (deployment: Deployment) => {
  const dbService = deployment.services?.find((s) => {
    const image = s.image?.toLowerCase() || "";
    return (
      image.includes("mysql") || image.includes("mariadb") || image.includes("postgres") || image.includes("mongo")
    );
  });
  if (!dbService) return "";
  const image = dbService.image?.toLowerCase() || "";
  if (image.includes("mysql")) return "MySQL";
  if (image.includes("mariadb")) return "MariaDB";
  if (image.includes("postgres")) return "PostgreSQL";
  if (image.includes("mongo")) return "MongoDB";
  return "Database";
};

const getNetworks = (deployment: Deployment) => {
  const networks = new Set<string>();
  deployment.services?.forEach((s) => {
    s.networks?.forEach((n) => networks.add(n));
  });
  return Array.from(networks);
};

const getMainImage = (deployment: Deployment) => {
  const appService = deployment.services?.find((s) => {
    const image = s.image?.toLowerCase() || "";
    return (
      !image.includes("mysql") &&
      !image.includes("mariadb") &&
      !image.includes("postgres") &&
      !image.includes("mongo") &&
      !image.includes("redis")
    );
  });
  if (!appService?.image) return null;
  const image = appService.image;
  const parts = image.split("/");
  const nameWithTag = parts[parts.length - 1];
  return nameWithTag.split(":")[0];
};

const getImageVersion = (deployment: Deployment) => {
  const appService = deployment.services?.find((s) => {
    const image = s.image?.toLowerCase() || "";
    return (
      !image.includes("mysql") &&
      !image.includes("mariadb") &&
      !image.includes("postgres") &&
      !image.includes("mongo") &&
      !image.includes("redis")
    );
  });
  if (!appService?.image) return null;
  const parts = appService.image.split(":");
  return parts.length > 1 ? parts[1] : "latest";
};

const getHealthyCount = (deployment: Deployment) => {
  if (!deployment.services?.length) return { healthy: 0, total: 0 };
  const healthy = deployment.services.filter((s) => s.status === "running" || s.health === "healthy").length;
  return { healthy, total: deployment.services.length };
};

const getPortMappings = (deployment: Deployment) => {
  const mappings: { host: string; container: string }[] = [];
  const seen = new Set<string>();

  deployment.services?.forEach((s) => {
    s.ports?.forEach((p) => {
      let host: string | null = null;
      let container: string | null = null;

      // Format: "0.0.0.0:8080->80/tcp" (runtime)
      const runtimeMatch = p.match(/(?:[\d.]+:)?(\d+)->(\d+)/);
      if (runtimeMatch) {
        host = runtimeMatch[1];
        container = runtimeMatch[2];
      } else {
        // Format: "8080:80" (compose host:container)
        const composeMatch = p.match(/^(\d+):(\d+)$/);
        if (composeMatch) {
          host = composeMatch[1];
          container = composeMatch[2];
        } else {
          // Format: "80" (single port - same for host and container)
          const singleMatch = p.match(/^(\d+)$/);
          if (singleMatch) {
            host = singleMatch[1];
            container = singleMatch[1];
          }
        }
      }

      if (host && container) {
        const key = `${host}:${container}`;
        if (!seen.has(key)) {
          seen.add(key);
          mappings.push({ host, container });
        }
      }
    });
  });

  // Fallback to metadata container port
  if (mappings.length === 0 && deployment.metadata?.networking?.container_port) {
    const port = String(deployment.metadata.networking.container_port);
    mappings.push({ host: port, container: port });
  }

  return mappings.slice(0, 3);
};

const formatDate = (dateStr: string) => {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const formatRelativeTime = (dateStr: string) => {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return formatDate(dateStr);
};

onMounted(() => {
  fetchDeployments();
});
</script>

<style scoped>
.deployments-view {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.deployment-info {
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
}

.deployment-name {
  font-weight: var(--font-medium);
  color: var(--color-gray-900);
}

.deployment-status-text {
  font-size: var(--text-xs);
  color: var(--color-gray-400);
  text-transform: capitalize;
}

.deployment-info.clickable {
  cursor: pointer;
}

.deployment-info.clickable:hover .deployment-name {
  color: var(--color-primary-600);
}

.deployment-domain {
  font-size: var(--text-xs);
  color: var(--color-primary-500);
}

.deployment-image {
  font-size: var(--text-xs);
  color: var(--color-gray-500);
}

/* Table Services */
.table-services {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.table-service-tag {
  display: inline-flex;
  align-items: center;
  padding: 2px 8px;
  background: var(--color-gray-100);
  color: var(--color-gray-600);
  font-size: var(--text-xs);
  border-radius: var(--radius-full);
}

.table-service-tag.database {
  background: var(--color-info-50);
  color: var(--color-info-700);
}

.table-service-tag.cache {
  background: var(--color-warning-50);
  color: var(--color-warning-700);
}

.table-service-tag.proxy {
  background: var(--color-primary-50);
  color: var(--color-primary-700);
}

.table-service-tag.more {
  background: var(--color-gray-200);
  color: var(--color-gray-500);
}

.no-services,
.no-ports {
  color: var(--color-gray-400);
  font-size: var(--text-sm);
}

/* Table Ports */
.table-ports {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.table-port-link {
  display: inline-flex;
  padding: 2px 8px;
  background: var(--color-warning-50);
  color: var(--color-warning-700);
  font-size: var(--text-xs);
  font-weight: 500;
  border-radius: var(--radius-sm);
  text-decoration: none;
  transition: background 0.15s;
}

.table-port-link:hover {
  background: var(--color-warning-100);
}

.path-tag {
  font-size: var(--text-sm);
  background: var(--color-gray-100);
  padding: 0.25rem 0.5rem;
  border-radius: var(--radius-sm);
  color: var(--color-gray-600);
}

.updated-time {
  font-size: var(--text-base);
  color: var(--color-gray-500);
}

.action-buttons {
  display: flex;
  gap: 0.25rem;
}

.action-btn {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: all var(--transition-base);
  font-size: var(--text-base);
}

.action-btn.start {
  background: var(--color-success-50);
  color: var(--color-success-700);
}
.action-btn.start:hover {
  background: var(--color-success-100);
}

.action-btn.stop {
  background: var(--color-warning-50);
  color: var(--color-warning-700);
}
.action-btn.stop:hover {
  background: var(--color-warning-100);
}

.action-btn.restart {
  background: var(--color-info-50);
  color: var(--color-info-700);
}
.action-btn.restart:hover {
  background: var(--color-info-100);
}

.action-btn.logs {
  background: var(--color-gray-100);
  color: var(--color-gray-600);
}
.action-btn.logs:hover {
  background: var(--color-gray-200);
}

.action-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
.action-btn:disabled:hover {
  filter: none;
}

.deployments-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: var(--space-3);
  align-items: start;
}

.domain-link {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-3);
  background: var(--color-primary-50);
  border-radius: var(--radius-sm);
  margin-bottom: var(--space-4);
  color: var(--color-primary-600);
}

.domain-link .app-link {
  display: flex;
  align-items: center;
  gap: var(--space-1);
  color: var(--color-primary-600);
  font-weight: var(--font-medium);
  text-decoration: none;
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.domain-link .app-link:hover {
  text-decoration: underline;
}

.ssl-badge {
  padding: 2px 6px;
  background: var(--color-success-100);
  color: var(--color-success-700);
  font-size: var(--text-xs);
  font-weight: 600;
  border-radius: var(--radius-sm);
}

/* Port Links */
.port-links {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  margin-bottom: var(--space-4);
}

.port-link {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-3);
  background: var(--color-warning-50);
  border-radius: var(--radius-sm);
  color: var(--color-warning-700);
  text-decoration: none;
  transition: background 0.15s;
}

.port-link:hover {
  background: var(--color-warning-100);
}

.port-link .port-url {
  font-weight: var(--font-medium);
  flex: 1;
}

.port-link .port-mapping {
  font-size: var(--text-xs);
  padding: 2px 6px;
  background: var(--color-warning-100);
  border-radius: var(--radius-sm);
  color: var(--color-warning-600);
}

/* Service Tags */
.service-tags {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-1);
  margin-bottom: var(--space-3);
}

.service-tag {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  background: var(--color-gray-100);
  color: var(--color-gray-700);
  font-size: var(--text-xs);
  font-weight: 500;
  border-radius: var(--radius-full);
}

.service-tag.database {
  background: var(--color-info-50);
  color: var(--color-info-700);
}

.service-tag.cache {
  background: var(--color-warning-50);
  color: var(--color-warning-700);
}

.service-tag.proxy {
  background: var(--color-primary-50);
  color: var(--color-primary-700);
}

.service-tag.more {
  background: var(--color-gray-200);
  color: var(--color-gray-600);
}

.service-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--color-gray-400);
}

.service-dot.running {
  background: var(--color-success-500);
}

.service-dot.exited {
  background: var(--color-danger-500);
}

/* Info Pills */
.info-pills {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
  margin-bottom: var(--space-3);
}

.info-pill {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  background: var(--color-gray-50);
  border: 1px solid var(--color-gray-200);
  color: var(--color-gray-600);
  font-size: var(--text-xs);
  font-weight: 500;
  border-radius: var(--radius-sm);
}

.info-pill.database {
  background: var(--color-info-50);
  border-color: var(--color-info-200);
  color: var(--color-info-700);
}

.info-pill.network {
  background: var(--color-primary-50);
  border-color: var(--color-primary-200);
  color: var(--color-primary-700);
}

.info-pill.port {
  background: var(--color-warning-50);
  border-color: var(--color-warning-200);
  color: var(--color-warning-700);
}

.info-pill.type {
  background: var(--color-gray-100);
  border-color: var(--color-gray-300);
  color: var(--color-gray-700);
}

.info-pill.image {
  background: var(--color-success-50);
  border-color: var(--color-success-200);
  color: var(--color-success-700);
}

/* Image Info (fallback when no domain) */
.image-info {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-3);
  background: var(--color-gray-50);
  border-radius: var(--radius-sm);
  margin-bottom: var(--space-3);
  color: var(--color-gray-600);
}

.image-info .image-name {
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  color: var(--color-gray-700);
}

.image-info .image-version {
  font-size: var(--text-xs);
  padding: 2px 6px;
  background: var(--color-gray-200);
  border-radius: var(--radius-sm);
  color: var(--color-gray-600);
}

.card-meta {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-4);
  margin-top: auto;
  padding-top: var(--space-3);
  border-top: 1px solid var(--color-gray-100);
}

.meta-item {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  color: var(--color-gray-500);
}

.meta-label {
  font-size: var(--text-xs);
  color: var(--color-gray-500);
  text-transform: uppercase;
  font-weight: 500;
}

.meta-value {
  font-size: var(--text-xs);
  color: var(--color-gray-600);
  font-weight: var(--font-medium);
}

.meta-value.health {
  color: var(--color-success-600);
}

.meta-item.ssl .meta-value {
  color: var(--color-success-600);
}

.icon-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: all var(--transition-base);
  font-size: var(--text-base);
  flex: 1;
  padding: var(--space-2);
}

.icon-btn.start {
  background: var(--color-success-50);
  color: var(--color-success-700);
}
.icon-btn.start:hover {
  background: var(--color-success-100);
}

.icon-btn.stop {
  background: var(--color-warning-50);
  color: var(--color-warning-700);
}
.icon-btn.stop:hover {
  background: var(--color-warning-100);
}

.icon-btn.restart {
  background: var(--color-info-50);
  color: var(--color-info-700);
}
.icon-btn.restart:hover {
  background: var(--color-info-100);
}

.icon-btn.logs {
  background: var(--color-gray-100);
  color: var(--color-gray-600);
}
.icon-btn.logs:hover {
  background: var(--color-gray-200);
}

.icon-btn.settings {
  background: var(--color-primary-50);
  color: var(--color-primary-600);
}
.icon-btn.settings:hover {
  background: var(--color-primary-100);
}

.icon-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
.icon-btn:disabled:hover {
  filter: none;
}

.btn {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-4);
  border-radius: var(--radius-sm);
  font-weight: var(--font-medium);
  font-size: var(--text-md);
  cursor: pointer;
  transition: all var(--transition-base);
  border: none;
}

.btn-primary {
  background: var(--color-primary-500);
  color: white;
}

.btn-primary:hover {
  background: var(--color-primary-600);
}

.btn-secondary {
  background: white;
  border: 1px solid var(--color-gray-200);
  color: var(--color-gray-700);
}

.btn-secondary:hover:not(:disabled) {
  background: var(--color-gray-50);
}

.btn-secondary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.status-indicator {
  width: 10px;
  height: 10px;
  border-radius: var(--radius-full);
  background: var(--color-gray-500);
  display: inline-block;
}

.status-indicator.running {
  background: var(--color-success-500);
}

.status-indicator.stopped {
  background: var(--color-gray-400);
}

.status-indicator.error {
  background: var(--color-danger-500);
}

.spinning {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}
</style>
