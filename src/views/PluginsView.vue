<template>
  <div class="plugins-view">
    <DataTable
      :items="plugins"
      :columns="columns"
      item-key="name"
      :loading="loading"
      :searchable="true"
      search-placeholder="Search apps..."
      :search-fields="['display_name', 'name', 'description', 'category', 'author']"
      :toggleable="true"
      default-view-mode="grid"
      empty-icon="pi pi-th-large"
      empty-title="No Apps Installed"
      empty-text="Browse the marketplace to deploy apps, or drop an app folder into .flatrun/plugins/."
      loading-text="Loading apps..."
    >
      <template #actions>
        <button class="btn btn-primary" @click="router.push('/marketplace')">
          <Icon name="store" :size="16" />
          Browse Marketplace
        </button>
        <button class="btn btn-icon" :disabled="loading" @click="fetchPlugins">
          <Icon name="refresh-cw" :size="16" :spin="loading" />
        </button>
      </template>

      <template #empty-action>
        <button class="btn btn-primary" @click="router.push('/marketplace')">
          <Icon name="store" :size="16" />
          Browse Marketplace
        </button>
      </template>

      <template #cell-display_name="{ item }">
        <div class="name-cell">
          <div class="plugin-logo plugin-logo--sm" :style="tintFor(item.category)">
            <Icon :name="iconFor(item.category)" :size="16" />
          </div>
          <div>
            <div class="plugin-name">{{ item.display_name }}</div>
            <div class="plugin-version">v{{ item.version }}</div>
          </div>
        </div>
      </template>

      <template #cell-enabled="{ item }">
        <span class="status-badge" :class="item.enabled ? 'enabled' : 'disabled'">
          {{ item.enabled ? "Enabled" : "Disabled" }}
        </span>
      </template>

      <template #cell-capabilities="{ item }"> {{ item.capabilities?.length || 0 }} </template>

      <template #grid="{ items }">
        <div class="plugins-grid">
          <div
            v-for="plugin in items"
            :key="plugin.name"
            class="plugin-card"
            role="button"
            tabindex="0"
            @click="openApp(plugin)"
            @keydown.enter="openApp(plugin)"
          >
            <div class="plugin-card-top">
              <div class="plugin-logo" :style="tintFor(plugin.category)">
                <Icon :name="iconFor(plugin.category)" :size="20" />
              </div>
              <span class="status-badge" :class="plugin.enabled ? 'enabled' : 'disabled'">
                {{ plugin.enabled ? "Enabled" : "Disabled" }}
              </span>
            </div>

            <h3 class="plugin-name">{{ plugin.display_name }}</h3>
            <p class="plugin-description">{{ plugin.description }}</p>

            <div class="plugin-chips">
              <span v-if="plugin.category" class="chip">{{ formatLabel(plugin.category) }}</span>
              <span v-if="plugin.capabilities?.length" class="chip chip--muted">
                {{ plugin.capabilities.length }} {{ plugin.capabilities.length === 1 ? "capability" : "capabilities" }}
              </span>
              <span class="plugin-version-chip">v{{ plugin.version }}</span>
            </div>
          </div>
        </div>
      </template>
    </DataTable>

    <Teleport to="body">
      <div v-if="selectedApp" class="drawer-overlay" @click.self="closeApp">
        <aside class="app-drawer">
          <header class="drawer-header">
            <div class="drawer-logo" :style="tintFor(selectedApp.category)">
              <Icon :name="iconFor(selectedApp.category)" :size="24" />
            </div>
            <div class="drawer-title">
              <h3>{{ selectedApp.display_name }}</h3>
              <span class="drawer-sub">v{{ selectedApp.version }} · {{ formatLabel(selectedApp.type || "app") }}</span>
            </div>
            <button class="icon-btn" @click="closeApp"><Icon name="x" :size="18" /></button>
          </header>

          <div class="drawer-body">
            <p class="drawer-description">{{ selectedApp.description }}</p>

            <section class="drawer-section">
              <h4>Capabilities</h4>
              <div v-if="selectedApp.capabilities?.length" class="cap-list">
                <span v-for="cap in selectedApp.capabilities" :key="cap" class="chip">{{ formatLabel(cap) }}</span>
              </div>
              <p v-else class="muted">This app declares no capabilities.</p>
            </section>

            <section v-if="selectedApp.api?.length" class="drawer-section">
              <h4>Endpoints</h4>
              <div class="api-list">
                <div v-for="ep in selectedApp.api" :key="ep.method + ep.path" class="api-row">
                  <span class="api-method" :class="ep.method.toLowerCase()">{{ ep.method }}</span>
                  <code>{{ ep.path }}</code>
                </div>
              </div>
            </section>

            <section class="drawer-section">
              <h4>Settings</h4>
              <div v-if="configFields(selectedApp).length" class="settings-list">
                <div v-for="f in configFields(selectedApp)" :key="f.key" class="setting-row">
                  <div class="setting-key">{{ f.label }}</div>
                  <div class="setting-type">{{ f.type }}</div>
                </div>
                <p class="muted setting-hint">Editing settings is coming with the app config flow.</p>
              </div>
              <p v-else class="muted">This app has no configurable settings.</p>
            </section>
          </div>
        </aside>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useRouter } from "vue-router";
