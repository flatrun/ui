<template>
  <div class="settings-view">
    <div class="view-header">
      <div class="header-actions">
        <button class="btn btn-icon" :disabled="loading" @click="fetchSettings">
          <i class="pi pi-refresh" :class="{ 'pi-spin': loading }" />
        </button>
      </div>
    </div>

    <div v-if="loading" class="loading-state">
      <i class="pi pi-spin pi-spinner" />
      <span>Loading settings...</span>
    </div>

    <div v-else class="settings-content">
      <div class="settings-section">
        <div class="section-header">
          <i class="pi pi-globe" />
          <h3>Domain Configuration</h3>
        </div>
        <div class="section-body">
          <div class="setting-item editable">
            <div class="setting-info">
              <span class="setting-label">Default Domain</span>
              <span class="setting-description">Base domain for auto-generated subdomains (e.g., example.com)</span>
            </div>
            <div class="setting-input">
              <input
                v-model="domainSettings.default_domain"
                type="text"
                placeholder="example.com"
                class="form-input"
              />
            </div>
          </div>
          <div class="setting-item editable">
            <div class="setting-info">
              <span class="setting-label">Auto Subdomain</span>
              <span class="setting-description">Automatically generate random subdomains for new deployments</span>
            </div>
            <div class="setting-input">
              <label class="toggle-switch">
                <input v-model="domainSettings.auto_subdomain" type="checkbox" />
                <span class="toggle-slider" />
              </label>
            </div>
          </div>
          <div class="setting-item editable">
            <div class="setting-info">
              <span class="setting-label">Auto SSL</span>
              <span class="setting-description">Automatically request SSL certificates for new deployments</span>
            </div>
            <div class="setting-input">
              <label class="toggle-switch">
                <input v-model="domainSettings.auto_ssl" type="checkbox" />
                <span class="toggle-slider" />
              </label>
            </div>
          </div>
          <div class="setting-item editable">
            <div class="setting-info">
              <span class="setting-label">Subdomain Style</span>
              <span class="setting-description">Format for auto-generated subdomains</span>
            </div>
            <div class="setting-input">
              <select v-model="domainSettings.subdomain_style" class="form-select">
                <option value="words">Words (swift-river-123)</option>
                <option value="hex">Hex (a1b2c3d4)</option>
                <option value="short">Short (swi-riv)</option>
              </select>
            </div>
          </div>
          <div class="setting-actions">
            <button class="btn btn-primary" :disabled="savingDomain" @click="saveDomainSettings">
              <i v-if="savingDomain" class="pi pi-spin pi-spinner" />
              <i v-else class="pi pi-save" />
              <span>Save Domain Settings</span>
            </button>
          </div>
        </div>
      </div>

      <div class="settings-section">
        <div class="section-header">
          <i class="pi pi-server" />
          <h3>Infrastructure</h3>
        </div>
        <div class="section-body">
          <div class="setting-item editable">
            <div class="setting-info">
              <span class="setting-label">Network Name</span>
              <span class="setting-description">Docker network for app containers to communicate with nginx</span>
            </div>
            <div class="setting-input">
              <input
                v-model="infrastructureSettings.network_name"
                type="text"
                placeholder="web"
                class="form-input"
              />
            </div>
          </div>

          <div class="setting-group-header">
            <i class="pi pi-database" />
            <span>Shared Database</span>
            <label class="toggle-switch small">
              <input v-model="infrastructureSettings.database.enabled" type="checkbox" />
              <span class="toggle-slider" />
            </label>
          </div>

          <template v-if="infrastructureSettings.database.enabled">
            <div class="setting-item editable nested">
              <div class="setting-info">
                <span class="setting-label">Database Type</span>
              </div>
              <div class="setting-input">
                <select v-model="infrastructureSettings.database.type" class="form-select">
                  <option value="mysql">MySQL</option>
                  <option value="mariadb">MariaDB</option>
                  <option value="postgres">PostgreSQL</option>
                </select>
              </div>
            </div>
            <div class="setting-item editable nested">
              <div class="setting-info">
                <span class="setting-label">Container Name</span>
                <span class="setting-description">Docker container running the database</span>
              </div>
              <div class="setting-input">
                <input
                  v-model="infrastructureSettings.database.container"
                  type="text"
                  placeholder="mysql"
                  class="form-input"
                />
              </div>
            </div>
            <div class="setting-item editable nested">
              <div class="setting-info">
                <span class="setting-label">Host</span>
                <span class="setting-description">Usually same as container name</span>
              </div>
              <div class="setting-input">
                <input
                  v-model="infrastructureSettings.database.host"
                  type="text"
                  placeholder="mysql"
                  class="form-input"
                />
              </div>
            </div>
            <div class="setting-item editable nested">
              <div class="setting-info">
                <span class="setting-label">Port</span>
              </div>
              <div class="setting-input">
                <input
                  v-model.number="infrastructureSettings.database.port"
                  type="number"
                  placeholder="3306"
                  class="form-input narrow"
                />
              </div>
            </div>
            <div class="setting-item editable nested">
              <div class="setting-info">
                <span class="setting-label">Root User</span>
              </div>
              <div class="setting-input">
                <input
                  v-model="infrastructureSettings.database.root_user"
                  type="text"
                  placeholder="root"
                  class="form-input"
                />
              </div>
            </div>
            <div class="setting-item editable nested">
              <div class="setting-info">
                <span class="setting-label">Root Password</span>
              </div>
              <div class="setting-input">
                <input
                  v-model="infrastructureSettings.database.root_password"
                  type="password"
                  placeholder="••••••••"
                  class="form-input"
                />
              </div>
            </div>
          </template>

          <div class="setting-group-header">
            <i class="pi pi-bolt" />
            <span>Shared Redis</span>
            <label class="toggle-switch small">
              <input v-model="infrastructureSettings.redis.enabled" type="checkbox" />
              <span class="toggle-slider" />
            </label>
          </div>

          <template v-if="infrastructureSettings.redis.enabled">
            <div class="setting-item editable nested">
              <div class="setting-info">
                <span class="setting-label">Container Name</span>
              </div>
              <div class="setting-input">
                <input
                  v-model="infrastructureSettings.redis.container"
                  type="text"
                  placeholder="redis"
                  class="form-input"
                />
              </div>
            </div>
            <div class="setting-item editable nested">
              <div class="setting-info">
                <span class="setting-label">Host</span>
              </div>
              <div class="setting-input">
                <input
                  v-model="infrastructureSettings.redis.host"
                  type="text"
                  placeholder="redis"
                  class="form-input"
                />
              </div>
            </div>
            <div class="setting-item editable nested">
              <div class="setting-info">
                <span class="setting-label">Port</span>
              </div>
              <div class="setting-input">
                <input
                  v-model.number="infrastructureSettings.redis.port"
                  type="number"
                  placeholder="6379"
                  class="form-input narrow"
                />
              </div>
            </div>
            <div class="setting-item editable nested">
              <div class="setting-info">
                <span class="setting-label">Password</span>
                <span class="setting-description">Leave empty if no authentication</span>
              </div>
              <div class="setting-input">
                <input
                  v-model="infrastructureSettings.redis.password"
                  type="password"
                  placeholder="••••••••"
                  class="form-input"
                />
              </div>
            </div>
          </template>

          <div class="setting-actions">
            <button
              class="btn btn-primary"
              :disabled="savingInfrastructure"
              @click="saveInfrastructureSettings"
            >
              <i v-if="savingInfrastructure" class="pi pi-spin pi-spinner" />
              <i v-else class="pi pi-save" />
              <span>Save Infrastructure Settings</span>
            </button>
          </div>
        </div>
      </div>

      <div class="settings-section">
        <div class="section-header">
          <i class="pi pi-cog" />
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
                {{ settings.enable_cors ? "Enabled" : "Disabled" }}
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
          <i class="pi pi-info-circle" />
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
              <code>{{ agentVersion }}</code>
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
          <i class="pi pi-database" />
          <h3>Quick Actions</h3>
        </div>
        <div class="section-body">
          <div class="actions-grid">
            <button class="action-card" @click="testConnection">
              <i class="pi pi-check-circle" />
              <span>Test Connection</span>
            </button>
            <button class="action-card" :disabled="refreshingTemplates" @click="refreshTemplates">
              <i class="pi pi-box" :class="{ 'pi-spin': refreshingTemplates }" />
              <span>{{ refreshingTemplates ? 'Refreshing...' : 'Refresh Templates' }}</span>
            </button>
            <button class="action-card" @click="refreshData">
              <i class="pi pi-sync" />
              <span>Refresh All Data</span>
            </button>
            <button class="action-card" @click="clearCache">
              <i class="pi pi-trash" />
              <span>Clear Cache</span>
            </button>
          </div>
        </div>
      </div>

      <div class="settings-section">
        <div class="section-header">
          <i class="pi pi-file-edit" />
          <h3>Configuration File</h3>
        </div>
        <div class="section-body">
          <div class="config-note">
            <i class="pi pi-info-circle" />
            <p>
              To modify settings, edit the configuration file on your server and restart the agent.
              The configuration file is typically located at
              <code>/etc/flatrun/config.yml</code> or passed via command line.
            </p>
          </div>
          <pre class="config-preview">{{ configYaml }}</pre>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from "vue";
