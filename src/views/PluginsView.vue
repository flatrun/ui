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
      empty-text="Extend Flatrun's functionality by installing apps from the marketplace."
      loading-text="Loading apps..."
    >
      <template #actions>
        <button class="btn btn-primary" @click="showInstallModal = true">
          <i class="pi pi-plus" />
          Install App
        </button>
        <button class="btn btn-icon" :disabled="loading" @click="fetchPlugins">
          <i class="pi pi-refresh" :class="{ 'pi-spin': loading }" />
        </button>
      </template>

      <template #empty-action>
        <button class="btn btn-primary" @click="showInstallModal = true">
          <i class="pi pi-plus" />
          Install App
        </button>
      </template>

      <template #cell-display_name="{ item }">
        <div class="name-cell">
          <div class="plugin-icon-sm">
            <i :class="getPluginIcon(item.category)" />
          </div>
          <div>
            <div class="plugin-name">
              {{ item.display_name }}
            </div>
            <div class="plugin-version">v{{ item.version }}</div>
          </div>
        </div>
      </template>

      <template #cell-enabled="{ item }">
        <span class="status-badge" :class="item.enabled ? 'enabled' : 'disabled'">
          {{ item.enabled ? "Enabled" : "Disabled" }}
        </span>
      </template>

      <template #cell-capabilities="{ item }"> {{ item.capabilities?.length || 0 }} capabilities </template>

      <template #cell-actions>
        <div class="table-actions">
          <button class="btn-icon-xs" title="Configure">
            <i class="pi pi-cog" />
          </button>
          <button class="btn-icon-xs danger" title="Uninstall">
            <i class="pi pi-trash" />
          </button>
        </div>
      </template>

      <template #grid="{ items }">
        <div class="plugins-grid">
          <div v-for="plugin in items" :key="plugin.name" class="plugin-card">
            <div class="plugin-header">
              <div class="plugin-icon">
                <i :class="getPluginIcon(plugin.category)" />
              </div>
              <div class="plugin-meta">
                <h4>{{ plugin.display_name }}</h4>
                <span class="plugin-version">v{{ plugin.version }}</span>
              </div>
              <div class="plugin-status">
                <span class="status-badge" :class="plugin.enabled ? 'enabled' : 'disabled'">
                  {{ plugin.enabled ? "Enabled" : "Disabled" }}
                </span>
              </div>
            </div>

            <div class="plugin-body">
              <p class="plugin-description">
                {{ plugin.description }}
              </p>

              <div class="plugin-info-grid">
                <div class="info-item">
                  <span class="info-label">Type</span>
                  <span class="info-value">{{ plugin.type }}</span>
                </div>
                <div class="info-item">
                  <span class="info-label">Category</span>
                  <span class="info-value">{{ plugin.category }}</span>
                </div>
                <div class="info-item">
                  <span class="info-label">Author</span>
                  <span class="info-value">{{ plugin.author }}</span>
                </div>
              </div>

              <div v-if="plugin.capabilities?.length" class="capabilities-section">
                <span class="section-label">Capabilities</span>
                <div class="capabilities-list">
                  <span v-for="cap in plugin.capabilities" :key="cap" class="capability-tag">
                    {{ formatCapability(cap) }}
                  </span>
                </div>
              </div>

              <div v-if="plugin.dashboard_extensions?.length" class="extensions-section">
                <span class="section-label">Dashboard Extensions</span>
                <div class="extensions-list">
                  <div v-for="ext in plugin.dashboard_extensions" :key="ext.location" class="extension-item">
                    <i class="pi pi-puzzle-piece" />
                    <span>{{ ext.component }}</span>
                    <span class="extension-location">@ {{ ext.location }}</span>
                  </div>
                </div>
              </div>

              <div v-if="plugin.api?.length" class="api-section">
                <span class="section-label">API Endpoints ({{ plugin.api.length }})</span>
                <div class="api-list">
                  <div v-for="endpoint in plugin.api.slice(0, 3)" :key="endpoint.path" class="api-item">
                    <span class="api-method" :class="endpoint.method.toLowerCase()">
                      {{ endpoint.method }}
                    </span>
                    <code>{{ endpoint.path }}</code>
                  </div>
                  <div v-if="plugin.api.length > 3" class="api-more">+{{ plugin.api.length - 3 }} more endpoints</div>
                </div>
              </div>
            </div>

            <div class="plugin-footer">
              <button class="btn btn-sm btn-secondary">
                <i class="pi pi-cog" />
                Configure
              </button>
              <button class="btn btn-sm btn-danger">
                <i class="pi pi-trash" />
                Uninstall
              </button>
            </div>
          </div>
        </div>
      </template>
    </DataTable>

    <Teleport to="body">
      <div v-if="showInstallModal" class="modal-overlay" @click.self="showInstallModal = false">
        <div class="modal-container">
          <div class="modal-header">
            <h3>
              <i class="pi pi-download" />
              Install App
            </h3>
            <button class="close-btn" @click="showInstallModal = false">
              <i class="pi pi-times" />
            </button>
          </div>
          <div class="modal-body">
            <p>App installation from marketplace coming soon.</p>
            <p class="hint">
              For now, manually place app folders in
              <code>.flatrun/plugins/</code>
            </p>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" @click="showInstallModal = false">Close</button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import { usePluginsStore } from "@/stores/plugins";
