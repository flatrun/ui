<template>
  <div class="volumes-view">
    <div class="stats-bar">
      <div class="stat-item">
        <span class="stat-value">{{ volumes.length }}</span>
        <span class="stat-label">Total Volumes</span>
      </div>
      <div class="stat-item">
        <span class="stat-value">{{ inUseVolumes }}</span>
        <span class="stat-label">In Use</span>
      </div>
      <div class="stat-item warning">
        <span class="stat-value">{{ unusedVolumes }}</span>
        <span class="stat-label">Unused</span>
      </div>
    </div>

    <DataTable
      :items="volumes"
      :columns="columns"
      :loading="loading"
      :searchable="true"
      search-placeholder="Search volumes..."
      :search-fields="['name', 'driver']"
      :selectable="true"
      :toggleable="true"
      item-key="name"
      empty-icon="pi pi-database"
      empty-title="No Volumes Found"
      empty-text="Create volumes to persist container data."
      loading-text="Loading volumes..."
      :default-page-size="25"
      default-view-mode="grid"
    >
      <template #actions>
        <button class="btn btn-primary" @click="showCreateModal = true">
          <i class="pi pi-plus" />
          Create Volume
        </button>
        <button class="btn btn-secondary" :disabled="loading" @click="fetchVolumes">
          <i class="pi pi-refresh" :class="{ 'pi-spin': loading }" />
          Refresh
        </button>
        <button class="btn btn-warning" :disabled="unusedVolumes === 0" @click="pruneVolumes">
          <i class="pi pi-trash" />
          Prune Unused
        </button>
      </template>

      <template #empty-action>
        <button class="btn btn-primary" @click="showCreateModal = true">
          <i class="pi pi-plus" />
          Create Volume
        </button>
      </template>

      <template #cell-name="{ item }">
        <span class="volume-name-cell">{{ item.name }}</span>
      </template>

      <template #cell-driver="{ item }">
        <span class="driver-badge">{{ item.driver }}</span>
      </template>

      <template #cell-status="{ item }">
        <span class="status-badge" :class="item.in_use ? 'in-use' : 'unused'">
          {{ item.in_use ? "In Use" : "Unused" }}
        </span>
      </template>

      <template #cell-mountpoint="{ item }">
        <code class="mountpoint-code">{{ item.mountpoint }}</code>
      </template>

      <template #cell-created="{ item }">
        {{ formatDate(item.created) }}
      </template>

      <template #cell-actions="{ item }">
        <div class="table-actions">
          <button class="action-btn inspect" title="Inspect" @click.stop="inspectVolume(item.name)">
            <i class="pi pi-info-circle" />
          </button>
          <button
            class="action-btn delete"
            title="Remove"
            :disabled="item.in_use"
            @click.stop="deleteVolume(item.name)"
          >
            <i class="pi pi-trash" />
          </button>
        </div>
      </template>

      <template #grid="{ items, selectedItems, toggleSelect }">
        <div class="volumes-grid">
          <div
            v-for="volume in items"
            :key="volume.name"
            class="volume-card"
            :class="{
              unused: !volume.in_use,
              selected: selectedItems.includes(volume.name),
            }"
          >
            <div class="volume-card-header">
              <input
                type="checkbox"
                :checked="selectedItems.includes(volume.name)"
                class="volume-checkbox"
                @change="toggleSelect(volume.name)"
              />
              <div class="volume-icon" :class="{ unused: !volume.in_use }">
                <i class="pi pi-database" />
              </div>
              <div class="volume-info">
                <h4 class="volume-name">
                  {{ volume.name }}
                </h4>
                <span class="volume-driver">{{ volume.driver }}</span>
              </div>
              <div class="volume-status">
                <span class="status-badge" :class="volume.in_use ? 'in-use' : 'unused'">
                  {{ volume.in_use ? "In Use" : "Unused" }}
                </span>
              </div>
            </div>

            <div class="volume-card-body">
              <div class="volume-details">
                <div class="detail-item">
                  <span class="detail-label">Mount Point</span>
                  <code class="detail-value path">{{ volume.mountpoint }}</code>
                </div>
                <div class="detail-item">
                  <span class="detail-label">Created</span>
                  <span class="detail-value">{{ formatDate(volume.created) }}</span>
                </div>
                <div v-if="volume.size" class="detail-item">
                  <span class="detail-label">Size</span>
                  <span class="detail-value">{{ formatSize(volume.size) }}</span>
                </div>
              </div>

              <div v-if="volume.labels && Object.keys(volume.labels).length > 0" class="volume-labels">
                <span class="labels-title">Labels</span>
                <div class="labels-list">
                  <span v-for="(value, key) in volume.labels" :key="key" class="label-tag">
                    {{ key }}: {{ value }}
                  </span>
                </div>
              </div>

              <div v-if="volume.containers?.length" class="volume-containers">
                <span class="containers-title">Mounted by</span>
                <div class="containers-list">
                  <span v-for="container in volume.containers" :key="container" class="container-tag">
                    <i class="pi pi-box" />
                    {{ container }}
                  </span>
                </div>
              </div>
            </div>

            <div class="volume-card-actions">
              <button class="action-btn inspect" title="Inspect" @click="inspectVolume(volume.name)">
                <i class="pi pi-info-circle" />
              </button>
              <button
                class="action-btn delete"
                title="Remove"
                :disabled="volume.in_use"
                @click="deleteVolume(volume.name)"
              >
                <i class="pi pi-trash" />
              </button>
            </div>
          </div>
        </div>
      </template>

      <template #bulk-actions="{ selectedItems, clearSelection }">
        <button class="btn btn-sm btn-danger" @click="bulkRemove(selectedItems, clearSelection)">
          <i class="pi pi-trash" /> Remove
        </button>
      </template>
    </DataTable>

    <ConfirmModal
      :visible="showDeleteModal"
      title="Remove Volume"
      :message="`Remove volume '${volumeToDelete}'?`"
      warning="This cannot be undone."
      variant="danger"
      confirm-text="Remove"
      :loading="deleting"
      @confirm="confirmDeleteVolume"
      @cancel="showDeleteModal = false"
    />

    <ConfirmModal
      :visible="showBulkDeleteModal"
      title="Remove Volumes"
      :message="`Remove ${bulkDeleteNames.length} volumes?`"
      warning="This cannot be undone."
      variant="danger"
      confirm-text="Remove All"
      :loading="bulkDeleting"
      @confirm="confirmBulkRemove"
      @cancel="showBulkDeleteModal = false"
    />

    <ConfirmModal
      :visible="showPruneModal"
      title="Prune Unused Volumes"
      message="Remove all unused volumes?"
      warning="This cannot be undone."
      variant="warning"
      confirm-text="Prune"
      :loading="pruning"
      @confirm="confirmPrune"
      @cancel="showPruneModal = false"
    />

    <Teleport to="body">
      <div v-if="showCreateModal" class="modal-overlay" @click.self="showCreateModal = false">
        <div class="create-modal modal-container">
          <div class="modal-header">
            <h3>
              <i class="pi pi-plus-circle" />
              Create Volume
            </h3>
            <button class="close-btn" @click="showCreateModal = false">
              <i class="pi pi-times" />
            </button>
          </div>
          <div class="modal-body">
            <div class="form-group">
              <label>Volume Name</label>
              <input v-model="newVolumeName" type="text" placeholder="my-volume" class="form-input" />
            </div>
            <div class="form-group">
              <label>Driver</label>
              <select v-model="newVolumeDriver" class="form-input">
                <option value="local">local</option>
              </select>
            </div>
            <div class="form-group">
              <label>Labels (optional)</label>
              <div class="labels-input">
                <div v-for="(label, index) in newVolumeLabels" :key="index" class="label-row">
                  <input v-model="label.key" type="text" placeholder="key" class="form-input small" />
                  <input v-model="label.value" type="text" placeholder="value" class="form-input small" />
                  <button class="remove-label" @click="removeLabel(index)">
                    <i class="pi pi-times" />
                  </button>
                </div>
                <button class="add-label-btn" @click="addLabel">
                  <i class="pi pi-plus" />
                  Add Label
                </button>
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" @click="showCreateModal = false">Cancel</button>
            <button class="btn btn-primary" :disabled="!newVolumeName || creating" @click="createVolume">
              <i v-if="creating" class="pi pi-spin pi-spinner" />
              {{ creating ? "Creating..." : "Create Volume" }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { volumesApi } from "@/services/api";
import DataTable from "@/components/DataTable.vue";
import ConfirmModal from "@/components/ConfirmModal.vue";

interface Volume {
  name: string;
  driver: string;
  mountpoint: string;
  created: string;
  size?: number;
  in_use: boolean;
  labels?: Record<string, string>;
  containers?: string[];
}

const volumes = ref<Volume[]>([]);
const loading = ref(false);
const showCreateModal = ref(false);
const newVolumeName = ref("");
const newVolumeDriver = ref("local");
const newVolumeLabels = ref<Array<{ key: string; value: string }>>([]);
const creating = ref(false);

const showDeleteModal = ref(false);
const volumeToDelete = ref<string | null>(null);
const deleting = ref(false);

const showBulkDeleteModal = ref(false);
const bulkDeleteNames = ref<string[]>([]);
const bulkDeleteClearFn = ref<(() => void) | null>(null);
const bulkDeleting = ref(false);

const showPruneModal = ref(false);
const pruning = ref(false);

const columns = [
  { key: "name", label: "Name", sortable: true },
  { key: "driver", label: "Driver" },
  { key: "status", label: "Status" },
  { key: "mountpoint", label: "Mount Point" },
  { key: "created", label: "Created", sortable: true },
  { key: "actions", label: "Actions", width: "100px" },
];

const inUseVolumes = computed(() => volumes.value.filter((v) => v.in_use).length);
const unusedVolumes = computed(() => volumes.value.filter((v) => !v.in_use).length);

const fetchVolumes = async () => {
  loading.value = true;
  try {
    const response = await volumesApi.list();
    volumes.value = response.data.volumes || [];
  } catch (error) {
    console.error("Failed to fetch volumes:", error);
  } finally {
    loading.value = false;
  }
};

const formatDate = (timestamp: string) => {
  const date = new Date(timestamp);
  return date.toLocaleDateString() + " " + date.toLocaleTimeString();
};

const formatSize = (bytes: number) => {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
};

const addLabel = () => {
  newVolumeLabels.value.push({ key: "", value: "" });
};

const removeLabel = (index: number) => {
  newVolumeLabels.value.splice(index, 1);
};

const createVolume = async () => {
  if (!newVolumeName.value) return;
  creating.value = true;
  try {
    const labels: Record<string, string> = {};
    newVolumeLabels.value.forEach((l) => {
      if (l.key) labels[l.key] = l.value;
    });
    await volumesApi.create({
      name: newVolumeName.value,
      driver: newVolumeDriver.value,
      labels,
    });
    showCreateModal.value = false;
    newVolumeName.value = "";
    newVolumeLabels.value = [];
    await fetchVolumes();
  } catch (error) {
    console.error("Failed to create volume:", error);
  } finally {
    creating.value = false;
  }
};

const deleteVolume = (name: string) => {
  volumeToDelete.value = name;
  showDeleteModal.value = true;
};

const confirmDeleteVolume = async () => {
  if (!volumeToDelete.value) return;
  deleting.value = true;
  try {
    await volumesApi.remove(volumeToDelete.value);
    await fetchVolumes();
  } catch (error) {
    console.error("Failed to remove volume:", error);
  } finally {
    deleting.value = false;
    showDeleteModal.value = false;
    volumeToDelete.value = null;
  }
};

const bulkRemove = (names: string[], clear: () => void) => {
  bulkDeleteNames.value = names;
  bulkDeleteClearFn.value = clear;
  showBulkDeleteModal.value = true;
};

const confirmBulkRemove = async () => {
  bulkDeleting.value = true;
  try {
    for (const name of bulkDeleteNames.value) {
      try {
        await volumesApi.remove(name);
      } catch (error) {
        console.error(`Failed to remove volume ${name}:`, error);
      }
    }
    if (bulkDeleteClearFn.value) bulkDeleteClearFn.value();
    await fetchVolumes();
  } finally {
    bulkDeleting.value = false;
    showBulkDeleteModal.value = false;
    bulkDeleteNames.value = [];
    bulkDeleteClearFn.value = null;
  }
};

const pruneVolumes = () => {
  showPruneModal.value = true;
};

const confirmPrune = async () => {
  pruning.value = true;
  try {
    await volumesApi.prune();
    await fetchVolumes();
  } catch (error) {
    console.error("Failed to prune volumes:", error);
  } finally {
    pruning.value = false;
    showPruneModal.value = false;
  }
};

const inspectVolume = (name: string) => {
  console.log("Inspect volume:", name);
};

onMounted(() => {
  fetchVolumes();
});
</script>

<style scoped>
.volumes-view {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.stats-bar {
  display: flex;
  gap: var(--space-6);
  background: white;
  padding: var(--space-4) var(--space-6);
  border-radius: var(--radius-sm);
  border: 1px solid var(--color-gray-200);
}

.stat-item {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.stat-item.warning .stat-value {
  color: var(--color-warning-600);
}

.stat-value {
  font-size: var(--text-2xl);
  font-weight: var(--font-semibold);
  color: var(--color-gray-900);
}

.stat-label {
  font-size: var(--text-sm);
  color: var(--color-gray-500);
  text-transform: uppercase;
}

.volume-name-cell {
  font-weight: var(--font-medium);
  color: var(--color-gray-900);
  word-break: break-all;
}

.driver-badge {
  font-size: var(--text-sm);
  background: var(--color-gray-100);
  padding: 0.25rem 0.5rem;
  border-radius: var(--radius-sm);
  color: var(--color-gray-600);
}

.status-badge {
  font-size: var(--text-xs);
  padding: 0.25rem 0.625rem;
  border-radius: var(--radius-full);
  font-weight: var(--font-semibold);
}

.status-badge.in-use {
  background: var(--color-success-50);
  color: var(--color-success-700);
}

.status-badge.unused {
  background: var(--color-warning-50);
  color: var(--color-warning-700);
}

.mountpoint-code {
  font-size: var(--text-xs);
  background: var(--color-gray-100);
  padding: 0.375rem 0.5rem;
  border-radius: var(--radius-sm);
  word-break: break-all;
  display: inline-block;
  max-width: 300px;
}

.table-actions {
  display: flex;
  gap: 0.375rem;
}

.volumes-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
  gap: var(--space-4);
}

.volume-card {
  background: white;
  border-radius: var(--radius-md);
  border: 1px solid var(--color-gray-200);
  overflow: hidden;
  transition: all var(--transition-base);
}

.volume-card:hover {
  box-shadow: var(--shadow-md);
}

.volume-card.unused {
  border-color: var(--color-warning-100);
}

.volume-card.selected {
  border-color: var(--color-primary-500);
  box-shadow: 0 0 0 var(--ring-width) var(--ring-color);
}

.volume-card-header {
  padding: var(--space-4);
  background: var(--color-gray-50);
  border-bottom: 1px solid var(--color-gray-100);
  display: flex;
  align-items: center;
  gap: var(--space-3);
}

.volume-checkbox {
  cursor: pointer;
}

.volume-icon {
  width: 44px;
  height: 44px;
  background: var(--color-info-50);
  border-radius: var(--radius-sm);
  display: flex;
  align-items: center;
  justify-content: center;
}

.volume-icon i {
  font-size: var(--text-2xl);
  color: var(--color-primary-500);
}

.volume-icon.unused {
  background: var(--color-warning-50);
}

.volume-icon.unused i {
  color: var(--color-warning-600);
}

.volume-info {
  flex: 1;
}

.volume-name {
  font-size: var(--text-lg);
  font-weight: var(--font-semibold);
  color: var(--color-gray-900);
  margin: 0 0 0.125rem 0;
  word-break: break-all;
}

.volume-driver {
  font-size: var(--text-sm);
  color: var(--color-gray-500);
}

.volume-card-body {
  padding: var(--space-4);
}

.volume-details {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  margin-bottom: var(--space-4);
}

.detail-item {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.detail-label {
  font-size: var(--text-xs);
  color: var(--color-gray-500);
  text-transform: uppercase;
  font-weight: var(--font-semibold);
}

.detail-value {
  font-size: var(--text-base);
  color: var(--color-gray-900);
}

.detail-value.path {
  font-size: var(--text-xs);
  background: var(--color-gray-100);
  padding: 0.375rem 0.5rem;
  border-radius: var(--radius-sm);
  word-break: break-all;
}

.volume-labels,
.volume-containers {
  margin-top: var(--space-3);
}

.labels-title,
.containers-title {
  display: block;
  font-size: var(--text-xs);
  color: var(--color-gray-500);
  text-transform: uppercase;
  font-weight: var(--font-semibold);
  margin-bottom: 0.375rem;
}

.labels-list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.375rem;
}

.label-tag {
  font-size: var(--text-xs);
  background: var(--color-gray-100);
  color: var(--color-gray-600);
  padding: 0.125rem 0.5rem;
  border-radius: var(--radius-sm);
  font-family: var(--font-mono);
}

.containers-list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.375rem;
}

.container-tag {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  font-size: var(--text-xs);
  background: var(--color-info-50);
  color: var(--color-info-700);
  padding: 0.25rem 0.5rem;
  border-radius: var(--radius-sm);
}

.container-tag i {
  font-size: var(--text-xs);
}

.volume-card-actions {
  padding: var(--space-3) var(--space-4);
  border-top: 1px solid var(--color-gray-100);
  display: flex;
  gap: 0.375rem;
}

.action-btn {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: all var(--transition-base);
}

.action-btn.inspect {
  background: var(--color-gray-100);
  color: var(--color-gray-600);
}

.action-btn.inspect:hover {
  background: var(--color-gray-200);
  color: var(--color-gray-900);
}

.action-btn.delete {
  background: var(--color-danger-50);
  color: var(--color-danger-600);
}

.action-btn.delete:hover:not(:disabled) {
  background: var(--color-danger-100);
}

.action-btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
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

.btn-primary {
  background: var(--color-primary-500);
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: var(--color-primary-600);
}

.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-secondary {
  background: white;
  border: 1px solid var(--color-gray-200);
  color: var(--color-gray-700);
}

.btn-secondary:hover:not(:disabled) {
  background: var(--color-gray-50);
}

.btn-warning {
  background: var(--color-warning-50);
  color: var(--color-warning-700);
}

.btn-warning:hover:not(:disabled) {
  background: var(--color-warning-100);
}

.btn-warning:disabled {
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

.create-modal {
  max-width: 500px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  margin-bottom: var(--space-4);
}

.form-group:last-child {
  margin-bottom: 0;
}

.form-group label {
  font-size: var(--text-md);
  font-weight: var(--font-medium);
  color: var(--color-gray-700);
}

.labels-input {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.label-row {
  display: flex;
  gap: var(--space-2);
  align-items: center;
}

.label-row .form-input {
  flex: 1;
}

.form-input.small {
  padding: var(--space-2) var(--space-3);
}

.remove-label {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-danger-50);
  color: var(--color-danger-600);
  border: none;
  border-radius: var(--radius-sm);
  cursor: pointer;
}

.remove-label:hover {
  background: var(--color-danger-100);
}

.add-label-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  padding: var(--space-2) var(--space-3);
  background: var(--color-gray-100);
  border: none;
  border-radius: var(--radius-sm);
  font-size: var(--text-base);
  color: var(--color-gray-600);
  cursor: pointer;
  transition: all var(--transition-base);
  align-self: flex-start;
}

.add-label-btn:hover {
  background: var(--color-gray-200);
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
</style>
