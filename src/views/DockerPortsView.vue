<template>
  <div class="docker-ports-view">
    <DataTable
      :items="portMappings"
      :columns="columns"
      :loading="loading"
      :searchable="true"
      search-placeholder="Search port mappings..."
      :search-fields="['hostPort', 'containerPort', 'containerName', 'deployment']"
      item-key="id"
      :empty-icon="Plug"
      empty-title="No Port Mappings"
      empty-text="No Docker containers with port mappings found."
      loading-text="Loading port mappings..."
      :default-page-size="25"
    >
      <template #actions>
        <button class="btn btn-secondary" :disabled="loading" @click="fetchContainers">
          <RefreshCw :size="16" :class="{ spinning: loading }" />
          Refresh
        </button>
      </template>

      <template #cell-hostPort="{ item }">
        <div class="port-info">
          <a :href="`http://localhost:${item.hostPort}`" target="_blank" class="port-link" @click.stop>
            <span class="port-number">{{ item.hostPort }}</span>
            <ExternalLink :size="12" />
          </a>
        </div>
      </template>

      <template #cell-containerPort="{ item }">
        <div class="port-info">
          <span class="port-number container">{{ item.containerPort }}</span>
          <span class="port-protocol">{{ item.protocol }}</span>
        </div>
      </template>

      <template #cell-container="{ item }">
        <div class="container-info">
          <router-link :to="`/containers`" class="container-name">
            {{ item.containerName }}
          </router-link>
          <span class="container-status" :class="item.containerStatus">
            {{ item.containerStatus }}
          </span>
        </div>
      </template>

      <template #cell-deployment="{ item }">
        <router-link v-if="item.deployment" :to="`/deployments/${item.deployment}`" class="deployment-link">
          <Layers :size="14" />
          {{ item.deployment }}
        </router-link>
        <span v-else class="no-deployment"> — </span>
      </template>

      <template #cell-actions="{ item }">
        <div class="action-buttons">
          <button
            v-if="item.containerStatus === 'running'"
            class="action-btn stop"
            title="Stop Container"
            @click.stop="stopContainer(item.containerId, item.containerName)"
          >
            <Square :size="14" />
          </button>
          <button
            class="action-btn restart"
            title="Restart Container"
            @click.stop="restartContainer(item.containerId, item.containerName)"
          >
            <RotateCw :size="14" />
          </button>
        </div>
      </template>
    </DataTable>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import { containersApi } from "@/services/api";
import { useNotificationsStore } from "@/stores/notifications";
import DataTable from "@/components/DataTable.vue";
import { RefreshCw, Plug, ExternalLink, Layers, Square, RotateCw } from "lucide-vue-next";

interface PortMapping {
  id: string;
  hostPort: string;
  containerPort: string;
  protocol: string;
  containerName: string;
  containerStatus: string;
  containerId: string;
  deployment: string | null;
  image: string;
}

const portMappings = ref<PortMapping[]>([]);
const loading = ref(false);
const notifications = useNotificationsStore();

const columns = [
  { key: "hostPort", label: "Host Port", sortable: true, width: "120px" },
  { key: "containerPort", label: "Container Port", sortable: true, width: "140px" },
  { key: "container", label: "Container", sortable: true },
  { key: "deployment", label: "Deployment", sortable: true, width: "180px" },
  { key: "actions", label: "Actions", width: "100px" },
];

const parseDeploymentFromContainer = (name: string): string | null => {
  if (name.startsWith("flatrun-")) {
    const parts = name.slice(8).split("-");
    if (parts.length >= 2) {
      parts.pop();
      return parts.join("-");
    }
  }
  return null;
};

const fetchContainers = async () => {
  loading.value = true;
  try {
    const response = await containersApi.list();
    const containers = response.data.containers || [];

    const mappingsMap = new Map<string, PortMapping>();

    for (const container of containers) {
      const name = container.names?.[0]?.replace(/^\//, "") || container.name || "";
      const deployment = parseDeploymentFromContainer(name);

      if (container.ports) {
        for (const portStr of container.ports) {
          // Parse port string: "0.0.0.0:8080->80/tcp", ":::8080->80/tcp" or "80/tcp"
          const match = portStr.match(/(?:[\d.:]+:)?(\d+)->(\d+)\/(\w+)/);
          if (match) {
            const key = `${container.id}-${match[1]}-${match[2]}`;
            if (!mappingsMap.has(key)) {
              mappingsMap.set(key, {
                id: key,
                hostPort: match[1],
                containerPort: match[2],
                protocol: match[3].toUpperCase(),
                containerName: name,
                containerStatus: container.state || container.status || "unknown",
                containerId: container.id,
                deployment,
                image: container.image || "",
              });
            }
          }
        }
      }
    }

    portMappings.value = Array.from(mappingsMap.values());
  } catch (error: any) {
    notifications.error("Failed to fetch containers", error.message);
    console.error("Failed to fetch containers:", error);
  } finally {
    loading.value = false;
  }
};

const stopContainer = async (containerId: string, name: string) => {
  try {
    await containersApi.stop(containerId);
    notifications.success("Container Stopped", `${name} has been stopped`);
    await fetchContainers();
  } catch (error: any) {
    notifications.error("Failed to stop container", error.message);
  }
};

const restartContainer = async (containerId: string, name: string) => {
  try {
    await containersApi.restart(containerId);
    notifications.success("Container Restarted", `${name} has been restarted`);
    await fetchContainers();
  } catch (error: any) {
    notifications.error("Failed to restart container", error.message);
  }
};

onMounted(() => {
  fetchContainers();
});
</script>

<style scoped>
.docker-ports-view {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.port-info {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.port-link {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  color: var(--color-primary-600);
  text-decoration: none;
  font-weight: var(--font-semibold);
  font-family: var(--font-mono);
}

.port-link:hover {
  text-decoration: underline;
}

.port-number {
  font-weight: var(--font-semibold);
  color: var(--color-gray-900);
  font-family: var(--font-mono);
  font-size: var(--text-md);
}

.port-number.container {
  color: var(--color-gray-600);
}

.port-protocol {
  font-size: var(--text-xs);
  background: var(--color-gray-100);
  color: var(--color-gray-600);
  padding: 0.125rem 0.375rem;
  border-radius: var(--radius-sm);
  font-weight: var(--font-semibold);
}

.container-info {
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
}

.container-name {
  font-weight: var(--font-medium);
  color: var(--color-gray-900);
  text-decoration: none;
}

.container-name:hover {
  color: var(--color-primary-600);
}

.container-status {
  font-size: var(--text-xs);
  text-transform: capitalize;
  color: var(--color-gray-500);
}

.container-status.running {
  color: var(--color-success-600);
}

.container-status.exited {
  color: var(--color-danger-600);
}

.deployment-link {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  padding: 0.25rem 0.5rem;
  background: var(--color-primary-50);
  color: var(--color-primary-700);
  border-radius: var(--radius-sm);
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  text-decoration: none;
  transition: background 0.15s;
}

.deployment-link:hover {
  background: var(--color-primary-100);
}

.no-deployment {
  color: var(--color-gray-400);
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
}

.action-btn.stop {
  background: var(--color-warning-50);
  color: var(--color-warning-600);
}

.action-btn.stop:hover {
  background: var(--color-warning-100);
}

.action-btn.restart {
  background: var(--color-info-50);
  color: var(--color-info-600);
}

.action-btn.restart:hover {
  background: var(--color-info-100);
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
