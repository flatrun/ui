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
        <button
          class="btn btn-primary"
          @click="showNewDeploymentModal = true"
        >
          <Plus :size="16" />
          New Deployment
        </button>
        <button
          class="btn btn-secondary"
          :disabled="loading"
          @click="refreshDeployments"
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
          :class="item.status"
        />
      </template>

      <template #cell-name="{ item }">
        <div class="deployment-info">
          <span class="deployment-name">{{ item.name }}</span>
          <span class="deployment-status-text">{{ item.status }}</span>
        </div>
      </template>

      <template #cell-path="{ item }">
        <code class="path-tag">{{ item.path }}</code>
      </template>

      <template #cell-updated="{ item }">
        <span class="updated-time">{{ formatDate(item.updated_at) }}</span>
      </template>

      <template #cell-actions="{ item }">
        <div class="action-buttons">
          <button
            class="action-btn start"
            title="Start"
            @click.stop="handleOperation('start', item.name)"
          >
            <Play :size="14" />
          </button>
          <button
            class="action-btn stop"
            title="Stop"
            @click.stop="handleOperation('stop', item.name)"
          >
            <Square :size="14" />
          </button>
          <button
            class="action-btn restart"
            title="Restart"
            @click.stop="handleOperation('restart', item.name)"
          >
            <RotateCw :size="14" />
          </button>
          <button
            class="action-btn logs"
            title="Logs"
            @click.stop="viewLogs(item.name)"
          >
            <FileText :size="14" />
          </button>
        </div>
      </template>

      <template #grid="{ items }">
        <div class="deployments-grid">
          <div
            v-for="deployment in items"
            :key="deployment.name"
            class="deployment-card"
            @click="goToDeployment(deployment.name)"
          >
            <div class="card-header">
              <h3>{{ deployment.name }}</h3>
              <span
                class="status-dot"
                :class="deployment.status"
              />
            </div>
            <div class="card-body">
              <div class="info-item">
                <span class="label">Status</span>
                <span
                  class="badge"
                  :class="deployment.status"
                >{{
                  deployment.status
                }}</span>
              </div>
              <div class="info-item">
                <span class="label">Path</span>
                <code>{{ deployment.path }}</code>
              </div>
              <div class="info-item">
                <span class="label">Updated</span>
                <span>{{ formatDate(deployment.updated_at) }}</span>
              </div>
            </div>
            <div
              class="card-footer"
              @click.stop
            >
              <button
                class="icon-btn start"
                title="Start"
                @click="handleOperation('start', deployment.name)"
              >
                <Play :size="14" />
              </button>
              <button
                class="icon-btn stop"
                title="Stop"
                @click="handleOperation('stop', deployment.name)"
              >
                <Square :size="14" />
              </button>
              <button
                class="icon-btn restart"
                title="Restart"
                @click="handleOperation('restart', deployment.name)"
              >
                <RotateCw :size="14" />
              </button>
              <button
                class="icon-btn logs"
                title="Logs"
                @click="viewLogs(deployment.name)"
              >
                <FileText :size="14" />
              </button>
            </div>
          </div>
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
      :deployment-name="logsModal.deploymentName"
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
} from "lucide-vue-next";

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
  { key: "status", label: "Status", width: "60px" },
  { key: "name", label: "Deployment", sortable: true },
  { key: "path", label: "Path", sortable: true },
  { key: "updated", label: "Updated", sortable: true },
  { key: "actions", label: "Actions", width: "140px" },
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

const handleOperation = async (
  op: "start" | "stop" | "restart",
  name: string,
) => {
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

    operationModal.value.output =
      response?.data?.output || "Operation completed";
    operationModal.value.isSuccess = true;
    operationModal.value.isRunning = false;

    notifications.success(`${op} successful`, `${name} ${op}ed successfully`);
    await fetchDeployments();
  } catch (e: any) {
    const errorMsg =
      e.response?.data?.output || e.response?.data?.error || e.message;
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
  notifications.success(
    "Deployment created",
    "New deployment folder created successfully",
  );
};

const goToDeployment = (name: string) => {
  router.push(`/deployments/${name}`);
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

.deployments-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
  gap: var(--space-4);
}

.deployment-card {
  background: white;
  border-radius: var(--radius-lg);
  border: 1px solid var(--color-gray-200);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  transition: all 0.2s;
  overflow: hidden;
  cursor: pointer;
}

.deployment-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.07);
  border-color: var(--color-gray-300);
}

.deployment-card .card-header {
  padding: var(--space-4) var(--space-5);
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: var(--color-gray-50);
  border-bottom: 1px solid var(--color-gray-200);
}

.deployment-card h3 {
  font-size: var(--text-lg);
  font-weight: 600;
  color: var(--color-gray-900);
  margin: 0;
}

.status-dot {
  width: 10px;
  height: 10px;
  border-radius: var(--radius-full);
  background: var(--color-gray-500);
  flex-shrink: 0;
}

.status-dot.running {
  background: var(--color-success-500);
}

.status-dot.stopped {
  background: var(--color-gray-400);
}

.status-dot.error {
  background: var(--color-danger-500);
}

.card-body {
  padding: var(--space-4) var(--space-5);
  background: white;
}

.info-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--space-3);
  padding: var(--space-1) 0;
}

.info-item:last-child {
  margin-bottom: 0;
}

.info-item .label {
  font-size: var(--text-xs);
  font-weight: 500;
  color: var(--color-gray-500);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.info-item code {
  font-size: var(--text-sm);
  background: var(--color-gray-100);
  padding: var(--space-1) var(--space-2);
  border-radius: var(--radius-sm);
  font-family: var(--font-mono);
  color: var(--color-gray-700);
  max-width: 180px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.badge {
  padding: 3px 10px;
  border-radius: var(--radius-full);
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.03em;
}

.badge.running {
  background: var(--color-success-50);
  color: var(--color-success-700);
}

.badge.stopped {
  background: var(--color-gray-100);
  color: var(--color-gray-600);
}

.badge.error {
  background: var(--color-danger-50);
  color: var(--color-danger-700);
}

.card-footer {
  padding: var(--space-3) var(--space-5);
  background: var(--color-gray-50);
  border-top: 1px solid var(--color-gray-200);
  display: flex;
  gap: var(--space-2);
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
}

.card-footer .icon-btn {
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
