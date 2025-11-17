<template>
  <div class="deployments-page">
    <div class="page-toolbar">
      <div class="toolbar-left">
        <button class="btn btn-primary" @click="showNewDeploymentModal = true">
          <i class="pi pi-plus"></i>
          New Deployment
        </button>
        <button class="btn btn-outline" @click="refreshDeployments">
          <i class="pi pi-refresh" :class="{ 'pi-spin': loading }"></i>
          Refresh
        </button>
      </div>
      <div class="toolbar-right">
        <div class="search-box">
          <i class="pi pi-search"></i>
          <input
            type="text"
            v-model="searchQuery"
            placeholder="Search deployments..."
          />
        </div>
        <div class="view-toggle">
          <button
            :class="{ active: viewMode === 'grid' }"
            @click="viewMode = 'grid'"
          >
            <i class="pi pi-th-large"></i>
          </button>
          <button
            :class="{ active: viewMode === 'table' }"
            @click="viewMode = 'table'"
          >
            <i class="pi pi-list"></i>
          </button>
        </div>
      </div>
    </div>

    <div v-if="loading && deployments.length === 0" class="loading-state">
      <i class="pi pi-spin pi-spinner"></i>
      <span>Loading deployments...</span>
    </div>

    <div v-else-if="error" class="error-state">
      <i class="pi pi-exclamation-triangle"></i>
      <h3>Failed to load deployments</h3>
      <p>{{ error }}</p>
      <button class="btn btn-primary" @click="refreshDeployments">Try Again</button>
    </div>

    <div v-else-if="filteredDeployments.length === 0" class="empty-state">
      <i class="pi pi-inbox"></i>
      <h3>No Deployments Found</h3>
      <p v-if="searchQuery">No results for "{{ searchQuery }}"</p>
      <p v-else>Create your first deployment to get started</p>
    </div>

    <template v-else>
      <div v-if="viewMode === 'grid'" class="deployments-grid">
        <div
          v-for="deployment in paginatedDeployments"
          :key="deployment.name"
          class="deployment-card"
          @click="goToDeployment(deployment.name)"
        >
          <div class="card-header">
            <h3>{{ deployment.name }}</h3>
            <span class="status-dot" :class="deployment.status"></span>
          </div>
          <div class="card-body">
            <div class="info-item">
              <span class="label">Status</span>
              <span class="badge" :class="deployment.status">{{ deployment.status }}</span>
            </div>
            <div class="info-item">
              <span class="label">Path</span>
              <code>{{ deployment.path }}</code>
            </div>
            <div class="info-item">
              <span class="label">Updated</span>
              <span>{{ formatDate(deployment.updated_at) }}</span>
            </div>
          </div>
          <div class="card-footer" @click.stop>
            <button class="icon-btn success" @click="handleOperation('start', deployment.name)" title="Start">
              <i class="pi pi-play"></i>
            </button>
            <button class="icon-btn danger" @click="handleOperation('stop', deployment.name)" title="Stop">
              <i class="pi pi-stop"></i>
            </button>
            <button class="icon-btn primary" @click="handleOperation('restart', deployment.name)" title="Restart">
              <i class="pi pi-refresh"></i>
            </button>
            <button class="icon-btn neutral" @click="viewLogs(deployment.name)" title="Logs">
              <i class="pi pi-file"></i>
            </button>
          </div>
        </div>
      </div>

      <div v-else class="deployments-table">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Status</th>
              <th>Path</th>
              <th>Updated</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="deployment in paginatedDeployments"
              :key="deployment.name"
              @click="goToDeployment(deployment.name)"
              class="clickable-row"
            >
              <td class="name-cell">
                <span class="status-dot small" :class="deployment.status"></span>
                {{ deployment.name }}
              </td>
              <td>
                <span class="badge" :class="deployment.status">{{ deployment.status }}</span>
              </td>
              <td class="path-cell">
                <code>{{ deployment.path }}</code>
              </td>
              <td>{{ formatDate(deployment.updated_at) }}</td>
              <td class="actions-cell" @click.stop>
                <button class="icon-btn-sm success" @click="handleOperation('start', deployment.name)">
                  <i class="pi pi-play"></i>
                </button>
                <button class="icon-btn-sm danger" @click="handleOperation('stop', deployment.name)">
                  <i class="pi pi-stop"></i>
                </button>
                <button class="icon-btn-sm primary" @click="handleOperation('restart', deployment.name)">
                  <i class="pi pi-refresh"></i>
                </button>
                <button class="icon-btn-sm neutral" @click="viewLogs(deployment.name)">
                  <i class="pi pi-file"></i>
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="pagination" v-if="totalPages > 1">
        <button
          class="page-btn"
          :disabled="currentPage === 1"
          @click="currentPage = 1"
        >
          <i class="pi pi-angle-double-left"></i>
        </button>
        <button
          class="page-btn"
          :disabled="currentPage === 1"
          @click="currentPage--"
        >
          <i class="pi pi-angle-left"></i>
        </button>
        <span class="page-info">
          Page {{ currentPage }} of {{ totalPages }}
        </span>
        <button
          class="page-btn"
          :disabled="currentPage === totalPages"
          @click="currentPage++"
        >
          <i class="pi pi-angle-right"></i>
        </button>
        <button
          class="page-btn"
          :disabled="currentPage === totalPages"
          @click="currentPage = totalPages"
        >
          <i class="pi pi-angle-double-right"></i>
        </button>
        <select v-model="pageSize" class="page-size-select">
          <option :value="6">6 per page</option>
          <option :value="12">12 per page</option>
          <option :value="24">24 per page</option>
        </select>
      </div>
    </template>

    <OperationModal
      :visible="operationModal.visible"
      :operation="operationModal.operation"
      :deployment-name="operationModal.deploymentName"
      :output="operationModal.output"
      :is-running="operationModal.isRunning"
      :is-success="operationModal.isSuccess"
      @close="closeOperationModal"
    />

    <LogsModal
      :visible="logsModal.visible"
      :deployment-name="logsModal.deploymentName"
      :logs="logsModal.logs"
      @close="logsModal.visible = false"
    />

    <NewDeploymentModal
      :visible="showNewDeploymentModal"
      @close="showNewDeploymentModal = false"
      @created="onDeploymentCreated"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { deploymentsApi } from '@/services/api'
