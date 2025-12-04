<template>
  <div class="settings-view">
    <div class="view-header">
      <div class="tabs">
        <button
          v-for="tab in tabs"
          :key="tab.id"
          class="tab"
          :class="{ active: activeTab === tab.id }"
          @click="activeTab = tab.id"
        >
          <i :class="tab.icon" />
          <span>{{ tab.label }}</span>
        </button>
      </div>
      <button class="btn btn-icon" :disabled="loading" @click="fetchSettings">
        <i class="pi pi-refresh" :class="{ 'pi-spin': loading }" />
      </button>
    </div>

    <div v-if="loading" class="loading-state">
      <i class="pi pi-spin pi-spinner" />
      <span>Loading settings...</span>
    </div>

    <div v-else class="settings-content">
      <!-- General Tab -->
      <div v-show="activeTab === 'general'" class="tab-content">
        <div class="content-grid">
          <div class="settings-card">
            <div class="card-header">
              <i class="pi pi-info-circle" />
              <h3>System Information</h3>
            </div>
            <div class="card-body">
              <div class="info-grid">
                <div class="info-item">
                  <span class="info-label">Agent Status</span>
                  <span class="status-badge enabled">Online</span>
                </div>
                <div class="info-item">
                  <span class="info-label">Agent Version</span>
                  <code>{{ agentVersion }}</code>
                </div>
                <div class="info-item">
                  <span class="info-label">UI Version</span>
                  <code>{{ uiVersion }}</code>
                </div>
              </div>
            </div>
          </div>

          <div class="settings-card">
            <div class="card-header">
              <i class="pi pi-bolt" />
              <h3>Quick Actions</h3>
            </div>
            <div class="card-body">
              <div class="actions-grid">
                <button class="action-btn" @click="testConnection">
                  <i class="pi pi-check-circle" />
                  <span>Test Connection</span>
                </button>
                <button
                  class="action-btn"
                  :disabled="refreshingTemplates"
                  @click="refreshTemplates"
                >
                  <i class="pi pi-box" :class="{ 'pi-spin': refreshingTemplates }" />
                  <span>{{ refreshingTemplates ? "Refreshing..." : "Refresh Templates" }}</span>
                </button>
                <button class="action-btn" @click="refreshData">
                  <i class="pi pi-sync" />
                  <span>Refresh All</span>
                </button>
                <button class="action-btn" @click="clearCache">
                  <i class="pi pi-trash" />
                  <span>Clear Cache</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        <div class="settings-card">
          <div class="card-header">
            <i class="pi pi-cog" />
            <h3>Agent Configuration</h3>
            <span class="badge">Read-only</span>
          </div>
          <div class="card-body">
            <div class="config-grid">
              <div class="config-item">
                <span class="config-label">Deployments Path</span>
                <code>{{ settings.deployments_path }}</code>
              </div>
              <div class="config-item">
                <span class="config-label">API Port</span>
                <code>{{ settings.api_port }}</code>
              </div>
              <div class="config-item">
                <span class="config-label">CORS</span>
                <span class="status-badge" :class="settings.enable_cors ? 'enabled' : 'disabled'">
                  {{ settings.enable_cors ? "Enabled" : "Disabled" }}
                </span>
              </div>
              <div class="config-item full-width">
                <span class="config-label">Allowed Origins</span>
                <div class="origins-list">
                  <code v-for="origin in settings.allowed_origins" :key="origin">{{ origin }}</code>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="settings-card collapsible" :class="{ collapsed: configCollapsed }">
          <div class="card-header clickable" @click="configCollapsed = !configCollapsed">
            <i class="pi pi-file-edit" />
            <h3>Configuration Preview</h3>
            <i class="pi chevron" :class="configCollapsed ? 'pi-chevron-down' : 'pi-chevron-up'" />
          </div>
          <div v-show="!configCollapsed" class="card-body">
            <div class="config-note">
              <i class="pi pi-info-circle" />
              <p>
                To modify agent settings, edit the configuration file on your server and restart the
                agent. Typically located at <code>/etc/flatrun/config.yml</code>
              </p>
            </div>
            <pre class="config-preview">{{ configYaml }}</pre>
          </div>
        </div>
      </div>

      <!-- Domain Tab -->
      <div v-show="activeTab === 'domain'" class="tab-content">
        <div class="settings-card">
          <div class="card-header">
            <i class="pi pi-globe" />
            <h3>Domain Configuration</h3>
          </div>
          <div class="card-body">
            <div class="form-grid">
              <div class="form-group full-width">
                <label class="form-label">Default Domain</label>
                <span class="form-hint">Base domain for auto-generated subdomains</span>
                <input
                  v-model="domainSettings.default_domain"
                  type="text"
                  placeholder="example.com"
                  class="form-input"
                />
              </div>

              <div class="form-group">
                <label class="form-label">Subdomain Style</label>
                <span class="form-hint">Format for auto-generated subdomains</span>
                <select v-model="domainSettings.subdomain_style" class="form-select">
                  <option value="words">Words (swift-river-123)</option>
                  <option value="hex">Hex (a1b2c3d4)</option>
                  <option value="short">Short (swi-riv)</option>
                </select>
              </div>

              <div class="form-group">
                <div class="toggle-row">
                  <div class="toggle-info">
                    <label class="form-label">Auto Subdomain</label>
                    <span class="form-hint">Generate random subdomains for new deployments</span>
                  </div>
                  <label class="toggle-switch">
                    <input v-model="domainSettings.auto_subdomain" type="checkbox" />
                    <span class="toggle-slider" />
                  </label>
                </div>
              </div>

              <div class="form-group">
                <div class="toggle-row">
                  <div class="toggle-info">
                    <label class="form-label">Auto SSL</label>
                    <span class="form-hint">Request SSL certificates automatically</span>
                  </div>
                  <label class="toggle-switch">
                    <input v-model="domainSettings.auto_ssl" type="checkbox" />
                    <span class="toggle-slider" />
                  </label>
                </div>
              </div>
            </div>

            <div class="card-footer">
              <button class="btn btn-primary" :disabled="savingDomain" @click="saveDomainSettings">
                <i v-if="savingDomain" class="pi pi-spin pi-spinner" />
                <i v-else class="pi pi-save" />
                <span>Save Changes</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Infrastructure Tab -->
      <div v-show="activeTab === 'infrastructure'" class="tab-content">
        <div class="settings-card">
          <div class="card-header">
            <i class="pi pi-share-alt" />
            <h3>Networks</h3>
          </div>
          <div class="card-body">
            <div class="form-grid">
              <div class="form-group">
                <label class="form-label">Proxy Network</label>
                <span class="form-hint">Docker network for nginx/web container communication</span>
                <input
                  v-model="infrastructureSettings.default_proxy_network"
                  type="text"
                  placeholder="proxy"
                  class="form-input"
                />
              </div>
              <div class="form-group">
                <label class="form-label">Database Network</label>
                <span class="form-hint">Docker network for database container communication</span>
                <input
                  v-model="infrastructureSettings.default_database_network"
                  type="text"
                  placeholder="database"
                  class="form-input"
                />
              </div>
            </div>
          </div>
        </div>

        <div class="settings-card">
          <div class="card-header">
            <i class="pi pi-server" />
            <h3>Nginx</h3>
            <label class="toggle-switch">
              <input v-model="nginxSettings.enabled" type="checkbox" />
              <span class="toggle-slider" />
            </label>
          </div>
          <div v-if="nginxSettings.enabled" class="card-body">
            <div class="form-grid">
              <div class="form-group">
                <label class="form-label">Docker Image</label>
                <input
                  v-model="nginxSettings.image"
                  type="text"
                  placeholder="nginx:alpine"
                  class="form-input"
                />
              </div>
              <div class="form-group">
                <label class="form-label">Container Name</label>
                <input
                  v-model="nginxSettings.container_name"
                  type="text"
                  placeholder="nginx"
                  class="form-input"
                />
              </div>
              <div class="form-group">
                <label class="form-label">Config Path</label>
                <span class="form-hint">Path to nginx conf.d directory</span>
                <input
                  v-model="nginxSettings.config_path"
                  type="text"
                  placeholder="/deployments/nginx/conf.d"
                  class="form-input"
                />
              </div>
              <div class="form-group full-width">
                <label class="form-label">Reload Command</label>
                <span class="form-hint">Command to reload nginx configuration</span>
                <input
                  v-model="nginxSettings.reload_command"
                  type="text"
                  placeholder="nginx -s reload"
                  class="form-input"
                />
              </div>
              <div class="form-group full-width">
                <div class="toggle-row">
                  <div class="toggle-info">
                    <label class="form-label">External Nginx</label>
                    <span class="form-hint"
                      >Use an existing nginx installation instead of Docker container</span
                    >
                  </div>
                  <label class="toggle-switch">
                    <input v-model="nginxSettings.external" type="checkbox" />
                    <span class="toggle-slider" />
                  </label>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="settings-card">
          <div class="card-header">
            <i class="pi pi-lock" />
            <h3>SSL / Certbot</h3>
            <label class="toggle-switch">
              <input v-model="certbotSettings.enabled" type="checkbox" />
              <span class="toggle-slider" />
            </label>
          </div>
          <div v-if="certbotSettings.enabled" class="card-body">
            <div class="form-grid">
              <div class="form-group">
                <label class="form-label">Docker Image</label>
                <input
                  v-model="certbotSettings.image"
                  type="text"
                  placeholder="certbot/certbot"
                  class="form-input"
                />
              </div>
              <div class="form-group">
                <label class="form-label">Email</label>
                <span class="form-hint">Email for Let's Encrypt notifications</span>
                <input
                  v-model="certbotSettings.email"
                  type="email"
                  placeholder="admin@example.com"
                  class="form-input"
                />
              </div>
              <div class="form-group">
                <label class="form-label">Certificates Path</label>
                <span class="form-hint">Leave empty to use default (nginx/certs)</span>
                <input
                  v-model="certbotSettings.certs_path"
                  type="text"
                  placeholder="Default: {deployments}/nginx/certs/live"
                  class="form-input"
                />
              </div>
              <div class="form-group">
                <label class="form-label">Webroot Path</label>
                <span class="form-hint">Leave empty to use default (nginx/html)</span>
                <input
                  v-model="certbotSettings.webroot_path"
                  type="text"
                  placeholder="Default: {deployments}/nginx/html"
                  class="form-input"
                />
              </div>
              <div class="form-group">
                <label class="form-label">DNS Provider</label>
                <span class="form-hint">Optional: for DNS-01 challenge</span>
                <select v-model="certbotSettings.dns_provider" class="form-select">
                  <option value="">None (HTTP-01)</option>
                  <option value="cloudflare">Cloudflare</option>
                  <option value="route53">AWS Route53</option>
                  <option value="digitalocean">DigitalOcean</option>
                </select>
              </div>
              <div class="form-group">
                <div class="toggle-row">
                  <div class="toggle-info">
                    <label class="form-label">Staging Mode</label>
                    <span class="form-hint">Use Let's Encrypt staging server for testing</span>
                  </div>
                  <label class="toggle-switch">
                    <input v-model="certbotSettings.staging" type="checkbox" />
                    <span class="toggle-slider" />
                  </label>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="settings-card">
          <div class="card-header">
            <i class="pi pi-database" />
            <h3>Shared Database</h3>
            <label class="toggle-switch">
              <input v-model="infrastructureSettings.database.enabled" type="checkbox" />
              <span class="toggle-slider" />
            </label>
          </div>
          <div v-if="infrastructureSettings.database.enabled" class="card-body">
            <div class="form-grid">
              <div class="form-group">
                <label class="form-label">Database Type</label>
                <select v-model="infrastructureSettings.database.type" class="form-select">
                  <option value="mysql">MySQL</option>
                  <option value="mariadb">MariaDB</option>
                  <option value="postgres">PostgreSQL</option>
                </select>
              </div>
              <div class="form-group">
                <label class="form-label">Container Name</label>
                <input
                  v-model="infrastructureSettings.database.container"
                  type="text"
                  placeholder="mysql"
                  class="form-input"
                />
              </div>
              <div class="form-group">
                <label class="form-label">Host</label>
                <span class="form-hint">Usually same as container name</span>
                <input
                  v-model="infrastructureSettings.database.host"
                  type="text"
                  placeholder="mysql"
                  class="form-input"
                />
              </div>
              <div class="form-group">
                <label class="form-label">Port</label>
                <input
                  v-model.number="infrastructureSettings.database.port"
                  type="number"
                  placeholder="3306"
                  class="form-input"
                />
              </div>
              <div class="form-group">
                <label class="form-label">Root User</label>
                <input
                  v-model="infrastructureSettings.database.root_user"
                  type="text"
                  placeholder="root"
                  class="form-input"
                />
              </div>
              <div class="form-group">
                <label class="form-label">Root Password</label>
                <input
                  v-model="infrastructureSettings.database.root_password"
                  type="password"
                  placeholder="••••••••"
                  class="form-input"
                />
              </div>
            </div>
          </div>
        </div>

        <div class="settings-card">
          <div class="card-header">
            <i class="pi pi-bolt" />
            <h3>Shared Redis</h3>
            <label class="toggle-switch">
              <input v-model="infrastructureSettings.redis.enabled" type="checkbox" />
              <span class="toggle-slider" />
            </label>
          </div>
          <div v-if="infrastructureSettings.redis.enabled" class="card-body">
            <div class="form-grid">
              <div class="form-group">
                <label class="form-label">Container Name</label>
                <input
                  v-model="infrastructureSettings.redis.container"
                  type="text"
                  placeholder="redis"
                  class="form-input"
                />
              </div>
              <div class="form-group">
                <label class="form-label">Host</label>
                <input
                  v-model="infrastructureSettings.redis.host"
                  type="text"
                  placeholder="redis"
                  class="form-input"
                />
              </div>
              <div class="form-group">
                <label class="form-label">Port</label>
                <input
                  v-model.number="infrastructureSettings.redis.port"
                  type="number"
                  placeholder="6379"
                  class="form-input"
                />
              </div>
              <div class="form-group">
                <label class="form-label">Password</label>
                <span class="form-hint">Leave empty if no authentication</span>
                <input
                  v-model="infrastructureSettings.redis.password"
                  type="password"
                  placeholder="••••••••"
                  class="form-input"
                />
              </div>
            </div>
          </div>
        </div>

        <div class="save-footer">
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
const activeTab = ref("general");
const configCollapsed = ref(true);

