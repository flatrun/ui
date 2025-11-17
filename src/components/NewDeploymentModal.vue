<template>
  <Teleport to="body">
    <div v-if="visible" class="modal-overlay" @click.self="handleClose">
      <div class="modal-container">
        <div class="modal-header">
          <h3>
            <i class="pi pi-plus-circle"></i>
            Create New Deployment
          </h3>
          <button class="close-btn" @click="handleClose">
            <i class="pi pi-times"></i>
          </button>
        </div>

        <div class="modal-body">
          <div class="two-column-layout">
            <div class="left-column">
              <div class="templates-section">
                <div class="section-header">
                  <i class="pi pi-bolt"></i>
                  <h4>Quick Apps</h4>
                  <span v-if="quickApps.length > 0" class="template-count">{{ quickApps.length }}</span>
                </div>

                <div v-if="loadingQuickApps" class="loading-state">
                  <i class="pi pi-spin pi-spinner"></i>
                  <span>Loading quick apps...</span>
                </div>

                <div v-else-if="quickApps.length > 0" class="templates-list">
                  <button
                    v-for="app in quickApps"
                    :key="app.id"
                    class="template-card"
                    :class="{ selected: selectedQuickApp === app.id }"
                    @click="selectQuickApp(app)"
                  >
                    <div class="template-icon" :class="app.category">
                      <i :class="app.icon || 'pi pi-box'"></i>
                    </div>
                    <div class="template-info">
                      <span class="template-name">{{ app.name }}</span>
                      <span class="template-desc">{{ app.description }}</span>
                    </div>
                  </button>
                </div>

                <div v-else class="empty-state">
                  <i class="pi pi-inbox"></i>
                  <span>No quick apps found</span>
                  <p class="empty-hint">Add apps to .flatrun/templates/</p>
                </div>
              </div>

              <div class="quick-templates">
                <span class="label">Basic Starters:</span>
                <div class="quick-btns">
                  <button class="quick-btn" @click="useBasicTemplate('nginx')">Nginx</button>
                  <button class="quick-btn" @click="useBasicTemplate('node')">Node.js</button>
                  <button class="quick-btn" @click="useBasicTemplate('postgres')">PostgreSQL</button>
                </div>
              </div>
            </div>

            <div class="right-column">
              <div class="form-section">
                <div class="form-group">
                  <label for="name">Deployment Name</label>
                  <input
                    id="name"
                    v-model="form.name"
                    type="text"
                    placeholder="my-app"
                    :class="{ error: errors.name }"
                  />
                  <span v-if="errors.name" class="error-text">{{ errors.name }}</span>
                  <span class="hint">Lowercase letters, numbers, and hyphens only</span>
                </div>

                <div class="form-group">
                  <label for="compose">Docker Compose Configuration</label>
                  <textarea
                    id="compose"
                    v-model="form.composeContent"
                    placeholder="Paste your docker-compose.yml content here..."
                    :class="{ error: errors.composeContent }"
                    rows="12"
                  ></textarea>
                  <span v-if="errors.composeContent" class="error-text">{{ errors.composeContent }}</span>
                </div>
              </div>

              <div class="advanced-section">
                <button class="advanced-toggle" @click="showAdvanced = !showAdvanced">
                  <i :class="showAdvanced ? 'pi pi-chevron-down' : 'pi pi-chevron-right'"></i>
                  Advanced Options
                </button>

                <div v-if="showAdvanced" class="advanced-options">
                  <div class="form-group">
                    <label>Environment Variables</label>
                    <div class="env-vars">
                      <div v-for="(env, index) in form.envVars" :key="index" class="env-row">
                        <input
                          v-model="env.key"
                          placeholder="KEY"
                          class="env-key"
                        />
                        <input
                          v-model="env.value"
                          placeholder="value"
                          class="env-value"
                        />
                        <button class="remove-btn" @click="removeEnvVar(index)">
                          <i class="pi pi-times"></i>
                        </button>
                      </div>
                      <button class="add-btn" @click="addEnvVar">
                        <i class="pi pi-plus"></i>
                        Add Variable
                      </button>
                    </div>
                  </div>

                  <div class="form-group">
                    <label>Port Mappings</label>
                    <div class="port-mappings">
                      <div v-for="(port, index) in form.ports" :key="index" class="port-row">
                        <input
                          v-model="port.host"
                          placeholder="Host"
                          type="number"
                          class="port-host"
                        />
                        <span class="port-separator">:</span>
                        <input
                          v-model="port.container"
                          placeholder="Container"
                          type="number"
                          class="port-container"
                        />
                        <button class="remove-btn" @click="removePort(index)">
                          <i class="pi pi-times"></i>
                        </button>
                      </div>
                      <button class="add-btn" @click="addPort">
                        <i class="pi pi-plus"></i>
                        Add Port
                      </button>
                    </div>
                  </div>

                  <div class="form-group">
                    <label>Volume Mounts</label>
                    <div class="volume-mounts">
                      <div v-for="(volume, index) in form.volumes" :key="index" class="volume-row">
                        <input
                          v-model="volume.host"
                          placeholder="Host path"
                          class="volume-host"
                        />
                        <span class="volume-separator">:</span>
                        <input
                          v-model="volume.container"
                          placeholder="Container path"
                          class="volume-container"
                        />
                        <button class="remove-btn" @click="removeVolume(index)">
                          <i class="pi pi-times"></i>
                        </button>
                      </div>
                      <button class="add-btn" @click="addVolume">
                        <i class="pi pi-plus"></i>
                        Add Volume
                      </button>
                    </div>
                  </div>

                  <div class="form-group">
                    <label class="checkbox-label">
                      <input type="checkbox" v-model="form.autoStart" />
                      <span>Start deployment after creation</span>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="modal-footer">
          <button class="btn btn-secondary" @click="handleClose">Cancel</button>
          <button class="btn btn-primary" @click="handleCreate" :disabled="creating">
            <i v-if="creating" class="pi pi-spin pi-spinner"></i>
            {{ creating ? 'Creating...' : 'Create Deployment' }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, reactive, watch } from 'vue'
