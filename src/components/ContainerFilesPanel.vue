<template>
  <div class="container-files-panel">
    <div class="cf-header">
      <div class="cf-heading">
        <h3>Container Files</h3>
        <p class="cf-subtitle">
          What the running service holds. Bring a path onto the host to edit it under Files, where the container reads
          the same content.
        </p>
      </div>
      <div class="cf-controls">
        <select v-model="service" class="form-select" :disabled="loading" @change="browse('/')">
          <option v-for="name in serviceNames" :key="name" :value="name">{{ name }}</option>
        </select>
        <button class="btn btn-secondary" :disabled="loading" @click="browse(path)">
          <Icon name="refresh-cw" :size="15" :spin="loading" />
          Refresh
        </button>
      </div>
    </div>

    <nav class="cf-breadcrumb" aria-label="Container path">
      <button class="cf-crumb" :disabled="loading" @click="browse('/')">
        <Icon name="hard-drive" :size="14" />
        /
      </button>
      <template v-for="(crumb, i) in crumbs" :key="crumb.path">
        <Icon name="chevron-right" :size="13" class="cf-crumb-sep" />
        <button class="cf-crumb" :disabled="loading || i === crumbs.length - 1" @click="browse(crumb.path)">
          {{ crumb.name }}
        </button>
      </template>
      <button v-if="path !== '/'" class="btn btn-primary cf-bring-current" :disabled="busy" @click="confirm(path)">
        <Icon name="download" :size="15" />
        Bring this folder onto the host
      </button>
    </nav>

    <div v-if="loading" class="loading-state">
      <Icon name="loader" :size="18" spin />
      Reading the container...
    </div>

    <div v-else-if="error" class="cf-error">
      <Icon name="triangle-alert" :size="18" />
      <div>
        <p class="cf-error-msg">{{ error }}</p>
        <p v-if="hint" class="cf-error-hint">{{ hint }}</p>
      </div>
    </div>

    <div v-else-if="!files.length" class="empty-state">
      <Icon name="folder-open" :size="28" />
      <h4>Nothing here</h4>
      <p>This directory is empty.</p>
    </div>

    <div v-else class="cf-listing">
      <table class="cf-table">
        <thead>
          <tr>
            <th>Name</th>
            <th class="cf-num">Size</th>
            <th>Modified</th>
            <th class="cf-actions-col">Host</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="path !== '/'" class="cf-row">
            <td colspan="4">
              <button class="cf-name cf-up" @click="browse(parentPath)">
                <Icon name="corner-left-up" :size="15" />
                ..
              </button>
            </td>
          </tr>
          <tr v-for="file in files" :key="file.path" class="cf-row">
            <td>
              <button v-if="file.is_dir" class="cf-name" @click="browse(file.path)">
                <Icon name="folder" :size="15" class="cf-icon-dir" />
                {{ file.name }}
              </button>
              <span v-else class="cf-name cf-name-static">
                <Icon :name="file.is_symlink ? 'link' : 'file'" :size="15" />
                {{ file.name }}
                <span v-if="file.link_target" class="cf-link-target">to {{ file.link_target }}</span>
              </span>
            </td>
            <td class="cf-num">{{ file.is_dir ? "" : formatBytes(file.size) }}</td>
            <td class="cf-modified">{{ file.modified_raw }}</td>
            <td class="cf-actions-col">
              <button
                class="btn btn-sm btn-secondary"
                :disabled="busy || file.is_symlink"
                :title="
                  file.is_symlink ? 'A symlink points elsewhere; bring its target out instead' : 'Copy onto the host'
                "
                @click="confirm(file.path)"
              >
                <Icon name="download" :size="14" />
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <ConfirmModal
      :visible="!!pending"
      title="Bring onto the host"
      :message="confirmMessage"
      variant="warning"
      warning="The service restarts to pick up the mount."
      confirm-text="Bring it out"
      :loading="busy"
      @confirm="materialize"
      @cancel="pending = null"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { containerFilesApi } from "@/services/api";
import type { ContainerFile } from "@/services/api";
import { useNotificationsStore } from "@/stores/notifications";
import Icon from "@/components/base/Icon.vue";
import ConfirmModal from "@/components/ConfirmModal.vue";

const props = defineProps<{
  deploymentName: string;
  serviceNames: string[];
}>();

const emit = defineEmits<{ materialized: [{ hostPath: string; containerPath: string }] }>();

const notifications = useNotificationsStore();

const service = ref(props.serviceNames[0] || "");
const path = ref("/");
const files = ref<ContainerFile[]>([]);
const loading = ref(false);
const busy = ref(false);
const error = ref("");
const hint = ref("");
const pending = ref<string | null>(null);

const crumbs = computed(() => {
  const parts = path.value.split("/").filter(Boolean);
  return parts.map((name, i) => ({ name, path: "/" + parts.slice(0, i + 1).join("/") }));
});

const parentPath = computed(() => {
  const parts = path.value.split("/").filter(Boolean);
  parts.pop();
  return "/" + parts.join("/");
});

