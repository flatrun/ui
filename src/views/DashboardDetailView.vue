<template>
  <div class="dashboard-detail">
    <div v-if="loading" class="empty-state">Loading dashboard</div>
    <div v-else-if="error" class="empty-state error">{{ error }}</div>
    <template v-else-if="dashboard">
      <div class="view-header">
        <div class="title-block">
          <router-link to="/dashboards" class="back-link"><Icon name="arrow-left" :size="16" /></router-link>
          <input v-model="dashboard.name" class="name-input" @change="persist" />
        </div>
        <div class="header-actions">
          <select v-model="since" class="range-select">
            <option value="15m">Last 15m</option>
            <option value="1h">Last 1h</option>
            <option value="6h">Last 6h</option>
            <option value="24h">Last 24h</option>
          </select>
          <button class="btn btn-primary" @click="addPanel">
            <Icon name="plus" :size="16" />
            Add panel
          </button>
        </div>
      </div>

      <div v-if="dashboard.panels.length === 0" class="empty-state">
        <Icon name="layout-dashboard" :size="32" />
        <p>This dashboard has no panels</p>
        <span>Add a panel to plot a container or serving metric.</span>
      </div>

      <div v-else class="panel-grid">
        <PanelCard
          v-for="(p, i) in dashboard.panels"
          :key="p.id || i"
          :panel="p"
          :since="since"
          editable
          @edit="editPanel(i)"
          @remove="removePanel(i)"
        />
      </div>
    </template>

    <PanelEditorModal
      v-if="editorOpen"
      :panel="editing"
      :deployments="deployments"
      @cancel="editorOpen = false"
      @save="onPanelSaved"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useRoute } from "vue-router";
import Icon from "@/components/base/Icon.vue";
import PanelCard from "@/components/dashboards/PanelCard.vue";
import PanelEditorModal from "@/components/dashboards/PanelEditorModal.vue";
import { dashboardsApi, deploymentsApi, type Dashboard, type DashboardPanel } from "@/services/api";

const route = useRoute();
const id = route.params.id as string;

const dashboard = ref<Dashboard | null>(null);
const deployments = ref<string[]>([]);
const loading = ref(false);
const error = ref("");
const since = ref("1h");

const editorOpen = ref(false);
const editing = ref<DashboardPanel | null>(null);
const editingIndex = ref(-1);

async function fetchDashboard() {
  loading.value = true;
  error.value = "";
  try {
    const { data } = await dashboardsApi.get(id);
    dashboard.value = data;
  } catch (e: any) {
    error.value = e.response?.data?.error || e.message || "Failed to load dashboard";
  } finally {
    loading.value = false;
  }
}

async function fetchDeployments() {
  try {
    const { data } = await deploymentsApi.list();
    deployments.value = (data.deployments || []).map((d) => d.name);
  } catch {
    deployments.value = [];
  }
}

// Every panel change is saved through the store's validation, and the returned
// copy (with server-assigned ids) becomes the new state.
async function persist() {
  if (!dashboard.value) return;
  try {
    const { data } = await dashboardsApi.save(dashboard.value);
    dashboard.value = data;
  } catch (e: any) {
    error.value = e.response?.data?.error || e.message || "Failed to save dashboard";
    await fetchDashboard();
  }
}

function addPanel() {
  editing.value = null;
  editingIndex.value = -1;
  editorOpen.value = true;
}

function editPanel(i: number) {
  if (!dashboard.value) return;
  editing.value = { ...dashboard.value.panels[i] };
  editingIndex.value = i;
  editorOpen.value = true;
}

async function onPanelSaved(panel: DashboardPanel) {
  if (!dashboard.value) return;
  if (editingIndex.value >= 0) {
    dashboard.value.panels[editingIndex.value] = panel;
  } else {
    dashboard.value.panels.push(panel);
  }
  editorOpen.value = false;
  await persist();
}

async function removePanel(i: number) {
  if (!dashboard.value) return;
  dashboard.value.panels.splice(i, 1);
  await persist();
}

onMounted(() => {
  fetchDashboard();
  fetchDeployments();
});
</script>

<style scoped>
.dashboard-detail {
  padding: 1.5rem;
}
.view-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1.5rem;
  gap: 1rem;
}
.title-block {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}
.back-link {
  display: inline-flex;
  color: var(--text-muted);
}
.name-input {
  font-size: 1.35rem;
  font-weight: 700;
  border: 1px solid transparent;
  background: transparent;
  color: var(--text);
  border-radius: var(--radius-sm);
  padding: 0.25rem 0.5rem;
}
.name-input:hover,
.name-input:focus {
  border-color: var(--border);
  background: var(--surface-inset);
  outline: none;
}
.header-actions {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}
.range-select {
  padding: 0.4rem 0.65rem;
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  background: var(--surface-inset);
  color: var(--text);
  font-size: 0.85rem;
}
.panel-grid {
  display: grid;
  grid-template-columns: repeat(12, 1fr);
  gap: 1rem;
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
</style>
