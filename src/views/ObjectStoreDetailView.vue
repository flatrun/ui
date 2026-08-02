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
      <div class="bucket-bar">
        <span class="bucket-label">Buckets</span>
        <button
          v-for="b in buckets"
          :key="b"
          type="button"
          class="bucket-chip"
          :class="{ active: b === selectedBucket }"
          @click="selectBucket(b)"
        >
          {{ b }}
          <Icon v-if="b === backupBucket" name="shield" :size="12" title="Backup bucket (protected)" />
        </button>
        <template v-if="showNewBucket">
          <BaseInput v-model="newBucketName" placeholder="new-bucket" class="new-bucket-input" @keyup.enter="createBucket" />
          <BaseButton variant="primary" size="sm" :loading="creatingBucket" :disabled="!newBucketName" @click="createBucket">
            Create
          </BaseButton>
          <BaseButton variant="ghost" size="sm" @click="showNewBucket = false">Cancel</BaseButton>
        </template>
        <button v-else-if="canWrite" type="button" class="bucket-new" @click="showNewBucket = true">
          <Icon name="plus" :size="13" /> New bucket
        </button>
      </div>

      <div class="toolbar">
        <h2>{{ selectedBucket }}</h2>
        <span v-if="isProtected" class="protected"><Icon name="shield" :size="12" /> Backups (delete disabled)</span>
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
        <p>This bucket is empty.</p>
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
    </BaseCard>

    <div v-else-if="!resolving" class="state empty">
      <Icon name="alert-triangle" :size="26" />
      <p>Store not found.</p>
    </div>

    <AttachStoreModal :visible="showAttach" :store="store" @close="showAttach = false" />
    <ReplicateStoreModal :visible="showReplicate" :store="store" @close="showReplicate = false" />
    <ConfirmModal
      :visible="!!pendingDelete"
      title="Delete object"
      :message="pendingDelete ? `Delete “${pendingDelete.Key}” from ${selectedBucket}? This cannot be undone.` : ''"
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
import { ref, computed, onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import Icon from "@/components/base/Icon.vue";
import BaseCard from "@/components/base/BaseCard.vue";
import BaseButton from "@/components/base/BaseButton.vue";
import BaseInput from "@/components/base/BaseInput.vue";
import BaseModal from "@/components/base/BaseModal.vue";
import AttachStoreModal from "@/components/AttachStoreModal.vue";
import ReplicateStoreModal from "@/components/ReplicateStoreModal.vue";
import ConfirmModal from "@/components/ConfirmModal.vue";
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
const pendingDelete = ref<StoreObject | null>(null);

const buckets = ref<string[]>([]);
const backupBucket = ref("");
const selectedBucket = ref("");
const showNewBucket = ref(false);
const newBucketName = ref("");
const creatingBucket = ref(false);

const preview = ref<{ key: string; kind: "image" | "text"; url?: string; text?: string } | null>(null);

const kind = computed(() => store.value?.kind || "external");
const isProtected = computed(() => selectedBucket.value === backupBucket.value);

const IMAGE_EXT = ["png", "jpg", "jpeg", "gif", "webp", "svg", "bmp", "ico"];
const TEXT_EXT = ["txt", "json", "yaml", "yml", "md", "log", "csv", "xml", "html", "css", "js", "ts", "env", "sh", "conf"];

onMounted(async () => {
  try {
    const res = await backupDestinationsApi.list();
    store.value = (res.data.destinations || []).find((d) => d.name === name) || null;
  } catch (e: any) {
    notifications.error("Could not load store", e.response?.data?.error || e.message);
  } finally {
    resolving.value = false;
  }
  if (store.value) await loadBuckets();
});

async function loadBuckets() {
  try {
    const res = await objectStoresApi.listBuckets(name);
    buckets.value = res.data.buckets || [];
    backupBucket.value = res.data.backup_bucket || "";
    selectedBucket.value = buckets.value.includes(backupBucket.value)
      ? backupBucket.value
      : buckets.value[0] || backupBucket.value;
  } catch (e: any) {
    notifications.error("Could not list buckets", e.response?.data?.error || e.message);
    selectedBucket.value = store.value?.bucket || "";
  }
  await load();
}

function selectBucket(b: string) {
  selectedBucket.value = b;
  load();
}

async function createBucket() {
  const bucket = newBucketName.value.trim();
  if (!bucket) return;
  creatingBucket.value = true;
  try {
    await objectStoresApi.createBucket(name, bucket);
    showNewBucket.value = false;
    newBucketName.value = "";
    await loadBuckets();
    selectBucket(bucket);
  } catch (e: any) {
    notifications.error("Could not create bucket", e.response?.data?.error || e.message);
  } finally {
    creatingBucket.value = false;
  }
}

async function load() {
  loading.value = true;
  try {
    const res = await objectStoresApi.listObjects(name, selectedBucket.value);
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
    await objectStoresApi.uploadObject(name, file, selectedBucket.value);
    notifications.success("Uploaded", `${file.name} uploaded to ${selectedBucket.value}.`);
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
    const res = await objectStoresApi.downloadObject(name, o.Key, selectedBucket.value);
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
    await objectStoresApi.deleteObject(name, o.Key, selectedBucket.value);
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
    const res = await objectStoresApi.downloadObject(name, o.Key, selectedBucket.value, true);
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

.bucket-bar {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  flex-wrap: wrap;
  padding-bottom: var(--space-3);
  margin-bottom: var(--space-3);
  border-bottom: 1px solid var(--border-subtle);
}

.bucket-label {
  font-size: var(--text-xs);
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.03em;
}

.bucket-chip {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  padding: 0.25rem 0.6rem;
  border: 1px solid var(--border);
  border-radius: var(--radius-full);
  background: transparent;
  color: var(--text);
  font-size: var(--text-sm);
  cursor: pointer;
}

.bucket-chip:hover {
  border-color: var(--accent);
}

.bucket-chip.active {
  background: var(--accent);
  border-color: var(--accent);
  color: var(--on-accent, #fff);
}

.bucket-new {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  background: none;
  border: 1px dashed var(--border);
  border-radius: var(--radius-full);
  padding: 0.25rem 0.6rem;
  color: var(--text-muted);
  font-size: var(--text-sm);
  cursor: pointer;
}

.bucket-new:hover {
  color: var(--text);
  border-color: var(--accent);
}

.new-bucket-input {
  max-width: 180px;
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