import { settingsApi, healthApi, templatesApi } from "@/services/api";
import type { DomainSettings } from "@/services/api";
import { useNotificationsStore } from "@/stores/notifications";

declare const __APP_VERSION__: string;

const notifications = useNotificationsStore();
const loading = ref(false);
const savingDomain = ref(false);
const savingInfrastructure = ref(false);
const refreshingTemplates = ref(false);
const agentVersion = ref("unknown");

const settings = reactive({
  deployments_path: "",
  api_port: 0,
  enable_cors: false,
  allowed_origins: [] as string[],
});

const domainSettings = reactive<DomainSettings>({
  default_domain: "",
  auto_subdomain: true,
  auto_ssl: true,
  subdomain_style: "words",
});

const infrastructureSettings = reactive({
  network_name: "web",
  database: {
    enabled: false,
    type: "mysql",
    container: "",
    host: "",
    port: 3306,
    root_user: "root",
    root_password: "",
  },
  redis: {
    enabled: false,
    container: "",
    host: "",
    port: 6379,
    password: "",
  },
});

const uiVersion = __APP_VERSION__;

const configYaml = computed(() => {
  return `deployments_path: ${settings.deployments_path}

api:
  port: ${settings.api_port}
  enable_cors: ${settings.enable_cors}
  allowed_origins:
${settings.allowed_origins.map((o) => `    - ${o}`).join("\n")}

domain:
  default_domain: ${domainSettings.default_domain || ""}
  auto_subdomain: ${domainSettings.auto_subdomain}
  auto_ssl: ${domainSettings.auto_ssl}
  subdomain_style: ${domainSettings.subdomain_style}
`;
});