import { deploymentsApi, templatesApi } from '@/services/api'
import { useNotificationsStore } from '@/stores/notifications'

interface QuickApp {
  id: string
  name: string
  description: string
  icon: string
  category: string
  content: string
}

const props = defineProps<{
  visible: boolean
}>()

const emit = defineEmits(['close', 'created'])

const notifications = useNotificationsStore()
const creating = ref(false)
const loadingQuickApps = ref(false)
const selectedQuickApp = ref('')
const showAdvanced = ref(false)
const quickApps = ref<QuickApp[]>([])

const form = reactive({
  name: '',
  composeContent: '',
  envVars: [] as { key: string; value: string }[],
  ports: [] as { host: string; container: string }[],
  volumes: [] as { host: string; container: string }[],
  autoStart: false
})

const errors = reactive({
  name: '',
  composeContent: ''
})

const loadQuickApps = async () => {
  loadingQuickApps.value = true
  try {
    const response = await templatesApi.list()
    quickApps.value = response.data.templates || []
  } catch {
    quickApps.value = []
  } finally {
    loadingQuickApps.value = false
  }
}

const selectQuickApp = (app: QuickApp) => {
  selectedQuickApp.value = app.id
  form.composeContent = app.content.replace(/\$\{NAME\}/g, form.name || 'my-app')
  if (!form.name) {
    form.name = app.id
  }
}

const basicTemplates: Record<string, string> = {
  nginx: `services:
  web:
    image: nginx:alpine
    container_name: \${NAME}
    ports:
      - "8080:80"
    volumes:
      - ./html:/usr/share/nginx/html:ro
    networks:
      - web
    restart: unless-stopped

networks:
  web:
    external: true
`,
  node: `services:
  app:
    image: node:20-alpine
    container_name: \${NAME}
    working_dir: /app
    volumes:
      - ./src:/app
    command: npm start
    ports:
      - "3000:3000"
    networks:
      - web
    restart: unless-stopped

networks:
  web:
    external: true
`,
  postgres: `services:
  db:
    image: postgres:16-alpine
    container_name: \${NAME}
    environment:
      POSTGRES_DB: mydb
      POSTGRES_USER: user
      POSTGRES_PASSWORD: changeme
    volumes:
      - ./data:/var/lib/postgresql/data
    networks:
      - database
    restart: unless-stopped

networks:
  database:
    external: true
`
}

const useBasicTemplate = (name: string) => {
  const template = basicTemplates[name]
  if (template) {
    selectedQuickApp.value = ''
    form.composeContent = template.replace(/\$\{NAME\}/g, form.name || 'my-app')
  }
}

const addEnvVar = () => {
  form.envVars.push({ key: '', value: '' })
}

const removeEnvVar = (index: number) => {
  form.envVars.splice(index, 1)
}

const addPort = () => {
  form.ports.push({ host: '', container: '' })
}

const removePort = (index: number) => {
  form.ports.splice(index, 1)
}

const addVolume = () => {
  form.volumes.push({ host: '', container: '' })
}

const removeVolume = (index: number) => {
  form.volumes.splice(index, 1)
}

