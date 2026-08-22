<template>
  <div class="bucket-view">
    <nav class="crumbs">
      <button type="button" class="crumb" @click="router.push('/storage/object-stores')">Object Stores</button>
      <Icon name="chevron-right" :size="13" />
      <button type="button" class="crumb" @click="router.push(`/storage/object-stores/${encodeURIComponent(name)}`)">
        {{ name }}
      </button>
      <Icon name="chevron-right" :size="13" />
      <span class="crumb current">{{ bucket }}</span>
    </nav>

    <BaseCard>
      <div class="toolbar">
        <h2><Icon name="folder-open" :size="16" /> {{ bucket }}</h2>
        <span v-if="isProtected" class="protected"><Icon name="shield" :size="12" /> Backups (delete disabled)</span>
        <span class="spacer" />
        <span class="count muted"
          >{{ objects.length }}{{ nextToken ? "+" : "" }} object{{ objects.length === 1 ? "" : "s" }}</span
        >
        <BaseButton variant="secondary" size="sm" icon="refresh-cw" :loading="loading" @click="reload"
          >Refresh</BaseButton
        >
        <input ref="fileInput" type="file" class="hidden-file" @change="onFilePicked" />
        <BaseButton v-if="canWrite" variant="primary" size="sm" icon="upload" :loading="uploading" @click="pickFile">
          Upload
        </BaseButton>
      </div>

      <div v-if="loading && !objects.length" class="state muted">
        <Icon name="loader-circle" spin :size="18" /> Loading…
      </div>

      <div v-else-if="!objects.length" class="state empty">
        <Icon name="package-open" :size="28" />
        <p>This bucket is empty.</p>
      </div>

      <template v-else>
        <table class="obj-table">
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
              <td class="key">
                <button v-if="previewable(o.Key)" class="key-link" @click="openPreview(o)">{{ o.Key }}</button>
                <span v-else>{{ o.Key }}</span>
              </td>
              <td class="num">{{ formatBytes(o.Size) }}</td>
              <td>{{ formatTime(o.ModTime) }}</td>
              <td class="actions-col">
                <button class="icon-action" title="Download" :disabled="busyKey === o.Key" @click="download(o)">
                  <Icon name="download" :size="15" />
                </button>
                <button
                  v-if="canWrite && !isProtected"
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
        <div v-if="nextToken" class="load-more">
          <BaseButton variant="secondary" size="sm" :loading="loadingMore" @click="loadMore">Load more</BaseButton>
        </div>
      </template>
    </BaseCard>

    <ConfirmModal
      :visible="!!pendingDelete"
      title="Delete object"
      :message="pendingDelete ? `Delete “${pendingDelete.Key}” from ${bucket}? This cannot be undone.` : ''"
      variant="danger"
      confirm-text="Delete"
      :loading="!!busyKey"
      @confirm="confirmDelete"
      @cancel="pendingDelete = null"
    />

    <BaseModal :visible="!!preview" :title="preview?.key || 'Preview'" size="xl" @close="closePreview">
      <div v-if="preview" class="preview">
        <img v-if="preview.kind === 'image'" :src="preview.url" :alt="preview.key" class="preview-img" />
        <pre v-else class="preview-text">{{ preview.text }}</pre>
      </div>
    </BaseModal>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import Icon from "@/components/base/Icon.vue";
import BaseCard from "@/components/base/BaseCard.vue";
import BaseButton from "@/components/base/BaseButton.vue";
import BaseModal from "@/components/base/BaseModal.vue";
import ConfirmModal from "@/components/ConfirmModal.vue";
import { backupDestinationsApi, objectStoresApi, type StoreObject } from "@/services/api";
import { useNotificationsStore } from "@/stores/notifications";
import { useAuthStore } from "@/stores/auth";

const route = useRoute();
const router = useRouter();
const notifications = useNotificationsStore();
const auth = useAuthStore();
const canWrite = auth.hasPermission("storage:write");

const name = route.params.name as string;
const bucket = route.params.bucket as string;

const objects = ref<StoreObject[]>([]);
const nextToken = ref("");
const loading = ref(false);
const loadingMore = ref(false);
const uploading = ref(false);
const busyKey = ref<string | null>(null);
const fileInput = ref<HTMLInputElement | null>(null);
const pendingDelete = ref<StoreObject | null>(null);
const isProtected = ref(false);
const preview = ref<{ key: string; kind: "image" | "text"; url?: string; text?: string } | null>(null);

const IMAGE_EXT = ["png", "jpg", "jpeg", "gif", "webp", "svg", "bmp", "ico"];
const TEXT_EXT = [
  "txt",
  "json",
  "yaml",
  "yml",
  "md",
  "log",
  "csv",
  "xml",
  "html",
  "css",
  "js",
  "ts",
  "env",
  "sh",
  "conf",
];

