<template>
  <div class="deployment-detail">
    <div class="detail-header">
      <div class="header-left">
        <router-link to="/deployments" class="back-link">
          <i class="pi pi-arrow-left"></i>
          Back to Deployments
        </router-link>
        <div class="deployment-title">
          <h1>{{ deployment?.name || $route.params.name }}</h1>
          <span class="status-badge" :class="deployment?.status">
            {{ deployment?.status || 'loading' }}
          </span>
        </div>
      </div>
      <div class="header-actions">
        <button class="btn btn-success" @click="handleOperation('start')" :disabled="loading">
          <i class="pi pi-play"></i> Start
        </button>
        <button class="btn btn-warning" @click="handleOperation('stop')" :disabled="loading">
          <i class="pi pi-stop"></i> Stop
        </button>
        <button class="btn btn-info" @click="handleOperation('restart')" :disabled="loading">
          <i class="pi pi-refresh"></i> Restart
        </button>
        <button class="btn btn-danger" @click="confirmDelete" :disabled="loading">
          <i class="pi pi-trash"></i> Delete
        </button>
      </div>
    </div>

    <div v-if="loading && !deployment" class="loading-state">
      <i class="pi pi-spin pi-spinner"></i>
      <span>Loading deployment details...</span>
    </div>

    <div v-else-if="error" class="error-state">
      <i class="pi pi-exclamation-triangle"></i>
      <h3>Failed to load deployment</h3>
      <p>{{ error }}</p>
      <button class="btn btn-primary" @click="fetchDeployment">Try Again</button>
    </div>

    <template v-else-if="deployment">
      <div class="detail-tabs">
        <button
          v-for="tab in tabs"
          :key="tab.id"
          class="tab-btn"
          :class="{ active: activeTab === tab.id }"
          @click="activeTab = tab.id"
        >
          <i :class="tab.icon"></i>
          {{ tab.label }}
        </button>
      </div>

      <div class="tab-content">
        <div v-if="activeTab === 'overview'" class="overview-tab">
          <div class="info-cards">
            <div class="info-card">
              <div class="card-header">
                <i class="pi pi-info-circle"></i>
                <h3>General Information</h3>
              </div>
              <div class="card-body">
                <div class="info-row">
                  <span class="label">Name</span>
                  <span class="value">{{ deployment.name }}</span>
                </div>
                <div class="info-row">
                  <span class="label">Status</span>
                  <span class="value">
                    <span class="status-indicator" :class="deployment.status"></span>
                    {{ deployment.status }}
                  </span>
                </div>
                <div class="info-row">
                  <span class="label">Path</span>
                  <code class="value path">{{ deployment.path }}</code>
                </div>
                <div class="info-row">
                  <span class="label">Created</span>
                  <span class="value">{{ formatDateTime(deployment.created_at) }}</span>
                </div>
                <div class="info-row">
                  <span class="label">Last Updated</span>
                  <span class="value">{{ formatDateTime(deployment.updated_at) }}</span>
                </div>
              </div>
            </div>

            <div class="info-card">
              <div class="card-header">
                <i class="pi pi-box"></i>
                <h3>Services</h3>
              </div>
              <div class="card-body">
                <div v-if="services.length === 0" class="empty-services">
                  No services configured
                </div>
                <div v-else class="services-list">
                  <div v-for="service in services" :key="service.name" class="service-item">
                    <div class="service-header">
                      <span class="service-name">{{ service.name }}</span>
                      <span class="service-status" :class="service.status">{{ service.status }}</span>
                    </div>
                    <div class="service-details">
                      <span class="detail-item">
                        <i class="pi pi-image"></i>
                        {{ service.image }}
                      </span>
                      <span v-if="service.ports?.length" class="detail-item">
                        <i class="pi pi-sitemap"></i>
                        {{ service.ports.join(', ') }}
                      </span>
                    </div>
                    <div class="service-actions">
                      <button class="action-btn" @click="openTerminal(service)" title="Terminal">
                        <i class="pi pi-desktop"></i>
                      </button>
                      <button class="action-btn" @click="viewServiceLogs(service)" title="Logs">
                        <i class="pi pi-file-edit"></i>
                      </button>
                      <button class="action-btn" @click="restartService(service)" title="Restart">
                        <i class="pi pi-refresh"></i>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div class="info-card wide">
            <div class="card-header">
              <i class="pi pi-chart-line"></i>
              <h3>Resource Usage</h3>
            </div>
            <div class="card-body">
              <div class="resource-grid">
                <div class="resource-item">
                  <div class="resource-label">CPU Usage</div>
                  <div class="resource-bar-wrapper">
                    <div class="resource-bar">
                      <div class="resource-fill" :style="{ width: resourceUsage.cpu + '%' }" :class="getUsageClass(resourceUsage.cpu)"></div>
                    </div>
                    <span class="resource-value">{{ resourceUsage.cpu }}%</span>
                  </div>
                </div>
                <div class="resource-item">
                  <div class="resource-label">Memory Usage</div>
                  <div class="resource-bar-wrapper">
                    <div class="resource-bar">
                      <div class="resource-fill" :style="{ width: resourceUsage.memory + '%' }" :class="getUsageClass(resourceUsage.memory)"></div>
                    </div>
                    <span class="resource-value">{{ resourceUsage.memory }}%</span>
                  </div>
                </div>
                <div class="resource-item">
                  <div class="resource-label">Disk I/O</div>
                  <div class="resource-bar-wrapper">
                    <div class="resource-bar">
                      <div class="resource-fill" :style="{ width: resourceUsage.disk + '%' }" :class="getUsageClass(resourceUsage.disk)"></div>
                    </div>
                    <span class="resource-value">{{ resourceUsage.disk }}%</span>
                  </div>
                </div>
                <div class="resource-item">
                  <div class="resource-label">Network I/O</div>
                  <div class="resource-bar-wrapper">
                    <div class="resource-bar">
                      <div class="resource-fill" :style="{ width: resourceUsage.network + '%' }" :class="getUsageClass(resourceUsage.network)"></div>
                    </div>
                    <span class="resource-value">{{ resourceUsage.network }}%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div v-if="activeTab === 'logs'" class="logs-tab">
          <div class="logs-controls">
            <div class="logs-filters">
              <select v-model="logsService" class="form-select">
                <option value="all">All Services</option>
                <option v-for="service in services" :key="service.name" :value="service.name">
                  {{ service.name }}
                </option>
              </select>
              <select v-model="logsTail" class="form-select">
                <option :value="100">Last 100 lines</option>
                <option :value="500">Last 500 lines</option>
                <option :value="1000">Last 1000 lines</option>
                <option :value="0">All logs</option>
              </select>
              <label class="checkbox-label">
                <input type="checkbox" v-model="logsFollow" />
                Follow logs
              </label>
            </div>
            <div class="logs-actions">
              <button class="btn btn-sm btn-secondary" @click="fetchLogs">
                <i class="pi pi-refresh"></i> Refresh
              </button>
              <button class="btn btn-sm btn-secondary" @click="downloadLogs">
                <i class="pi pi-download"></i> Download
              </button>
              <button class="btn btn-sm btn-secondary" @click="clearLogs">
                <i class="pi pi-trash"></i> Clear
              </button>
            </div>
          </div>
          <div class="logs-viewer">
            <div class="logs-search">
              <i class="pi pi-search"></i>
              <input
                type="text"
                v-model="logsSearch"
                placeholder="Search in logs..."
                class="logs-search-input"
              />
            </div>
            <pre class="logs-content" ref="logsContainer">{{ filteredLogs }}</pre>
          </div>
        </div>

        <div v-if="activeTab === 'terminal'" class="terminal-tab">
          <div class="terminal-header">
            <div class="terminal-selector">
              <label>Service:</label>
              <select v-model="terminalService" class="form-select">
                <option v-for="service in services" :key="service.name" :value="service.name">
                  {{ service.name }}
                </option>
              </select>
            </div>
            <div class="terminal-actions">
              <button class="btn btn-sm btn-secondary" @click="reconnectTerminal">
                <i class="pi pi-refresh"></i> Reconnect
              </button>
            </div>
          </div>
          <div class="terminal-container">
            <div class="terminal-placeholder">
              <i class="pi pi-desktop"></i>
              <h3>Terminal Access</h3>
              <p>Connect to container shell for {{ terminalService || 'selected service' }}</p>
              <button class="btn btn-primary" @click="connectTerminal" :disabled="!terminalService">
                <i class="pi pi-sign-in"></i> Connect to Shell
              </button>
            </div>
          </div>
        </div>

        <div v-if="activeTab === 'environment'" class="env-tab">
          <div class="env-header">
            <h3>Environment Variables</h3>
            <button class="btn btn-sm btn-primary" @click="showAddEnvModal = true">
              <i class="pi pi-plus"></i> Add Variable
            </button>
          </div>
          <div class="env-list">
            <div v-if="envVars.length === 0" class="empty-env">
              <i class="pi pi-list"></i>
              <p>No environment variables configured</p>
            </div>
            <div v-else class="env-table">
              <div class="env-row header">
                <span class="env-key">Key</span>
                <span class="env-value">Value</span>
                <span class="env-actions">Actions</span>
              </div>
              <div v-for="env in envVars" :key="env.key" class="env-row">
                <span class="env-key">{{ env.key }}</span>
                <span class="env-value">
                  <code v-if="!env.hidden">{{ env.value }}</code>
                  <code v-else>••••••••</code>
                  <button class="toggle-btn" @click="env.hidden = !env.hidden">
                    <i :class="env.hidden ? 'pi pi-eye' : 'pi pi-eye-slash'"></i>
                  </button>
                </span>
                <span class="env-actions">
                  <button class="action-btn" @click="editEnvVar(env)">
                    <i class="pi pi-pencil"></i>
                  </button>
                  <button class="action-btn delete" @click="deleteEnvVar(env.key)">
                    <i class="pi pi-trash"></i>
                  </button>
                </span>
              </div>
            </div>
          </div>
        </div>

        <div v-if="activeTab === 'config'" class="config-tab">
          <div class="config-header">
            <h3>Docker Compose Configuration</h3>
            <div class="config-actions">
              <button class="btn btn-sm btn-secondary" @click="copyConfig">
                <i class="pi pi-copy"></i> Copy
              </button>
              <button class="btn btn-sm btn-primary" @click="editConfig">
                <i class="pi pi-pencil"></i> Edit
              </button>
            </div>
          </div>
          <div class="config-viewer">
            <pre class="config-content">{{ composeConfig }}</pre>
          </div>
        </div>
      </div>
    </template>

    <Teleport to="body">
      <div v-if="showOperationModal" class="modal-overlay" @click.self="showOperationModal = false">
        <div class="operation-modal modal-container">
          <div class="modal-header">
            <h3>
              <i class="pi pi-cog"></i>
              {{ operationTitle }}
            </h3>
          </div>
          <div class="modal-body">
            <div v-if="operationRunning" class="operation-progress">
              <i class="pi pi-spin pi-spinner"></i>
              <p>Operation in progress...</p>
            </div>
            <div v-else-if="operationSuccess" class="operation-success">
              <i class="pi pi-check-circle"></i>
              <p>Operation completed successfully</p>
            </div>
            <div v-else-if="operationError" class="operation-error">
              <i class="pi pi-times-circle"></i>
              <p>{{ operationError }}</p>
            </div>
            <pre v-if="operationOutput" class="operation-output">{{ operationOutput }}</pre>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" @click="showOperationModal = false">Close</button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { deploymentsApi } from '@/services/api'

