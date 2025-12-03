<template>
  <div class="dashboard">
    <div class="dashboard-header">
      <span class="last-updated" v-if="!loading">
        <i class="pi pi-clock" />
        Updated {{ lastUpdated }}
      </span>
      <div class="header-actions">
        <button class="btn btn-secondary" :disabled="loading" @click="refreshData">
          <i class="pi pi-refresh" :class="{ 'pi-spin': loading }" />
          <span>Refresh</span>
        </button>
        <button class="btn btn-primary" @click="showNewDeployment = true">
          <i class="pi pi-plus" />
          <span>New Deployment</span>
        </button>
      </div>
    </div>

    <div class="stats-row">
      <div class="stat-card" @click="$router.push('/deployments')">
        <div class="stat-content">
          <span class="stat-value">{{ stats.total_deployments }}</span>
          <span class="stat-label">Deployments</span>
        </div>
        <div class="stat-icon blue">
          <i class="pi pi-box" />
        </div>
      </div>
      <div class="stat-card" @click="$router.push('/deployments?status=running')">
        <div class="stat-content">
          <span class="stat-value">{{ stats.running }}</span>
          <span class="stat-label">Running</span>
        </div>
        <div class="stat-icon green">
          <i class="pi pi-check-circle" />
        </div>
      </div>
      <div class="stat-card" @click="$router.push('/deployments?status=stopped')">
        <div class="stat-content">
          <span class="stat-value">{{ stats.stopped }}</span>
          <span class="stat-label">Stopped</span>
        </div>
        <div class="stat-icon gray">
          <i class="pi pi-stop-circle" />
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-content">
          <span class="stat-value">{{ containerStats.running }}/{{ containerStats.total }}</span>
          <span class="stat-label">Containers</span>
        </div>
        <div class="stat-icon purple">
          <i class="pi pi-server" />
        </div>
      </div>
    </div>

    <div class="dashboard-grid">
      <div class="main-column">
        <div class="panel deployments-panel">
          <div class="panel-header">
            <div class="panel-title">
              <i class="pi pi-list" />
              <span>Deployments</span>
            </div>
            <router-link to="/deployments" class="view-all-link">
              View all
              <i class="pi pi-arrow-right" />
            </router-link>
          </div>
          <div class="panel-body">
            <div v-if="loading" class="loading-state">
              <i class="pi pi-spin pi-spinner" />
              <span>Loading...</span>
            </div>
            <div v-else-if="deployments.length === 0" class="empty-state">
              <div class="empty-icon">
                <i class="pi pi-inbox" />
              </div>
              <p>No deployments yet</p>
              <button class="btn btn-primary btn-sm" @click="showNewDeployment = true">
                Create your first deployment
              </button>
            </div>
            <table v-else class="deployments-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Status</th>
                  <th>Updated</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="deployment in deployments.slice(0, 6)"
                  :key="deployment.name"
                  @click="$router.push(`/deployments/${deployment.name}`)"
                >
                  <td class="name-cell">
                    <span class="status-dot" :class="deployment.status" />
                    <span class="deployment-name">{{ deployment.name }}</span>
                  </td>
                  <td>
                    <span class="status-badge" :class="deployment.status">
                      {{ deployment.status }}
                    </span>
                  </td>
                  <td class="time-cell">{{ formatTime(deployment.updated_at) }}</td>
                  <td class="action-cell">
                    <i class="pi pi-chevron-right" />
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div class="panel quick-actions-panel">
          <div class="panel-header">
            <div class="panel-title">
              <i class="pi pi-bolt" />
              <span>Quick Actions</span>
            </div>
          </div>
          <div class="panel-body">
            <div class="actions-row">
              <button class="quick-action" @click="showNewDeployment = true">
                <div class="action-icon blue">
                  <i class="pi pi-plus-circle" />
                </div>
                <div class="action-label">
                  <span class="action-name">New Deployment</span>
                  <span class="action-hint">Deploy from template</span>
                </div>
              </button>
              <button
                class="quick-action"
                :disabled="stats.stopped === 0"
                @click="startAllDeployments"
              >
                <div class="action-icon green">
                  <i class="pi pi-play" />
                </div>
                <div class="action-label">
                  <span class="action-name">Start All</span>
                  <span class="action-hint">{{ stats.stopped }} stopped</span>
                </div>
              </button>
              <button
                class="quick-action"
                :disabled="stats.running === 0"
                @click="stopAllDeployments"
              >
                <div class="action-icon red">
                  <i class="pi pi-stop" />
                </div>
                <div class="action-label">
                  <span class="action-name">Stop All</span>
                  <span class="action-hint">{{ stats.running }} running</span>
                </div>
              </button>
              <button class="quick-action" @click="$router.push('/templates')">
                <div class="action-icon purple">
                  <i class="pi pi-th-large" />
                </div>
                <div class="action-label">
                  <span class="action-name">Templates</span>
                  <span class="action-hint">Browse apps</span>
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div class="side-column">
        <div class="panel system-panel">
          <div class="panel-header">
            <div class="panel-title">
              <i class="pi pi-heart-fill" />
              <span>System</span>
            </div>
            <span class="health-indicator" :class="systemHealth.status">
              {{ systemHealth.label }}
            </span>
          </div>
          <div class="panel-body">
            <div class="resource-item">
              <div class="resource-header">
                <span class="resource-label">CPU</span>
                <span class="resource-value">{{ resources.cpu }}%</span>
              </div>
              <div class="resource-bar">
                <div
                  class="resource-fill"
                  :class="getResourceClass(resources.cpu)"
                  :style="{ width: resources.cpu + '%' }"
                />
              </div>
            </div>
            <div class="resource-item">
              <div class="resource-header">
                <span class="resource-label">Memory</span>
                <span class="resource-value">{{ resources.memory }}%</span>
              </div>
              <div class="resource-bar">
                <div
                  class="resource-fill"
                  :class="getResourceClass(resources.memory)"
                  :style="{ width: resources.memory + '%' }"
                />
              </div>
            </div>
            <div class="resource-item">
              <div class="resource-header">
                <span class="resource-label">Disk</span>
                <span class="resource-value">{{ resources.disk }}%</span>
              </div>
              <div class="resource-bar">
                <div
                  class="resource-fill"
                  :class="getResourceClass(resources.disk)"
                  :style="{ width: resources.disk + '%' }"
                />
              </div>
            </div>
          </div>
        </div>

        <div class="panel docker-panel">
          <div class="panel-header">
            <div class="panel-title">
              <i class="pi pi-database" />
              <span>Docker</span>
            </div>
          </div>
          <div class="panel-body">
            <div class="docker-grid">
              <div class="docker-item">
                <i class="pi pi-box" />
                <div class="docker-info">
                  <span class="docker-value">{{ containerStats.running }}</span>
                  <span class="docker-label">Running</span>
                </div>
              </div>
              <div class="docker-item">
                <i class="pi pi-image" />
                <div class="docker-info">
                  <span class="docker-value">{{ dockerResources.images }}</span>
                  <span class="docker-label">Images</span>
                </div>
              </div>
              <div class="docker-item">
                <i class="pi pi-folder" />
                <div class="docker-info">
                  <span class="docker-value">{{ dockerResources.volumes }}</span>
                  <span class="docker-label">Volumes</span>
                </div>
              </div>
              <div class="docker-item">
                <i class="pi pi-share-alt" />
                <div class="docker-info">
                  <span class="docker-value">{{ dockerResources.networks }}</span>
                  <span class="docker-label">Networks</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="panel agent-panel">
          <div class="panel-header">
            <div class="panel-title">
              <i class="pi pi-cog" />
              <span>Agent</span>
            </div>
            <span class="agent-status online">
              <i class="pi pi-circle-fill" />
              Online
            </span>
          </div>
          <div class="panel-body">
            <div class="agent-info">
              <div class="agent-row">
                <span class="agent-label">Version</span>
                <code>{{ agentVersion }}</code>
              </div>
              <div class="agent-row">
                <span class="agent-label">Endpoint</span>
                <code>{{ apiEndpoint }}</code>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <NewDeploymentModal
      :visible="showNewDeployment"
      @close="showNewDeployment = false"
      @created="onDeploymentCreated"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { deploymentsApi } from "@/services/api";