import { usePluginsStore, type Plugin } from "@/stores/plugins";
import { storeToRefs } from "pinia";
import DataTable from "@/components/DataTable.vue";
import Icon from "@/components/base/Icon.vue";

const router = useRouter();
const pluginsStore = usePluginsStore();
const { plugins, loading } = storeToRefs(pluginsStore);
const { fetchPlugins } = pluginsStore;

const selectedApp = ref<Plugin | null>(null);
const openApp = (plugin: Plugin) => (selectedApp.value = plugin);
const closeApp = () => (selectedApp.value = null);

// Flatten a plugin's declared config_schema into label/type rows for display.
const configFields = (plugin: Plugin) => {
  const schema = plugin.config_schema;
  if (!schema || typeof schema !== "object") return [];
  return Object.entries(schema).map(([key, def]) => ({
    key,
    label: formatLabel(key),
    type: (def && typeof def === "object" && "type" in def ? String((def as any).type) : typeof def) || "string",
  }));
};

const columns = [
  { key: "display_name", label: "Name", sortable: true },
  { key: "enabled", label: "Status", sortable: true },
  { key: "type", label: "Type", sortable: true },
  { key: "category", label: "Category", sortable: true },
  { key: "capabilities", label: "Capabilities" },
];

const categoryIcons: Record<string, string> = {
  infrastructure: "server",
  monitoring: "activity",
  security: "shield",
  networking: "network",
  database: "database",
  web: "globe",
};

const categoryColors: Record<string, string> = {
  infrastructure: "#6366f1",
  monitoring: "#0ea5e9",
  security: "#f59e0b",
  networking: "#8b5cf6",
  database: "#10b981",
  web: "#3b82f6",
};

const iconFor = (category: string) => categoryIcons[category] || "puzzle";

const tintFor = (category: string) => {
  const c = categoryColors[category] || "var(--color-primary-600)";
  const isHex = c.startsWith("#");
  return { background: isHex ? `${c}1a` : "var(--surface-sunken)", color: c };
};

const formatLabel = (s: string) => s.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());

onMounted(fetchPlugins);
</script>

<style scoped>
.plugins-view {
  display: flex;
  flex-direction: column;
  gap: var(--space-5);
}

.btn {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  padding: var(--space-2) var(--space-3);
  border-radius: var(--radius-sm);
  font-weight: var(--font-medium);
  font-size: var(--text-sm);
  cursor: pointer;
  transition: all var(--transition-base);
  border: 1px solid transparent;
}

.btn-primary {
  background: var(--color-primary-500);
  color: white;
}

.btn-primary:hover {
  background: var(--color-primary-600);
}

.btn-icon {
  padding: var(--space-2);
  background: var(--surface-raised);
  border: 1px solid var(--border);
  color: var(--text-muted);
}

.btn-icon:hover:not(:disabled) {
  background: var(--surface-sunken);
}

.btn-icon:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.name-cell {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.plugin-logo {
  width: 40px;
  height: 40px;
  border-radius: var(--radius-sm);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.plugin-logo--sm {
  width: 32px;
  height: 32px;
}

.plugin-name {
  font-weight: var(--font-semibold);
  color: var(--text);
}

.plugin-version {
  font-size: var(--text-xs);
  color: var(--text-muted);
}

.status-badge {
  font-size: var(--text-xs);
  padding: 0.125rem 0.5rem;
  border-radius: var(--radius-full);
  font-weight: var(--font-semibold);
}

.status-badge.enabled {
  background: var(--color-success-50);
  color: var(--color-success-700);
}

.status-badge.disabled {
  background: var(--surface-inset);
  color: var(--text-muted);
}

.plugins-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(248px, 1fr));
  gap: var(--space-4);
}