const tabs = [
  { id: "general", label: "General", icon: "pi pi-home" },
  { id: "domain", label: "Domain", icon: "pi pi-globe" },
  { id: "infrastructure", label: "Infrastructure", icon: "pi pi-server" },
];

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
  default_proxy_network: "proxy",
  default_database_network: "database",
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

const nginxSettings = reactive({
  enabled: false,
  image: "nginx:alpine",
  container_name: "nginx",
  config_path: "",
  reload_command: "",
  external: false,
});

const certbotSettings = reactive({
  enabled: false,
  image: "certbot/certbot",
  email: "",
  staging: false,
  certs_path: "",
  webroot_path: "",
  dns_provider: "",
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

    if (data.nginx) {
      nginxSettings.enabled = data.nginx.enabled ?? false;
      nginxSettings.image = data.nginx.image || "nginx:alpine";
      nginxSettings.container_name = data.nginx.container_name || "nginx";
      nginxSettings.config_path = data.nginx.config_path || "";
      nginxSettings.reload_command = data.nginx.reload_command || "";
      nginxSettings.external = data.nginx.external ?? false;
    }

    if (data.certbot) {
      certbotSettings.enabled = data.certbot.enabled ?? false;
      certbotSettings.image = data.certbot.image || "certbot/certbot";
      certbotSettings.email = data.certbot.email || "";
      certbotSettings.staging = data.certbot.staging ?? false;
      certbotSettings.certs_path = data.certbot.certs_path || "";
      certbotSettings.webroot_path = data.certbot.webroot_path || "";
      certbotSettings.dns_provider = data.certbot.dns_provider || "";
    }

    if (data.infrastructure) {
      infrastructureSettings.default_proxy_network =
        data.infrastructure.default_proxy_network || "proxy";
      infrastructureSettings.default_database_network =
        data.infrastructure.default_database_network || "database";
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
      nginx: {
        enabled: nginxSettings.enabled,
        image: nginxSettings.image,
        container_name: nginxSettings.container_name,
        config_path: nginxSettings.config_path,
        reload_command: nginxSettings.reload_command,
        external: nginxSettings.external,
      },
      certbot: {
        enabled: certbotSettings.enabled,
        image: certbotSettings.image,
        email: certbotSettings.email,
        staging: certbotSettings.staging,
        certs_path: certbotSettings.certs_path,
        webroot_path: certbotSettings.webroot_path,
        dns_provider: certbotSettings.dns_provider,
      },
      infrastructure: {
        default_proxy_network: infrastructureSettings.default_proxy_network,
        default_database_network: infrastructureSettings.default_database_network,
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
  justify-content: space-between;
  align-items: center;
  background: white;
  padding: 0.5rem;
  border-radius: 12px;
  border: 1px solid #e5e7eb;
}

.tabs {
  display: flex;
  gap: 0.25rem;
}

.tab {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.625rem 1rem;
  background: transparent;
  border: none;
  border-radius: 8px;
  font-size: 0.875rem;
  font-weight: 500;
  color: #6b7280;
  cursor: pointer;
  transition: all 0.2s;
}

.tab:hover {
  background: #f3f4f6;
  color: #374151;
}

.tab.active {
  background: #3b82f6;
  color: white;
}

.tab i {
  font-size: 1rem;
}

.btn-icon {
  padding: 0.625rem;
  background: transparent;
  border: none;
  color: #6b7280;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-icon:hover:not(:disabled) {
  background: #f3f4f6;
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
}

.tab-content {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.content-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1.25rem;
}

.settings-card {
  background: white;
  border-radius: 12px;
  border: 1px solid #e5e7eb;
  overflow: hidden;
}

.card-header {
  padding: 1rem 1.25rem;
  border-bottom: 1px solid #f3f4f6;
  display: flex;
  align-items: center;
  gap: 0.625rem;
}

.card-header i:first-child {
  font-size: 1.125rem;
  color: #3b82f6;
}

.card-header h3 {
  font-size: 0.9375rem;
  font-weight: 600;
  color: #1f2937;
  margin: 0;
  flex: 1;
}

.card-header .badge {
  font-size: 0.6875rem;
  font-weight: 500;
  padding: 0.25rem 0.5rem;
  background: #f3f4f6;
  color: #6b7280;
  border-radius: 4px;
  text-transform: uppercase;
  letter-spacing: 0.025em;
}

.card-header .chevron {
  color: #9ca3af;
  transition: transform 0.2s;
}

.card-header.clickable {
  cursor: pointer;
}

.card-header.clickable:hover {
  background: #f9fafb;
}

.card-body {
  padding: 1.25rem;
}

.card-footer {
  padding-top: 1.25rem;
  margin-top: 1rem;
  border-top: 1px solid #f3f4f6;
  display: flex;
  justify-content: flex-end;
}

.info-grid {
  display: flex;
  flex-direction: column;
  gap: 0.875rem;
}

.info-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.info-label {
  font-size: 0.8125rem;
  color: #6b7280;
}

.info-item code {
  background: #f3f4f6;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-family: "SF Mono", "Fira Code", monospace;
  font-size: 0.75rem;
  color: #374151;
}

.status-badge {
  display: inline-block;
  padding: 0.25rem 0.625rem;
  border-radius: 9999px;
  font-size: 0.6875rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.025em;
}

.status-badge.enabled {
  background: #dcfce7;
  color: #166534;
}

.status-badge.disabled {
  background: #f3f4f6;
  color: #6b7280;
}

.actions-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0.625rem;
}

.action-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.625rem 0.75rem;
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  font-size: 0.8125rem;
  font-weight: 500;
  color: #374151;
  cursor: pointer;
  transition: all 0.2s;
}

.action-btn:hover:not(:disabled) {
  background: #f3f4f6;
  border-color: #d1d5db;
}

.action-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.action-btn i {
  font-size: 0.875rem;
  color: #3b82f6;
}

.config-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1rem;
}