import { storeToRefs } from "pinia";
import DataTable from "@/components/DataTable.vue";

const pluginsStore = usePluginsStore();
const { plugins, loading } = storeToRefs(pluginsStore);
const { fetchPlugins } = pluginsStore;

const showInstallModal = ref(false);

const columns = [
  { key: "display_name", label: "Name", sortable: true },
  { key: "enabled", label: "Status", sortable: true },
  { key: "type", label: "Type", sortable: true },
  { key: "category", label: "Category", sortable: true },
  { key: "author", label: "Author", sortable: true },
  { key: "capabilities", label: "Capabilities" },
  { key: "actions", label: "Actions", width: "100px" },
];

const getPluginIcon = (category: string) => {
  const icons: Record<string, string> = {
    infrastructure: "pi pi-server",
    monitoring: "pi pi-chart-line",
    security: "pi pi-shield",
    database: "pi pi-database",
    web: "pi pi-globe",
  };
  return icons[category] || "pi pi-puzzle-piece";
};

const formatCapability = (cap: string) => {
  return cap.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
};

onMounted(() => {
  fetchPlugins();
});
</script>

<style scoped>
.plugins-view {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.btn {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.625rem 1.25rem;
  border-radius: 8px;
  font-weight: 500;
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.2s;
  border: none;
}

.btn-sm {
  padding: 0.5rem 1rem;
  font-size: 0.8125rem;
}

.btn-primary {
  background: #3b82f6;
  color: white;
}

.btn-primary:hover {
  background: #2563eb;
}

.btn-secondary {
  background: #f3f4f6;
  border: 1px solid #d1d5db;
  color: #374151;
}

.btn-secondary:hover {
  background: #e5e7eb;
}

.btn-danger {
  background: #fee2e2;
  color: #dc2626;
}

.btn-danger:hover {
  background: #fecaca;
}

.btn-icon {
  padding: 0.625rem;
  background: white;
  border: 1px solid #e5e7eb;
  color: #6b7280;
}

.btn-icon:hover:not(:disabled) {
  background: #f9fafb;
}

.btn-icon:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-icon-xs {
  padding: 0.25rem;
  background: none;
  border: none;
  color: #9ca3af;
  cursor: pointer;
  border-radius: 4px;
  transition: all 0.2s;
}

.btn-icon-xs:hover {
  background: #f3f4f6;
  color: #6b7280;
}

.btn-icon-xs.danger:hover {
  background: #fee2e2;
  color: #dc2626;
}

.table-actions {
  display: flex;
  gap: 0.5rem;
}

.name-cell {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.plugin-icon-sm {
  width: 32px;
  height: 32px;
  background: #eff6ff;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.plugin-icon-sm i {
  font-size: 0.875rem;
  color: #3b82f6;
}

.plugin-name {
  font-weight: 600;
  color: #1f2937;
}

.plugin-version {
  font-size: 0.75rem;
  color: #6b7280;
}

.status-badge {
  font-size: 0.6875rem;
  padding: 0.25rem 0.5rem;
  border-radius: 9999px;
  font-weight: 600;
}

.status-badge.enabled {
  background: #dcfce7;
  color: #166534;
}

.status-badge.disabled {
  background: #f3f4f6;
  color: #6b7280;
}

.plugins-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(450px, 1fr));
  gap: 1.5rem;
}

