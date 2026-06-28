<template>
  <div v-if="visible" class="modal-overlay" @click.self="$emit('close')">
    <div class="modal-panel">
      <div class="modal-header">
        <div class="modal-title-group">
          <h2>Container Resources</h2>
          <code class="container-name">{{ containerName }}</code>
        </div>
        <button class="close-btn" @click="$emit('close')">
          <i class="pi pi-times" />
        </button>
      </div>

      <div v-if="loadingResources" class="modal-loading">
        <i class="pi pi-spin pi-spinner" />
        <span>Loading resources...</span>
      </div>

      <template v-else-if="resources">
        <div class="modal-body">
          <div class="current-resources">
            <h3>Current Limits</h3>
            <div class="resource-grid">
              <div class="resource-display">
                <span class="resource-label">CPU</span>
                <span class="resource-value">{{ resources.cpus > 0 ? resources.cpus + " cores" : "Unlimited" }}</span>
              </div>
              <div class="resource-display">
                <span class="resource-label">Memory</span>
                <span class="resource-value">{{
                  resources.memory_limit > 0 ? formatBytes(resources.memory_limit) : "Unlimited"
                }}</span>
              </div>
              <div class="resource-display">
                <span class="resource-label">Memory + Swap</span>
                <span class="resource-value">{{
                  resources.memory_swap > 0 ? formatBytes(resources.memory_swap) : "Unlimited"
                }}</span>
              </div>
              <div class="resource-display">
                <span class="resource-label">CPU Shares</span>
                <span class="resource-value">{{ resources.cpu_shares || 1024 }}</span>
              </div>
              <div class="resource-display">
                <span class="resource-label">Restart Policy</span>
                <span class="resource-value">{{ resources.restart_policy || "no" }}</span>
              </div>
            </div>
          </div>

          <div v-if="canWrite" class="update-resources">
            <h3>Update Limits</h3>
            <div class="form-grid">
              <div class="form-group">
                <label for="cpus">CPU Cores</label>
                <div class="input-with-hint">
                  <input
                    id="cpus"
                    v-model.number="form.cpus"
                    type="number"
                    min="0"
                    step="0.25"
                    placeholder="e.g. 0.5, 1, 2"
                  />
                  <span class="input-hint">0 = unlimited</span>
                </div>
              </div>
              <div class="form-group">
                <label for="memory">Memory Limit (MB)</label>
                <div class="input-with-hint">
                  <input
                    id="memory"
                    v-model.number="form.memoryMB"
                    type="number"
                    min="0"
                    step="32"
                    placeholder="e.g. 256, 512, 1024"
                  />
                  <span class="input-hint">0 = unlimited</span>
                </div>
              </div>
              <div class="form-group">
                <label for="memorySwap">Memory + Swap (MB)</label>
                <div class="input-with-hint">
                  <input
                    id="memorySwap"
                    v-model.number="form.memorySwapMB"
                    type="number"
                    min="0"
                    step="32"
                    placeholder="e.g. 512, 1024"
                  />
                  <span class="input-hint">Must be >= memory limit</span>
                </div>
              </div>
              <div class="form-group">
                <label for="cpuShares">CPU Shares</label>
                <div class="input-with-hint">
                  <input
                    id="cpuShares"
                    v-model.number="form.cpuShares"
                    type="number"
                    min="0"
                    step="128"
                    placeholder="Default: 1024"
                  />
                  <span class="input-hint">Relative weight (default 1024)</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div v-if="canWrite" class="modal-footer">
          <div v-if="error" class="error-message">
            <i class="pi pi-exclamation-circle" />
            {{ error }}
          </div>
          <div class="footer-actions">
            <button class="btn btn-secondary" @click="$emit('close')">Cancel</button>
            <button class="btn btn-primary" :disabled="saving || !hasChanges" @click="saveResources">
              <i v-if="saving" class="pi pi-spin pi-spinner" />
              <span>{{ saving ? "Updating..." : "Update Resources" }}</span>
            </button>
          </div>
        </div>
      </template>

      <div v-else class="modal-error">
        <i class="pi pi-exclamation-triangle" />
        <span>Failed to load container resources</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, computed } from "vue";
import { containersApi, type ResourceLimits, type ResourceUpdate } from "@/services/api";

const props = defineProps<{
  visible: boolean;
  containerId: string;
  containerName: string;
  canWrite: boolean;
}>();

const emit = defineEmits<{
  close: [];
  updated: [];
}>();

const resources = ref<ResourceLimits | null>(null);
const loadingResources = ref(false);
const saving = ref(false);
const error = ref("");

const form = ref({
  cpus: null as number | null,
  memoryMB: null as number | null,
  memorySwapMB: null as number | null,
  cpuShares: null as number | null,
});

const hasChanges = computed(() => {
  if (!resources.value) return false;
  const r = resources.value;
  const f = form.value;
  if (f.cpus !== null && f.cpus !== r.cpus) return true;
  if (f.memoryMB !== null && f.memoryMB !== bytesToMB(r.memory_limit)) return true;
  if (f.memorySwapMB !== null && f.memorySwapMB !== bytesToMB(r.memory_swap)) return true;
  if (f.cpuShares !== null && f.cpuShares !== r.cpu_shares) return true;
  return false;
});

const bytesToMB = (bytes: number) => Math.round(bytes / (1024 * 1024));

