<template>
  <div class="ports-view">
    <DataTable
      :items="ports"
      :columns="columns"
      :loading="loading"
      :searchable="true"
      search-placeholder="Search ports..."
      :search-fields="['port', 'process', 'pid', 'protocol']"
      item-key="port"
      :empty-icon="Network"
      empty-title="No Active Ports"
      :empty-text="emptyText"
      loading-text="Loading ports..."
      :default-page-size="25"
    >
      <template #actions>
        <button
          class="btn btn-secondary"
          :disabled="loading"
          @click="fetchPorts"
        >
          <RefreshCw
            :size="16"
            :class="{ spinning: loading }"
          />
          Refresh
        </button>
      </template>

      <template #cell-port="{ item }">
        <div class="port-info">
          <span class="port-number">{{ item.port }}</span>
          <span class="port-protocol">{{ item.protocol }}</span>
        </div>
      </template>

      <template #cell-process="{ item }">
        <div class="process-info">
          <span class="process-name">{{ item.process || "Unknown" }}</span>
          <span class="process-pid">PID: {{ item.pid }}</span>
        </div>
      </template>

      <template #cell-address="{ item }">
        <code class="address-tag">{{ item.address }}</code>
      </template>

      <template #cell-state="{ item }">
        <span
          class="state-badge"
          :class="item.state?.toLowerCase()"
        >
          {{ item.state || "UNKNOWN" }}
        </span>
      </template>

      <template #cell-actions="{ item }">
        <div class="action-buttons">
          <button
            class="action-btn kill"
            title="Kill Process"
            :disabled="!item.pid"
            @click.stop="confirmKillProcess(item)"
          >
            <Trash2 :size="14" />
          </button>
        </div>
      </template>
    </DataTable>

    <Teleport to="body">
      <div
        v-if="showKillModal"
        class="modal-overlay"
        @click.self="showKillModal = false"
      >
        <div class="kill-modal modal-container">
          <div class="modal-header">
            <h3>
              <AlertTriangle :size="20" />
              Kill Process
            </h3>
            <button
              class="close-btn"
              @click="showKillModal = false"
            >
              <X :size="18" />
            </button>
          </div>
          <div class="modal-body">
            <p>Are you sure you want to kill this process?</p>
            <div class="process-details">
              <div class="detail-row">
                <span class="label">Port:</span>
                <span class="value">{{ selectedPort?.port }}</span>
              </div>
              <div class="detail-row">
                <span class="label">Process:</span>
                <span class="value">{{
                  selectedPort?.process || "Unknown"
                }}</span>
              </div>
              <div class="detail-row">
                <span class="label">PID:</span>
                <span class="value">{{ selectedPort?.pid }}</span>
              </div>
            </div>
            <div class="warning-message">
              <AlertTriangle :size="16" />
              <span>This action cannot be undone. The process will be terminated
                immediately.</span>
            </div>
          </div>
          <div class="modal-footer">
            <button
              class="btn btn-secondary"
              @click="showKillModal = false"
            >
              Cancel
            </button>
            <button
              class="btn btn-danger"
              :disabled="killing"
              @click="killProcess"
            >
              <Trash2
                v-if="!killing"
                :size="16"
              />
              <RefreshCw
                v-else
                :size="16"
                class="spinning"
              />
              {{ killing ? "Killing..." : "Kill Process" }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { portsApi } from "@/services/api";
import { useNotificationsStore } from "@/stores/notifications";
import DataTable from "@/components/DataTable.vue";
import { RefreshCw, Trash2, Network, AlertTriangle, X } from "lucide-vue-next";

interface Port {
  port: number;
  protocol: string;
  process: string;
  pid: number;
  address: string;
  state: string;
}

const ports = ref<Port[]>([]);
const loading = ref(false);
const showKillModal = ref(false);
const selectedPort = ref<Port | null>(null);
const killing = ref(false);
const notifications = useNotificationsStore();

const columns = [
  { key: "port", label: "Port", sortable: true, width: "100px" },
  { key: "process", label: "Process", sortable: true },
  { key: "address", label: "Address", sortable: true },
  { key: "state", label: "State", width: "120px" },
  { key: "actions", label: "Actions", width: "80px" },
];

const emptyText = computed(() => {
  return "No active ports found on the system.";
});

const fetchPorts = async () => {
  loading.value = true;
  try {
    const response = await portsApi.list();
    ports.value = response.data.ports || [];
  } catch (error: any) {
    notifications.error("Failed to fetch ports", error.message);
    console.error("Failed to fetch ports:", error);
  } finally {
    loading.value = false;
  }
};

const confirmKillProcess = (port: Port) => {
  selectedPort.value = port;
  showKillModal.value = true;
};

const killProcess = async () => {
  if (!selectedPort.value?.pid) return;

  killing.value = true;
  try {
    await portsApi.kill(selectedPort.value.pid);
    notifications.success(
      "Process killed",
      `Successfully killed process ${selectedPort.value.pid}`,
    );
    showKillModal.value = false;
    selectedPort.value = null;
    await fetchPorts();
  } catch (error: any) {
    notifications.error("Failed to kill process", error.message);
    console.error("Failed to kill process:", error);
  } finally {
    killing.value = false;
  }
};

onMounted(() => {
  fetchPorts();
});
</script>

<style scoped>
.ports-view {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.port-info {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.port-number {
  font-weight: var(--font-semibold);
  color: var(--color-gray-900);
  font-family: var(--font-mono);
  font-size: var(--text-md);
}

.port-protocol {
  font-size: var(--text-xs);
  background: var(--color-gray-100);
  color: var(--color-gray-600);
  padding: 0.125rem 0.375rem;
  border-radius: var(--radius-sm);
  font-weight: var(--font-semibold);
  text-transform: uppercase;
}

.process-info {
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
}

.process-name {
  font-weight: var(--font-medium);
  color: var(--color-gray-900);
}

.process-pid {
  font-size: var(--text-xs);
  font-family: var(--font-mono);
  color: var(--color-gray-500);
}

.address-tag {
  font-size: var(--text-sm);
  background: var(--color-gray-100);
  padding: 0.25rem 0.5rem;
  border-radius: var(--radius-sm);
  color: var(--color-gray-600);
  font-family: var(--font-mono);
}

.state-badge {
  display: inline-block;
  padding: 0.25rem 0.5rem;
  border-radius: var(--radius-full);
  font-size: var(--text-xs);
  font-weight: var(--font-semibold);
  text-transform: uppercase;
}

.state-badge.listen {
  background: var(--color-success-50);
  color: var(--color-success-700);
}

.state-badge.established {
  background: var(--color-info-50);
  color: var(--color-info-700);
}

.state-badge.time_wait {
  background: var(--color-warning-50);
  color: var(--color-warning-700);
}

.state-badge.close_wait {
  background: var(--color-danger-50);
  color: var(--color-danger-700);
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

.action-btn.kill {
  background: var(--color-danger-50);
  color: var(--color-danger-600);
}

.action-btn.kill:hover:not(:disabled) {
  background: var(--color-danger-100);
}

.action-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
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
  background: var(--color-danger-500);
  color: white;
}

.btn-danger:hover:not(:disabled) {
  background: var(--color-danger-600);
}

.btn-danger:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-container {
  background: white;
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-xl);
  max-width: 500px;
  width: 90%;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-4) var(--space-5);
  border-bottom: 1px solid var(--color-gray-200);
}

.modal-header h3 {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  font-size: var(--text-lg);
  font-weight: var(--font-semibold);
  color: var(--color-gray-900);
  margin: 0;
}

.close-btn {
  background: none;
  border: none;
  color: var(--color-gray-400);
  cursor: pointer;
  padding: 0.375rem;
  border-radius: var(--radius-sm);
  display: flex;
  align-items: center;
  justify-content: center;
}

.close-btn:hover {
  background: var(--color-gray-100);
  color: var(--color-gray-600);
}

.modal-body {
  padding: var(--space-5);
  flex: 1;
  overflow-y: auto;
}

.modal-body > p {
  margin: 0 0 var(--space-4) 0;
  color: var(--color-gray-700);
}

.process-details {
  background: var(--color-gray-50);
  border-radius: var(--radius-md);
  padding: var(--space-4);
  margin-bottom: var(--space-4);
}

.detail-row {
  display: flex;
  justify-content: space-between;
  padding: var(--space-2) 0;
  border-bottom: 1px solid var(--color-gray-200);
}

.detail-row:last-child {
  border-bottom: none;
}

.detail-row .label {
  font-size: var(--text-sm);
  color: var(--color-gray-500);
  font-weight: var(--font-medium);
}

.detail-row .value {
  font-size: var(--text-sm);
  color: var(--color-gray-900);
  font-weight: var(--font-semibold);
  font-family: var(--font-mono);
}

.warning-message {
  display: flex;
  align-items: flex-start;
  gap: var(--space-2);
  padding: var(--space-3);
  background: var(--color-warning-50);
  border: 1px solid var(--color-warning-200);
  border-radius: var(--radius-md);
  color: var(--color-warning-800);
  font-size: var(--text-sm);
}

.warning-message svg {
  flex-shrink: 0;
  margin-top: 2px;
}

.modal-footer {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: var(--space-2);
  padding: var(--space-4) var(--space-5);
  border-top: 1px solid var(--color-gray-200);
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