.plugin-card {
  background: white;
  border-radius: 16px;
  border: 1px solid #e5e7eb;
  overflow: hidden;
  transition: all 0.3s ease;
}

.plugin-card:hover {
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
}

.plugin-header {
  padding: 1.25rem;
  border-bottom: 1px solid #f3f4f6;
  display: flex;
  align-items: center;
  gap: 1rem;
}

.plugin-icon {
  width: 48px;
  height: 48px;
  background: #eff6ff;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.plugin-icon i {
  font-size: 1.25rem;
  color: #3b82f6;
}

.plugin-meta {
  flex: 1;
}

.plugin-meta h4 {
  margin: 0 0 0.25rem 0;
  font-size: 1rem;
  color: #1f2937;
}

.plugin-body {
  padding: 1.25rem;
}

.plugin-description {
  font-size: 0.875rem;
  color: #6b7280;
  line-height: 1.5;
  margin: 0 0 1rem 0;
}

.plugin-info-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.75rem;
  margin-bottom: 1rem;
}

.info-item {
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
}

.info-label {
  font-size: 0.6875rem;
  color: #6b7280;
  text-transform: uppercase;
  font-weight: 600;
}

.info-value {
  font-size: 0.8125rem;
  color: #1f2937;
  font-weight: 500;
  text-transform: capitalize;
}

.section-label {
  display: block;
  font-size: 0.6875rem;
  color: #6b7280;
  text-transform: uppercase;
  font-weight: 600;
  margin-bottom: 0.5rem;
}

.capabilities-section,
.extensions-section,
.api-section {
  margin-bottom: 1rem;
}

.capabilities-list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.375rem;
}

.capability-tag {
  font-size: 0.6875rem;
  padding: 0.125rem 0.5rem;
  background: #dbeafe;
  color: #1e40af;
  border-radius: 9999px;
  font-weight: 500;
}

.extensions-list {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
}

.extension-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.8125rem;
  color: #374151;
}

.extension-item i {
  color: #9ca3af;
  font-size: 0.75rem;
}

.extension-location {
  font-size: 0.6875rem;
  color: #9ca3af;
}

.api-list {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
}

.api-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.75rem;
}

.api-method {
  padding: 0.125rem 0.375rem;
  border-radius: 4px;
  font-weight: 600;
  font-size: 0.625rem;
}

.api-method.get {
  background: #dcfce7;
  color: #166534;
}

.api-method.post {
  background: #dbeafe;
  color: #1e40af;
}

.api-method.put {
  background: #fef3c7;
  color: #92400e;
}

.api-method.delete {
  background: #fee2e2;
  color: #991b1b;
}

.api-item code {
  font-family: "SF Mono", monospace;
  color: #6b7280;
}

.api-more {
  font-size: 0.6875rem;
  color: #9ca3af;
}

.plugin-footer {
  padding: 1rem 1.25rem;
  border-top: 1px solid #f3f4f6;
  display: flex;
  gap: 0.5rem;
}

.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 2rem;
}

.modal-container {
  background: white;
  border-radius: 16px;
  width: 100%;
  max-width: 500px;
  box-shadow: 0 25px 50px rgba(0, 0, 0, 0.25);
}

.modal-header {
  padding: 1.25rem 1.5rem;
  border-bottom: 1px solid #e5e7eb;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.modal-header h3 {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 1.125rem;
  font-weight: 600;
  color: #1f2937;
  margin: 0;
}

.modal-header h3 i {
  color: #3b82f6;
}

.close-btn {
  background: none;
  border: none;
  color: #9ca3af;
  cursor: pointer;
  padding: 0.5rem;
  border-radius: 6px;
}

.close-btn:hover {
  background: #f3f4f6;
}

.modal-body {
  padding: 1.5rem;
}

.modal-body p {
  margin: 0 0 0.5rem 0;
  color: #374151;
}

.hint {
  font-size: 0.875rem;
  color: #6b7280;
}

.hint code {
  background: #f3f4f6;
  padding: 0.125rem 0.375rem;
  border-radius: 4px;
  font-family: monospace;
}

.modal-footer {
  padding: 1rem 1.5rem;
  border-top: 1px solid #e5e7eb;
  display: flex;
  justify-content: flex-end;
}

@media (max-width: 768px) {
  .plugins-grid {
    grid-template-columns: 1fr;
  }
}
</style>
