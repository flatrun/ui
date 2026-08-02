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
      <div class="toolbar">
        <h2>Buckets</h2>
        <span class="spacer" />
        <template v-if="showNewBucket">
          <BaseInput
            v-model="newBucketName"
            placeholder="new-bucket"
            class="new-bucket-input"
            @keyup.enter="createBucket"
          />
          <BaseButton variant="primary" size="sm" :loading="creating" :disabled="!newBucketName" @click="createBucket">
            Create
          </BaseButton>
          <BaseButton variant="ghost" size="sm" @click="showNewBucket = false">Cancel</BaseButton>
        </template>
        <BaseButton v-else-if="canWrite" variant="primary" size="sm" icon="plus" @click="showNewBucket = true">
          New bucket
        </BaseButton>
      </div>

      <div v-if="loading" class="state muted"><Icon name="loader-circle" spin :size="18" /> Loading…</div>

      <div v-else-if="!buckets.length" class="state empty">
        <Icon name="package-open" :size="28" />
        <p>No buckets yet.</p>
      </div>

      <table v-else class="bucket-table">
        <thead>
          <tr>
            <th>Bucket</th>
            <th class="num">Objects</th>
            <th class="num">Size</th>
            <th class="actions-col" />
          </tr>
        </thead>
        <tbody>
          <tr v-for="b in buckets" :key="b.name" class="bucket-row" @click="open(b)">
            <td class="bname">
              <Icon name="folder" :size="15" />
              {{ b.name }}
              <span v-if="b.is_backup" class="badge"><Icon name="shield" :size="11" /> backups</span>
            </td>
            <td class="num">{{ b.truncated ? `${b.objects.toLocaleString()}+` : b.objects.toLocaleString() }}</td>
            <td class="num">{{ formatBytes(b.size) }}{{ b.truncated ? "+" : "" }}</td>
            <td class="actions-col">
              <button class="icon-action" title="Open" @click.stop="open(b)">
                <Icon name="chevron-right" :size="16" />
              </button>
              <button
                v-if="canDelete && !b.is_backup"
                class="icon-action danger"
                title="Delete bucket"
                @click.stop="askDelete(b)"
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
      title="Delete bucket"
      :message="pendingDelete ? `Delete bucket “${pendingDelete.name}”? It must be empty. This cannot be undone.` : ''"
      variant="danger"
      confirm-text="Delete"
      :loading="deleting"
      @confirm="confirmDeleteBucket"
      @cancel="pendingDelete = null"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import Icon from "@/components/base/Icon.vue";
import BaseCard from "@/components/base/BaseCard.vue";
import BaseButton from "@/components/base/BaseButton.vue";
import BaseInput from "@/components/base/BaseInput.vue";
import AttachStoreModal from "@/components/AttachStoreModal.vue";
import ReplicateStoreModal from "@/components/ReplicateStoreModal.vue";
import ConfirmModal from "@/components/ConfirmModal.vue";
import { backupDestinationsApi, objectStoresApi, type BackupDestination, type StoreBucket } from "@/services/api";
import { useNotificationsStore } from "@/stores/notifications";
import { useAuthStore } from "@/stores/auth";

const route = useRoute();
const router = useRouter();
const notifications = useNotificationsStore();
const auth = useAuthStore();
const canWrite = auth.hasPermission("backups:write");
const canDelete = auth.hasPermission("backups:delete");
const canManage = auth.hasPermission("backups:write") || auth.hasPermission("config:write");

const name = route.params.name as string;
const store = ref<BackupDestination | null>(null);
const resolving = ref(true);
const buckets = ref<StoreBucket[]>([]);
const loading = ref(false);
const showAttach = ref(false);
const showReplicate = ref(false);
const showNewBucket = ref(false);
const newBucketName = ref("");
const creating = ref(false);
const pendingDelete = ref<StoreBucket | null>(null);
const deleting = ref(false);

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
    const res = await objectStoresApi.listBuckets(name);
    buckets.value = (res.data.buckets || []).sort((a, b) => a.name.localeCompare(b.name));
  } catch (e: any) {
    notifications.error("Could not list buckets", e.response?.data?.error || e.message);
    buckets.value = [];
  } finally {
    loading.value = false;
  }
}

function open(b: StoreBucket) {
  router.push(`/storage/object-stores/${encodeURIComponent(name)}/buckets/${encodeURIComponent(b.name)}`);
}

async function createBucket() {
  const bucket = newBucketName.value.trim();
  if (!bucket) return;
  creating.value = true;
  try {
    await objectStoresApi.createBucket(name, bucket);
    showNewBucket.value = false;
    newBucketName.value = "";
    await load();
  } catch (e: any) {
    notifications.error("Could not create bucket", e.response?.data?.error || e.message);
  } finally {
    creating.value = false;
  }
}

function askDelete(b: StoreBucket) {
  pendingDelete.value = b;
}

async function confirmDeleteBucket() {
  const b = pendingDelete.value;
  if (!b) return;
  deleting.value = true;
  try {
    await objectStoresApi.deleteBucket(name, b.name);
    buckets.value = buckets.value.filter((x) => x.name !== b.name);
    pendingDelete.value = null;
  } catch (e: any) {
    notifications.error("Could not delete bucket", e.response?.data?.error || e.message);
  } finally {
    deleting.value = false;
  }
}

function formatBytes(n: number): string {
  if (!n) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(n) / Math.log(1024));
  return `${(n / Math.pow(1024, i)).toFixed(i ? 1 : 0)} ${units[i]}`;
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

.new-bucket-input {
  max-width: 200px;
}

.state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-6);
  color: var(--text-muted);
}

.bucket-table {
  width: 100%;
  border-collapse: collapse;
  font-size: var(--text-sm);
}

.bucket-table th {
  text-align: left;
  color: var(--text-muted);
  font-weight: var(--font-medium);
  padding: 0.4rem 0.6rem;
  border-bottom: 1px solid var(--border);
}

.bucket-row {
  cursor: pointer;
}

.bucket-row:hover {
  background: var(--surface-inset);
}

.bucket-table td {
  padding: 0.5rem 0.6rem;
  border-bottom: 1px solid var(--border-subtle);
  color: var(--text);
}

.bname {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-weight: var(--font-medium);
}

.badge {
  display: inline-flex;
  align-items: center;
  gap: 0.2rem;
  font-size: var(--text-xs);
  font-weight: var(--font-semibold);
  color: var(--color-info-700);
  background: var(--color-info-50);
  padding: 0.05rem 0.4rem;
  border-radius: var(--radius-full);
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
  background: var(--surface-raised);
}

.icon-action.danger:hover {
  color: var(--color-danger-600, #dc2626);
}

.muted {
  color: var(--text-muted);
}
</style>
