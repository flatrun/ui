<template>
  <div class="object-stores-view">
    <header class="page-header">
      <div>
        <h1>Object Stores</h1>
        <p>S3-compatible storage for backups and deployment data.</p>
      </div>
    </header>

    <div class="subtabs">
      <button v-for="t in tabs" :key="t.id" class="subtab" :class="{ active: tab === t.id }" @click="tab = t.id">
        <Icon :name="t.icon" :size="15" />
        {{ t.label }}
      </button>
    </div>

    <div v-if="tab === 'overview'" class="tab-panel">
      <BaseCard title="Local object store" icon="hard-drive">
        <p class="body">
          Run FlatRun as its own S3-compatible endpoint so deployments can store and serve objects locally, then browse
          and replicate them. This is on the roadmap; for now, connect external stores below.
        </p>
        <span class="roadmap-tag">Coming soon</span>
      </BaseCard>

      <section class="stores-section">
        <div class="section-head">
          <h2>Connected stores</h2>
          <BaseButton v-if="canManage" variant="secondary" size="sm" icon="settings" @click="tab = 'settings'">
            Manage
          </BaseButton>
        </div>

        <div v-if="loading" class="muted"><Icon name="loader-circle" spin :size="18" /></div>

        <div v-else-if="!destinations.length" class="empty">
          <Icon name="container" :size="28" />
          <p>No object stores connected yet.</p>
          <BaseButton v-if="canManage" variant="primary" size="sm" icon="plus" @click="tab = 'settings'">
            Add a store
          </BaseButton>
        </div>

        <div v-else class="store-grid">
          <BaseCard v-for="d in destinations" :key="d.name">
            <div class="store-top">
              <Icon name="container" :size="16" />
              <span class="store-name">{{ d.name }}</span>
              <span class="store-state" :class="d.enabled === false ? 'off' : 'on'">
                {{ d.enabled === false ? "Disabled" : "Active" }}
              </span>
            </div>
            <dl class="store-meta">
              <dt>Bucket</dt>
              <dd>{{ d.bucket }}</dd>
              <dt>Endpoint</dt>
              <dd>{{ d.endpoint || "AWS default" }}</dd>
            </dl>
          </BaseCard>
        </div>
      </section>
    </div>

    <div v-else class="tab-panel">
      <StorageBackupsSettings />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted } from "vue";
import Icon from "@/components/base/Icon.vue";
import BaseCard from "@/components/base/BaseCard.vue";
import BaseButton from "@/components/base/BaseButton.vue";
import StorageBackupsSettings from "@/components/StorageBackupsSettings.vue";
import { backupDestinationsApi, type BackupDestination } from "@/services/api";
import { useAuthStore } from "@/stores/auth";

const auth = useAuthStore();
const canManage = auth.hasPermission("backups:write") || auth.hasPermission("config:write");

const tabs = [
  { id: "overview", label: "Overview", icon: "layout-grid" },
  { id: "settings", label: "Settings", icon: "settings" },
];
const tab = ref("overview");

const destinations = ref<BackupDestination[]>([]);
const loading = ref(true);

async function load() {
  loading.value = true;
  try {
    const res = await backupDestinationsApi.list();
    destinations.value = res.data.destinations || [];
  } catch {
    destinations.value = [];
  } finally {
    loading.value = false;
  }
}

watch(tab, (t) => {
  if (t === "overview") load();
});

onMounted(load);
</script>

<style scoped>
.object-stores-view {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.page-header h1 {
  margin: 0;
  font-size: var(--text-xl);
  font-weight: var(--font-bold);
  color: var(--text);
}

.page-header p {
  margin: 0.25rem 0 0;
  color: var(--text-muted);
  font-size: var(--text-sm);
}

.subtabs {
  display: flex;
  gap: 0.25rem;
  border-bottom: 1px solid var(--border);
}

.subtab {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.6rem 0.9rem;
  background: transparent;
  border: none;
  border-bottom: 2px solid transparent;
  color: var(--text-muted);
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  cursor: pointer;
  margin-bottom: -1px;
}

.subtab:hover {
  color: var(--text);
}

.subtab.active {
  color: var(--accent);
  border-bottom-color: var(--accent);
}

.tab-panel {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.body {
  margin: 0 0 var(--space-3);
  color: var(--text-muted);
  font-size: var(--text-sm);
}

.roadmap-tag {
  display: inline-flex;
  padding: 0.15rem 0.5rem;
  border-radius: var(--radius-full);
  background: var(--color-info-50);
  color: var(--color-info-700);
  font-size: var(--text-xs);
  font-weight: var(--font-semibold);
}

.section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--space-3);
}

.section-head h2 {
  margin: 0;
  font-size: var(--text-md);
  font-weight: var(--font-semibold);
  color: var(--text);
}

.empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-6);
  color: var(--text-muted);
  border: 1px dashed var(--border);
  border-radius: var(--radius-md);
}

.store-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: var(--space-3);
}

.store-top {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  color: var(--text);
}

.store-name {
  font-weight: var(--font-semibold);
}

.store-state {
  margin-left: auto;
  font-size: var(--text-xs);
  font-weight: var(--font-semibold);
  padding: 0.05rem 0.45rem;
  border-radius: var(--radius-full);
}

.store-state.on {
  background: var(--color-success-50);
  color: var(--color-success-700);
}

.store-state.off {
  background: var(--surface-inset);
  color: var(--text-muted);
}

.store-meta {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 0.25rem 0.75rem;
  margin: var(--space-3) 0 0;
}

.store-meta dt {
  color: var(--text-muted);
  font-size: var(--text-xs);
}

.store-meta dd {
  margin: 0;
  color: var(--text);
  font-size: var(--text-sm);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.muted {
  color: var(--text-muted);
  font-size: var(--text-sm);
}
</style>
