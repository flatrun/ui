<template>
  <div class="containers-view">
    <DataTable
      :items="filteredContainers"
      :columns="columns"
      :loading="loading"
      :searchable="true"
      search-placeholder="Search containers..."
      :search-fields="['name', 'image', 'id']"
      :selectable="true"
      item-key="id"
      :empty-icon="Package"
      empty-title="No Containers Found"
      :empty-text="emptyText"
      loading-text="Loading containers..."
      :default-page-size="25"
    >
      <template #filters>
        <div class="filter-group">
          <button
            v-for="filter in statusFilters"
            :key="filter.value"
            class="filter-btn"
            :class="{ active: activeFilter === filter.value }"
            @click="activeFilter = filter.value"
          >
            <span class="filter-count" :class="filter.value">{{ filter.count }}</span>
            {{ filter.label }}
          </button>
        </div>
      </template>

      <template #actions>
        <button class="btn btn-secondary" :disabled="loading" @click="fetchContainers">
          <RefreshCw :size="16" :class="{ spinning: loading }" />
          Refresh
        </button>
      </template>

      <template #cell-status="{ item }">
        <span class="status-indicator" :class="item.state" />
      </template>

      <template #cell-name="{ item }">
        <div class="container-info">
          <span class="container-name">{{ item.name }}</span>
          <span class="container-id">{{ item.id.substring(0, 12) }}</span>
        </div>
      </template>

      <template #cell-deployment="{ item }">
        <button v-if="item.deployment" class="deployment-link" @click.stop="goToDeployment(item.deployment)">
          <Link :size="12" />
          {{ item.deployment }}
        </button>
        <span v-else class="no-deployment">-</span>
      </template>

      <template #cell-image="{ item }">
        <code class="image-tag">{{ item.image }}</code>
      </template>

      <template #cell-ports="{ item }">
        <div class="ports-list">
          <span v-for="port in item.ports" :key="port" class="port-badge">{{ port }}</span>
          <span v-if="!item.ports?.length" class="no-ports">-</span>
        </div>
      </template>

      <template #cell-created="{ item }">
        <span class="created-time">{{ formatTime(item.created) }}</span>
      </template>

      <template #cell-actions="{ item }">
        <div class="action-buttons">
          <button
            v-if="canWrite && item.state === 'running'"
            class="action-btn stop"
            title="Stop"
            :disabled="actions.isBusy(`${item.id}:stop`)"
            @click.stop="stopContainer(item.id)"
          >
            <Icon v-if="actions.isBusy(`${item.id}:stop`)" name="loader-circle" spin :size="14" />
            <Square v-else :size="14" />
          </button>
          <button
            v-else-if="canWrite"
            class="action-btn start"
            title="Start"
            :disabled="actions.isBusy(`${item.id}:start`)"
            @click.stop="startContainer(item.id)"
          >
            <Icon v-if="actions.isBusy(`${item.id}:start`)" name="loader-circle" spin :size="14" />
            <Play v-else :size="14" />
          </button>
          <button
            v-if="canWrite"
            class="action-btn restart"
            title="Restart"
            :disabled="actions.isBusy(`${item.id}:restart`)"
            @click.stop="restartContainer(item.id)"
          >
            <Icon v-if="actions.isBusy(`${item.id}:restart`)" name="loader-circle" spin :size="14" />
            <RotateCw v-else :size="14" />
          </button>
          <button class="action-btn resources" title="Resources" @click.stop="showResources(item.id, item.name)">
            <Gauge :size="14" />
          </button>
          <button class="action-btn logs" title="Logs" @click.stop="showLogs(item.id, item.name)">
            <FileText :size="14" />
          </button>
          <button v-if="canDelete" class="action-btn delete" title="Remove" @click.stop="deleteContainer(item.id)">
            <Trash2 :size="14" />
          </button>
        </div>
      </template>

      <template #bulk-actions="{ selectedItems, clearSelection }">
        <button v-if="canWrite" class="btn btn-sm btn-secondary" @click="bulkStart(selectedItems, clearSelection)">
          <Play :size="14" /> Start
        </button>
        <button v-if="canWrite" class="btn btn-sm btn-secondary" @click="bulkStop(selectedItems, clearSelection)">
          <Square :size="14" /> Stop
        </button>
        <button v-if="canDelete" class="btn btn-sm btn-danger" @click="bulkRemove(selectedItems, clearSelection)">
          <Trash2 :size="14" /> Remove
        </button>
      </template>
    </DataTable>

    <LogsModal
      :visible="showLogsModal"
      :title="selectedContainerName"
      subtitle="Container logs output"
      :logs="containerLogs"
      @close="showLogsModal = false"
    />

    <ConfirmModal
      :visible="showDeleteModal"
      title="Remove Container"
      :message="`Are you sure you want to remove this container?`"
      warning="The container will be permanently removed."
      variant="danger"
      confirm-text="Remove"
      :loading="deleting"
      @confirm="confirmDeleteContainer"
      @cancel="showDeleteModal = false"
    />

    <ConfirmModal
      :visible="showBulkDeleteModal"
      title="Remove Containers"
      :message="`Are you sure you want to remove ${bulkDeleteIds.length} containers?`"
      warning="These containers will be permanently removed."
      variant="danger"
      confirm-text="Remove All"
      :loading="bulkDeleting"
      @confirm="confirmBulkRemove"
      @cancel="showBulkDeleteModal = false"
    />

    <ContainerResourcesModal
      :visible="resourcesModal.visible"
      :container-id="resourcesModal.containerId"
      :container-name="resourcesModal.containerName"
      :can-write="canWrite"
      @close="resourcesModal.visible = false"
      @updated="onResourcesUpdated"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { useRouter } from "vue-router";
