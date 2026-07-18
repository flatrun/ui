<template>
  <div class="dashboards-view">
    <div class="view-header">
      <div>
        <h1>Dashboards</h1>
        <p class="subtitle">Build your own views over container and serving metrics.</p>
      </div>
      <button class="btn btn-primary" @click="showCreate = true">
        <Icon name="plus" :size="16" />
        New dashboard
      </button>
    </div>

    <div v-if="loading" class="empty-state">Loading dashboards</div>
    <div v-else-if="error" class="empty-state error">{{ error }}</div>
    <div v-else-if="dashboards.length === 0" class="empty-state">
      <Icon name="layout-dashboard" :size="32" />
      <p>No dashboards yet</p>
      <span>Create one to arrange the metrics you care about.</span>
    </div>

    <div v-else class="dashboard-grid">
      <div v-for="d in dashboards" :key="d.id" class="dashboard-card" @click="open(d)">
        <div class="card-main">
          <Icon name="layout-dashboard" :size="18" />
          <span class="card-name">{{ d.name }}</span>
        </div>
        <div class="card-foot">
          <span>{{ d.panels.length }} {{ d.panels.length === 1 ? "panel" : "panels" }}</span>
          <button class="icon-btn" title="Delete dashboard" @click.stop="remove(d)">
            <Icon name="trash-2" :size="15" />
          </button>
        </div>
      </div>
    </div>

    <Teleport to="body">
      <div v-if="showCreate" class="modal-overlay" @click.self="showCreate = false">
        <div class="modal-dialog">
          <div class="modal-header">
            <h3>New dashboard</h3>
            <button class="icon-btn" @click="showCreate = false"><Icon name="x" :size="16" /></button>
          </div>
          <div class="modal-body">
            <label>Name</label>
            <input
              v-model="newName"
              type="text"
              class="form-input"
              placeholder="Production overview"
              @keyup.enter="create"
            />
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" @click="showCreate = false">Cancel</button>
            <button class="btn btn-primary" :disabled="!newName.trim() || creating" @click="create">Create</button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useRouter } from "vue-router";
import Icon from "@/components/base/Icon.vue";
import { dashboardsApi, type Dashboard } from "@/services/api";

const router = useRouter();
const dashboards = ref<Dashboard[]>([]);
const loading = ref(false);
const error = ref("");
const showCreate = ref(false);
const newName = ref("");
const creating = ref(false);

async function fetchDashboards() {
  loading.value = true;
  error.value = "";
  try {
    const { data } = await dashboardsApi.list();
    dashboards.value = data.dashboards || [];
  } catch (e: any) {
    error.value = e.response?.data?.error || e.message || "Failed to load dashboards";
  } finally {
    loading.value = false;
  }
}

function open(d: Dashboard) {
  router.push(`/dashboards/${d.id}`);
}

async function create() {
  if (!newName.value.trim()) return;
  creating.value = true;
  try {
    const { data } = await dashboardsApi.save({ name: newName.value.trim(), panels: [] });
    showCreate.value = false;
    newName.value = "";
    router.push(`/dashboards/${data.id}`);
  } catch (e: any) {
    error.value = e.response?.data?.error || e.message || "Failed to create dashboard";
  } finally {
    creating.value = false;
  }
}

async function remove(d: Dashboard) {
  if (!d.id || !confirm(`Delete dashboard "${d.name}"?`)) return;
  try {
    await dashboardsApi.remove(d.id);
    dashboards.value = dashboards.value.filter((x) => x.id !== d.id);
  } catch (e: any) {
    error.value = e.response?.data?.error || e.message || "Failed to delete dashboard";
  }
}

onMounted(fetchDashboards);
</script>

<style scoped>
.dashboards-view {
  padding: 1.5rem;
}
.view-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 1.5rem;
}
.view-header h1 {
  margin: 0;
  font-size: 1.5rem;
}
.subtitle {
  margin: 0.25rem 0 0;
  color: var(--text-muted);
  font-size: 0.875rem;
}
.dashboard-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 1rem;
}
.dashboard-card {
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  background: var(--surface-raised);
  padding: 1rem;
  cursor: pointer;
  transition: border-color 0.15s;
}
.dashboard-card:hover {
  border-color: var(--primary, #6366f1);
}
.card-main {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: 600;
}
.card-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 0.75rem;
  font-size: 0.8rem;
  color: var(--text-muted);
}
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  padding: 3rem;
  color: var(--text-muted);
  text-align: center;
}
.empty-state.error {
  color: var(--danger, #ef4444);
}
.icon-btn {
  display: inline-flex;
  padding: 0.25rem;
  border: none;
  background: transparent;
  color: var(--text-muted);
  cursor: pointer;
  border-radius: var(--radius-sm);
}
.icon-btn:hover {
  color: var(--text);
}
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 1rem;
}
.modal-dialog {
  background: var(--surface-raised);
  border: 1px solid var(--border);
  border-radius: var(--radius-xl);
  width: 100%;
  max-width: 420px;
}
.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 1.25rem;
  border-bottom: 1px solid var(--border);
}
.modal-header h3 {
  margin: 0;
  font-size: 1rem;
}
.modal-body {
  padding: 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
.modal-body label {
  font-size: 0.8rem;
  color: var(--text-muted);
}
.form-input {
  padding: 0.5rem 0.75rem;
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  background: var(--surface-inset);
  color: var(--text);
  font-size: 0.875rem;
}
.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  padding: 1rem 1.25rem;
  border-top: 1px solid var(--border);
}
</style>