const route = useRoute()
const router = useRouter()

const deployment = ref<any>(null)
const loading = ref(false)
const error = ref('')
const activeTab = ref('overview')

const tabs = [
  { id: 'overview', label: 'Overview', icon: 'pi pi-info-circle' },
  { id: 'logs', label: 'Logs', icon: 'pi pi-file-edit' },
  { id: 'terminal', label: 'Terminal', icon: 'pi pi-desktop' },
  { id: 'environment', label: 'Environment', icon: 'pi pi-list' },
  { id: 'config', label: 'Configuration', icon: 'pi pi-cog' }
]

const services = ref<any[]>([])
const resourceUsage = ref({
  cpu: 0,
  memory: 0,
  disk: 0,
  network: 0
})

const logsContainer = ref<HTMLElement | null>(null)
const logs = ref('')
const logsService = ref('all')
const logsTail = ref(100)
const logsFollow = ref(false)
const logsSearch = ref('')

const terminalService = ref('')

const envVars = ref<Array<{ key: string; value: string; hidden: boolean }>>([])
const showAddEnvModal = ref(false)

const composeConfig = ref('')

const showOperationModal = ref(false)
const operationTitle = ref('')
const operationRunning = ref(false)
const operationSuccess = ref(false)
const operationError = ref('')
const operationOutput = ref('')