import { containersApi } from "@/services/api";
import { useAuthStore } from "@/stores/auth";
import { useActionRunner } from "@/composables/useActionRunner";
import Icon from "@/components/base/Icon.vue";
import DataTable from "@/components/DataTable.vue";
import LogsModal from "@/components/LogsModal.vue";
import ConfirmModal from "@/components/ConfirmModal.vue";
import ContainerResourcesModal from "@/components/ContainerResourcesModal.vue";
import { RefreshCw, Play, Square, RotateCw, FileText, Trash2, Package, Link, Gauge } from "lucide-vue-next";

const router = useRouter();
const authStore = useAuthStore();
const actions = useActionRunner();
const canWrite = authStore.hasPermission("containers:write");
const canDelete = authStore.hasPermission("containers:delete");

interface Container {
  id: string;
  name: string;
  image: string;
  state: string;
  status: string;
  ports: string[];
  created: string;
  deployment?: string;
}

const parseDeploymentFromContainer = (name: string): string | undefined => {
  if (name.startsWith("flatrun-")) {
    const parts = name.slice(8).split("-");
    if (parts.length >= 2) {
      parts.pop();
      return parts.join("-");
    }
  }
  const labelMatch = name.match(/^([a-z0-9-]+)-(app|db|web|api|worker|redis|cache|nginx)(-\d+)?$/i);
  if (labelMatch) {
    return labelMatch[1];
  }
  return undefined;
};

const goToDeployment = (name: string) => {
  router.push(`/deployments/${name}`);
};

const containers = ref<Container[]>([]);
const loading = ref(false);
const activeFilter = ref("all");
const showLogsModal = ref(false);
const containerLogs = ref("");
const selectedContainerName = ref("");

const showDeleteModal = ref(false);
const containerToDelete = ref<string | null>(null);
const deleting = ref(false);

const showBulkDeleteModal = ref(false);
const bulkDeleteIds = ref<string[]>([]);
const bulkDeleteClearFn = ref<(() => void) | null>(null);
const bulkDeleting = ref(false);

const resourcesModal = ref({
  visible: false,
  containerId: "",
  containerName: "",
});

const columns = [
  { key: "status", label: "Status", width: "60px" },
  { key: "name", label: "Container", sortable: true },
  { key: "deployment", label: "Deployment", sortable: true },
  { key: "image", label: "Image", sortable: true },
  { key: "ports", label: "Ports" },
  { key: "created", label: "Created", sortable: true },
  { key: "actions", label: "Actions", width: "192px" },
];

const statusFilters = computed(() => [
  { label: "All", value: "all", count: containers.value.length },
  {
    label: "Running",
    value: "running",
    count: containers.value.filter((c) => c.state === "running").length,
  },
  {
    label: "Stopped",
    value: "exited",
    count: containers.value.filter((c) => c.state === "exited").length,
  },
]);

const filteredContainers = computed(() => {
  if (activeFilter.value === "all") return containers.value;
  return containers.value.filter((c) => c.state === activeFilter.value);
});

const emptyText = computed(() => {
  if (activeFilter.value !== "all") {
    return "Try adjusting your filters.";
  }
  return "No Docker containers are currently running.";
});

const fetchContainers = async () => {
  loading.value = true;
  try {
    const response = await containersApi.list();
    const rawContainers = response.data.containers || [];
    containers.value = rawContainers.map((c: Container) => ({
      ...c,
      deployment: parseDeploymentFromContainer(c.name),
    }));
  } catch (error) {
    console.error("Failed to fetch containers:", error);
  } finally {
    loading.value = false;
  }
};

const formatTime = (timestamp: string) => {
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  return date.toLocaleDateString();
};

const startContainer = (id: string) =>
  actions.run(
    `${id}:start`,
    async () => {
      await containersApi.start(id);
      await fetchContainers();
    },
    { success: "Container started", error: "Failed to start container" },
  );

const stopContainer = (id: string) =>
  actions.run(
    `${id}:stop`,
    async () => {
      await containersApi.stop(id);
      await fetchContainers();
    },
    { success: "Container stopped", error: "Failed to stop container" },
  );

const restartContainer = (id: string) =>
  actions.run(
    `${id}:restart`,
    async () => {
      await containersApi.restart(id);
      await fetchContainers();
    },
    { success: "Container restarted", error: "Failed to restart container" },
  );

const deleteContainer = (id: string) => {
  containerToDelete.value = id;
  showDeleteModal.value = true;
};