import { useNotificationsStore } from '@/stores/notifications'
import type { Deployment } from '@/types'
import OperationModal from '@/components/OperationModal.vue'
import LogsModal from '@/components/LogsModal.vue'
import NewDeploymentModal from '@/components/NewDeploymentModal.vue'

const router = useRouter()
const notifications = useNotificationsStore()
const deployments = ref<Deployment[]>([])
const loading = ref(true)
const error = ref<string | null>(null)
const viewMode = ref<'grid' | 'table'>('grid')
const searchQuery = ref('')
const currentPage = ref(1)
const pageSize = ref(6)
const showNewDeploymentModal = ref(false)

const operationModal = ref({
  visible: false,
  operation: 'start' as 'start' | 'stop' | 'restart',
  deploymentName: '',
  output: '',
  isRunning: false,
  isSuccess: null as boolean | null
})

const logsModal = ref({
  visible: false,
  deploymentName: '',
  logs: ''
})

const filteredDeployments = computed(() => {
  if (!searchQuery.value) return deployments.value
  const query = searchQuery.value.toLowerCase()
  return deployments.value.filter(d =>
    d.name.toLowerCase().includes(query) ||
    d.path.toLowerCase().includes(query) ||
    d.status.toLowerCase().includes(query)
  )
})

const totalPages = computed(() =>
  Math.ceil(filteredDeployments.value.length / pageSize.value)
)

const paginatedDeployments = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  return filteredDeployments.value.slice(start, start + pageSize.value)
})

const fetchDeployments = async () => {
  loading.value = true
  error.value = null

  try {
    const response = await deploymentsApi.list()
    deployments.value = response.data.deployments || []
  } catch (e: any) {
    error.value = e.message || 'Failed to fetch deployments'
    notifications.error('Failed to load deployments', e.message)
  } finally {
    loading.value = false
  }
}

const refreshDeployments = () => {
  fetchDeployments()
  notifications.info('Refreshing', 'Fetching latest deployment status')
}

const handleOperation = async (op: 'start' | 'stop' | 'restart', name: string) => {
  operationModal.value = {
    visible: true,
    operation: op,
    deploymentName: name,
    output: '',
    isRunning: true,
    isSuccess: null
  }

  try {
    let response
    if (op === 'start') {
      response = await deploymentsApi.start(name)
    } else if (op === 'stop') {
      response = await deploymentsApi.stop(name)
    } else {
      response = await deploymentsApi.restart(name)
    }

    operationModal.value.output = response.data.output || 'Operation completed'
    operationModal.value.isSuccess = true
    operationModal.value.isRunning = false

    notifications.success(`${op} successful`, `${name} ${op}ed successfully`)
    await fetchDeployments()
  } catch (e: any) {
    const errorMsg = e.response?.data?.output || e.response?.data?.error || e.message
    operationModal.value.output = errorMsg
    operationModal.value.isSuccess = false
    operationModal.value.isRunning = false

    notifications.error(`${op} failed`, errorMsg)
  }
}

const closeOperationModal = () => {
  operationModal.value.visible = false
}