const fetchSettings = async () => {
  loading.value = true;

  try {
    const response = await settingsApi.get();
    const data = response.data.settings;
    settings.deployments_path = data.deployments_path || "";
    settings.api_port = data.api_port || 0;
    settings.enable_cors = data.enable_cors || false;
    settings.allowed_origins = data.allowed_origins || [];

    if (data.domain) {
      domainSettings.default_domain = data.domain.default_domain || "";
      domainSettings.auto_subdomain = data.domain.auto_subdomain ?? true;
      domainSettings.auto_ssl = data.domain.auto_ssl ?? true;
      domainSettings.subdomain_style = data.domain.subdomain_style || "words";
    }

    if (data.infrastructure) {
      infrastructureSettings.network_name = data.infrastructure.network_name || "web";
      if (data.infrastructure.database) {
        infrastructureSettings.database.enabled = data.infrastructure.database.enabled ?? false;
        infrastructureSettings.database.type = data.infrastructure.database.type || "mysql";
        infrastructureSettings.database.container = data.infrastructure.database.container || "";
        infrastructureSettings.database.host = data.infrastructure.database.host || "";
        infrastructureSettings.database.port = data.infrastructure.database.port || 3306;
      }
      if (data.infrastructure.redis) {
        infrastructureSettings.redis.enabled = data.infrastructure.redis.enabled ?? false;
        infrastructureSettings.redis.container = data.infrastructure.redis.container || "";
        infrastructureSettings.redis.host = data.infrastructure.redis.host || "";
        infrastructureSettings.redis.port = data.infrastructure.redis.port || 6379;
      }
    }
  } catch (e: any) {
    notifications.error("Error", "Failed to load settings");
  } finally {
    loading.value = false;
  }
};

const saveDomainSettings = async () => {
  savingDomain.value = true;

  try {
    await settingsApi.update({
      domain: {
        default_domain: domainSettings.default_domain,
        auto_subdomain: domainSettings.auto_subdomain,
        auto_ssl: domainSettings.auto_ssl,
        subdomain_style: domainSettings.subdomain_style,
      },
    });
    notifications.success("Settings Saved", "Domain configuration has been updated");
  } catch (e: any) {
    notifications.error("Error", "Failed to save domain settings");
  } finally {
    savingDomain.value = false;
  }
};

const saveInfrastructureSettings = async () => {
  savingInfrastructure.value = true;

  try {
    await settingsApi.update({
      infrastructure: {
        network_name: infrastructureSettings.network_name,
        database: {
          enabled: infrastructureSettings.database.enabled,
          type: infrastructureSettings.database.type,
          container: infrastructureSettings.database.container,
          host: infrastructureSettings.database.host,
          port: infrastructureSettings.database.port,
          root_user: infrastructureSettings.database.root_user,
          root_password: infrastructureSettings.database.root_password,
        },
        redis: {
          enabled: infrastructureSettings.redis.enabled,
          container: infrastructureSettings.redis.container,
          host: infrastructureSettings.redis.host,
          port: infrastructureSettings.redis.port,
          password: infrastructureSettings.redis.password,
        },
      },
    });
    notifications.success("Settings Saved", "Infrastructure configuration has been updated");
  } catch (e: any) {
    notifications.error("Error", "Failed to save infrastructure settings");
  } finally {
    savingInfrastructure.value = false;
  }
};

