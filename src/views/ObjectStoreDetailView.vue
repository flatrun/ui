<template>
  <div class="store-detail">
    <header class="page-header">
      <button type="button" class="back" @click="router.push('/storage/object-stores')">
        <Icon name="arrow-left" :size="16" /> Object Stores
      </button>
      <div v-if="store" class="head-main">
        <div class="title-row">
          <Icon name="container" :size="20" />
          <h1>{{ store.name }}</h1>
          <span class="store-kind" :class="kind">{{ kind === "managed" ? "Managed" : "External" }}</span>
          <span class="store-state" :class="store.enabled === false ? 'off' : 'on'">
            {{ store.enabled === false ? "Disabled" : "Active" }}
          </span>
        </div>
        <dl class="meta">
          <dt>Bucket</dt>
          <dd>{{ store.bucket }}</dd>
          <dt>Endpoint</dt>
          <dd>{{ store.endpoint || "AWS default" }}</dd>
          <dt>Region</dt>
          <dd>{{ store.region || "—" }}</dd>
        </dl>
        <div v-if="canManage" class="head-actions">
          <BaseButton variant="secondary" size="sm" icon="plug" @click="showAttach = true">Use in app</BaseButton>
          <BaseButton variant="secondary" size="sm" icon="copy" @click="showReplicate = true">Replicate</BaseButton>
        </div>
      </div>
    </header>

    <BaseCard v-if="store">
      <div class="toolbar">
        <h2>Objects</h2>
        <span class="spacer" />
        <span class="count muted">{{ objects.length }} object{{ objects.length === 1 ? "" : "s" }}</span>
        <BaseButton variant="secondary" size="sm" icon="refresh-cw" :loading="loading" @click="load">Refresh</BaseButton>
        <input ref="fileInput" type="file" class="hidden-file" @change="onFilePicked" />
        <BaseButton v-if="canWrite" variant="primary" size="sm" icon="upload" :loading="uploading" @click="pickFile">
          Upload
        </BaseButton>
      </div>

      <div v-if="loading" class="state muted"><Icon name="loader-circle" spin :size="18" /> Loading…</div>

      <div v-else-if="!objects.length" class="state empty">
        <Icon name="package-open" :size="28" />
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
    </BaseCard>

    <div v-else-if="!resolving" class="state empty">
      <Icon name="alert-triangle" :size="26" />
      <p>Store not found.</p>
    </div>

    <AttachStoreModal :visible="showAttach" :store="store" @close="showAttach = false" />
    <ReplicateStoreModal :visible="showReplicate" :store="store" @close="showReplicate = false" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import Icon from "@/components/base/Icon.vue";
import BaseCard from "@/components/base/BaseCard.vue";
import BaseButton from "@/components/base/BaseButton.vue";
import AttachStoreModal from "@/components/AttachStoreModal.vue";
import ReplicateStoreModal from "@/components/ReplicateStoreModal.vue";
import { backupDestinationsApi, objectStoresApi, type BackupDestination, type StoreObject } from "@/services/api";
import { useNotificationsStore } from "@/stores/notifications";
import { useAuthStore } from "@/stores/auth";

const route = useRoute();
const router = useRouter();
const notifications = useNotificationsStore();
const auth = useAuthStore();
const canWrite = auth.hasPermission("backups:write");
const canManage = auth.hasPermission("backups:write") || auth.hasPermission("config:write");

const name = route.params.name as string;
const store = ref<BackupDestination | null>(null);
const resolving = ref(true);
const objects = ref<StoreObject[]>([]);
const loading = ref(false);
const uploading = ref(false);
const busyKey = ref<string | null>(null);
const fileInput = ref<HTMLInputElement | null>(null);
const showAttach = ref(false);
const showReplicate = ref(false);

const kind = computed(() => store.value?.kind || "external");

onMounted(async () => {
  try {
    const res = await backupDestinationsApi.list();
    store.value = (res.data.destinations || []).find((d) => d.name === name) || null;
  } catch (e: any) {
    notifications.error("Could not load store", e.response?.data?.error || e.message);
  } finally {
    resolving.value = false;
  }
  if (store.value) load();
});

async function load() {
  loading.value = true;
  try {
    const res = await objectStoresApi.listObjects(name);
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
  if (!file) return;
  uploading.value = true;
  try {
    await objectStoresApi.uploadObject(name, file);
    notifications.success("Uploaded", `${file.name} uploaded.`);
    await load();
  } catch (e: any) {
    notifications.error("Upload failed", e.response?.data?.error || e.message);
  } finally {
    uploading.value = false;
  }
}

async function download(o: StoreObject) {
  busyKey.value = o.Key;
  try {
    const res = await objectStoresApi.downloadObject(name, o.Key);
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
  busyKey.value = o.Key;
  try {
    await objectStoresApi.deleteObject(name, o.Key);
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
.store-detail {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.back {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  background: none;
  border: none;
  color: var(--text-muted);
  font-size: var(--text-sm);
  cursor: pointer;
  padding: 0;
  margin-bottom: var(--space-3);
}

.back:hover {
  color: var(--text);
}

.title-row {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.title-row h1 {
  margin: 0;
  font-size: var(--text-xl);
  font-weight: var(--font-bold);
  color: var(--text);
}

.store-kind,
.store-state {
  font-size: var(--text-xs);
  font-weight: var(--font-semibold);
  padding: 0.05rem 0.45rem;
  border-radius: var(--radius-full);
}

.store-kind.external {
  background: var(--surface-inset);
  color: var(--text-muted);
}

.store-kind.managed {
  background: var(--color-info-50);
  color: var(--color-info-700);
}

.store-state.on {
  background: var(--color-success-50);
  color: var(--color-success-700);
}

.store-state.off {
  background: var(--surface-inset);
  color: var(--text-muted);
}

.meta {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 0.25rem 1rem;
  margin: var(--space-3) 0;
  max-width: 640px;
}

.meta dt {
  color: var(--text-muted);
  font-size: var(--text-xs);
}

.meta dd {
  margin: 0;
  color: var(--text);
  font-size: var(--text-sm);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.head-actions {
  display: flex;
  gap: var(--space-2);
}

.toolbar {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  margin-bottom: var(--space-3);
}

.toolbar h2 {
  margin: 0;
  font-size: var(--text-md);
  font-weight: var(--font-semibold);
  color: var(--text);
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
