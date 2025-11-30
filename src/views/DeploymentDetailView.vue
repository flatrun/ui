<template>
  <div class="deployment-detail">
    <div class="detail-header">
      <div class="header-left">
        <router-link to="/deployments" class="back-link">
          <i class="pi pi-arrow-left" />
          Back to Deployments
        </router-link>
        <div class="deployment-title">
          <h1>{{ deployment?.name || $route.params.name }}</h1>
          <span class="status-badge" :class="deployment?.status">
            {{ deployment?.status || "loading" }}
          </span>
        </div>
      </div>
      <div class="header-actions">
        <button class="btn btn-success" :disabled="loading" @click="handleOperation('start')">
          <i class="pi pi-play" /> Start
        </button>
        <button class="btn btn-warning" :disabled="loading" @click="handleOperation('stop')">
          <i class="pi pi-stop" /> Stop
        </button>
        <button class="btn btn-info" :disabled="loading" @click="handleOperation('restart')">
          <i class="pi pi-refresh" /> Restart
        </button>
        <button class="btn btn-danger" :disabled="loading" @click="confirmDelete">
          <i class="pi pi-trash" /> Delete
        </button>
      </div>
    </div>

    <div v-if="loading && !deployment" class="loading-state">
      <i class="pi pi-spin pi-spinner" />
      <span>Loading deployment details...</span>
    </div>

    <div v-else-if="error" class="error-state">
      <i class="pi pi-exclamation-triangle" />
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
          <i :class="tab.icon" />
          {{ tab.label }}
        </button>
      </div>

      <div class="tab-content">
        <div v-if="activeTab === 'overview'" class="overview-tab">
          <div class="info-cards">
            <div class="info-card">
              <div class="card-header">
                <i class="pi pi-info-circle" />
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
                    <span class="status-indicator" :class="deployment.status" />
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
                <i class="pi pi-globe" />
                <h3>Domain & SSL</h3>
                <button
                  class="btn btn-sm btn-icon"
                  title="Edit Domain Settings"
                  @click="openDomainSettings"
                >
                  <i class="pi pi-pencil" />
                </button>
              </div>
              <div class="card-body">
                <template v-if="proxyStatus && proxyStatus.exposed">
                  <div class="info-row">
                    <span class="label">Domain</span>
                    <span class="value domain-link">
                      <a
                        :href="
                          (proxyStatus.ssl_enabled ? 'https://' : 'http://') + proxyStatus.domain
                        "
                        target="_blank"
                      >
                        {{ proxyStatus.domain }}
                        <i class="pi pi-external-link" />
                      </a>
                    </span>
                  </div>
                  <div class="info-row">
                    <span class="label">Virtual Host</span>
                    <span class="value">
                      <span
                        class="status-badge"
                        :class="proxyStatus.virtual_host_exists ? 'running' : 'stopped'"
                      >
                        {{ proxyStatus.virtual_host_exists ? "Configured" : "Not Configured" }}
                      </span>
                    </span>
                  </div>
                  <div class="info-row">
                    <span class="label">SSL</span>
                    <span class="value">
                      <span
                        class="status-badge"
                        :class="proxyStatus.ssl_enabled ? 'running' : 'stopped'"
                      >
                        {{ proxyStatus.ssl_enabled ? "Enabled" : "Disabled" }}
                      </span>
                    </span>
                  </div>
                  <template v-if="proxyStatus.ssl_enabled && proxyStatus.certificate">
                    <div class="info-row">
                      <span class="label">Certificate</span>
                      <span class="value">
                        <span class="status-badge" :class="proxyStatus.certificate.status">
                          {{ proxyStatus.certificate.status }}
                        </span>
                      </span>
                    </div>
                    <div class="info-row">
                      <span class="label">Expires</span>
                      <span
                        class="value"
                        :class="{ 'text-warning': proxyStatus.certificate.days_left <= 30 }"
                      >
                        {{ proxyStatus.certificate.days_left }} days ({{
                          formatDateTime(proxyStatus.certificate.not_after)
                        }})
                      </span>
                    </div>
                  </template>
                  <div class="proxy-actions">
                    <button
                      v-if="!proxyStatus.virtual_host_exists"
                      class="btn btn-sm btn-primary"
                      :disabled="settingUpProxy"
                      @click="handleSetupProxy"
                    >
                      <i :class="settingUpProxy ? 'pi pi-spin pi-spinner' : 'pi pi-cog'" />
                      Setup Proxy
                    </button>
                    <button
                      v-if="proxyStatus.ssl_enabled && !proxyStatus.certificate_exists"
                      class="btn btn-sm btn-success"
                      :disabled="requestingCert"
                      @click="handleRequestCertificate"
                    >
                      <i :class="requestingCert ? 'pi pi-spin pi-spinner' : 'pi pi-shield'" />
                      Request SSL
                    </button>
                  </div>
                </template>
                <template v-else>
                  <div class="empty-proxy">
                    <i class="pi pi-globe" />
                    <p>No domain configured</p>
                    <span class="hint">Configure domain exposure in deployment settings</span>
                  </div>
                </template>
              </div>
            </div>

            <div class="info-card">
              <div class="card-header">
                <i class="pi pi-box" />
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
                      <span class="service-status" :class="service.status">{{
                        service.status
                      }}</span>
                    </div>
                    <div class="service-details">
                      <span class="detail-item">
                        <i class="pi pi-image" />
                        {{ service.image }}
                      </span>
                      <span v-if="service.ports?.length" class="detail-item">
                        <i class="pi pi-sitemap" />
                        {{ service.ports.join(", ") }}
                      </span>
                    </div>
                    <div class="service-actions">
                      <button class="action-btn" title="Terminal" @click="openTerminal(service)">
                        <i class="pi pi-desktop" />
                      </button>
                      <button class="action-btn" title="Logs" @click="viewServiceLogs(service)">
                        <i class="pi pi-file-edit" />
                      </button>
                      <button class="action-btn" title="Restart" @click="restartService(service)">
                        <i class="pi pi-refresh" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div class="info-card wide">
            <div class="card-header">
              <i class="pi pi-chart-line" />
              <h3>Resource Usage</h3>
            </div>
            <div class="card-body">
              <div class="resource-grid">
                <div class="resource-item">
                  <div class="resource-label">CPU Usage</div>
                  <div class="resource-bar-wrapper">
                    <div class="resource-bar">
                      <div
                        class="resource-fill"
                        :style="{ width: resourceUsage.cpu + '%' }"
                        :class="getUsageClass(resourceUsage.cpu)"
                      />
                    </div>
                    <span class="resource-value">{{ resourceUsage.cpu }}%</span>
                  </div>
                </div>
                <div class="resource-item">
                  <div class="resource-label">Memory Usage</div>
                  <div class="resource-bar-wrapper">
                    <div class="resource-bar">
                      <div
                        class="resource-fill"
                        :style="{ width: resourceUsage.memory + '%' }"
                        :class="getUsageClass(resourceUsage.memory)"
                      />
                    </div>
                    <span class="resource-value">{{ resourceUsage.memory }}%</span>
                  </div>
                </div>
                <div class="resource-item">
                  <div class="resource-label">Disk I/O</div>
                  <div class="resource-bar-wrapper">
                    <div class="resource-bar">
                      <div
                        class="resource-fill"
                        :style="{ width: resourceUsage.disk + '%' }"
                        :class="getUsageClass(resourceUsage.disk)"
                      />
                    </div>
                    <span class="resource-value">{{ resourceUsage.disk }}%</span>
                  </div>
                </div>
                <div class="resource-item">
                  <div class="resource-label">Network I/O</div>
                  <div class="resource-bar-wrapper">
                    <div class="resource-bar">
                      <div
                        class="resource-fill"
                        :style="{ width: resourceUsage.network + '%' }"
                        :class="getUsageClass(resourceUsage.network)"
                      />
                    </div>
                    <span class="resource-value">{{ resourceUsage.network }}%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div v-if="activeTab === 'files'" class="files-tab">
          <FileBrowser :deployment-name="route.params.name as string" />
        </div>

        <div v-if="activeTab === 'logs'" class="logs-tab">
          <LogViewer
            :logs="logs"
            :loading="logsLoading"
            :file-name="`${deployment?.name || 'deployment'}-logs.txt`"
            empty-message="No logs available"
            @refresh="fetchLogs"
          >
            <template #filters>
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
            </template>
          </LogViewer>
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
                <i class="pi pi-refresh" /> Reconnect
              </button>
            </div>
          </div>
          <div class="terminal-container">
            <div class="terminal-placeholder">
              <i class="pi pi-desktop" />
              <h3>Terminal Access</h3>
              <p>
                Connect to container shell for
                {{ terminalService || "selected service" }}
              </p>
              <button class="btn btn-primary" :disabled="!terminalService" @click="connectTerminal">
                <i class="pi pi-sign-in" /> Connect to Shell
              </button>
            </div>
          </div>
        </div>

        <div v-if="activeTab === 'environment'" class="env-tab">
          <div class="env-header">
            <h3>Environment Variables</h3>
            <button class="btn btn-sm btn-primary" @click="showAddEnvModal = true">
              <i class="pi pi-plus" /> Add Variable
            </button>
          </div>
          <div class="env-list">
            <div v-if="envVars.length === 0" class="empty-env">
              <i class="pi pi-list" />
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
                    <i :class="env.hidden ? 'pi pi-eye' : 'pi pi-eye-slash'" />
                  </button>
                </span>
                <span class="env-actions">
                  <button class="action-btn" @click="editEnvVar(env)">
                    <i class="pi pi-pencil" />
                  </button>
                  <button class="action-btn delete" @click="confirmDeleteEnv(env.key)">
                    <i class="pi pi-trash" />
                  </button>
                </span>
              </div>
            </div>
          </div>
        </div>

        <div v-if="activeTab === 'config'" class="config-tab">
          <div class="config-sub-tabs">
            <button
              class="config-sub-tab"
              :class="{ active: activeConfigTab === 'compose' }"
              @click="activeConfigTab = 'compose'"
            >
              <i class="pi pi-file" />
              docker-compose.yml
            </button>
            <button
              class="config-sub-tab"
              :class="{ active: activeConfigTab === 'service' }"
              @click="activeConfigTab = 'service'"
            >
              <i class="pi pi-cog" />
              service.yml
            </button>
          </div>

          <div v-if="activeConfigTab === 'compose'" class="config-section">
            <div class="config-header">
              <h3>Docker Compose Configuration</h3>
              <div class="config-actions">
                <button class="btn btn-sm btn-secondary" @click="copyConfig">
                  <i class="pi pi-copy" /> Copy
                </button>
                <button
                  v-if="!isEditingConfig"
                  class="btn btn-sm btn-primary"
                  @click="isEditingConfig = true"
                >
                  <i class="pi pi-pencil" /> Edit
                </button>
                <template v-else>
                  <button class="btn btn-sm btn-secondary" @click="cancelConfigEdit">Cancel</button>
                  <button class="btn btn-sm btn-success" @click="saveConfig">
                    <i class="pi pi-check" /> Save
                  </button>
                </template>
              </div>
            </div>
            <div class="config-editor">
              <Codemirror
                v-model="composeConfig"
                :extensions="configExtensions"
                :disabled="!isEditingConfig"
                :style="{ height: '500px' }"
              />
            </div>
          </div>

          <div v-if="activeConfigTab === 'service'" class="config-section">
            <div class="config-header">
              <h3>Service Configuration</h3>
              <div class="config-actions">
                <button class="btn btn-sm btn-secondary" @click="copyServiceConfig">
                  <i class="pi pi-copy" /> Copy
                </button>
                <button
                  v-if="!isEditingServiceConfig"
                  class="btn btn-sm btn-primary"
                  @click="isEditingServiceConfig = true"
                >
                  <i class="pi pi-pencil" /> Edit
                </button>
                <template v-else>
                  <button class="btn btn-sm btn-secondary" @click="cancelServiceConfigEdit">
                    Cancel
                  </button>
                  <button class="btn btn-sm btn-success" @click="saveServiceConfig">
                    <i class="pi pi-check" /> Save
                  </button>
                </template>
              </div>
            </div>
            <div class="config-editor">
              <Codemirror
                v-model="serviceConfig"
                :extensions="configExtensions"
                :disabled="!isEditingServiceConfig"
                :style="{ height: '500px' }"
              />
            </div>
          </div>
        </div>
      </div>
    </template>

    <Teleport to="body">
      <div
        v-if="showOperationModal"
        class="modal-overlay"
        @click.self="!operationRunning && (showOperationModal = false)"
      >
        <div class="operation-modal modal-container">
          <div class="modal-header" :class="{ success: operationSuccess, error: operationError }">
            <h3>
              <i
                :class="
                  operationRunning
                    ? 'pi pi-spin pi-spinner'
                    : operationSuccess
                      ? 'pi pi-check-circle'
                      : operationError
                        ? 'pi pi-times-circle'
                        : 'pi pi-cog'
                "
              />
              {{ operationTitle }}
            </h3>
            <span v-if="operationSuccess" class="status-text success">Completed</span>
            <span v-else-if="operationError" class="status-text error">Failed</span>
            <span v-else-if="operationRunning" class="status-text running">Running...</span>
          </div>
          <div class="modal-body">
            <div v-if="operationError && !operationOutput" class="error-message">
              {{ operationError }}
            </div>
            <div class="operation-logs">
              <LogViewer
                :logs="operationOutput"
                :loading="operationRunning"
                :file-name="`${deployment?.name || 'operation'}-output.txt`"
                empty-message="Waiting for output..."
              />
            </div>
          </div>
          <div class="modal-footer">
            <button
              class="btn btn-secondary"
              :disabled="operationRunning"
              @click="showOperationModal = false"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <ConfirmModal
      :visible="showDeleteDeploymentModal"
      title="Delete Deployment"
      :message="`Are you sure you want to delete '${deployment?.name}'? This will remove all containers, volumes, and configuration.`"
      warning="This action cannot be undone."
      variant="danger"
      confirm-text="Delete"
      :loading="deletingDeployment"
      @confirm="deleteDeployment"
      @cancel="showDeleteDeploymentModal = false"
    />

    <ConfirmModal
      :visible="showDeleteEnvModal"
      title="Delete Environment Variable"
      :message="`Are you sure you want to delete '${envKeyToDelete}'?`"
      variant="warning"
      confirm-text="Delete"
      @confirm="deleteEnvVar"
      @cancel="showDeleteEnvModal = false"
    />

    <Teleport to="body">
      <div
        v-if="showDomainSettingsModal"
        class="modal-overlay"
        @click.self="showDomainSettingsModal = false"
      >
        <div class="domain-settings-modal modal-container">
          <div class="modal-header">
            <h3>
              <i class="pi pi-globe" />
              Domain & SSL Settings
            </h3>
            <button class="close-btn" @click="showDomainSettingsModal = false">
              <i class="pi pi-times" />
            </button>
          </div>
          <div class="modal-body">
            <div class="form-group">
              <label class="checkbox-label">
                <input v-model="domainSettings.expose" type="checkbox" />
                <span>Expose to Internet</span>
              </label>
              <span class="hint">Enable reverse proxy for external access</span>
            </div>

            <template v-if="domainSettings.expose">
              <div class="form-group">
                <label>Domain</label>
                <input
                  v-model="domainSettings.domain"
                  type="text"
                  placeholder="app.example.com"
                  class="form-input"
                />
                <span class="hint">The domain name for your deployment</span>
              </div>

              <div class="form-group">
                <label>Container Port</label>
                <input
                  v-model.number="domainSettings.containerPort"
                  type="number"
                  placeholder="80"
                  class="form-input"
                />
                <span class="hint">The port your application listens on</span>
              </div>

              <div class="form-group">
                <label class="checkbox-label">
                  <input v-model="domainSettings.sslEnabled" type="checkbox" />
                  <span>Enable SSL</span>
                </label>
                <span class="hint">Secure your deployment with HTTPS</span>
              </div>

              <div v-if="domainSettings.sslEnabled" class="form-group">
                <label class="checkbox-label">
                  <input v-model="domainSettings.autoCert" type="checkbox" />
                  <span>Auto-generate Certificate</span>
                </label>
                <span class="hint">Automatically request Let's Encrypt certificate</span>
              </div>
            </template>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" @click="showDomainSettingsModal = false">
              Cancel
            </button>
            <button
              class="btn btn-primary"
              :disabled="savingDomainSettings"
              @click="saveDomainSettings"
            >
              <i v-if="savingDomainSettings" class="pi pi-spin pi-spinner" />
              {{ savingDomainSettings ? "Saving..." : "Save Settings" }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { Codemirror } from "vue-codemirror";
import { yaml } from "@codemirror/lang-yaml";
import { oneDark } from "@codemirror/theme-one-dark";
import { deploymentsApi, proxyApi, certificatesApi, filesApi } from "@/services/api";
import { useNotificationsStore } from "@/stores/notifications";
import type { ProxyStatus } from "@/types";
import FileBrowser from "@/components/FileBrowser.vue";
import LogViewer from "@/components/LogViewer.vue";
import ConfirmModal from "@/components/ConfirmModal.vue";

const route = useRoute();
const router = useRouter();
const notifications = useNotificationsStore();

const deployment = ref<any>(null);
const loading = ref(false);
const error = ref("");
const activeTab = ref("overview");
const proxyStatus = ref<ProxyStatus | null>(null);
const settingUpProxy = ref(false);
const requestingCert = ref(false);

const tabs = [
  { id: "overview", label: "Overview", icon: "pi pi-info-circle" },
  { id: "files", label: "Files", icon: "pi pi-folder" },
  { id: "logs", label: "Logs", icon: "pi pi-file-edit" },
  { id: "terminal", label: "Terminal", icon: "pi pi-desktop" },
  { id: "environment", label: "Environment", icon: "pi pi-list" },
  { id: "config", label: "Configuration", icon: "pi pi-cog" },
];

const services = ref<any[]>([]);
const resourceUsage = ref({
  cpu: 0,
  memory: 0,
  disk: 0,
  network: 0,
});

const logs = ref("");
const logsLoading = ref(false);
const logsService = ref("all");
const logsTail = ref(100);
const logsFollow = ref(false);

const terminalService = ref("");

const envVars = ref<Array<{ key: string; value: string; hidden: boolean }>>([]);
const showAddEnvModal = ref(false);

const composeConfig = ref("");
const isEditingConfig = ref(false);
const serviceConfig = ref("");
const isEditingServiceConfig = ref(false);
const configExtensions = [yaml(), oneDark];
const activeConfigTab = ref<"compose" | "service">("compose");

const showOperationModal = ref(false);
const operationTitle = ref("");
const operationRunning = ref(false);
const operationSuccess = ref(false);
const operationError = ref("");
const operationOutput = ref("");

const showDeleteDeploymentModal = ref(false);
const deletingDeployment = ref(false);
const showDeleteEnvModal = ref(false);
const envKeyToDelete = ref("");

const showDomainSettingsModal = ref(false);
const savingDomainSettings = ref(false);
const domainSettings = ref({
  expose: false,
  domain: "",
  containerPort: 80,
  sslEnabled: false,
  autoCert: false,
});

let refreshInterval: number | null = null;

const fetchDeployment = async () => {
  loading.value = true;
  error.value = "";
  try {
    const response = await deploymentsApi.get(route.params.name as string);
    const data = response.data as any;
    deployment.value = data.deployment || data;

    if (data.proxy_status) {
      proxyStatus.value = data.proxy_status;
    } else {
      try {
        const proxyResponse = await proxyApi.getStatus(route.params.name as string);
        proxyStatus.value = proxyResponse.data.status;
      } catch {
        proxyStatus.value = null;
      }
    }

    services.value = [
      {
        name: "web",
        image: "nginx:latest",
        status: "running",
        ports: ["80:80", "443:443"],
      },
      {
        name: "app",
        image: "node:18-alpine",
        status: "running",
        ports: ["3000:3000"],
      },
      {
        name: "db",
        image: "postgres:15",
        status: "running",
        ports: ["5432:5432"],
      },
    ];

    resourceUsage.value = {
      cpu: Math.floor(Math.random() * 60 + 10),
      memory: Math.floor(Math.random() * 70 + 20),
      disk: Math.floor(Math.random() * 40 + 5),
      network: Math.floor(Math.random() * 30 + 5),
    };

    envVars.value = [
      { key: "NODE_ENV", value: "production", hidden: false },
      {
        key: "DATABASE_URL",
        value: "postgres://user:pass@db:5432/app",
        hidden: true,
      },
      { key: "SECRET_KEY", value: "super-secret-key-12345", hidden: true },
      { key: "API_PORT", value: "3000", hidden: false },
    ];

    try {
      const composeResponse = await deploymentsApi.getComposeFile(route.params.name as string);
      composeConfig.value =
        composeResponse.data.content || composeResponse.data || "No compose file found";
    } catch (composeErr) {
      composeConfig.value = "Error loading compose file";
      console.error("Failed to load compose file:", composeErr);
    }

    try {
      const serviceResponse = await filesApi.getContent(
        route.params.name as string,
        "/service.yml",
      );
      serviceConfig.value = serviceResponse.data || "No service.yml found";
    } catch (serviceErr) {
      serviceConfig.value =
        "# Service configuration not found\n# This file will be created when you save";
      console.error("Failed to load service.yml:", serviceErr);
    }

    if (services.value.length > 0) {
      terminalService.value = services.value[0].name;
    }
  } catch (err: any) {
    error.value = err.message || "Failed to load deployment";
  } finally {
    loading.value = false;
  }
};

const handleSetupProxy = async () => {
  settingUpProxy.value = true;
  try {
    await proxyApi.setup(route.params.name as string);
    notifications.success("Proxy Setup", "Virtual host has been configured");
    await fetchDeployment();
  } catch (err: any) {
    const msg = err.response?.data?.error || err.message;
    notifications.error("Setup Failed", msg);
  } finally {
    settingUpProxy.value = false;
  }
};

const handleRequestCertificate = async () => {
  if (!proxyStatus.value?.domain) return;

  requestingCert.value = true;
  try {
    await certificatesApi.request(proxyStatus.value.domain);
    notifications.success(
      "Certificate Requested",
      `SSL certificate for ${proxyStatus.value.domain} has been requested`,
    );
    await fetchDeployment();
  } catch (err: any) {
    const msg = err.response?.data?.error || err.message;
    notifications.error("Request Failed", msg);
  } finally {
    requestingCert.value = false;
  }
};

const fetchLogs = async () => {
  logsLoading.value = true;
  try {
    const response = await deploymentsApi.logs(route.params.name as string);
    logs.value = response.data.logs || "";
  } catch (err) {
    console.error("Failed to fetch logs:", err);
  } finally {
    logsLoading.value = false;
  }
};

const handleOperation = async (operation: string) => {
  operationTitle.value = `${operation.charAt(0).toUpperCase() + operation.slice(1)} Deployment`;
  operationRunning.value = true;
  operationSuccess.value = false;
  operationError.value = "";
  operationOutput.value = "";
  showOperationModal.value = true;

  try {
    let response;
    if (operation === "start") {
      response = await deploymentsApi.start(route.params.name as string);
    } else if (operation === "stop") {
      response = await deploymentsApi.stop(route.params.name as string);
    } else if (operation === "restart") {
      response = await deploymentsApi.restart(route.params.name as string);
    }

    operationOutput.value = response?.data?.output || "Operation completed";
    operationSuccess.value = true;
    await fetchDeployment();
  } catch (err: any) {
    const errorOutput = err.response?.data?.output || err.response?.data?.error || err.message;
    operationOutput.value = errorOutput;
    operationError.value = "Operation failed";
  } finally {
    operationRunning.value = false;
  }
};

const confirmDelete = () => {
  showDeleteDeploymentModal.value = true;
};

const deleteDeployment = async () => {
  deletingDeployment.value = true;
  try {
    await deploymentsApi.delete(route.params.name as string);
    showDeleteDeploymentModal.value = false;
    notifications.success("Deleted", `Deployment "${deployment.value?.name}" has been deleted`);
    router.push("/deployments");
  } catch (err: any) {
    const msg = err.response?.data?.error || err.message;
    notifications.error("Delete Failed", msg);
  } finally {
    deletingDeployment.value = false;
  }
};

const openTerminal = (service: any) => {
  terminalService.value = service.name;
  activeTab.value = "terminal";
};

const viewServiceLogs = (service: any) => {
  logsService.value = service.name;
  activeTab.value = "logs";
  fetchLogs();
};

const restartService = async (service: any) => {
  console.log("Restarting service:", service.name);
};

const connectTerminal = () => {
  console.log("Connecting to terminal for:", terminalService.value);
};

const reconnectTerminal = () => {
  console.log("Reconnecting terminal");
};

const editEnvVar = (env: any) => {
  console.log("Edit env var:", env.key);
};

const confirmDeleteEnv = (key: string) => {
  envKeyToDelete.value = key;
  showDeleteEnvModal.value = true;
};

const deleteEnvVar = () => {
  envVars.value = envVars.value.filter((e) => e.key !== envKeyToDelete.value);
  showDeleteEnvModal.value = false;
  notifications.success("Deleted", `Environment variable "${envKeyToDelete.value}" removed`);
  envKeyToDelete.value = "";
};

const openDomainSettings = () => {
  const metadata = deployment.value?.metadata;
  if (metadata) {
    domainSettings.value = {
      expose: metadata.networking?.expose || false,
      domain: metadata.networking?.domain || "",
      containerPort: metadata.networking?.container_port || 80,
      sslEnabled: metadata.ssl?.enabled || false,
      autoCert: metadata.ssl?.auto_cert || false,
    };
  } else {
    domainSettings.value = {
      expose: proxyStatus.value?.exposed || false,
      domain: proxyStatus.value?.domain || "",
      containerPort: 80,
      sslEnabled: proxyStatus.value?.ssl_enabled || false,
      autoCert: false,
    };
  }
  showDomainSettingsModal.value = true;
};

const saveDomainSettings = async () => {
  savingDomainSettings.value = true;
  try {
    await deploymentsApi.updateMetadata(route.params.name as string, {
      name: deployment.value?.name || "",
      type: deployment.value?.metadata?.type || "custom",
      networking: {
        expose: domainSettings.value.expose,
        domain: domainSettings.value.domain,
        container_port: domainSettings.value.containerPort,
        protocol: "http",
        proxy_type: "http",
      },
      ssl: {
        enabled: domainSettings.value.sslEnabled,
        auto_cert: domainSettings.value.autoCert,
      },
      healthcheck: {
        path: "/",
        interval: "30s",
      },
    });
    showDomainSettingsModal.value = false;
    notifications.success("Saved", "Domain settings updated successfully");
    await fetchDeployment();
  } catch (err: any) {
    const msg = err.response?.data?.error || err.message;
    notifications.error("Save Failed", msg);
  } finally {
    savingDomainSettings.value = false;
  }
};

const copyConfig = () => {
  navigator.clipboard.writeText(composeConfig.value);
  notifications.success("Copied", "Configuration copied to clipboard");
};

const copyServiceConfig = () => {
  navigator.clipboard.writeText(serviceConfig.value);
  notifications.success("Copied", "Service configuration copied to clipboard");
};

let originalConfig = "";
let originalServiceConfig = "";

const cancelConfigEdit = () => {
  composeConfig.value = originalConfig;
  isEditingConfig.value = false;
};

const cancelServiceConfigEdit = () => {
  serviceConfig.value = originalServiceConfig;
  isEditingServiceConfig.value = false;
};

const saveConfig = async () => {
  try {
    await deploymentsApi.update(route.params.name as string, {
      compose_content: composeConfig.value,
    });
    originalConfig = composeConfig.value;
    isEditingConfig.value = false;
    notifications.success("Saved", "Configuration saved successfully");
  } catch (err: any) {
    const msg = err.response?.data?.error || err.message;
    notifications.error("Save Failed", msg);
  }
};

const saveServiceConfig = async () => {
  try {
    const blob = new Blob([serviceConfig.value], { type: "text/yaml" });
    const file = new File([blob], "service.yml", { type: "text/yaml" });
    await filesApi.upload(route.params.name as string, "/service.yml", file);
    originalServiceConfig = serviceConfig.value;
    isEditingServiceConfig.value = false;
    notifications.success("Saved", "Service configuration saved successfully");
    await fetchDeployment();
  } catch (err: any) {
    const msg = err.response?.data?.error || err.message;
    notifications.error("Save Failed", msg);
  }
};

watch(isEditingConfig, (editing) => {
  if (editing) {
    originalConfig = composeConfig.value;
  }
});

watch(isEditingServiceConfig, (editing) => {
  if (editing) {
    originalServiceConfig = serviceConfig.value;
  }
});

const formatDateTime = (date: string) => {
  return new Date(date).toLocaleString();
};

const getUsageClass = (percentage: number) => {
  if (percentage > 80) return "critical";
  if (percentage > 60) return "warning";
  return "normal";
};

watch(activeTab, (newTab) => {
  if (newTab === "logs" && !logs.value) {
    fetchLogs();
  }
});

onMounted(() => {
  fetchDeployment();
  refreshInterval = window.setInterval(() => {
    if (logsFollow.value && activeTab.value === "logs") {
      fetchLogs();
    }
  }, 3000);
});

onUnmounted(() => {
  if (refreshInterval) {
    clearInterval(refreshInterval);
  }
});
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

.status-badge.running {
  background: var(--color-success-50);
  color: var(--color-success-700);
}
.status-badge.stopped {
  background: var(--color-danger-50);
  color: var(--color-danger-700);
}
.status-badge.error {
  background: var(--color-danger-50);
  color: var(--color-danger-700);
}
.status-badge.starting {
  background: var(--color-warning-50);
  color: var(--color-warning-700);
}

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

.btn-primary {
  background: var(--color-primary-500);
  color: white;
}
.btn-primary:hover:not(:disabled) {
  background: var(--color-primary-600);
}

.btn-secondary {
  background: var(--color-gray-100);
  color: var(--color-gray-700);
}
.btn-secondary:hover:not(:disabled) {
  background: var(--color-gray-200);
}

.btn-success {
  background: var(--color-success-50);
  color: var(--color-success-700);
}
.btn-success:hover:not(:disabled) {
  background: var(--color-success-100);
}

.btn-warning {
  background: var(--color-warning-50);
  color: var(--color-warning-700);
}
.btn-warning:hover:not(:disabled) {
  background: var(--color-warning-100);
}

.btn-info {
  background: var(--color-info-50);
  color: var(--color-info-700);
}
.btn-info:hover:not(:disabled) {
  background: var(--color-info-100);
}

.btn-danger {
  background: var(--color-danger-50);
  color: var(--color-danger-700);
}
.btn-danger:hover:not(:disabled) {
  background: var(--color-danger-100);
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.loading-state,
.error-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: var(--space-12);
  background: white;
  border-radius: var(--radius-lg);
  text-align: center;
  gap: var(--space-4);
}

.loading-state i,
.error-state i {
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

.status-indicator.running {
  background: var(--color-success-500);
}
.status-indicator.stopped {
  background: var(--color-danger-500);
}

.status-badge.valid,
.status-badge.expiring {
  background: var(--color-success-50);
  color: var(--color-success-700);
}

.status-badge.expiring {
  background: var(--color-warning-50);
  color: var(--color-warning-700);
}

.status-badge.expired {
  background: var(--color-danger-50);
  color: var(--color-danger-700);
}

.domain-link a {
  display: flex;
  align-items: center;
  gap: var(--space-1);
  color: var(--color-primary-600);
  text-decoration: none;
}

.domain-link a:hover {
  text-decoration: underline;
}

.domain-link i {
  font-size: var(--text-xs);
}

.text-warning {
  color: var(--color-warning-600);
}

.proxy-actions {
  display: flex;
  gap: var(--space-2);
  margin-top: var(--space-3);
  padding-top: var(--space-3);
  border-top: 1px solid var(--color-gray-100);
}

.empty-proxy {
  text-align: center;
  padding: var(--space-4);
  color: var(--color-gray-400);
}

.empty-proxy i {
  font-size: 2rem;
  margin-bottom: var(--space-2);
}

.empty-proxy p {
  margin: 0 0 var(--space-1) 0;
  color: var(--color-gray-500);
}

.empty-proxy .hint {
  font-size: var(--text-xs);
  color: var(--color-gray-400);
}

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

.service-status.running {
  background: var(--color-success-50);
  color: var(--color-success-700);
}
.service-status.stopped {
  background: var(--color-danger-50);
  color: var(--color-danger-700);
}

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

.resource-fill.normal {
  background: var(--color-success-500);
}
.resource-fill.warning {
  background: var(--color-warning-500);
}
.resource-fill.critical {
  background: var(--color-danger-500);
}

.resource-value {
  font-size: var(--text-sm);
  font-weight: var(--font-semibold);
  color: var(--color-gray-700);
  min-width: 45px;
}

.logs-tab {
  height: 600px;
}

.logs-tab :deep(.form-select) {
  padding: var(--space-1) var(--space-2);
  border: 1px solid #2a2e3d;
  border-radius: var(--radius-sm);
  font-size: var(--text-sm);
  background: #1a1b26;
  color: #a9b1d6;
}

.form-select {
  padding: var(--space-2) var(--space-3);
  border: 1px solid var(--color-gray-200);
  border-radius: var(--radius-md);
  font-size: var(--text-md);
  background: white;
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

.env-key,
.env-value,
.env-actions {
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

.config-sub-tabs {
  display: flex;
  gap: var(--space-2);
  margin-bottom: var(--space-4);
  border-bottom: 1px solid var(--color-gray-200);
  padding-bottom: var(--space-2);
}

.config-sub-tab {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-4);
  border: none;
  background: transparent;
  border-radius: var(--radius-md);
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  color: var(--color-gray-500);
  cursor: pointer;
  transition: all var(--transition-base);
}

.config-sub-tab:hover {
  color: var(--color-gray-700);
  background: var(--color-gray-100);
}

.config-sub-tab.active {
  color: var(--color-primary-600);
  background: var(--color-primary-50);
}

.config-sub-tab i {
  font-size: var(--text-sm);
}

.config-section {
  display: flex;
  flex-direction: column;
}

.config-section .config-header {
  margin-bottom: var(--space-3);
}

.config-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
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

.config-editor {
  border-radius: var(--radius-md);
  overflow: hidden;
  border: 1px solid var(--color-gray-200);
}

.config-editor :deep(.cm-editor) {
  font-size: var(--text-sm);
}

.config-editor :deep(.cm-editor.cm-focused) {
  outline: none;
}

.operation-modal {
  width: 800px;
  max-width: 90vw;
}

.operation-modal .modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--space-4);
  border-bottom: 1px solid var(--color-gray-200);
}

.operation-modal .modal-header.success {
  background: var(--color-success-50);
  border-bottom-color: var(--color-success-200);
}

.operation-modal .modal-header.success h3 {
  color: var(--color-success-700);
}

.operation-modal .modal-header.error {
  background: var(--color-danger-50);
  border-bottom-color: var(--color-danger-200);
}

.operation-modal .modal-header.error h3 {
  color: var(--color-danger-700);
}

.operation-modal .modal-header h3 {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  margin: 0;
  font-size: var(--text-lg);
}

.status-text {
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  padding: var(--space-1) var(--space-3);
  border-radius: var(--radius-full);
}

.status-text.success {
  background: var(--color-success-100);
  color: var(--color-success-700);
}

.status-text.error {
  background: var(--color-danger-100);
  color: var(--color-danger-700);
}

.status-text.running {
  background: var(--color-primary-100);
  color: var(--color-primary-700);
}

.operation-modal .modal-body {
  padding: 0;
}

.error-message {
  padding: var(--space-3) var(--space-4);
  background: var(--color-danger-50);
  color: var(--color-danger-700);
  border-bottom: 1px solid var(--color-danger-100);
}

.operation-logs {
  height: 400px;
}

.operation-modal .modal-footer {
  padding: var(--space-3) var(--space-4);
  border-top: 1px solid var(--color-gray-200);
  display: flex;
  justify-content: flex-end;
}

.files-tab {
  height: 600px;
}

.domain-settings-modal {
  max-width: 500px;
}

.form-group {
  margin-bottom: var(--space-4);
}

.form-group:last-child {
  margin-bottom: 0;
}

.form-group label {
  display: block;
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  color: var(--color-gray-700);
  margin-bottom: var(--space-2);
}

.form-input {
  width: 100%;
  padding: var(--space-3);
  border: 1px solid var(--color-gray-200);
  border-radius: var(--radius-md);
  font-size: var(--text-sm);
  transition: all var(--transition-base);
}

.form-input:focus {
  outline: none;
  border-color: var(--color-primary-500);
  box-shadow: 0 0 0 3px var(--color-primary-100);
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  cursor: pointer;
  font-weight: var(--font-medium);
}

.checkbox-label input[type="checkbox"] {
  width: 18px;
  height: 18px;
  cursor: pointer;
}

.hint {
  display: block;
  font-size: var(--text-xs);
  color: var(--color-gray-500);
  margin-top: var(--space-1);
}

.btn-icon {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  background: var(--color-gray-100);
  border: none;
  border-radius: var(--radius-md);
  color: var(--color-gray-600);
  cursor: pointer;
  transition: all var(--transition-base);
}

.btn-icon:hover {
  background: var(--color-gray-200);
  color: var(--color-gray-900);
}

.card-header {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.card-header .btn-icon {
  margin-left: auto;
}
</style>