watch(() => props.visible, (val) => {
  if (val) {
    form.name = ''
    form.composeContent = ''
    form.envVars = []
    form.ports = []
    form.volumes = []
    form.autoStart = false
    errors.name = ''
    errors.composeContent = ''
    selectedQuickApp.value = ''
    showAdvanced.value = false
    loadQuickApps()
  }
})

const validate = () => {
  errors.name = ''
  errors.composeContent = ''
  let valid = true

  if (!form.name.trim()) {
    errors.name = 'Name is required'
    valid = false
  } else if (!/^[a-z0-9-]+$/.test(form.name)) {
    errors.name = 'Only lowercase letters, numbers, and hyphens allowed'
    valid = false
  }

  if (!form.composeContent.trim()) {
    errors.composeContent = 'Compose configuration is required'
    valid = false
  }

  return valid
}

const handleCreate = async () => {
  if (!validate()) return

  creating.value = true

  try {
    await deploymentsApi.create({
      name: form.name,
      compose_content: form.composeContent,
      env_vars: form.envVars.filter(e => e.key),
      ports: form.ports.filter(p => p.host && p.container),
      volumes: form.volumes.filter(v => v.host && v.container),
      auto_start: form.autoStart
    })
    emit('created')
  } catch (e: any) {
    const msg = e.response?.data?.error || e.message
    notifications.error('Failed to create deployment', msg)
  } finally {
    creating.value = false
  }
}

const handleClose = () => {
  if (!creating.value) {
    emit('close')
  }
}
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: var(--space-8);
}

.modal-container {
  background: white;
  border-radius: var(--radius-lg);
  width: 100%;
  max-width: 1000px;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  box-shadow: var(--shadow-xl);
}

.modal-header {
  padding: var(--space-5) var(--space-6);
  border-bottom: 1px solid var(--color-gray-200);
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-radius: var(--radius-lg) var(--radius-lg) 0 0;
}

.modal-header h3 {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  font-size: var(--text-xl);
  font-weight: var(--font-semibold);
  color: var(--color-gray-900);
}

.modal-header h3 i {
  color: var(--color-primary-500);
}

.close-btn {
  background: none;
  border: none;
  color: var(--color-gray-400);
  cursor: pointer;
  padding: var(--space-2);
  border-radius: var(--radius-md);
  transition: all var(--transition-base);
}

.close-btn:hover {
  background: var(--color-gray-100);
  color: var(--color-gray-500);
}

.modal-body {
  padding: var(--space-6);
  flex: 1;
  overflow-y: auto;
}

.two-column-layout {
  display: grid;
  grid-template-columns: 280px 1fr;
  gap: var(--space-6);
  min-height: 400px;
}

.left-column {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.templates-section {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: var(--color-gray-50);
  border-radius: var(--radius-lg);
  padding: var(--space-4);
}

.section-header {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  margin-bottom: var(--space-3);
}

.section-header i {
  color: var(--color-warning-500);
  font-size: var(--text-lg);
}

.section-header h4 {
  font-size: var(--text-md);
  font-weight: var(--font-semibold);
  color: var(--color-gray-900);
  margin: 0;
}

.template-count {
  margin-left: auto;
  font-size: var(--text-xs);
  color: var(--color-gray-500);
  background: var(--color-gray-200);
  padding: 2px var(--space-2);
  border-radius: var(--radius-full);
}

.loading-state,
.empty-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  color: var(--color-gray-400);
  font-size: var(--text-base);
}

.empty-state i {
  font-size: 2rem;
}

.empty-hint {
  font-size: var(--text-xs);
  color: var(--color-gray-400);
  margin: 0;
}

.templates-list {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.template-card {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-3);
  background: white;
  border: 2px solid var(--color-gray-200);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all var(--transition-base);
  text-align: left;
}

.template-card:hover {
  border-color: var(--color-primary-300);
}

.template-card.selected {
  border-color: var(--color-primary-500);
  background: var(--color-primary-50);
}

.template-icon {
  width: 36px;
  height: 36px;
  border-radius: var(--radius-md);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: var(--text-md);
  flex-shrink: 0;
  background: var(--color-gray-100);
  color: var(--color-gray-600);
}

.template-icon.cms {
  background: var(--color-info-50);
  color: var(--color-primary-600);
}

.template-icon.framework {
  background: var(--color-success-50);
  color: var(--color-success-600);
}

.template-icon.database {
  background: var(--color-warning-50);
  color: var(--color-warning-600);
}

.template-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.template-name {
  font-weight: var(--font-semibold);
  font-size: var(--text-base);
  color: var(--color-gray-900);
}