const viewLogs = async (name: string) => {
  logsModal.value = {
    visible: true,
    deploymentName: name,
    logs: 'Loading...'
  }

  try {
    const response = await deploymentsApi.logs(name)
    logsModal.value.logs = response.data.logs || 'No logs available'
  } catch (e: any) {
    logsModal.value.logs = `Error: ${e.message}`
    notifications.error('Failed to load logs', e.message)
  }
}

const onDeploymentCreated = () => {
  showNewDeploymentModal.value = false
  fetchDeployments()
  notifications.success('Deployment created', 'New deployment folder created successfully')
}

const goToDeployment = (name: string) => {
  router.push(`/deployments/${name}`)
}

const formatDate = (dateStr: string) => {
  const date = new Date(dateStr)
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

onMounted(() => {
  fetchDeployments()
})
</script>

<style scoped>
.deployments-page {
  display: flex;
  flex-direction: column;
  gap: var(--space-6);
}

.page-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: var(--space-4);
}

.toolbar-left,
.toolbar-right {
  display: flex;
  align-items: center;
  gap: var(--space-3);
}

.btn {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  padding: 0.625rem var(--space-4);
  border-radius: var(--radius-md);
  font-weight: var(--font-medium);
  font-size: var(--text-md);
  cursor: pointer;
  transition: all var(--transition-base);
  border: none;
}

.btn-primary {
  background: var(--color-primary-500);
  color: white;
}

.btn-primary:hover {
  background: var(--color-primary-600);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4);
}

.btn-outline {
  background: white;
  color: var(--color-gray-700);
  border: 1px solid var(--color-gray-300);
}

.btn-outline:hover {
  background: var(--color-gray-50);
  border-color: var(--color-gray-400);
}

.search-box {
  position: relative;
  display: flex;
  align-items: center;
}

.search-box i {
  position: absolute;
  left: var(--space-3);
  color: var(--color-gray-400);
}

.search-box input {
  padding: 0.625rem var(--space-3) 0.625rem 2.25rem;
  border: 1px solid var(--color-gray-300);
  border-radius: var(--radius-md);
  font-size: var(--text-md);
  width: 240px;
  transition: all var(--transition-base);
}

.search-box input:focus {
  outline: none;
  border-color: var(--color-primary-500);
  box-shadow: 0 0 0 var(--ring-width) var(--ring-color);
}

.view-toggle {
  display: flex;
  background: var(--color-gray-100);
  border-radius: var(--radius-md);
  padding: var(--space-1);
}

.view-toggle button {
  padding: var(--space-2) var(--space-3);
  background: transparent;
  border: none;
  border-radius: var(--radius-md);
  color: var(--color-gray-500);
  cursor: pointer;
  transition: all var(--transition-base);
}

.view-toggle button.active {
  background: white;
  color: var(--color-gray-900);
  box-shadow: var(--shadow-sm);
}

.loading-state,
.error-state,
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--space-12) var(--space-8);
  background: white;
  border-radius: var(--radius-lg);
  text-align: center;
}

.loading-state i,
.error-state i,
.empty-state i {
  font-size: 3rem;
  margin-bottom: var(--space-4);
  color: var(--color-gray-400);
}

.error-state i {
  color: var(--color-danger-500);
}

.loading-state span,
.empty-state h3,
.error-state h3 {
  color: var(--color-gray-700);
  font-weight: var(--font-semibold);
}

.empty-state p,
.error-state p {
  color: var(--color-gray-500);
  margin-top: var(--space-2);
}

.deployments-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(360px, 1fr));
  gap: var(--space-5);
}

.deployment-card {
  background: white;
  border-radius: var(--radius-lg);
  border: 1px solid var(--color-gray-200);
  box-shadow: var(--shadow-sm);
  transition: all var(--transition-base);
  overflow: hidden;
  cursor: pointer;
}

.deployment-card:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-lg);
  border-color: var(--color-primary-200);
}

.deployment-card .card-header {
  padding: var(--space-4) var(--space-5);
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid var(--color-gray-100);
}

.deployment-card h3 {
  font-size: var(--text-xl);
  font-weight: var(--font-semibold);
  color: var(--color-gray-900);
}

.status-dot {
  width: 10px;
  height: 10px;
  border-radius: var(--radius-full);
  background: var(--color-gray-500);
}

.status-dot.small {
  width: 8px;
  height: 8px;
}

.status-dot.running {
  background: var(--color-success-500);
  box-shadow: 0 0 8px rgba(34, 197, 94, 0.6);
}

.status-dot.stopped {
  background: var(--color-gray-400);
}

.status-dot.error {
  background: var(--color-danger-500);
  box-shadow: 0 0 8px rgba(239, 68, 68, 0.6);
}