const formatBytes = (bytes: number) => {
  if (bytes >= 1024 * 1024 * 1024) return (bytes / (1024 * 1024 * 1024)).toFixed(1) + " GB";
  if (bytes >= 1024 * 1024) return Math.round(bytes / (1024 * 1024)) + " MB";
  if (bytes >= 1024) return Math.round(bytes / 1024) + " KB";
  return bytes + " B";
};

const fetchResources = async () => {
  if (!props.containerId) return;
  loadingResources.value = true;
  error.value = "";
  try {
    const res = await containersApi.getResources(props.containerId);
    resources.value = res.data.resources;
    form.value = {
      cpus: null,
      memoryMB: null,
      memorySwapMB: null,
      cpuShares: null,
    };
  } catch {
    resources.value = null;
  } finally {
    loadingResources.value = false;
  }
};

const saveResources = async () => {
  if (!props.containerId || !hasChanges.value) return;
  saving.value = true;
  error.value = "";

  const update: ResourceUpdate = {};
  if (form.value.cpus !== null && form.value.cpus !== resources.value?.cpus) {
    update.cpus = form.value.cpus;
  }
  if (form.value.memoryMB !== null && form.value.memoryMB !== bytesToMB(resources.value?.memory_limit || 0)) {
    update.memory_limit = form.value.memoryMB * 1024 * 1024;
  }
  if (form.value.memorySwapMB !== null && form.value.memorySwapMB !== bytesToMB(resources.value?.memory_swap || 0)) {
    update.memory_swap = form.value.memorySwapMB * 1024 * 1024;
  }
  if (form.value.cpuShares !== null && form.value.cpuShares !== resources.value?.cpu_shares) {
    update.cpu_shares = form.value.cpuShares;
  }

  try {
    const res = await containersApi.updateResources(props.containerId, update);
    resources.value = res.data.resources;
    form.value = { cpus: null, memoryMB: null, memorySwapMB: null, cpuShares: null };
    emit("updated");
  } catch (e: any) {
    error.value = e.response?.data?.error || "Failed to update resources";
  } finally {
    saving.value = false;
  }
};

watch(
  () => props.visible,
  (val) => {
    if (val) fetchResources();
  },
);
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-panel {
  background: var(--surface-raised);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15);
  width: 100%;
  max-width: 560px;
  max-height: 90vh;
  overflow-y: auto;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 1.25rem 1.5rem;
  border-bottom: 1px solid var(--border);
}

.modal-title-group h2 {
  font-size: 1.125rem;
  font-weight: 600;
  color: var(--text);
  margin: 0;
}

.container-name {
  font-size: 0.75rem;
  background: var(--surface-inset);
  padding: 0.125rem 0.5rem;
  border-radius: var(--radius-sm);
  color: var(--text-muted);
  font-family: "SF Mono", "Fira Code", monospace;
  margin-top: 0.375rem;
  display: inline-block;
}

.close-btn {
  background: none;
  border: none;
  color: var(--text-subtle);
  cursor: pointer;
  padding: 0.25rem;
  border-radius: var(--radius-sm);
  transition: all 0.2s;
}

.close-btn:hover {
  color: var(--text);
  background: var(--surface-inset);
}

.modal-loading,
.modal-error {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
  padding: 3rem;
  color: var(--text-subtle);
}

.modal-loading i,
.modal-error i {
  font-size: 1.5rem;
}

.modal-body {
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.current-resources h3,
.update-resources h3 {
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin: 0 0 0.75rem 0;
}

.resource-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0.75rem;
}

.resource-display {
  background: var(--surface-sunken);
  padding: 0.75rem;
  border-radius: var(--radius-sm);
  border: 1px solid var(--border-subtle);
}

.resource-label {
  display: block;
  font-size: 0.6875rem;
  color: var(--text-subtle);
  text-transform: uppercase;
  letter-spacing: 0.025em;
  margin-bottom: 0.25rem;
}

.resource-value {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--text);
}

.update-resources {
  padding-top: 1rem;
  border-top: 1px solid var(--border-subtle);
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1rem;
}

.form-group label {
  display: block;
  font-size: 0.8125rem;
  font-weight: 500;
  color: var(--text);
  margin-bottom: 0.375rem;
}

.input-with-hint {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.form-group input {
  width: 100%;
  padding: 0.5rem 0.75rem;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  font-size: 0.875rem;
  color: var(--text);
  transition: border-color 0.2s;
  box-sizing: border-box;
}

.form-group input:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.1);
}

.input-hint {
  font-size: 0.6875rem;
  color: var(--text-subtle);
}

.modal-footer {
  padding: 1rem 1.5rem;
  border-top: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.error-message {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  font-size: 0.8125rem;
  color: #dc2626;
  background: #fef2f2;
  padding: 0.5rem 0.75rem;
  border-radius: var(--radius-sm);
}

.footer-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
}

.btn {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.5rem 1rem;
  font-size: 0.8125rem;
  font-weight: 500;
  border-radius: var(--radius-sm);
  border: none;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-primary {
  background: #3b82f6;
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: #2563eb;
}

.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-secondary {
  background: var(--surface);
  color: var(--text);
  border: 1px solid var(--border);
}

.btn-secondary:hover {
  background: var(--surface-sunken);
}

@media (max-width: 640px) {
  .resource-grid,
  .form-grid {
    grid-template-columns: 1fr;
  }

  .modal-panel {
    margin: 1rem;
  }
}
</style>