const confirmMessage = computed(
  () =>
    `${pending.value} will be copied onto the host and mounted back, so ${service.value} keeps the content it is running now. ` +
    `Afterwards you can edit it under Files.`,
);

const browse = async (target: string) => {
  if (!service.value) return;
  loading.value = true;
  error.value = "";
  hint.value = "";
  try {
    const response = await containerFilesApi.list(props.deploymentName, service.value, target || "/");
    files.value = response.data.files || [];
    path.value = response.data.path || target || "/";
  } catch (err: any) {
    files.value = [];
    error.value = err.response?.data?.error || err.message || "Could not read the container";
    hint.value = err.response?.data?.hint || "";
  } finally {
    loading.value = false;
  }
};

const confirm = (target: string) => {
  pending.value = target;
};

const materialize = async () => {
  if (!pending.value) return;
  busy.value = true;
  const containerPath = pending.value;
  try {
    const response = await containerFilesApi.materialize(props.deploymentName, service.value, {
      container_path: containerPath,
    });
    notifications.success("Now on the host", `${containerPath} is at ${response.data.host_path} and editable.`);
    emit("materialized", { hostPath: response.data.host_path, containerPath });
    pending.value = null;
    await browse(path.value);
  } catch (err: any) {
    notifications.error("Could not bring it out", err.response?.data?.error || err.message);
  } finally {
    busy.value = false;
  }
};

const formatBytes = (bytes: number) => {
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / Math.pow(1024, i)).toFixed(i ? 1 : 0)} ${units[i]}`;
};

onMounted(() => browse("/"));
</script>

<style scoped>
/* The panel fills the file pane and scrolls its own listing, so the tab's
   height stays put no matter how long a directory is. */
.container-files-panel {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  height: 100%;
  min-height: 0;
  padding: var(--space-4);
}

.cf-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: var(--space-4);
  flex-wrap: wrap;
  flex-shrink: 0;
}

.cf-heading h3 {
  margin: 0 0 var(--space-1);
  font-size: var(--text-md);
}

.cf-subtitle {
  margin: 0;
  max-width: 62ch;
  color: var(--text-muted);
  font-size: var(--text-sm);
}

.cf-controls {
  display: flex;
  gap: var(--space-2);
  align-items: center;
}

.cf-breadcrumb {
  display: flex;
  align-items: center;
  gap: var(--space-1);
  flex-wrap: wrap;
  padding: var(--space-2) var(--space-3);
  background: var(--surface-inset);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-sm);
  flex-shrink: 0;
}

.cf-crumb {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  border: 0;
  background: none;
  color: var(--text);
  cursor: pointer;
  padding: var(--space-1) var(--space-2);
  border-radius: var(--radius-xs);
  font-size: var(--text-sm);
}

.cf-crumb:hover:not(:disabled) {
  background: var(--surface-raised);
}

.cf-crumb:disabled {
  cursor: default;
  color: var(--text-muted);
}

.cf-crumb-sep {
  color: var(--text-subtle);
}

.cf-bring-current {
  margin-left: auto;
}

.cf-listing {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-sm);
}

.cf-table {
  width: 100%;
  border-collapse: collapse;
}

.cf-table th {
  position: sticky;
  top: 0;
  background: var(--surface-raised);
  text-align: left;
  font-size: var(--text-xs);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--text-muted);
  padding: var(--space-2) var(--space-3);
  border-bottom: 1px solid var(--border);
}

.cf-row td {
  padding: var(--space-2) var(--space-3);
  border-bottom: 1px solid var(--border-subtle);
  font-size: var(--text-sm);
}

.cf-row:last-child td {
  border-bottom: 0;
}

.cf-row:hover td {
  background: var(--surface-raised);
}

.cf-name {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  border: 0;
  background: none;
  color: var(--text);
  cursor: pointer;
  font-size: var(--text-sm);
  padding: 0;
}

.cf-name-static {
  cursor: default;
}

.cf-name:hover:not(.cf-name-static) {
  text-decoration: underline;
}

.cf-icon-dir {
  color: var(--accent);
}

.cf-link-target {
  color: var(--text-subtle);
  font-size: var(--text-xs);
}

.cf-num {
  text-align: right;
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
  color: var(--text-muted);
}

.cf-modified {
  color: var(--text-muted);
  white-space: nowrap;
}

.cf-actions-col {
  text-align: right;
  white-space: nowrap;
}

.cf-error {
  display: flex;
  gap: var(--space-3);
  padding: var(--space-3) var(--space-4);
  border-radius: var(--radius-sm);
  background: var(--color-danger-50);
  border: 1px solid var(--color-danger-200);
  color: var(--color-danger-700);
}

.cf-error-msg {
  margin: 0;
  font-size: var(--text-sm);
}

.cf-error-hint {
  margin: var(--space-1) 0 0;
  font-size: var(--text-xs);
  color: var(--color-danger-600);
}
</style>