let refreshInterval: number | null = null

const filteredLogs = computed(() => {
  if (!logsSearch.value) return logs.value
  const lines = logs.value.split('\n')
  return lines.filter(line => line.toLowerCase().includes(logsSearch.value.toLowerCase())).join('\n')
})

const fetchDeployment = async () => {
  loading.value = true
  error.value = ''
  try {
    const response = await deploymentsApi.get(route.params.name as string)
    deployment.value = response.data

    services.value = [
      { name: 'web', image: 'nginx:latest', status: 'running', ports: ['80:80', '443:443'] },
      { name: 'app', image: 'node:18-alpine', status: 'running', ports: ['3000:3000'] },
      { name: 'db', image: 'postgres:15', status: 'running', ports: ['5432:5432'] }
    ]

    resourceUsage.value = {
      cpu: Math.floor(Math.random() * 60 + 10),
      memory: Math.floor(Math.random() * 70 + 20),
      disk: Math.floor(Math.random() * 40 + 5),
      network: Math.floor(Math.random() * 30 + 5)
    }

    envVars.value = [
      { key: 'NODE_ENV', value: 'production', hidden: false },
      { key: 'DATABASE_URL', value: 'postgres://user:pass@db:5432/app', hidden: true },
      { key: 'SECRET_KEY', value: 'super-secret-key-12345', hidden: true },
      { key: 'API_PORT', value: '3000', hidden: false }
    ]

    try {
      const composeResponse = await deploymentsApi.getComposeFile(route.params.name as string)
      composeConfig.value = composeResponse.data.content || composeResponse.data || 'No compose file found'
    } catch (composeErr) {
      composeConfig.value = 'Error loading compose file'
      console.error('Failed to load compose file:', composeErr)
    }

    if (services.value.length > 0) {
      terminalService.value = services.value[0].name
    }
  } catch (err: any) {
    error.value = err.message || 'Failed to load deployment'
  } finally {
    loading.value = false
  }
}