.plugin-card {
  background: var(--surface-raised);
  border-radius: var(--radius-md);
  border: 1px solid var(--border);
  padding: var(--space-4);
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  transition: all var(--transition-base);
  cursor: pointer;
}

.plugin-card:hover {
  box-shadow: var(--shadow-md);
  border-color: var(--color-primary-300, var(--border));
}

.plugin-card-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.plugin-card .plugin-name {
  font-size: var(--text-md);
  margin: var(--space-1) 0 0 0;
}

.plugin-description {
  font-size: var(--text-sm);
  color: var(--text-muted);
  line-height: 1.45;
  margin: 0;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  min-height: 2.1em;
}

.plugin-chips {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.375rem;
  margin-top: auto;
  padding-top: var(--space-1);
}

.chip {
  font-size: var(--text-xs);
  padding: 0.125rem 0.5rem;
  border-radius: var(--radius-full);
  font-weight: var(--font-medium);
  background: var(--color-info-50, #eff6ff);
  color: var(--color-primary-700, #1d4ed8);
}

.chip--muted {
  background: var(--surface-inset);
  color: var(--text-muted);
}

.plugin-version-chip {
  margin-left: auto;
  font-size: var(--text-xs);
  background: var(--surface-inset);
  padding: 0.125rem 0.5rem;
  border-radius: var(--radius-sm);
  color: var(--text-muted);
}

@media (max-width: 640px) {
  .plugins-grid {
    grid-template-columns: 1fr;
  }
}

.drawer-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  display: flex;
  justify-content: flex-end;
  z-index: 1000;
}

.app-drawer {
  width: 100%;
  max-width: 420px;
  height: 100%;
  background: var(--surface-raised);
  border-left: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  box-shadow: var(--shadow-lg);
}

.drawer-header {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-4) var(--space-5);
  border-bottom: 1px solid var(--border-subtle);
}

.drawer-logo {
  width: 44px;
  height: 44px;
  border-radius: var(--radius-sm);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.drawer-title {
  flex: 1;
  min-width: 0;
}

.drawer-title h3 {
  margin: 0;
  font-size: var(--text-lg);
  color: var(--text);
}

.drawer-sub {
  font-size: var(--text-xs);
  color: var(--text-muted);
  text-transform: capitalize;
}

.icon-btn {
  background: none;
  border: none;
  color: var(--text-muted);
  cursor: pointer;
  display: inline-flex;
}

.drawer-body {
  padding: var(--space-5);
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: var(--space-5);
}

.drawer-description {
  margin: 0;
  color: var(--text-muted);
  font-size: var(--text-sm);
  line-height: 1.5;
}

.drawer-section h4 {
  margin: 0 0 var(--space-2) 0;
  font-size: var(--text-xs);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--text-muted);
}

.cap-list,
.settings-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.cap-list {
  flex-direction: row;
  flex-wrap: wrap;
}

.api-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.api-row {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  font-size: var(--text-xs);
}

.api-method {
  font-weight: var(--font-semibold);
  padding: 0.05rem 0.4rem;
  border-radius: var(--radius-sm);
  font-size: var(--text-xs);
}

.api-method.get {
  background: var(--color-success-50);
  color: var(--color-success-700);
}

.api-method.post,
.api-method.put {
  background: var(--color-info-50, #eff6ff);
  color: var(--color-primary-700, #1d4ed8);
}

.api-method.delete {
  background: var(--color-danger-50, #fef2f2);
  color: var(--color-danger-600, #dc2626);
}

.setting-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-2) var(--space-3);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-sm);
}

.setting-key {
  font-size: var(--text-sm);
  color: var(--text);
}

.setting-type {
  font-size: var(--text-xs);
  color: var(--text-muted);
  font-family: monospace;
}

.setting-hint {
  margin: var(--space-1) 0 0 0;
}

.muted {
  color: var(--text-muted);
  font-size: var(--text-sm);
  margin: 0;
}
</style>
