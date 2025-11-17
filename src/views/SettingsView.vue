<template>
  <div class="settings-view">
    <div class="view-header">
      <div class="header-actions">
        <button class="btn btn-icon" @click="fetchSettings" :disabled="loading">
          <i class="pi pi-refresh" :class="{ 'pi-spin': loading }"></i>
        </button>
      </div>
    </div>

    <div v-if="loading" class="loading-state">
      <i class="pi pi-spin pi-spinner"></i>
      <span>Loading settings...</span>
    </div>

    <div v-else class="settings-content">
      <div class="settings-section">
        <div class="section-header">
          <i class="pi pi-cog"></i>
          <h3>Agent Configuration</h3>
        </div>
        <div class="section-body">
          <div class="setting-item">
            <div class="setting-info">
              <span class="setting-label">Deployments Path</span>
              <span class="setting-description">Directory where deployments are stored</span>
            </div>
            <div class="setting-value">
              <code>{{ settings.deployments_path }}</code>
            </div>
          </div>
          <div class="setting-item">
            <div class="setting-info">
              <span class="setting-label">API Port</span>
              <span class="setting-description">Port the agent listens on</span>
            </div>
            <div class="setting-value">
              <code>{{ settings.api_port }}</code>
            </div>
          </div>
          <div class="setting-item">
            <div class="setting-info">
              <span class="setting-label">CORS Enabled</span>
              <span class="setting-description">Cross-origin resource sharing</span>
            </div>
            <div class="setting-value">
              <span class="status-badge" :class="settings.enable_cors ? 'enabled' : 'disabled'">
                {{ settings.enable_cors ? 'Enabled' : 'Disabled' }}
              </span>
            </div>
          </div>
          <div class="setting-item">
            <div class="setting-info">
              <span class="setting-label">Allowed Origins</span>
              <span class="setting-description">Origins allowed to access the API</span>
            </div>
            <div class="setting-value">
              <div class="origins-list">
                <code v-for="origin in settings.allowed_origins" :key="origin">{{ origin }}</code>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="settings-section">
        <div class="section-header">
          <i class="pi pi-info-circle"></i>
          <h3>System Information</h3>
        </div>
        <div class="section-body">
          <div class="setting-item">
            <div class="setting-info">
              <span class="setting-label">Agent Status</span>
            </div>
            <div class="setting-value">
              <span class="status-badge enabled">Online</span>
            </div>
          </div>
          <div class="setting-item">
            <div class="setting-info">
              <span class="setting-label">Agent Version</span>
            </div>
            <div class="setting-value">
              <code>1.0.0</code>
            </div>
          </div>
          <div class="setting-item">
            <div class="setting-info">
              <span class="setting-label">UI Version</span>
            </div>
            <div class="setting-value">
              <code>{{ uiVersion }}</code>
            </div>
          </div>
        </div>
      </div>

      <div class="settings-section">
        <div class="section-header">
          <i class="pi pi-database"></i>
          <h3>Quick Actions</h3>
        </div>
        <div class="section-body">
          <div class="actions-grid">
            <button class="action-card" @click="testConnection">
              <i class="pi pi-check-circle"></i>
              <span>Test Connection</span>
            </button>
            <button class="action-card" @click="refreshData">
              <i class="pi pi-sync"></i>
              <span>Refresh All Data</span>
            </button>
            <button class="action-card" @click="clearCache">
              <i class="pi pi-trash"></i>
              <span>Clear Cache</span>
            </button>
          </div>
        </div>
      </div>

      <div class="settings-section">
        <div class="section-header">
          <i class="pi pi-file-edit"></i>
          <h3>Configuration File</h3>
        </div>
        <div class="section-body">
          <div class="config-note">
            <i class="pi pi-info-circle"></i>
            <p>
              To modify settings, edit the configuration file on your server and restart the agent.
              The configuration file is typically located at <code>/etc/flatrun/config.yml</code> or passed via command line.
            </p>
          </div>
          <pre class="config-preview">{{ configYaml }}</pre>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { settingsApi, healthApi } from '@/services/api'
import { useNotificationsStore } from '@/stores/notifications'

const notifications = useNotificationsStore()
const loading = ref(false)

const settings = reactive({
  deployments_path: '',
  api_port: 0,
  enable_cors: false,
  allowed_origins: [] as string[]
})

const uiVersion = '1.0.0'

const configYaml = computed(() => {
  return `deployments_path: ${settings.deployments_path}

api:
  port: ${settings.api_port}
  enable_cors: ${settings.enable_cors}
  allowed_origins:
${settings.allowed_origins.map(o => `    - ${o}`).join('\n')}
`
})