import { useNotificationsStore } from "@/stores/notifications";
import { useStatsStore } from "@/stores/stats";
import NewDeploymentModal from "@/components/NewDeploymentModal.vue";
import type { Deployment } from "@/types";

const notifications = useNotificationsStore();
const statsStore = useStatsStore();

const stats = computed(() => ({
  total_deployments: statsStore.deployments.total,
  running: statsStore.deployments.running,
  stopped: statsStore.deployments.stopped,
  error: statsStore.deployments.error,
  unknown: 0,
}));

const containerStats = computed(() => ({
  total: statsStore.containers.total,
  running: statsStore.containers.running,
  stopped: statsStore.containers.stopped,
}));

const dockerResources = computed(() => ({
  images: statsStore.docker.images,
  volumes: statsStore.docker.volumes,
  networks: statsStore.docker.networks,
}));

const resources = computed(() => ({
  cpu: statsStore.resources.cpu,
  memory: statsStore.resources.memory,
  disk: statsStore.resources.disk,
}));

const deployments = ref<Deployment[]>([]);
const loading = ref(true);
const showNewDeployment = ref(false);

const agentVersion = computed(() => statsStore.agentVersion);
const lastUpdated = computed(() => statsStore.formatLastUpdated());

const apiEndpoint = computed(() => {
  return window.location.hostname + ":8090";
});

