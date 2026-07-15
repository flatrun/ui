<template>
  <div class="container-files-tab">
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

    <table v-else class="cf-table">
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
.container-files-tab {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.cf-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1rem;
  flex-wrap: wrap;
}

.cf-heading h3 {
  margin: 0 0 0.25rem;
}

.cf-subtitle {
  margin: 0;
  max-width: 60ch;
  color: var(--text-secondary);
  font-size: 0.85rem;
}

.cf-controls {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}

.cf-breadcrumb {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  flex-wrap: wrap;
  padding: 0.5rem 0.75rem;
  background: var(--surface-2, rgba(127, 127, 127, 0.08));
  border-radius: 8px;
}

.cf-crumb {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  border: 0;
  background: none;
  color: var(--text-primary);
  cursor: pointer;
  padding: 0.15rem 0.35rem;
  border-radius: 6px;
  font-size: 0.85rem;
}

.cf-crumb:hover:not(:disabled) {
  background: var(--surface-3, rgba(127, 127, 127, 0.16));
}

.cf-crumb:disabled {
  cursor: default;
  color: var(--text-secondary);
}

.cf-crumb-sep {
  color: var(--text-secondary);
}

.cf-bring-current {
  margin-left: auto;
}

.cf-table {
  width: 100%;
  border-collapse: collapse;
}

.cf-table th {
  text-align: left;
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--text-secondary);
  padding: 0.5rem;
  border-bottom: 1px solid var(--border-color, rgba(127, 127, 127, 0.2));
}

.cf-row td {
  padding: 0.4rem 0.5rem;
  border-bottom: 1px solid var(--border-color, rgba(127, 127, 127, 0.12));
  font-size: 0.85rem;
}

.cf-name {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  border: 0;
  background: none;
  color: var(--text-primary);
  cursor: pointer;
  font-size: 0.85rem;
  padding: 0;
}

.cf-name-static {
  cursor: default;
  color: var(--text-secondary);
}

.cf-name:hover:not(.cf-name-static) {
  text-decoration: underline;
}

.cf-icon-dir {
  color: var(--primary-color, #6366f1);
}

.cf-link-target {
  color: var(--text-secondary);
  font-size: 0.75rem;
}

.cf-num {
  text-align: right;
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
}

.cf-modified,
.cf-actions-col {
  color: var(--text-secondary);
  white-space: nowrap;
}

.cf-actions-col {
  text-align: right;
}

.cf-error {
  display: flex;
  gap: 0.6rem;
  padding: 0.75rem 1rem;
  border-radius: 8px;
  background: var(--danger-bg, rgba(239, 68, 68, 0.08));
  color: var(--danger-color, #ef4444);
}

.cf-error-msg {
  margin: 0;
  font-size: 0.85rem;
}

.cf-error-hint {
  margin: 0.25rem 0 0;
  font-size: 0.8rem;
  color: var(--text-secondary);
}
</style>