.template-desc {
  font-size: var(--text-xs);
  color: var(--color-gray-500);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.quick-templates {
  padding: var(--space-3);
  background: var(--color-gray-50);
  border-radius: var(--radius-md);
}

.quick-templates .label {
  display: block;
  font-size: var(--text-xs);
  color: var(--color-gray-500);
  margin-bottom: var(--space-2);
}

.quick-btns {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
}

.quick-btn {
  padding: 0.375rem var(--space-3);
  background: white;
  border: 1px solid var(--color-gray-200);
  border-radius: var(--radius-md);
  font-size: var(--text-xs);
  color: var(--color-gray-600);
  cursor: pointer;
  transition: all var(--transition-base);
}

.quick-btn:hover {
  background: var(--color-gray-100);
  border-color: var(--color-gray-300);
}

.right-column {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.form-section {
  flex: 1;
}

.form-group {
  margin-bottom: var(--space-4);
}

.form-group label {
  display: block;
  font-size: var(--text-base);
  font-weight: var(--font-semibold);
  color: var(--color-gray-700);
  margin-bottom: var(--space-2);
}

.form-group input[type="text"],
.form-group input[type="number"],
.form-group textarea {
  width: 100%;
  padding: var(--space-3);
  border: 1px solid var(--color-gray-300);
  border-radius: var(--radius-md);
  font-size: var(--text-md);
  transition: all var(--transition-base);
  font-family: inherit;
}

.form-group textarea {
  font-family: var(--font-mono);
  font-size: var(--text-base);
  line-height: 1.5;
  resize: vertical;
}

.form-group input:focus,
.form-group textarea:focus {
  outline: none;
  border-color: var(--color-primary-500);
  box-shadow: 0 0 0 var(--ring-width) var(--ring-color);
}

.form-group input.error,
.form-group textarea.error {
  border-color: var(--color-danger-500);
}

.error-text {
  display: block;
  font-size: var(--text-xs);
  color: var(--color-danger-500);
  margin-top: 0.375rem;
}

.hint {
  display: block;
  font-size: var(--text-xs);
  color: var(--color-gray-500);
  margin-top: 0.375rem;
}

.advanced-section {
  border-top: 1px solid var(--color-gray-200);
  padding-top: var(--space-4);
}

.advanced-toggle {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  background: none;
  border: none;
  color: var(--color-gray-600);
  font-size: var(--text-base);
  font-weight: var(--font-medium);
  cursor: pointer;
  padding: var(--space-2) 0;
}

.advanced-toggle:hover {
  color: var(--color-gray-900);
}

.advanced-toggle i {
  font-size: var(--text-xs);
}

.advanced-options {
  margin-top: var(--space-4);
}

.env-vars,
.port-mappings,
.volume-mounts {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.env-row,
.port-row,
.volume-row {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.env-key {
  flex: 1;
}

.env-value {
  flex: 2;
}

.port-host,
.port-container {
  flex: 1;
}

.port-separator,
.volume-separator {
  color: var(--color-gray-400);
  font-weight: var(--font-semibold);
}

.volume-host,
.volume-container {
  flex: 1;
}

.remove-btn {
  background: none;
  border: none;
  color: var(--color-gray-400);
  cursor: pointer;
  padding: var(--space-2);
  border-radius: var(--radius-md);
  transition: all var(--transition-base);
}

.remove-btn:hover {
  color: var(--color-danger-500);
  background: var(--color-danger-50);
}

.add-btn {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-3);
  background: var(--color-gray-100);
  border: 1px dashed var(--color-gray-300);
  border-radius: var(--radius-md);
  font-size: var(--text-xs);
  color: var(--color-gray-600);
  cursor: pointer;
  transition: all var(--transition-base);
  margin-top: var(--space-1);
}

.add-btn:hover {
  background: var(--color-gray-200);
  border-color: var(--color-gray-400);
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  font-weight: var(--font-normal) !important;
  cursor: pointer;
}

.checkbox-label input[type="checkbox"] {
  width: auto;
}

.modal-footer {
  padding: var(--space-4) var(--space-6);
  border-top: 1px solid var(--color-gray-200);
  display: flex;
  justify-content: flex-end;
  gap: var(--space-3);
  border-radius: 0 0 var(--radius-lg) var(--radius-lg);
}

.btn {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  padding: 0.625rem var(--space-5);
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

.btn-primary:hover:not(:disabled) {
  background: var(--color-primary-600);
}

.btn-primary:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.btn-secondary {
  background: var(--color-gray-100);
  color: var(--color-gray-700);
  border: 1px solid var(--color-gray-300);
}

.btn-secondary:hover {
  background: var(--color-gray-200);
}
</style>