.config-item {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
}

.config-item.full-width {
  grid-column: 1 / -1;
}

.config-label {
  font-size: 0.75rem;
  font-weight: 500;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.025em;
}

.config-item code {
  background: #f3f4f6;
  padding: 0.375rem 0.5rem;
  border-radius: 6px;
  font-family: "SF Mono", "Fira Code", monospace;
  font-size: 0.8125rem;
  color: #374151;
}

.origins-list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.375rem;
}

.origins-list code {
  background: #f3f4f6;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-family: "SF Mono", "Fira Code", monospace;
  font-size: 0.75rem;
  color: #374151;
}

.config-note {
  display: flex;
  align-items: flex-start;
  gap: 0.625rem;
  padding: 0.875rem;
  background: #eff6ff;
  border-radius: 8px;
  margin-bottom: 1rem;
}

.config-note i {
  color: #3b82f6;
  margin-top: 0.125rem;
  flex-shrink: 0;
}

.config-note p {
  margin: 0;
  font-size: 0.8125rem;
  color: #1e40af;
  line-height: 1.5;
}

.config-note code {
  background: #dbeafe;
  padding: 0.125rem 0.375rem;
  border-radius: 4px;
  font-family: "SF Mono", "Fira Code", monospace;
  font-size: 0.75rem;
}

