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
            <span
              class="filter-count"
              :class="filter.value"
            >{{
              filter.count
            }}</span>
            {{ filter.label }}
          </button>
        </div>
      </template>

      <template #actions>
        <button
          class="btn btn-secondary"
          :disabled="loading"
          @click="fetchContainers"
        >
          <RefreshCw
            :size="16"
            :class="{ spinning: loading }"
          />
          Refresh
        </button>
      </template>

      <template #cell-status="{ item }">
        <span
          class="status-indicator"
          :class="item.state"
        />
      </template>

      <template #cell-name="{ item }">
        <div class="container-info">
          <span class="container-name">{{ item.name }}</span>
          <span class="container-id">{{ item.id.substring(0, 12) }}</span>
        </div>
      </template>

      <template #cell-image="{ item }">
        <code class="image-tag">{{ item.image }}</code>
      </template>

      <template #cell-ports="{ item }">
        <div class="ports-list">
          <span
            v-for="port in item.ports"
            :key="port"
            class="port-badge"
          >{{
            port
          }}</span>
          <span
            v-if="!item.ports?.length"
            class="no-ports"
          >-</span>
        </div>
      </template>

      <template #cell-created="{ item }">
        <span class="created-time">{{ formatTime(item.created) }}</span>
      </template>

      <template #cell-actions="{ item }">
        <div class="action-buttons">
          <button
            v-if="item.state === 'running'"
            class="action-btn stop"
            title="Stop"
            @click.stop="stopContainer(item.id)"
          >
            <Square :size="14" />
          </button>
          <button
            v-else
            class="action-btn start"
            title="Start"
            @click.stop="startContainer(item.id)"
          >
            <Play :size="14" />
          </button>
          <button
            class="action-btn restart"
            title="Restart"
            @click.stop="restartContainer(item.id)"
          >
            <RotateCw :size="14" />
          </button>
          <button
            class="action-btn logs"
            title="Logs"
            @click.stop="showLogs(item.id)"
          >
            <FileText :size="14" />
          </button>
          <button
            class="action-btn delete"
            title="Remove"
            @click.stop="deleteContainer(item.id)"
          >
            <Trash2 :size="14" />
          </button>
        </div>
      </template>

      <template #bulk-actions="{ selectedItems, clearSelection }">
        <button
          class="btn btn-sm btn-secondary"
          @click="bulkStart(selectedItems, clearSelection)"
        >
          <Play :size="14" /> Start
        </button>
        <button
          class="btn btn-sm btn-secondary"
          @click="bulkStop(selectedItems, clearSelection)"
        >
          <Square :size="14" /> Stop
        </button>
        <button
          class="btn btn-sm btn-danger"
          @click="bulkRemove(selectedItems, clearSelection)"
        >
          <Trash2 :size="14" /> Remove
        </button>
      </template>
    </DataTable>

    <Teleport to="body">
      <div
        v-if="showLogsModal"
        class="modal-overlay"
        @click.self="showLogsModal = false"
      >
        <div
          class="logs-modal modal-container"
          style="max-width: 1100px"
        >
          <div class="modal-header">
            <h3>
              <FileText :size="20" />
              Container Logs
            </h3>
            <button
              class="close-btn"
              @click="showLogsModal = false"
            >
              <X :size="18" />
            </button>
          </div>
          <div class="logs-content">
            <pre>{{ containerLogs }}</pre>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { containersApi } from "@/services/api";
import DataTable from "@/components/DataTable.vue";
import {
  RefreshCw,
  Play,
  Square,
  RotateCw,
  FileText,
  Trash2,
  X,
  Package,
} from "lucide-vue-next";

interface Container {
  id: string;
  name: string;
  image: string;
  state: string;
  status: string;
  ports: string[];
  created: string;
}

const containers = ref<Container[]>([]);
const loading = ref(false);
const activeFilter = ref("all");
const showLogsModal = ref(false);
const containerLogs = ref("");

const columns = [
  { key: "status", label: "Status", width: "60px" },
  { key: "name", label: "Container", sortable: true },
  { key: "image", label: "Image", sortable: true },
  { key: "ports", label: "Ports" },
  { key: "created", label: "Created", sortable: true },
  { key: "actions", label: "Actions", width: "160px" },
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
    containers.value = response.data.containers || [];
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

const startContainer = async (id: string) => {
  await containersApi.start(id);
  await fetchContainers();
};

const stopContainer = async (id: string) => {
  await containersApi.stop(id);
  await fetchContainers();
};

const restartContainer = async (id: string) => {
  await containersApi.restart(id);
  await fetchContainers();
};

const deleteContainer = async (id: string) => {
  if (!confirm("Remove this container?")) return;
  await containersApi.remove(id);
  await fetchContainers();
};

const showLogs = async (id: string) => {
  const response = await containersApi.logs(id);
  containerLogs.value = response.data.logs || "No logs available";
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

const bulkRemove = async (ids: string[], clear: () => void) => {
  if (!confirm(`Remove ${ids.length} containers?`)) return;
  for (const id of ids) await containersApi.remove(id);
  clear();
  await fetchContainers();
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
  background: var(--color-gray-100);
  padding: 0.25rem;
  border-radius: var(--radius-md);
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
  color: var(--color-gray-500);
  cursor: pointer;
  transition: all var(--transition-base);
}

.filter-btn.active {
  background: white;
  color: var(--color-gray-900);
  box-shadow: var(--shadow-xs);
}

.filter-count {
  font-size: var(--text-xs);
  padding: 0.125rem 0.375rem;
  border-radius: var(--radius-full);
  font-weight: var(--font-semibold);
}

.filter-count.all {
  background: var(--color-gray-200);
  color: var(--color-gray-700);
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
  color: var(--color-gray-900);
}

.container-id {
  font-size: var(--text-xs);
  font-family: var(--font-mono);
  color: var(--color-gray-400);
}

.image-tag {
  font-size: var(--text-sm);
  background: var(--color-gray-100);
  padding: 0.25rem 0.5rem;
  border-radius: var(--radius-sm);
  color: var(--color-gray-600);
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
  color: var(--color-gray-400);
}

.created-time {
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

.action-btn.delete {
  background: var(--color-danger-50);
  color: var(--color-danger-600);
}
.action-btn.delete:hover {
  background: var(--color-danger-100);
}

.logs-content {
  padding: 0;
  overflow: auto;
  flex: 1;
  background: var(--color-gray-950);
  max-height: 500px;
}

.logs-content pre {
  background: transparent;
  color: #e2e8f0;
  padding: var(--space-4) var(--space-5);
  font-family: var(--font-mono);
  font-size: var(--text-base);
  line-height: 1.7;
  margin: 0;
  white-space: pre-wrap;
  word-break: break-all;
  min-height: 400px;
}

.close-btn {
  background: none;
  border: none;
  color: var(--color-gray-400);
  cursor: pointer;
  padding: 0.375rem;
  border-radius: var(--radius-sm);
}

.close-btn:hover {
  background: var(--color-gray-200);
}

.btn {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-4);
  border-radius: var(--radius-md);
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