onMounted(async () => {
  try {
    const res = await backupDestinationsApi.list();
    const store = (res.data.destinations || []).find((d) => d.name === name);
    isProtected.value = !!store && store.bucket === bucket;
  } catch {
    isProtected.value = false;
  }
  reload();
});

async function reload() {
  loading.value = true;
  objects.value = [];
  nextToken.value = "";
  try {
    const res = await objectStoresApi.listObjects(name, bucket);
    objects.value = res.data.objects || [];
    nextToken.value = res.data.next_token || "";
  } catch (e: any) {
    notifications.error("Could not list objects", e.response?.data?.error || e.message);
  } finally {
    loading.value = false;
  }
}

async function loadMore() {
  if (!nextToken.value) return;
  loadingMore.value = true;
  try {
    const res = await objectStoresApi.listObjects(name, bucket, nextToken.value);
    objects.value.push(...(res.data.objects || []));
    nextToken.value = res.data.next_token || "";
  } catch (e: any) {
    notifications.error("Could not load more", e.response?.data?.error || e.message);
  } finally {
    loadingMore.value = false;
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
    await objectStoresApi.uploadObject(name, file, bucket);
    notifications.success("Uploaded", `${file.name} uploaded to ${bucket}.`);
    await reload();
  } catch (e: any) {
    notifications.error("Upload failed", e.response?.data?.error || e.message);
  } finally {
    uploading.value = false;
  }
}

async function download(o: StoreObject) {
  busyKey.value = o.Key;
  try {
    const res = await objectStoresApi.downloadObject(name, o.Key, bucket);
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

function remove(o: StoreObject) {
  pendingDelete.value = o;
}

async function confirmDelete() {
  const o = pendingDelete.value;
  if (!o) return;
  busyKey.value = o.Key;
  try {
    await objectStoresApi.deleteObject(name, o.Key, bucket);
    objects.value = objects.value.filter((x) => x.Key !== o.Key);
    pendingDelete.value = null;
  } catch (e: any) {
    notifications.error("Delete failed", e.response?.data?.error || e.message);
  } finally {
    busyKey.value = null;
  }
}

function ext(key: string): string {
  return key.split(".").pop()?.toLowerCase() || "";
}

function previewable(key: string): boolean {
  const e = ext(key);
  return IMAGE_EXT.includes(e) || TEXT_EXT.includes(e);
}

async function openPreview(o: StoreObject) {
  const e = ext(o.Key);
  busyKey.value = o.Key;
  try {
    const res = await objectStoresApi.downloadObject(name, o.Key, bucket, true);
    const blob = res.data as Blob;
    if (IMAGE_EXT.includes(e)) {
      preview.value = { key: o.Key, kind: "image", url: URL.createObjectURL(blob) };
    } else {
      preview.value = { key: o.Key, kind: "text", text: await blob.text() };
    }
  } catch (err: any) {
    notifications.error("Preview failed", err.response?.data?.error || err.message);
  } finally {
    busyKey.value = null;
  }
}

function closePreview() {
  if (preview.value?.url) URL.revokeObjectURL(preview.value.url);
  preview.value = null;
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
.bucket-view {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.crumbs {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  color: var(--text-muted);
  font-size: var(--text-sm);
}

.crumb {
  background: none;
  border: none;
  padding: 0;
  color: var(--text-muted);
  cursor: pointer;
  font: inherit;
}

.crumb:hover {
  color: var(--text);
}

.crumb.current {
  color: var(--text);
  font-weight: var(--font-medium);
  cursor: default;
}

.toolbar {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  margin-bottom: var(--space-3);
}

.toolbar h2 {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  margin: 0;
  font-size: var(--text-md);
  font-weight: var(--font-semibold);
  color: var(--text);
}

.protected {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  font-size: var(--text-xs);
  color: var(--text-muted);
  background: var(--surface-inset);
  padding: 0.1rem 0.45rem;
  border-radius: var(--radius-full);
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

.key-link {
  background: none;
  border: none;
  padding: 0;
  color: var(--accent);
  font: inherit;
  cursor: pointer;
  text-align: left;
}

.key-link:hover {
  text-decoration: underline;
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

.load-more {
  display: flex;
  justify-content: center;
  padding: var(--space-3);
}

.preview {
  display: flex;
  justify-content: center;
}

.preview-img {
  max-width: 100%;
  max-height: 70vh;
  object-fit: contain;
}

.preview-text {
  width: 100%;
  max-height: 70vh;
  overflow: auto;
  margin: 0;
  padding: var(--space-3);
  background: var(--surface-inset);
  border-radius: var(--radius-sm);
  font-size: var(--text-sm);
  white-space: pre-wrap;
  word-break: break-word;
}

.muted {
  color: var(--text-muted);
}

.count {
  font-size: var(--text-sm);
}
</style>