const fetchLogs = async () => {
  try {
    const response = await deploymentsApi.logs(route.params.name as string)
    logs.value = response.data.logs || 'No logs available'

    if (logsFollow.value && logsContainer.value) {
      await nextTick()
      logsContainer.value.scrollTop = logsContainer.value.scrollHeight
    }
  } catch (err) {
    console.error('Failed to fetch logs:', err)
  }
}

const downloadLogs = () => {
  const blob = new Blob([logs.value], { type: 'text/plain' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${deployment.value?.name || 'deployment'}-logs.txt`
  a.click()
  URL.revokeObjectURL(url)
}

const clearLogs = () => {
  logs.value = ''
}

const handleOperation = async (operation: string) => {
  operationTitle.value = `${operation.charAt(0).toUpperCase() + operation.slice(1)} Deployment`
  operationRunning.value = true
  operationSuccess.value = false
  operationError.value = ''
  operationOutput.value = ''
  showOperationModal.value = true

  try {
    let response
    if (operation === 'start') {
      response = await deploymentsApi.start(route.params.name as string)
    } else if (operation === 'stop') {
      response = await deploymentsApi.stop(route.params.name as string)
    } else if (operation === 'restart') {
      response = await deploymentsApi.restart(route.params.name as string)
    }

    operationOutput.value = response?.data?.output || 'Operation completed'
    operationSuccess.value = true
    await fetchDeployment()
  } catch (err: any) {
    operationError.value = err.message || 'Operation failed'
  } finally {
    operationRunning.value = false
  }
}

const confirmDelete = () => {
  if (confirm(`Are you sure you want to delete deployment "${deployment.value?.name}"? This action cannot be undone.`)) {
    deleteDeployment()
  }
}

const deleteDeployment = async () => {
  try {
    await deploymentsApi.delete(route.params.name as string)
    router.push('/deployments')
  } catch (err: any) {
    alert('Failed to delete deployment: ' + err.message)
  }
}

const openTerminal = (service: any) => {
  terminalService.value = service.name
  activeTab.value = 'terminal'
}

const viewServiceLogs = (service: any) => {
  logsService.value = service.name
  activeTab.value = 'logs'
  fetchLogs()
}

const restartService = async (service: any) => {
  console.log('Restarting service:', service.name)
}

const connectTerminal = () => {
  console.log('Connecting to terminal for:', terminalService.value)
}

const reconnectTerminal = () => {
  console.log('Reconnecting terminal')
}

const editEnvVar = (env: any) => {
  console.log('Edit env var:', env.key)
}

const deleteEnvVar = (key: string) => {
  if (confirm(`Delete environment variable "${key}"?`)) {
    envVars.value = envVars.value.filter(e => e.key !== key)
  }
}

const copyConfig = () => {
  navigator.clipboard.writeText(composeConfig.value)
}

const editConfig = () => {
  console.log('Edit config')
}

const formatDateTime = (date: string) => {
  return new Date(date).toLocaleString()
}

const getUsageClass = (percentage: number) => {
  if (percentage > 80) return 'critical'
  if (percentage > 60) return 'warning'
  return 'normal'
}

watch(activeTab, (newTab) => {
  if (newTab === 'logs' && !logs.value) {
    fetchLogs()
  }
})

onMounted(() => {
  fetchDeployment()
  refreshInterval = window.setInterval(() => {
    if (logsFollow.value && activeTab.value === 'logs') {
      fetchLogs()
    }
  }, 3000)
})

onUnmounted(() => {
  if (refreshInterval) {
    clearInterval(refreshInterval)
  }
})
</script>

<style scoped>
.deployment-detail {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.detail-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  background: white;
  padding: var(--space-4) var(--space-5);
  border-radius: var(--radius-lg);
  border: 1px solid var(--color-gray-200);
}

.back-link {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  color: var(--color-gray-500);
  text-decoration: none;
  font-size: var(--text-sm);
  margin-bottom: var(--space-2);
}

.back-link:hover {
  color: var(--color-primary-500);
}

.deployment-title {
  display: flex;
  align-items: center;
  gap: var(--space-3);
}

.deployment-title h1 {
  font-size: var(--text-2xl);
  font-weight: var(--font-semibold);
  color: var(--color-gray-900);
  margin: 0;
}

.status-badge {
  font-size: var(--text-sm);
  padding: var(--space-1) var(--space-3);
  border-radius: var(--radius-full);
  font-weight: var(--font-medium);
  text-transform: capitalize;
}

.status-badge.running { background: var(--color-success-50); color: var(--color-success-700); }
.status-badge.stopped { background: var(--color-danger-50); color: var(--color-danger-700); }
.status-badge.error { background: var(--color-danger-50); color: var(--color-danger-700); }
.status-badge.starting { background: var(--color-warning-50); color: var(--color-warning-700); }

.header-actions {
  display: flex;
  gap: var(--space-2);
}

.btn {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-4);
  border-radius: var(--radius-md);
  font-weight: var(--font-medium);
  font-size: var(--text-md);
  cursor: pointer;
  transition: all var(--transition-base);
  border: none;
}

.btn-sm {
  padding: var(--space-1) var(--space-3);
  font-size: var(--text-base);
}

.btn-primary { background: var(--color-primary-500); color: white; }
.btn-primary:hover:not(:disabled) { background: var(--color-primary-600); }

.btn-secondary { background: var(--color-gray-100); color: var(--color-gray-700); }
.btn-secondary:hover:not(:disabled) { background: var(--color-gray-200); }

.btn-success { background: var(--color-success-50); color: var(--color-success-700); }
.btn-success:hover:not(:disabled) { background: var(--color-success-100); }

.btn-warning { background: var(--color-warning-50); color: var(--color-warning-700); }
.btn-warning:hover:not(:disabled) { background: var(--color-warning-100); }

.btn-info { background: var(--color-info-50); color: var(--color-info-700); }
.btn-info:hover:not(:disabled) { background: var(--color-info-100); }

.btn-danger { background: var(--color-danger-50); color: var(--color-danger-700); }
.btn-danger:hover:not(:disabled) { background: var(--color-danger-100); }

.btn:disabled { opacity: 0.5; cursor: not-allowed; }

.loading-state, .error-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: var(--space-12);
  background: white;
  border-radius: var(--radius-lg);
  text-align: center;
  gap: var(--space-4);
}

.loading-state i, .error-state i {
  font-size: 3rem;
  color: var(--color-gray-400);
}

.detail-tabs {
  display: flex;
  gap: var(--space-1);
  background: var(--color-gray-100);
  padding: var(--space-1);
  border-radius: var(--radius-md);
}

.tab-btn {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-4);
  border: none;
  background: transparent;
  border-radius: var(--radius-sm);
  font-size: var(--text-md);
  color: var(--color-gray-500);
  cursor: pointer;
  transition: all var(--transition-base);
}

.tab-btn:hover {
  color: var(--color-gray-700);
}

.tab-btn.active {
  background: white;
  color: var(--color-gray-900);
  box-shadow: var(--shadow-xs);
}

.tab-content {
  background: white;
  border-radius: var(--radius-lg);
  border: 1px solid var(--color-gray-200);
  min-height: 500px;
}

.overview-tab {
  padding: var(--space-5);
}

.info-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
  gap: var(--space-4);
  margin-bottom: var(--space-4);
}

.info-card {
  border: 1px solid var(--color-gray-200);
  border-radius: var(--radius-md);
  overflow: hidden;
}

.info-card.wide {
  grid-column: 1 / -1;
}

.info-card .card-header {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-3) var(--space-4);
  background: var(--color-gray-50);
  border-bottom: 1px solid var(--color-gray-200);
}

.info-card .card-header i {
  color: var(--color-primary-500);
}

.info-card .card-header h3 {
  font-size: var(--text-md);
  font-weight: var(--font-semibold);
  color: var(--color-gray-900);
  margin: 0;
}

.info-card .card-body {
  padding: var(--space-4);
}

.info-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--space-2) 0;
  border-bottom: 1px solid var(--color-gray-100);
}

.info-row:last-child {
  border-bottom: none;
}

.info-row .label {
  font-size: var(--text-sm);
  color: var(--color-gray-500);
}

.info-row .value {
  font-size: var(--text-md);
  color: var(--color-gray-900);
  font-weight: var(--font-medium);
}

.info-row .value.path {
  font-size: var(--text-sm);
  background: var(--color-gray-100);
  padding: var(--space-1) var(--space-2);
  border-radius: var(--radius-sm);
}

.status-indicator {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  margin-right: var(--space-2);
}

.status-indicator.running { background: var(--color-success-500); }
.status-indicator.stopped { background: var(--color-danger-500); }

.services-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.service-item {
  border: 1px solid var(--color-gray-200);
  border-radius: var(--radius-md);
  padding: var(--space-3);
}

.service-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--space-2);
}

.service-name {
  font-weight: var(--font-semibold);
  color: var(--color-gray-900);
}

.service-status {
  font-size: var(--text-xs);
  padding: var(--space-1) var(--space-2);
  border-radius: var(--radius-full);
  font-weight: var(--font-medium);
}

.service-status.running { background: var(--color-success-50); color: var(--color-success-700); }
.service-status.stopped { background: var(--color-danger-50); color: var(--color-danger-700); }

.service-details {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-3);
  margin-bottom: var(--space-2);
}

.detail-item {
  display: flex;
  align-items: center;
  gap: var(--space-1);
  font-size: var(--text-sm);
  color: var(--color-gray-600);
}

.service-actions {
  display: flex;
  gap: var(--space-2);
}

.action-btn {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: var(--radius-sm);
  cursor: pointer;
  background: var(--color-gray-100);
  color: var(--color-gray-600);
  transition: all var(--transition-base);
}

.action-btn:hover {
  background: var(--color-gray-200);
  color: var(--color-gray-900);
}

.action-btn.delete {
  background: var(--color-danger-50);
  color: var(--color-danger-600);
}

.action-btn.delete:hover {
  background: var(--color-danger-100);
}

.resource-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: var(--space-4);
}

.resource-item {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.resource-label {
  font-size: var(--text-sm);
  color: var(--color-gray-600);
  font-weight: var(--font-medium);
}

.resource-bar-wrapper {
  display: flex;
  align-items: center;
  gap: var(--space-3);
}

.resource-bar {
  flex: 1;
  height: 8px;
  background: var(--color-gray-200);
  border-radius: var(--radius-full);
  overflow: hidden;
}

.resource-fill {
  height: 100%;
  border-radius: var(--radius-full);
  transition: width var(--transition-base);
}

.resource-fill.normal { background: var(--color-success-500); }
.resource-fill.warning { background: var(--color-warning-500); }
.resource-fill.critical { background: var(--color-danger-500); }

.resource-value {
  font-size: var(--text-sm);
  font-weight: var(--font-semibold);
  color: var(--color-gray-700);
  min-width: 45px;
}

.logs-tab {
  display: flex;
  flex-direction: column;
  height: 600px;
}

.logs-controls {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--space-3) var(--space-4);
  border-bottom: 1px solid var(--color-gray-200);
  background: var(--color-gray-50);
}

.logs-filters {
  display: flex;
  align-items: center;
  gap: var(--space-3);
}

.form-select {
  padding: var(--space-2) var(--space-3);
  border: 1px solid var(--color-gray-200);
  border-radius: var(--radius-md);
  font-size: var(--text-md);
  background: white;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  font-size: var(--text-md);
  color: var(--color-gray-700);
}

.logs-actions {
  display: flex;
  gap: var(--space-2);
}

.logs-viewer {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.logs-search {
  position: relative;
  padding: var(--space-3) var(--space-4);
  border-bottom: 1px solid var(--color-gray-200);
}

.logs-search i {
  position: absolute;
  left: calc(var(--space-4) + var(--space-3));
  top: 50%;
  transform: translateY(-50%);
  color: var(--color-gray-400);
}

.logs-search-input {
  width: 100%;
  padding: var(--space-2) var(--space-3) var(--space-2) 2.5rem;
  border: 1px solid var(--color-gray-200);
  border-radius: var(--radius-md);
  font-size: var(--text-md);
}

.logs-content {
  flex: 1;
  margin: 0;
  padding: var(--space-4);
  background: var(--color-gray-950);
  color: #e2e8f0;
  font-family: var(--font-mono);
  font-size: var(--text-sm);
  line-height: 1.6;
  overflow: auto;
  white-space: pre-wrap;
  word-break: break-all;
  border-radius: 0 0 var(--radius-lg) var(--radius-lg);
  min-height: 400px;
}

.logs-content:empty::before {
  content: 'Loading logs...';
  color: var(--color-gray-500);
  font-style: italic;
}

.terminal-tab {
  padding: var(--space-4);
}

.terminal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--space-4);
}

.terminal-selector {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.terminal-container {
  background: var(--color-gray-950);
  border-radius: var(--radius-md);
  min-height: 500px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.terminal-placeholder {
  text-align: center;
  color: var(--color-gray-400);
}

.terminal-placeholder i {
  font-size: 3rem;
  margin-bottom: var(--space-4);
}

.terminal-placeholder h3 {
  color: var(--color-gray-300);
  margin: 0 0 var(--space-2) 0;
}

.terminal-placeholder p {
  margin: 0 0 var(--space-4) 0;
}

.env-tab {
  padding: var(--space-4);
}

.env-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--space-4);
}

.env-header h3 {
  font-size: var(--text-lg);
  font-weight: var(--font-semibold);
  color: var(--color-gray-900);
  margin: 0;
}

.empty-env {
  text-align: center;
  padding: var(--space-8);
  color: var(--color-gray-500);
}

.empty-env i {
  font-size: 2rem;
  margin-bottom: var(--space-3);
}

.env-table {
  border: 1px solid var(--color-gray-200);
  border-radius: var(--radius-md);
  overflow: hidden;
}

.env-row {
  display: grid;
  grid-template-columns: 200px 1fr 100px;
  border-bottom: 1px solid var(--color-gray-200);
}

.env-row:last-child {
  border-bottom: none;
}

.env-row.header {
  background: var(--color-gray-50);
  font-weight: var(--font-semibold);
  font-size: var(--text-sm);
  color: var(--color-gray-600);
}

.env-key, .env-value, .env-actions {
  padding: var(--space-3);
}

.env-value {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.env-value code {
  background: var(--color-gray-100);
  padding: var(--space-1) var(--space-2);
  border-radius: var(--radius-sm);
  font-size: var(--text-sm);
}

.toggle-btn {
  background: none;
  border: none;
  color: var(--color-gray-400);
  cursor: pointer;
  padding: var(--space-1);
}

.toggle-btn:hover {
  color: var(--color-gray-600);
}

.env-actions {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.config-tab {
  padding: var(--space-4);
}

.config-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--space-4);
}

.config-header h3 {
  font-size: var(--text-lg);
  font-weight: var(--font-semibold);
  color: var(--color-gray-900);
  margin: 0;
}

.config-actions {
  display: flex;
  gap: var(--space-2);
}

.config-viewer {
  background: var(--color-gray-950);
  border-radius: var(--radius-md);
  overflow: hidden;
}

.config-content {
  margin: 0;
  padding: var(--space-4);
  color: #e2e8f0;
  font-family: var(--font-mono);
  font-size: var(--text-sm);
  line-height: 1.6;
}

.operation-modal {
  max-width: 600px;
}

.operation-progress, .operation-success, .operation-error {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: var(--space-6);
  gap: var(--space-3);
}

.operation-progress i {
  font-size: 2rem;
  color: var(--color-primary-500);
}

.operation-success i {
  font-size: 2rem;
  color: var(--color-success-500);
}

.operation-error i {
  font-size: 2rem;
  color: var(--color-danger-500);
}

.operation-output {
  background: var(--color-gray-950);
  color: #e2e8f0;
  padding: var(--space-3);
  border-radius: var(--radius-sm);
  font-family: var(--font-mono);
  font-size: var(--text-sm);
  max-height: 300px;
  overflow: auto;
  margin: 0;
}
</style>