const testConnection = async () => {
  try {
    await healthApi.check();
    notifications.success("Connection OK", "Agent is responding normally");
  } catch {
    notifications.error("Connection Failed", "Unable to reach the agent");
  }
};

const refreshData = () => {
  notifications.info("Refreshing", "Reloading all data...");
  window.location.reload();
};

const clearCache = () => {
  localStorage.clear();
  notifications.success("Cache Cleared", "Local storage has been cleared");
};

const refreshTemplates = async () => {
  refreshingTemplates.value = true;
  try {
    const response = await templatesApi.refresh();
    notifications.success("Templates Refreshed", `${response.data.count} templates updated`);
  } catch {
    notifications.error("Error", "Failed to refresh templates");
  } finally {
    refreshingTemplates.value = false;
  }
};

const fetchAgentVersion = async () => {
  try {
    const response = await healthApi.check();
    agentVersion.value = response.data.version?.version || "unknown";
  } catch {
    agentVersion.value = "unknown";
  }
};

onMounted(() => {
  fetchSettings();
  fetchAgentVersion();
});
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
  font-family: "SF Mono", "Fira Code", monospace;
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
  font-family: "SF Mono", "Fira Code", monospace;
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
  font-family: "SF Mono", "Fira Code", monospace;
  font-size: 0.8125rem;
}

.config-preview {
  background: #1f2937;
  color: #d1d5db;
  padding: 1.25rem;
  border-radius: 12px;
  font-family: "SF Mono", "Fira Code", monospace;
  font-size: 0.8125rem;
  line-height: 1.6;
  overflow-x: auto;
  margin: 0;
}

.setting-item.editable {
  padding: 1rem 0;
}

.setting-input {
  flex-shrink: 0;
}

.form-input {
  padding: 0.5rem 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  font-size: 0.875rem;
  color: #374151;
  background: white;
  min-width: 200px;
  transition:
    border-color 0.2s,
    box-shadow 0.2s;
}

.form-input:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.form-input::placeholder {
  color: #9ca3af;
}

.form-select {
  padding: 0.5rem 2rem 0.5rem 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  font-size: 0.875rem;
  color: #374151;
  background: white
    url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")
    right 0.5rem center/1.5em 1.5em no-repeat;
  appearance: none;
  cursor: pointer;
  transition:
    border-color 0.2s,
    box-shadow 0.2s;
}

.form-select:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.toggle-switch {
  position: relative;
  display: inline-block;
  width: 44px;
  height: 24px;
}

.toggle-switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.toggle-slider {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: #d1d5db;
  transition: 0.3s;
  border-radius: 24px;
}

.toggle-slider::before {
  position: absolute;
  content: "";
  height: 18px;
  width: 18px;
  left: 3px;
  bottom: 3px;
  background-color: white;
  transition: 0.3s;
  border-radius: 50%;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.toggle-switch input:checked + .toggle-slider {
  background-color: #3b82f6;
}

.toggle-switch input:checked + .toggle-slider::before {
  transform: translateX(20px);
}

.toggle-switch input:focus + .toggle-slider {
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.toggle-switch.small {
  width: 36px;
  height: 20px;
}

.toggle-switch.small .toggle-slider::before {
  height: 14px;
  width: 14px;
  left: 3px;
  bottom: 3px;
}

.toggle-switch.small input:checked + .toggle-slider::before {
  transform: translateX(16px);
}

.setting-group-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1rem 0;
  margin-top: 0.5rem;
  border-top: 1px solid #e5e7eb;
}

.setting-group-header i {
  font-size: 1rem;
  color: #6b7280;
}

.setting-group-header span {
  font-size: 0.875rem;
  font-weight: 600;
  color: #374151;
  flex: 1;
}

.setting-item.nested {
  padding-left: 1.5rem;
  border-left: 2px solid #e5e7eb;
  margin-left: 0.5rem;
}

.form-input.narrow {
  width: 100px;
  min-width: unset;
}

.setting-actions {
  margin-top: 1.5rem;
  padding-top: 1.5rem;
  border-top: 1px solid #f3f4f6;
  display: flex;
  justify-content: flex-end;
}

.btn {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.625rem 1rem;
  font-size: 0.875rem;
  font-weight: 500;
  border-radius: 8px;
  border: none;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-primary {
  background: #3b82f6;
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: #2563eb;
}

.btn-primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

@media (max-width: 768px) {
  .setting-item {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.5rem;
  }

  .setting-item.editable {
    gap: 0.75rem;
  }

  .setting-value {
    text-align: left;
  }

  .setting-input {
    width: 100%;
  }

  .form-input,
  .form-select {
    width: 100%;
    min-width: unset;
  }

  .origins-list {
    align-items: flex-start;
  }
}
</style>