const fetchSettings = async () => {
  loading.value = true

  try {
    const response = await settingsApi.get()
    const data = response.data.settings
    settings.deployments_path = data.deployments_path || ''
    settings.api_port = data.api_port || 0
    settings.enable_cors = data.enable_cors || false
    settings.allowed_origins = data.allowed_origins || []
  } catch (e: any) {
    notifications.error('Error', 'Failed to load settings')
  } finally {
    loading.value = false
  }
}

const testConnection = async () => {
  try {
    await healthApi.check()
    notifications.success('Connection OK', 'Agent is responding normally')
  } catch {
    notifications.error('Connection Failed', 'Unable to reach the agent')
  }
}

const refreshData = () => {
  notifications.info('Refreshing', 'Reloading all data...')
  window.location.reload()
}

const clearCache = () => {
  localStorage.clear()
  notifications.success('Cache Cleared', 'Local storage has been cleared')
}

onMounted(() => {
  fetchSettings()
})
</script>

<style scoped>
.settings-view {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.view-header {
  display: flex;
  justify-content: flex-end;
  align-items: center;
}

.btn-icon {
  padding: 0.625rem;
  background: white;
  border: 1px solid #e5e7eb;
  color: #6b7280;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-icon:hover:not(:disabled) {
  background: #f9fafb;
  color: #374151;
}

.btn-icon:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 4rem;
  background: white;
  border-radius: 16px;
  text-align: center;
  gap: 1rem;
}

.loading-state i {
  font-size: 3rem;
  color: #9ca3af;
}

.settings-content {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.settings-section {
  background: white;
  border-radius: 16px;
  border: 1px solid #e5e7eb;
  overflow: hidden;
}

.section-header {
  padding: 1.25rem 1.5rem;
  border-bottom: 1px solid #f3f4f6;
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.section-header i {
  font-size: 1.25rem;
  color: #3b82f6;
}

.section-header h3 {
  font-size: 1rem;
  font-weight: 600;
  color: #1f2937;
  margin: 0;
}

.section-body {
  padding: 1.5rem;
}

.setting-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 0;
  border-bottom: 1px solid #f3f4f6;
}

.setting-item:last-child {
  border-bottom: none;
  padding-bottom: 0;
}

.setting-item:first-child {
  padding-top: 0;
}

.setting-info {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.setting-label {
  font-size: 0.875rem;
  font-weight: 600;
  color: #1f2937;
}

.setting-description {
  font-size: 0.75rem;
  color: #6b7280;
}

.setting-value {
  text-align: right;
}

.setting-value code {
  background: #f3f4f6;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-family: 'SF Mono', 'Fira Code', monospace;
  font-size: 0.8125rem;
  color: #374151;
}

.status-badge {
  display: inline-block;
  padding: 0.25rem 0.75rem;
  border-radius: 9999px;
  font-size: 0.75rem;
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

.origins-list {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  align-items: flex-end;
}

.origins-list code {
  background: #f3f4f6;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-family: 'SF Mono', 'Fira Code', monospace;
  font-size: 0.75rem;
  color: #374151;
}

.actions-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 1rem;
}

.action-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
  padding: 1.5rem;
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s;
}

.action-card:hover {
  background: #f3f4f6;
  border-color: #d1d5db;
  transform: translateY(-2px);
}

.action-card i {
  font-size: 1.5rem;
  color: #3b82f6;
}

.action-card span {
  font-size: 0.875rem;
  font-weight: 500;
  color: #374151;
}

.config-note {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  padding: 1rem;
  background: #eff6ff;
  border-radius: 8px;
  margin-bottom: 1rem;
}

.config-note i {
  color: #3b82f6;
  margin-top: 0.125rem;
}

.config-note p {
  margin: 0;
  font-size: 0.875rem;
  color: #1e40af;
  line-height: 1.5;
}

.config-note code {
  background: #dbeafe;
  padding: 0.125rem 0.375rem;
  border-radius: 4px;
  font-family: 'SF Mono', 'Fira Code', monospace;
  font-size: 0.8125rem;
}

.config-preview {
  background: #1f2937;
  color: #d1d5db;
  padding: 1.25rem;
  border-radius: 12px;
  font-family: 'SF Mono', 'Fira Code', monospace;
  font-size: 0.8125rem;
  line-height: 1.6;
  overflow-x: auto;
  margin: 0;
}

@media (max-width: 768px) {
  .setting-item {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.5rem;
  }

  .setting-value {
    text-align: left;
  }

  .origins-list {
    align-items: flex-start;
  }
}
</style>
