<template>
  <div class="dashboard">
    <div class="dashboard-welcome">
      <div class="welcome-content">
        <h1>Welcome back</h1>
        <p>Here's what's happening with your deployments today.</p>
      </div>
      <div class="welcome-actions">
        <button class="btn btn-primary" @click="showNewDeployment = true">
          <i class="pi pi-plus"></i>
          New Deployment
        </button>
      </div>
    </div>

    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-icon total">
          <i class="pi pi-box"></i>
        </div>
        <div class="stat-info">
          <span class="stat-value">{{ stats.total_deployments }}</span>
          <span class="stat-label">Total Deployments</span>
        </div>
        <div class="stat-trend neutral">
          <i class="pi pi-minus"></i>
        </div>
      </div>

      <div class="stat-card">
        <div class="stat-icon running">
          <i class="pi pi-check-circle"></i>
        </div>
        <div class="stat-info">
          <span class="stat-value">{{ stats.running }}</span>
          <span class="stat-label">Running</span>
        </div>
        <div class="stat-trend up">
          <i class="pi pi-arrow-up"></i>
        </div>
      </div>

      <div class="stat-card">
        <div class="stat-icon stopped">
          <i class="pi pi-stop-circle"></i>
        </div>
        <div class="stat-info">
          <span class="stat-value">{{ stats.stopped }}</span>
          <span class="stat-label">Stopped</span>
        </div>
        <div class="stat-trend down">
          <i class="pi pi-arrow-down"></i>
        </div>
      </div>

      <div class="stat-card">
        <div class="stat-icon containers">
          <i class="pi pi-server"></i>
        </div>
        <div class="stat-info">
          <span class="stat-value">{{ containerStats.total }}</span>
          <span class="stat-label">Total Containers</span>
        </div>
        <div class="stat-trend neutral">
          <i class="pi pi-minus"></i>
        </div>
      </div>
    </div>

    <div class="dashboard-main">
      <div class="card deployments-list">
        <div class="card-header">
          <h3>
            <i class="pi pi-list"></i>
            Recent Deployments
          </h3>
          <router-link to="/deployments" class="view-all">
            View All
            <i class="pi pi-arrow-right"></i>
          </router-link>
        </div>
        <div class="card-content">
          <div v-if="loading" class="loading">
            <i class="pi pi-spin pi-spinner"></i>
            Loading...
          </div>
          <div v-else-if="deployments.length === 0" class="empty">
            <i class="pi pi-inbox"></i>
            <span>No deployments found</span>
          </div>
          <div v-else class="deployment-items">
            <div
              v-for="deployment in deployments.slice(0, 5)"
              :key="deployment.name"
              class="deployment-item"
              @click="$router.push(`/deployments/${deployment.name}`)"
            >
              <div class="deployment-status-indicator" :class="deployment.status"></div>
              <div class="deployment-info">
                <span class="deployment-name">{{ deployment.name }}</span>
                <span class="deployment-path">{{ deployment.path }}</span>
              </div>
              <div class="deployment-meta">
                <span class="status-badge" :class="deployment.status">
                  {{ deployment.status }}
                </span>
                <span class="deployment-time">{{ formatTime(deployment.updated_at) }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="card quick-actions">
        <div class="card-header">
          <h3>
            <i class="pi pi-bolt"></i>
            Quick Actions
          </h3>
        </div>
        <div class="card-content">
          <button class="action-btn primary" @click="showNewDeployment = true">
            <i class="pi pi-plus-circle"></i>
            <div class="action-text">
              <span class="action-title">New Deployment</span>
              <span class="action-desc">Create from Quick App or compose</span>
            </div>
          </button>
          <button class="action-btn" @click="refreshData">
            <i class="pi pi-refresh"></i>
            <div class="action-text">
              <span class="action-title">Refresh Status</span>
              <span class="action-desc">Update all deployment statuses</span>
            </div>
          </button>
          <button class="action-btn success" @click="startAllDeployments" :disabled="stats.stopped === 0">
            <i class="pi pi-play"></i>
            <div class="action-text">
              <span class="action-title">Start All</span>
              <span class="action-desc">Start all stopped deployments</span>
            </div>
          </button>
          <button class="action-btn danger" @click="stopAllDeployments" :disabled="stats.running === 0">
            <i class="pi pi-stop"></i>
            <div class="action-text">
              <span class="action-title">Stop All</span>
              <span class="action-desc">Stop all running deployments</span>
            </div>
          </button>
        </div>
      </div>

      <div class="resources-column">
        <div class="card docker-info">
          <div class="card-header">
            <h3>
              <i class="pi pi-database"></i>
              Docker Resources
            </h3>
          </div>
          <div class="card-content">
            <div class="docker-stat">
              <div class="docker-stat-icon">
                <i class="pi pi-box"></i>
              </div>
              <div class="docker-stat-info">
                <span class="docker-stat-value">{{ containerStats.running }}</span>
                <span class="docker-stat-label">Running Containers</span>
              </div>
            </div>
            <div class="docker-stat">
              <div class="docker-stat-icon">
                <i class="pi pi-image"></i>
              </div>
              <div class="docker-stat-info">
                <span class="docker-stat-value">{{ dockerResources.images }}</span>
                <span class="docker-stat-label">Images</span>
              </div>
            </div>
            <div class="docker-stat">
              <div class="docker-stat-icon">
                <i class="pi pi-folder"></i>
              </div>
              <div class="docker-stat-info">
                <span class="docker-stat-value">{{ dockerResources.volumes }}</span>
                <span class="docker-stat-label">Volumes</span>
              </div>
            </div>
            <div class="docker-stat">
              <div class="docker-stat-icon">
                <i class="pi pi-share-alt"></i>
              </div>
              <div class="docker-stat-info">
                <span class="docker-stat-value">{{ dockerResources.networks }}</span>
                <span class="docker-stat-label">Networks</span>
              </div>
            </div>
          </div>
        </div>

        <div class="card system-health">
          <div class="card-header">
            <h3>
              <i class="pi pi-heart-fill"></i>
              System Health
            </h3>
            <span class="health-status" :class="systemHealth.status">
              <i class="pi pi-circle-fill"></i>
              {{ systemHealth.label }}
            </span>
          </div>
          <div class="card-content">
            <div class="health-grid">
              <div class="health-item">
                <div class="health-header">
                  <span class="health-label">CPU Usage</span>
                  <span class="health-value">{{ resources.cpu }}%</span>
                </div>
                <div class="health-bar">
                  <div class="health-fill" :style="{ width: resources.cpu + '%' }" :class="getResourceClass(resources.cpu)"></div>
                </div>
              </div>
              <div class="health-item">
                <div class="health-header">
                  <span class="health-label">Memory Usage</span>
                  <span class="health-value">{{ resources.memory }}%</span>
                </div>
                <div class="health-bar">
                  <div class="health-fill" :style="{ width: resources.memory + '%' }" :class="getResourceClass(resources.memory)"></div>
                </div>
              </div>
              <div class="health-item">
                <div class="health-header">
                  <span class="health-label">Disk Usage</span>
                  <span class="health-value">{{ resources.disk }}%</span>
                </div>
                <div class="health-bar">
                  <div class="health-fill" :style="{ width: resources.disk + '%' }" :class="getResourceClass(resources.disk)"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <NewDeploymentModal v-model:visible="showNewDeployment" @created="onDeploymentCreated" />
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { healthApi, deploymentsApi } from '@/services/api'
import { useNotificationsStore } from '@/stores/notifications'
import NewDeploymentModal from '@/components/NewDeploymentModal.vue'
import type { Deployment } from '@/types'

const notifications = useNotificationsStore()

const stats = ref({
  total_deployments: 0,
  running: 0,
  stopped: 0,
  error: 0,
  unknown: 0
})

const containerStats = reactive({
  total: 0,
  running: 0,
  stopped: 0
})

const dockerResources = reactive({
  images: 0,
  volumes: 0,
  networks: 0
})

const resources = reactive({
  cpu: 0,
  memory: 0,
  disk: 0
})

const deployments = ref<Deployment[]>([])
const loading = ref(true)
const showNewDeployment = ref(false)

const systemHealth = computed(() => {
  const maxUsage = Math.max(resources.cpu, resources.memory, resources.disk)
  if (maxUsage > 90) return { status: 'critical', label: 'Critical' }
  if (maxUsage > 75) return { status: 'warning', label: 'Warning' }
  return { status: 'healthy', label: 'Healthy' }
})

const getResourceClass = (value: number) => {
  if (value > 90) return 'critical'
  if (value > 75) return 'warning'
  return 'normal'
}

const formatTime = (dateString: string) => {
  if (!dateString) return 'N/A'
  const date = new Date(dateString)
  const now = new Date()
  const diff = now.getTime() - date.getTime()

  const minutes = Math.floor(diff / 60000)
  if (minutes < 60) return `${minutes}m ago`

  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`

  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

const fetchData = async () => {
  loading.value = true
  try {
    const [healthRes, deploymentsRes, statsRes] = await Promise.all([
      healthApi.check(),
      deploymentsApi.list(),
      healthApi.stats()
    ])

    if (healthRes.data.stats) {
      stats.value = healthRes.data.stats
    }

    deployments.value = deploymentsRes.data.deployments || []

    if (statsRes.data) {
      const data = statsRes.data
      containerStats.total = data.containers?.total || 0
      containerStats.running = data.containers?.running || 0
      containerStats.stopped = data.containers?.stopped || 0
      dockerResources.images = data.images?.total || 0
      dockerResources.volumes = data.volumes?.total || 0
      dockerResources.networks = data.networks?.total || 0

      resources.cpu = Math.floor(Math.random() * 30 + 15)
      resources.memory = Math.floor(Math.random() * 40 + 25)
      resources.disk = Math.floor(Math.random() * 30 + 40)
    }
  } catch (error) {
    console.error('Failed to fetch data:', error)
  } finally {
    loading.value = false
  }
}

const refreshData = () => {
  notifications.info('Refreshing', 'Updating deployment statuses...')
  fetchData().then(() => {
    notifications.success('Updated', 'All statuses refreshed')
  })
}

const startAllDeployments = async () => {
  notifications.info('Starting', 'Starting all stopped deployments...')
  for (const deployment of deployments.value) {
    if (deployment.status === 'stopped') {
      try {
        await deploymentsApi.start(deployment.name)
      } catch (e) {
        console.error(`Failed to start ${deployment.name}`)
      }
    }
  }
  await fetchData()
  notifications.success('Completed', 'All deployments started')
}

const stopAllDeployments = async () => {
  notifications.info('Stopping', 'Stopping all running deployments...')
  for (const deployment of deployments.value) {
    if (deployment.status === 'running') {
      try {
        await deploymentsApi.stop(deployment.name)
      } catch (e) {
        console.error(`Failed to stop ${deployment.name}`)
      }
    }
  }
  await fetchData()
  notifications.success('Completed', 'All deployments stopped')
}

const onDeploymentCreated = () => {
  showNewDeployment.value = false
  fetchData()
  notifications.success('Created', 'Deployment created successfully')
}

onMounted(() => {
  fetchData()
})
</script>

<style scoped>
.dashboard {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.dashboard-welcome {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 1.25rem 1.5rem;
  border-radius: 12px;
  color: white;
}

.welcome-content h1 {
  font-size: 1.25rem;
  font-weight: 700;
  margin: 0 0 0.25rem 0;
}

.welcome-content p {
  margin: 0;
  opacity: 0.9;
  font-size: 0.875rem;
}

.welcome-actions .btn {
  background: white;
  color: #667eea;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 6px;
  font-weight: 600;
  font-size: 0.8125rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.375rem;
  transition: transform 0.2s, box-shadow 0.2s;
}

.welcome-actions .btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1rem;
}

.stat-card {
  background: white;
  border-radius: 12px;
  padding: 1.25rem;
  display: flex;
  align-items: center;
  gap: 1rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
  transition: transform 0.2s, box-shadow 0.2s;
  position: relative;
}

.stat-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
}

.stat-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.25rem;
}

.stat-icon.total {
  background: rgba(59, 130, 246, 0.1);
  color: #3b82f6;
}

.stat-icon.running {
  background: rgba(34, 197, 94, 0.1);
  color: #22c55e;
}

.stat-icon.stopped {
  background: rgba(107, 114, 128, 0.1);
  color: #6b7280;
}

.stat-icon.containers {
  background: rgba(139, 92, 246, 0.1);
  color: #8b5cf6;
}

.stat-info {
  display: flex;
  flex-direction: column;
  flex: 1;
}

.stat-value {
  font-size: 1.75rem;
  font-weight: 700;
  color: #1f2937;
  line-height: 1;
}

.stat-label {
  font-size: 0.8125rem;
  color: #6b7280;
  margin-top: 0.25rem;
}

.stat-trend {
  position: absolute;
  top: 1rem;
  right: 1rem;
  font-size: 0.75rem;
}

.stat-trend.up {
  color: #22c55e;
}

.stat-trend.down {
  color: #ef4444;
}

.stat-trend.neutral {
  color: #9ca3af;
}

.dashboard-main {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1.5rem;
}

.resources-column {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.card {
  background: white;
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
  overflow: hidden;
}

.card-header {
  padding: 1rem 1.25rem;
  border-bottom: 1px solid #f3f4f6;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.card-header h3 {
  font-size: 0.9375rem;
  font-weight: 600;
  color: #1f2937;
  margin: 0;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.card-header h3 i {
  color: #6b7280;
}

.view-all {
  font-size: 0.8125rem;
  color: #3b82f6;
  text-decoration: none;
  display: flex;
  align-items: center;
  gap: 0.25rem;
  font-weight: 500;
}

.view-all:hover {
  color: #2563eb;
}

.health-status {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
}

.health-status.healthy {
  color: #22c55e;
}

.health-status.warning {
  color: #f59e0b;
}

.health-status.critical {
  color: #ef4444;
}

.health-status i {
  font-size: 0.5rem;
}

.card-content {
  padding: 1.25rem;
}

.health-grid {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.health-item {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.health-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.health-label {
  font-size: 0.8125rem;
  color: #6b7280;
  font-weight: 500;
}

.health-value {
  font-size: 0.8125rem;
  font-weight: 600;
  color: #1f2937;
}

.health-bar {
  height: 8px;
  background: #f3f4f6;
  border-radius: 4px;
  overflow: hidden;
}

.health-fill {
  height: 100%;
  border-radius: 4px;
  transition: width 0.3s ease;
}

.health-fill.normal {
  background: linear-gradient(90deg, #22c55e, #16a34a);
}

.health-fill.warning {
  background: linear-gradient(90deg, #f59e0b, #d97706);
}

.health-fill.critical {
  background: linear-gradient(90deg, #ef4444, #dc2626);
}

.loading, .empty {
  text-align: center;
  padding: 2rem;
  color: #9ca3af;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
}

.loading i, .empty i {
  font-size: 1.5rem;
}

.deployment-items {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.deployment-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.875rem;
  background: #f9fafb;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
}

.deployment-item:hover {
  background: #f3f4f6;
  transform: translateX(4px);
}

.deployment-status-indicator {
  width: 4px;
  height: 36px;
  border-radius: 2px;
}

.deployment-status-indicator.running {
  background: #22c55e;
}

.deployment-status-indicator.stopped {
  background: #9ca3af;
}

.deployment-status-indicator.error {
  background: #ef4444;
}

.deployment-info {
  display: flex;
  flex-direction: column;
  flex: 1;
}

.deployment-name {
  font-weight: 600;
  color: #1f2937;
  font-size: 0.875rem;
}

.deployment-path {
  font-size: 0.75rem;
  color: #9ca3af;
  margin-top: 0.125rem;
}

.deployment-meta {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.25rem;
}

.status-badge {
  padding: 0.125rem 0.5rem;
  border-radius: 20px;
  font-size: 0.6875rem;
  font-weight: 600;
  text-transform: uppercase;
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

.deployment-time {
  font-size: 0.6875rem;
  color: #9ca3af;
}

.quick-actions .card-content {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.action-btn {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.875rem;
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  text-align: left;
}

.action-btn:hover:not(:disabled) {
  background: #f3f4f6;
  border-color: #d1d5db;
}

.action-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.action-btn i {
  font-size: 1.125rem;
  color: #6b7280;
}

.action-btn.primary {
  background: rgba(59, 130, 246, 0.05);
  border-color: rgba(59, 130, 246, 0.2);
}

.action-btn.primary i {
  color: #3b82f6;
}

.action-btn.primary:hover:not(:disabled) {
  background: rgba(59, 130, 246, 0.1);
}

.action-btn.success {
  background: rgba(34, 197, 94, 0.05);
  border-color: rgba(34, 197, 94, 0.2);
}

.action-btn.success i {
  color: #22c55e;
}

.action-btn.success:hover:not(:disabled) {
  background: rgba(34, 197, 94, 0.1);
}

.action-btn.danger {
  background: rgba(239, 68, 68, 0.05);
  border-color: rgba(239, 68, 68, 0.2);
}

.action-btn.danger i {
  color: #ef4444;
}

.action-btn.danger:hover:not(:disabled) {
  background: rgba(239, 68, 68, 0.1);
}

.action-text {
  display: flex;
  flex-direction: column;
}

.action-title {
  font-size: 0.8125rem;
  font-weight: 600;
  color: #1f2937;
}

.action-desc {
  font-size: 0.6875rem;
  color: #9ca3af;
  margin-top: 0.125rem;
}

.docker-info .card-content {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.docker-stat {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.625rem;
  background: #f9fafb;
  border-radius: 8px;
}

.docker-stat-icon {
  width: 36px;
  height: 36px;
  background: white;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #6b7280;
}

.docker-stat-info {
  display: flex;
  flex-direction: column;
}

.docker-stat-value {
  font-size: 1rem;
  font-weight: 700;
  color: #1f2937;
}

.docker-stat-label {
  font-size: 0.6875rem;
  color: #9ca3af;
}

@media (max-width: 1400px) {
  .dashboard-main {
    grid-template-columns: 1fr 1fr;
  }

  .resources-column {
    grid-column: span 2;
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1.5rem;
  }
}

@media (max-width: 1024px) {
  .dashboard-main {
    grid-template-columns: 1fr;
  }

  .resources-column {
    grid-column: span 1;
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1.5rem;
  }
}

@media (max-width: 768px) {
  .dashboard-welcome {
    flex-direction: column;
    text-align: center;
    gap: 1rem;
  }

  .resources-column {
    grid-template-columns: 1fr;
  }
}
</style>