const systemHealth = computed(() => {
  const maxUsage = Math.max(resources.value.cpu, resources.value.memory, resources.value.disk);
  if (maxUsage > 90) return { status: "critical", label: "Critical" };
  if (maxUsage > 75) return { status: "warning", label: "Warning" };
  return { status: "healthy", label: "Healthy" };
});

const getResourceClass = (value: number) => {
  if (value > 90) return "critical";
  if (value > 75) return "warning";
  return "normal";
};

const formatTime = (dateString: string) => {
  if (!dateString) return "N/A";
  const date = new Date(dateString);
  const now = new Date();
  const diff = now.getTime() - date.getTime();

  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  return `${days}d ago`;
};

const fetchData = async () => {
  loading.value = true;
  try {
    const [, deploymentsRes] = await Promise.all([statsStore.fetchAll(), deploymentsApi.list()]);

    deployments.value = deploymentsRes.data.deployments || [];
  } catch (error) {
    console.error("Failed to fetch data:", error);
  } finally {
    loading.value = false;
  }
};

const refreshData = () => {
  notifications.info("Refreshing", "Updating data...");
  fetchData().then(() => {
    notifications.success("Updated", "Dashboard refreshed");
  });
};

const startAllDeployments = async () => {
  notifications.info("Starting", "Starting all stopped deployments...");
  for (const deployment of deployments.value) {
    if (deployment.status === "stopped") {
      try {
        await deploymentsApi.start(deployment.name);
      } catch (e) {
        console.error(`Failed to start ${deployment.name}`);
      }
    }
  }
  await fetchData();
  notifications.success("Completed", "All deployments started");
};

const stopAllDeployments = async () => {
  notifications.info("Stopping", "Stopping all running deployments...");
  for (const deployment of deployments.value) {
    if (deployment.status === "running") {
      try {
        await deploymentsApi.stop(deployment.name);
      } catch (e) {
        console.error(`Failed to stop ${deployment.name}`);
      }
    }
  }
  await fetchData();
  notifications.success("Completed", "All deployments stopped");
};

const onDeploymentCreated = () => {
  showNewDeployment.value = false;
  fetchData();
  notifications.success("Created", "Deployment created successfully");
};

onMounted(() => {
  fetchData();
});
</script>

