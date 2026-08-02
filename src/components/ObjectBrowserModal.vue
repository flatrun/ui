<template>
  <BaseModal
    :visible="visible"
    :title="store ? `Objects in ${store.name}` : 'Objects'"
    :subtitle="store ? `Bucket ${store.bucket}` : ''"
    size="xl"
    @close="emit('close')"
  >
    <div class="browser">
      <div class="toolbar">
        <BaseButton variant="secondary" size="sm" icon="refresh-cw" :loading="loading" @click="load">Refresh</BaseButton>
        <input ref="fileInput" type="file" class="hidden-file" @change="onFilePicked" />
        <BaseButton v-if="canWrite" variant="primary" size="sm" icon="upload" :loading="uploading" @click="pickFile">
          Upload
        </BaseButton>
        <span class="spacer" />
        <span class="count muted">{{ objects.length }} object{{ objects.length === 1 ? "" : "s" }}</span>
      </div>

      <div v-if="loading" class="state muted"><Icon name="loader-circle" spin :size="18" /> Loading…</div>

      <div v-else-if="!objects.length" class="state empty">
        <Icon name="package-open" :size="26" />
        <p>This store is empty.</p>
      </div>

      <table v-else class="obj-table">
        <thead>
          <tr>
            <th>Key</th>
            <th class="num">Size</th>
            <th>Modified</th>
            <th class="actions-col" />
          </tr>
        </thead>
        <tbody>
          <tr v-for="o in objects" :key="o.Key">
            <td class="key">{{ o.Key }}</td>
            <td class="num">{{ formatBytes(o.Size) }}</td>
            <td>{{ formatTime(o.ModTime) }}</td>
            <td class="actions-col">
              <button class="icon-action" title="Download" :disabled="busyKey === o.Key" @click="download(o)">
                <Icon name="download" :size="15" />
              </button>
              <button
                v-if="canWrite"
                class="icon-action danger"
                title="Delete"
                :disabled="busyKey === o.Key"
                @click="remove(o)"
              >
                <Icon name="trash-2" :size="15" />
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </BaseModal>
</template>

<script setup lang="ts">
import { ref, watch } from "vue";
import BaseModal from "@/components/base/BaseModal.vue";
import BaseButton from "@/components/base/BaseButton.vue";
import Icon from "@/components/base/Icon.vue";
import { objectStoresApi, type BackupDestination, type StoreObject } from "@/services/api";
import { useNotificationsStore } from "@/stores/notifications";
import { useAuthStore } from "@/stores/auth";

const props = defineProps<{ visible: boolean; store: BackupDestination | null }>();
const emit = defineEmits(["close"]);

const notifications = useNotificationsStore();
const auth = useAuthStore();
const canWrite = auth.hasPermission("backups:write");

const objects = ref<StoreObject[]>([]);
const loading = ref(false);
const uploading = ref(false);
const busyKey = ref<string | null>(null);
const fileInput = ref<HTMLInputElement | null>(null);

watch(
  () => props.visible,
  (open) => {
    if (open && props.store) load();
    else objects.value = [];
  },
);

async function load() {
  if (!props.store) return;
  loading.value = true;
  try {
    const res = await objectStoresApi.listObjects(props.store.name);
    objects.value = (res.data.objects || []).sort((a, b) => b.ModTime.localeCompare(a.ModTime));
  } catch (e: any) {
    notifications.error("Could not list objects", e.response?.data?.error || e.message);
    objects.value = [];
  } finally {
    loading.value = false;
  }
}

function pickFile() {
  fileInput.value?.click();
}

async function onFilePicked(e: Event) {
  const input = e.target as HTMLInputElement;
  const file = input.files?.[0];
  input.value = "";
  if (!file || !props.store) return;
  uploading.value = true;
  try {
    await objectStoresApi.uploadObject(props.store.name, file);
    notifications.success("Uploaded", `${file.name} uploaded to ${props.store.name}.`);
    await load();
  } catch (e: any) {
    notifications.error("Upload failed", e.response?.data?.error || e.message);
  } finally {
    uploading.value = false;
  }
}

async function download(o: StoreObject) {
  if (!props.store) return;
  busyKey.value = o.Key;
  try {
    const res = await objectStoresApi.downloadObject(props.store.name, o.Key);
    const url = URL.createObjectURL(res.data as Blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = o.Key.split("/").pop() || o.Key;
    a.click();
    URL.revokeObjectURL(url);
  } catch (e: any) {
    notifications.error("Download failed", e.response?.data?.error || e.message);
  } finally {
    busyKey.value = null;
  }
}

async function remove(o: StoreObject) {
  if (!props.store) return;
  busyKey.value = o.Key;
  try {
    await objectStoresApi.deleteObject(props.store.name, o.Key);
    objects.value = objects.value.filter((x) => x.Key !== o.Key);
  } catch (e: any) {
    notifications.error("Delete failed", e.response?.data?.error || e.message);
  } finally {
    busyKey.value = null;
  }
}

function formatBytes(n: number): string {
  if (!n) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(n) / Math.log(1024));
  return `${(n / Math.pow(1024, i)).toFixed(i ? 1 : 0)} ${units[i]}`;
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  const diff = (Date.now() - d.getTime()) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return d.toLocaleDateString();
}
</script>

<style scoped>
.browser {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  min-height: 200px;
}

.toolbar {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.spacer {
  flex: 1;
}

.hidden-file {
  display: none;
}

.state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-6);
  color: var(--text-muted);
}

.obj-table {
  width: 100%;
  border-collapse: collapse;
  font-size: var(--text-sm);
}

.obj-table th {
  text-align: left;
  color: var(--text-muted);
  font-weight: var(--font-medium);
  padding: 0.4rem 0.6rem;
  border-bottom: 1px solid var(--border);
}

.obj-table td {
  padding: 0.45rem 0.6rem;
  border-bottom: 1px solid var(--border-subtle);
  color: var(--text);
}

.obj-table .key {
  font-family: var(--font-mono, monospace);
  word-break: break-all;
}

.num {
  text-align: right;
  white-space: nowrap;
}

.actions-col {
  text-align: right;
  white-space: nowrap;
  width: 1%;
}

.icon-action {
  background: none;
  border: none;
  color: var(--text-muted);
  cursor: pointer;
  padding: 0.2rem 0.35rem;
  border-radius: var(--radius-sm);
}

.icon-action:hover {
  color: var(--text);
  background: var(--surface-inset);
}

.icon-action.danger:hover {
  color: var(--color-danger-600, #dc2626);
}

.icon-action:disabled {
  opacity: 0.5;
  cursor: default;
}

.muted {
  color: var(--text-muted);
}

.count {
  font-size: var(--text-sm);
}
</style>