.card-body {
  padding: var(--space-4) var(--space-5);
}

.info-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.625rem;
}

.info-item:last-child {
  margin-bottom: 0;
}

.info-item .label {
  font-size: var(--text-base);
  color: var(--color-gray-500);
}

.info-item code {
  font-size: var(--text-sm);
  background: var(--color-gray-100);
  padding: var(--space-1) var(--space-2);
  border-radius: var(--radius-sm);
  font-family: 'SF Mono', monospace;
  color: var(--color-gray-600);
  max-width: 180px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.badge {
  padding: var(--space-1) 0.625rem;
  border-radius: var(--radius-full);
  font-size: var(--text-xs);
  font-weight: var(--font-semibold);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.badge.running {
  background: var(--color-success-50);
  color: var(--color-success-700);
}

.badge.stopped {
  background: var(--color-gray-100);
  color: var(--color-gray-600);
}

.badge.error {
  background: var(--color-danger-50);
  color: var(--color-danger-700);
}

.card-footer {
  padding: var(--space-3) var(--space-5);
  background: var(--color-gray-50);
  display: flex;
  gap: var(--space-2);
}

.icon-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-2);
  border: none;
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all var(--transition-base);
  font-size: var(--text-lg);
}

.icon-btn.success {
  background: var(--color-success-50);
  color: var(--color-success-600);
}

.icon-btn.success:hover {
  background: var(--color-success-100);
  transform: scale(1.05);
}

.icon-btn.danger {
  background: var(--color-danger-50);
  color: var(--color-danger-600);
}

.icon-btn.danger:hover {
  background: var(--color-danger-100);
  transform: scale(1.05);
}

.icon-btn.primary {
  background: var(--color-info-50);
  color: var(--color-primary-600);
}

.icon-btn.primary:hover {
  background: var(--color-info-100);
  transform: scale(1.05);
}

.icon-btn.neutral {
  background: var(--color-gray-100);
  color: var(--color-gray-600);
}

.icon-btn.neutral:hover {
  background: var(--color-gray-200);
  transform: scale(1.05);
}

.deployments-table {
  background: white;
  border-radius: var(--radius-lg);
  overflow: hidden;
  border: 1px solid var(--color-gray-200);
  box-shadow: var(--shadow-sm);
}

table {
  width: 100%;
  border-collapse: collapse;
}

th {
  padding: var(--space-4) var(--space-5);
  text-align: left;
  font-size: var(--text-base);
  font-weight: var(--font-semibold);
  color: var(--color-gray-500);
  background: var(--color-gray-50);
  border-bottom: 1px solid var(--color-gray-200);
}

td {
  padding: var(--space-4) var(--space-5);
  font-size: var(--text-md);
  color: var(--color-gray-700);
  border-bottom: 1px solid var(--color-gray-100);
}

.clickable-row {
  cursor: pointer;
  transition: background var(--transition-base);
}

.clickable-row:hover td {
  background: var(--color-gray-50);
}

.name-cell {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  font-weight: var(--font-medium);
}

.path-cell code {
  font-size: var(--text-sm);
  background: var(--color-gray-100);
  padding: var(--space-1) var(--space-2);
  border-radius: var(--radius-sm);
  font-family: 'SF Mono', monospace;
}

.actions-cell {
  display: flex;
  gap: 0.375rem;
}

.icon-btn-sm {
  padding: 0.375rem;
  border: none;
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: all var(--transition-base);
  font-size: var(--text-base);
}

.icon-btn-sm.success {
  background: var(--color-success-50);
  color: var(--color-success-600);
}

.icon-btn-sm.danger {
  background: var(--color-danger-50);
  color: var(--color-danger-600);
}

.icon-btn-sm.primary {
  background: var(--color-info-50);
  color: var(--color-primary-600);
}

.icon-btn-sm.neutral {
  background: var(--color-gray-100);
  color: var(--color-gray-600);
}

.icon-btn-sm:hover {
  transform: scale(1.1);
}

.pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  margin-top: var(--space-4);
}

.page-btn {
  padding: var(--space-2) var(--space-3);
  background: white;
  border: 1px solid var(--color-gray-300);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all var(--transition-base);
  color: var(--color-gray-700);
}

.page-btn:hover:not(:disabled) {
  background: var(--color-gray-100);
}

.page-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.page-info {
  padding: var(--space-2) var(--space-4);
  color: var(--color-gray-500);
  font-size: var(--text-md);
}

.page-size-select {
  padding: var(--space-2);
  border: 1px solid var(--color-gray-300);
  border-radius: var(--radius-md);
  font-size: var(--text-md);
  color: var(--color-gray-700);
  background: white;
  margin-left: var(--space-4);
}
</style>