<style scoped>
.dashboard {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.dashboard-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.last-updated {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  font-size: 0.75rem;
  color: #9ca3af;
}

.last-updated i {
  font-size: 0.6875rem;
}

.header-actions {
  display: flex;
  gap: 0.5rem;
}

.btn {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.5rem 0.875rem;
  border-radius: 8px;
  font-size: 0.8125rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  border: none;
}

.btn-primary {
  background: #3b82f6;
  color: white;
}

.btn-primary:hover {
  background: #2563eb;
}

.btn-secondary {
  background: white;
  color: #374151;
  border: 1px solid #e5e7eb;
}

.btn-secondary:hover:not(:disabled) {
  background: #f9fafb;
  border-color: #d1d5db;
}

.btn-secondary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-sm {
  padding: 0.375rem 0.75rem;
  font-size: 0.75rem;
}

.stats-row {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1rem;
}

.stat-card {
  background: white;
  border-radius: 10px;
  padding: 1rem 1.25rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border: 1px solid #e5e7eb;
  cursor: pointer;
  transition: all 0.2s;
}

.stat-card:hover {
  border-color: #d1d5db;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.stat-content {
  display: flex;
  flex-direction: column;
}

.stat-value {
  font-size: 1.5rem;
  font-weight: 700;
  color: #1f2937;
  line-height: 1.2;
}

.stat-label {
  font-size: 0.75rem;
  color: #6b7280;
  margin-top: 0.125rem;
}

.stat-icon {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.125rem;
}

.stat-icon.blue {
  background: rgba(59, 130, 246, 0.1);
  color: #3b82f6;
}

.stat-icon.green {
  background: rgba(34, 197, 94, 0.1);
  color: #22c55e;
}

.stat-icon.gray {
  background: rgba(107, 114, 128, 0.1);
  color: #6b7280;
}

.stat-icon.purple {
  background: rgba(139, 92, 246, 0.1);
  color: #8b5cf6;
}

.dashboard-grid {
  display: grid;
  grid-template-columns: 1fr 320px;
  gap: 1.25rem;
}

.main-column {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.side-column {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.panel {
  background: white;
  border-radius: 10px;
  border: 1px solid #e5e7eb;
  overflow: hidden;
}

.panel-header {
  padding: 0.875rem 1rem;
  border-bottom: 1px solid #f3f4f6;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.panel-title {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
  font-weight: 600;
  color: #1f2937;
}

.panel-title i {
  color: #6b7280;
  font-size: 0.9375rem;
}

.panel-body {
  padding: 1rem;
}

.view-all-link {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.75rem;
  font-weight: 500;
  color: #3b82f6;
  text-decoration: none;
}

.view-all-link:hover {
  color: #2563eb;
}

.view-all-link i {
  font-size: 0.625rem;
}

.loading-state,
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  text-align: center;
  color: #9ca3af;
}

.loading-state i {
  font-size: 1.5rem;
  margin-bottom: 0.5rem;
}

.empty-icon {
  width: 48px;
  height: 48px;
  background: #f3f4f6;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 0.75rem;
}

.empty-icon i {
  font-size: 1.25rem;
  color: #9ca3af;
}

.empty-state p {
  margin: 0 0 1rem 0;
  font-size: 0.875rem;
}

.deployments-table {
  width: 100%;
  border-collapse: collapse;
}

.deployments-table th {
  text-align: left;
  padding: 0.5rem 0.75rem;
  font-size: 0.6875rem;
  font-weight: 600;
  color: #9ca3af;
  text-transform: uppercase;
  letter-spacing: 0.025em;
  border-bottom: 1px solid #f3f4f6;
}

.deployments-table td {
  padding: 0.75rem;
  font-size: 0.8125rem;
  border-bottom: 1px solid #f9fafb;
}

.deployments-table tr {
  cursor: pointer;
  transition: background 0.15s;
}

.deployments-table tbody tr:hover {
  background: #f9fafb;
}

.deployments-table tbody tr:last-child td {
  border-bottom: none;
}

.name-cell {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

.status-dot.running {
  background: #22c55e;
}

.status-dot.stopped {
  background: #9ca3af;
}

.status-dot.error {
  background: #ef4444;
}

.deployment-name {
  font-weight: 500;
  color: #1f2937;
}

.status-badge {
  display: inline-block;
  padding: 0.125rem 0.5rem;
  border-radius: 4px;
  font-size: 0.6875rem;
  font-weight: 500;
  text-transform: capitalize;
}

.status-badge.running {
  background: #dcfce7;
  color: #166534;
}

.status-badge.stopped {
  background: #f3f4f6;
  color: #4b5563;
}

.status-badge.error {
  background: #fee2e2;
  color: #991b1b;
}

.time-cell {
  color: #9ca3af;
  font-size: 0.75rem;
}

.action-cell {
  color: #d1d5db;
  text-align: right;
}

.action-cell i {
  font-size: 0.75rem;
}

.actions-row {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 0.75rem;
}

.quick-action {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.625rem;
  padding: 1rem;
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  text-align: center;
}

.quick-action:hover:not(:disabled) {
  background: #f3f4f6;
  border-color: #d1d5db;
}

.quick-action:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.action-icon {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.action-icon i {
  font-size: 1rem;
}

.action-icon.blue {
  background: rgba(59, 130, 246, 0.1);
  color: #3b82f6;
}

.action-icon.green {
  background: rgba(34, 197, 94, 0.1);
  color: #22c55e;
}

.action-icon.red {
  background: rgba(239, 68, 68, 0.1);
  color: #ef4444;
}

.action-icon.purple {
  background: rgba(139, 92, 246, 0.1);
  color: #8b5cf6;
}

.action-label {
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
}

.action-name {
  font-size: 0.8125rem;
  font-weight: 600;
  color: #1f2937;
}

.action-hint {
  font-size: 0.6875rem;
  color: #9ca3af;
}

.health-indicator {
  font-size: 0.6875rem;
  font-weight: 600;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
}

.health-indicator.healthy {
  background: #dcfce7;
  color: #166534;
}

.health-indicator.warning {
  background: #fef3c7;
  color: #92400e;
}

.health-indicator.critical {
  background: #fee2e2;
  color: #991b1b;
}

.resource-item {
  margin-bottom: 0.875rem;
}

.resource-item:last-child {
  margin-bottom: 0;
}

.resource-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.375rem;
}

.resource-label {
  font-size: 0.75rem;
  color: #6b7280;
}

.resource-value {
  font-size: 0.75rem;
  font-weight: 600;
  color: #1f2937;
}

.resource-bar {
  height: 6px;
  background: #f3f4f6;
  border-radius: 3px;
  overflow: hidden;
}

.resource-fill {
  height: 100%;
  border-radius: 3px;
  transition: width 0.3s;
}

.resource-fill.normal {
  background: #22c55e;
}

.resource-fill.warning {
  background: #f59e0b;
}

.resource-fill.critical {
  background: #ef4444;
}

.docker-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0.75rem;
}

.docker-item {
  display: flex;
  align-items: center;
  gap: 0.625rem;
  padding: 0.625rem;
  background: #f9fafb;
  border-radius: 6px;
}

.docker-item i {
  font-size: 0.875rem;
  color: #6b7280;
}

.docker-info {
  display: flex;
  flex-direction: column;
}

.docker-value {
  font-size: 0.9375rem;
  font-weight: 600;
  color: #1f2937;
  line-height: 1.2;
}

.docker-label {
  font-size: 0.625rem;
  color: #9ca3af;
}

.agent-status {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  font-size: 0.6875rem;
  font-weight: 500;
}

.agent-status.online {
  color: #22c55e;
}

.agent-status i {
  font-size: 0.375rem;
}

.agent-info {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.agent-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.agent-label {
  font-size: 0.75rem;
  color: #6b7280;
}

.agent-row code {
  font-size: 0.6875rem;
  background: #f3f4f6;
  padding: 0.125rem 0.375rem;
  border-radius: 4px;
  color: #374151;
  font-family: "SF Mono", "Fira Code", monospace;
}

@media (max-width: 1200px) {
  .dashboard-grid {
    grid-template-columns: 1fr;
  }

  .side-column {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 1rem;
  }
}

@media (max-width: 1024px) {
  .stats-row {
    grid-template-columns: repeat(2, 1fr);
  }

  .actions-row {
    grid-template-columns: repeat(2, 1fr);
  }

  .side-column {
    grid-template-columns: 1fr 1fr;
  }

  .side-column .agent-panel {
    grid-column: span 2;
  }
}

@media (max-width: 768px) {
  .dashboard-header {
    flex-wrap: wrap;
    gap: 0.75rem;
  }

  .last-updated {
    order: 2;
    width: 100%;
  }

  .header-actions {
    flex: 1;
    justify-content: flex-end;
  }

  .stats-row {
    grid-template-columns: 1fr 1fr;
  }

  .side-column {
    grid-template-columns: 1fr;
  }

  .side-column .agent-panel {
    grid-column: span 1;
  }
}
</style>