const confirmDeleteContainer = async () => {
  if (!containerToDelete.value) return;
  deleting.value = true;
  try {
    await containersApi.remove(containerToDelete.value);
    await fetchContainers();
  } finally {
    deleting.value = false;
    showDeleteModal.value = false;
    containerToDelete.value = null;
  }
};

const showResources = (id: string, name: string) => {
  resourcesModal.value = { visible: true, containerId: id, containerName: name };
};

const onResourcesUpdated = () => {
  resourcesModal.value.visible = false;
};

const showLogs = async (id: string, name: string) => {
  selectedContainerName.value = name;
  const response = await containersApi.logs(id);
  containerLogs.value = response.data.logs || "";
  showLogsModal.value = true;
};

const bulkStart = async (ids: string[], clear: () => void) => {
  for (const id of ids) await startContainer(id);
  clear();
};

const bulkStop = async (ids: string[], clear: () => void) => {
  for (const id of ids) await stopContainer(id);
  clear();
};

const bulkRemove = (ids: string[], clear: () => void) => {
  bulkDeleteIds.value = ids;
  bulkDeleteClearFn.value = clear;
  showBulkDeleteModal.value = true;
};

const confirmBulkRemove = async () => {
  bulkDeleting.value = true;
  try {
    for (const id of bulkDeleteIds.value) {
      await containersApi.remove(id);
    }
    if (bulkDeleteClearFn.value) bulkDeleteClearFn.value();
    await fetchContainers();
  } finally {
    bulkDeleting.value = false;
    showBulkDeleteModal.value = false;
    bulkDeleteIds.value = [];
    bulkDeleteClearFn.value = null;
  }
};

onMounted(() => {
  fetchContainers();
});
</script>

<style scoped>
.containers-view {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.filter-group {
  display: flex;
  gap: 0.25rem;
  background: var(--surface-inset);
  padding: 0.25rem;
  border-radius: var(--radius-sm);
}

.filter-btn {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.375rem 0.75rem;
  border: none;
  background: transparent;
  border-radius: var(--radius-sm);
  font-size: var(--text-base);
  color: var(--text-muted);
  cursor: pointer;
  transition: all var(--transition-base);
}

.filter-btn.active {
  background: var(--surface-raised);
  color: var(--text);
  box-shadow: var(--shadow-xs);
}

.filter-count {
  font-size: var(--text-xs);
  padding: 0.125rem 0.375rem;
  border-radius: var(--radius-full);
  font-weight: var(--font-semibold);
}

.filter-count.all {
  background: var(--border);
  color: var(--text);
}
.filter-count.running {
  background: var(--color-success-50);
  color: var(--color-success-700);
}
.filter-count.exited {
  background: var(--color-danger-50);
  color: var(--color-danger-700);
}

.container-info {
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
}

.container-name {
  font-weight: var(--font-medium);
  color: var(--text);
}

.container-id {
  font-size: var(--text-xs);
  font-family: var(--font-mono);
  color: var(--text-subtle);
}

.deployment-link {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.25rem 0.5rem;
  background: var(--color-primary-50);
  color: var(--color-primary-700);
  border: none;
  border-radius: var(--radius-sm);
  font-size: var(--text-xs);
  font-weight: var(--font-medium);
  cursor: pointer;
  transition: all var(--transition-base);
}

.deployment-link:hover {
  background: var(--color-primary-100);
}

.no-deployment {
  color: var(--text-subtle);
}

.image-tag {
  font-size: var(--text-sm);
  background: var(--surface-inset);
  padding: 0.25rem 0.5rem;
  border-radius: var(--radius-sm);
  color: var(--text-muted);
}

.ports-list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem;
}

.port-badge {
  font-size: var(--text-xs);
  background: var(--color-info-50);
  color: var(--color-info-700);
  padding: 0.125rem 0.375rem;
  border-radius: var(--radius-sm);
  font-family: var(--font-mono);
}

.no-ports {
  color: var(--text-subtle);
}

.created-time {
  font-size: var(--text-base);
  color: var(--text-muted);
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

.action-btn.resources {
  background: rgba(139, 92, 246, 0.1);
  color: #7c3aed;
}
.action-btn.resources:hover {
  background: rgba(139, 92, 246, 0.2);
}

.action-btn.logs {
  background: var(--surface-inset);
  color: var(--text-muted);
}
.action-btn.logs:hover {
  background: var(--border);
}

.action-btn.delete {
  background: var(--color-danger-50);
  color: var(--color-danger-600);
}
.action-btn.delete:hover {
  background: var(--color-danger-100);
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

.btn-sm {
  padding: var(--space-1) var(--space-3);
  font-size: var(--text-base);
}

.btn-secondary {
  background: var(--surface);
  border: 1px solid var(--border);
  color: var(--text);
}

.btn-secondary:hover:not(:disabled) {
  background: var(--surface-sunken);
}

.btn-secondary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-danger {
  background: var(--color-danger-50);
  color: var(--color-danger-600);
}

.btn-danger:hover {
  background: var(--color-danger-100);
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