.config-preview {
  background: #1f2937;
  color: #d1d5db;
  padding: 1rem;
  border-radius: 8px;
  font-family: "SF Mono", "Fira Code", monospace;
  font-size: 0.75rem;
  line-height: 1.6;
  overflow-x: auto;
  margin: 0;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1.25rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
}

.form-group.full-width {
  grid-column: 1 / -1;
}

.form-label {
  font-size: 0.8125rem;
  font-weight: 600;
  color: #374151;
}

.form-hint {
  font-size: 0.75rem;
  color: #9ca3af;
}

.form-input {
  padding: 0.5rem 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  font-size: 0.875rem;
  color: #374151;
  background: white;
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

.toggle-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem 0;
}

.toggle-info {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.toggle-switch {
  position: relative;
  display: inline-block;
  width: 44px;
  height: 24px;
  flex-shrink: 0;
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

.save-footer {
  display: flex;
  justify-content: flex-end;
  padding-top: 0.5rem;
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

@media (max-width: 1024px) {
  .content-grid {
    grid-template-columns: 1fr;
  }

  .config-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 768px) {
  .view-header {
    flex-direction: column;
    gap: 0.75rem;
    padding: 0.75rem;
  }

  .tabs {
    width: 100%;
    overflow-x: auto;
  }

  .tab {
    padding: 0.5rem 0.75rem;
    white-space: nowrap;
  }

  .tab span {
    display: none;
  }

  .form-grid,
  .config-grid {
    grid-template-columns: 1fr;
  }

  .actions-grid {
    grid-template-columns: 1fr;
  }
}
</style>
