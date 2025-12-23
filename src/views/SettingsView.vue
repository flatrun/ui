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
                <button class="action-btn" :disabled="refreshingTemplates" @click="refreshTemplates">
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
                To modify agent settings, edit the configuration file on your server and restart the agent. Typically
                located at <code>/etc/flatrun/config.yml</code>
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
                <input v-model="nginxSettings.image" type="text" placeholder="nginx:alpine" class="form-input" />
              </div>
              <div class="form-group">
                <label class="form-label">Container Name</label>
                <input v-model="nginxSettings.container_name" type="text" placeholder="nginx" class="form-input" />
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
                    <span class="form-hint">Use an existing nginx installation instead of Docker container</span>
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
                <input v-model="certbotSettings.image" type="text" placeholder="certbot/certbot" class="form-input" />
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
                <input v-model="infrastructureSettings.redis.host" type="text" placeholder="redis" class="form-input" />
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
          <button class="btn btn-primary" :disabled="savingInfrastructure" @click="saveInfrastructureSettings">
            <i v-if="savingInfrastructure" class="pi pi-spin pi-spinner" />
            <i v-else class="pi pi-save" />
            <span>Save Infrastructure Settings</span>
          </button>
        </div>
      </div>

      <!-- Security Tab -->
      <div v-show="activeTab === 'security'" class="tab-content">
        <div class="settings-card">
          <div class="card-header">
            <i class="pi pi-shield" />
            <h3>Security Module</h3>
            <label class="toggle-switch">
              <input v-model="securitySettings.enabled" type="checkbox" />
              <span class="toggle-slider" />
            </label>
          </div>
          <div v-if="securitySettings.enabled" class="card-body">
            <div class="config-note">
              <i class="pi pi-info-circle" />
              <p>
                The security module captures events in realtime using OpenResty/Lua, monitoring unauthorized access
                attempts, suspicious paths, and scanner activity. Requires OpenResty nginx image.
              </p>
            </div>

            <div class="form-grid">
              <div class="form-group">
                <label class="form-label">Retention Days</label>
                <span class="form-hint">How long to keep security events</span>
                <input
                  v-model.number="securitySettings.retention_days"
                  type="number"
                  placeholder="30"
                  class="form-input"
                />
              </div>

              <div class="form-group">
                <label class="form-label">Rate Threshold</label>
                <span class="form-hint">Requests per minute to trigger high rate alert</span>
                <input
                  v-model.number="securitySettings.rate_threshold"
                  type="number"
                  placeholder="100"
                  class="form-input"
                />
              </div>
            </div>
          </div>
        </div>

        <div class="settings-card">
          <div class="card-header">
            <i class="pi pi-ban" />
            <h3>Auto-Blocking</h3>
            <label class="toggle-switch">
              <input v-model="securitySettings.auto_block_enabled" type="checkbox" />
              <span class="toggle-slider" />
            </label>
          </div>
          <div v-if="securitySettings.auto_block_enabled" class="card-body">
            <div class="form-grid">
              <div class="form-group">
                <label class="form-label">Auto-Block Duration</label>
                <span class="form-hint">How long to block IPs automatically (e.g., 24h, 1h, 30m)</span>
                <input
                  v-model="securitySettings.auto_block_duration"
                  type="text"
                  placeholder="24h"
                  class="form-input"
                />
              </div>

              <div class="form-group">
                <label class="form-label">Detection Window</label>
                <span class="form-hint">Time window for counting violations (e.g., 2m, 5m)</span>
                <input
                  v-model="securitySettings.detection_window"
                  type="text"
                  placeholder="2m"
                  class="form-input"
                />
              </div>
            </div>

            <h4 class="subsection-title">Detection Thresholds</h4>
            <p class="subsection-hint">
              IPs exceeding these thresholds within the detection window will be auto-blocked.
            </p>

            <div class="form-grid">
              <div class="form-group">
                <label class="form-label">404 Responses</label>
                <span class="form-hint">Max 404 errors (path probing)</span>
                <input
                  v-model.number="securitySettings.not_found_threshold"
                  type="number"
                  placeholder="10"
                  class="form-input"
                />
              </div>

              <div class="form-group">
                <label class="form-label">Auth Failures</label>
                <span class="form-hint">Max 401/403 responses</span>
                <input
                  v-model.number="securitySettings.auth_failure_threshold"
                  type="number"
                  placeholder="5"
                  class="form-input"
                />
              </div>

              <div class="form-group">
                <label class="form-label">Unique Paths</label>
                <span class="form-hint">Max different paths (scanning)</span>
                <input
                  v-model.number="securitySettings.unique_paths_threshold"
                  type="number"
                  placeholder="20"
                  class="form-input"
                />
              </div>

              <div class="form-group">
                <label class="form-label">Repeated Hits</label>
                <span class="form-hint">Max hits to same path (hammering)</span>
                <input
                  v-model.number="securitySettings.repeated_hits_threshold"
                  type="number"
                  placeholder="30"
                  class="form-input"
                />
              </div>
            </div>
          </div>
        </div>

        <div class="save-footer">
          <button class="btn btn-primary" :disabled="savingSecurity" @click="saveSecuritySettings">
            <i v-if="savingSecurity" class="pi pi-spin pi-spinner" />
            <i v-else class="pi pi-save" />
            <span>Save Security Settings</span>
          </button>
        </div>
      </div>

      <!-- Health Checks Tab -->
      <div v-show="activeTab === 'healthchecks'" class="tab-content">
        <SecurityHealthCard :auto-fetch="true" />
      </div>

      <!-- Credentials Tab -->
      <div v-show="activeTab === 'credentials'" class="tab-content">
        <div class="settings-card">
          <div class="card-header">
            <i class="pi pi-key" />
            <h3>Registry Credentials</h3>
            <button
              v-if="!showAddCredentialForm"
              class="btn btn-primary btn-sm header-action"
              @click="showAddCredentialForm = true"
            >
              <i class="pi pi-plus" />
              Add Credential
            </button>
          </div>
          <div class="card-body">
            <p class="section-description">
              Manage saved credentials for private Docker registries. These credentials can be used when pulling private
              images or deploying from private registries.
            </p>

            <!-- Add Credential Form -->
            <div v-if="showAddCredentialForm" class="add-credential-form">
              <h4>Add New Credential</h4>
              <div class="credential-form-grid">
                <div class="form-group">
                  <label class="form-label">Name <span class="required">*</span></label>
                  <input
                    v-model="newCredential.name"
                    type="text"
                    class="form-control"
                    placeholder="e.g., Docker Hub, GitHub Container Registry"
                  />
                </div>
                <div class="form-group">
                  <label class="form-label">Username <span class="required">*</span></label>
                  <input
                    v-model="newCredential.username"
                    type="text"
                    class="form-control"
                    placeholder="Username or access token name"
                  />
                </div>
                <div class="form-group">
                  <label class="form-label">Password / Token <span class="required">*</span></label>
                  <div class="password-input-wrapper">
                    <input
                      v-model="newCredential.password"
                      :type="showCredentialPassword ? 'text' : 'password'"
                      class="form-control"
                      placeholder="Password or personal access token"
                    />
                    <button
                      type="button"
                      class="password-toggle-btn"
                      @click="showCredentialPassword = !showCredentialPassword"
                    >
                      <i :class="showCredentialPassword ? 'pi pi-eye-slash' : 'pi pi-eye'" />
                    </button>
                  </div>
                </div>
                <div class="form-group checkbox-group">
                  <label class="checkbox-label">
                    <input v-model="newCredential.is_default" type="checkbox" />
                    <span>Set as default credential</span>
                  </label>
                </div>
              </div>
              <div class="form-actions">
                <button
                  class="btn btn-secondary"
                  :disabled="savingCredential"
                  @click="
                    showAddCredentialForm = false;
                    resetNewCredentialForm();
                  "
                >
                  Cancel
                </button>
                <button
                  class="btn btn-primary"
                  :disabled="
                    savingCredential || !newCredential.name || !newCredential.username || !newCredential.password
                  "
                  @click="createCredential"
                >
                  <i v-if="savingCredential" class="pi pi-spin pi-spinner" />
                  <i v-else class="pi pi-save" />
                  Save Credential
                </button>
              </div>
            </div>

            <div v-if="loadingCredentials" class="loading-inline">
              <i class="pi pi-spin pi-spinner" />
              <span>Loading credentials...</span>
            </div>

            <div v-else-if="credentials.length === 0 && !showAddCredentialForm" class="empty-state">
              <i class="pi pi-key" />
              <p>No saved credentials</p>
              <span class="empty-hint">
                Click "Add Credential" above to save registry credentials for private images.
              </span>
            </div>

            <div v-else-if="credentials.length > 0" class="credentials-list">
              <div v-for="cred in credentials" :key="cred.id" class="credential-item">
                <div class="credential-info">
                  <div class="credential-name">{{ cred.name }}</div>
                  <div class="credential-meta">
                    <span class="credential-username">
                      <i class="pi pi-user" />
                      {{ cred.username }}
                    </span>
                    <span v-if="cred.is_default" class="credential-badge default">Default</span>
                  </div>
                </div>
                <div class="credential-actions">
                  <button
                    class="btn btn-icon btn-danger-ghost"
                    :disabled="deletingCredentialId === cred.id"
                    title="Delete credential"
                    @click="confirmDeleteCredential(cred)"
                  >
                    <i v-if="deletingCredentialId === cred.id" class="pi pi-spin pi-spinner" />
                    <i v-else class="pi pi-trash" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Delete Confirmation Modal -->
        <Teleport to="body">
          <div v-if="showDeleteConfirm" class="modal-overlay" @click.self="cancelDeleteCredential">
            <div class="confirm-modal">
              <div class="confirm-icon danger">
                <i class="pi pi-exclamation-triangle" />
              </div>
              <h3>Delete Credential</h3>
              <p>
                Are you sure you want to delete <strong>{{ credentialToDelete?.name }}</strong
                >? This action cannot be undone.
              </p>
              <div class="confirm-actions">
                <button class="btn btn-secondary" @click="cancelDeleteCredential">Cancel</button>
                <button class="btn btn-danger" :disabled="deletingCredentialId !== null" @click="deleteCredential">
                  <i v-if="deletingCredentialId" class="pi pi-spin pi-spinner" />
                  Delete
                </button>
              </div>
            </div>
          </div>
        </Teleport>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from "vue";
import { settingsApi, healthApi, templatesApi, credentialsApi } from "@/services/api";
import type { DomainSettings } from "@/services/api";
import type { RegistryCredential } from "@/types";
import { useNotificationsStore } from "@/stores/notifications";
import SecurityHealthCard from "@/components/SecurityHealthCard.vue";

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
  { id: "security", label: "Security & Monitoring", icon: "pi pi-shield" },
  { id: "healthchecks", label: "Health Checks", icon: "pi pi-heart" },
  { id: "credentials", label: "Credentials", icon: "pi pi-key" },
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

const securitySettings = reactive({
  enabled: false,
  retention_days: 30,
  rate_threshold: 100,
  auto_block_enabled: false,
  auto_block_threshold: 50,
  auto_block_duration: "24h",
  detection_window: "2m",
  not_found_threshold: 10,
  auth_failure_threshold: 5,
  unique_paths_threshold: 20,
  repeated_hits_threshold: 30,
});

const savingSecurity = ref(false);

const credentials = ref<RegistryCredential[]>([]);
const loadingCredentials = ref(false);
const deletingCredentialId = ref<string | null>(null);
const showAddCredentialForm = ref(false);
const savingCredential = ref(false);
const showDeleteConfirm = ref(false);
const credentialToDelete = ref<RegistryCredential | null>(null);
const showCredentialPassword = ref(false);
const newCredential = reactive({
  name: "",
  username: "",
  password: "",
  is_default: false,
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

const fetchCredentials = async () => {
  loadingCredentials.value = true;
  try {
    const response = await credentialsApi.list();
    credentials.value = response.data.credentials || [];
  } catch (error) {
    console.error("Failed to fetch credentials:", error);
    credentials.value = [];
  } finally {
    loadingCredentials.value = false;
  }
};

const confirmDeleteCredential = (cred: RegistryCredential) => {
  credentialToDelete.value = cred;
  showDeleteConfirm.value = true;
};

const cancelDeleteCredential = () => {
  showDeleteConfirm.value = false;
  credentialToDelete.value = null;
};

const deleteCredential = async () => {
  if (!credentialToDelete.value) return;
  const id = credentialToDelete.value.id;
  deletingCredentialId.value = id;
  try {
    await credentialsApi.delete(id);
    credentials.value = credentials.value.filter((c) => c.id !== id);
    notifications.success("Credential deleted", "The credential has been removed.");
    showDeleteConfirm.value = false;
    credentialToDelete.value = null;
  } catch (error) {
    console.error("Failed to delete credential:", error);
    notifications.error("Failed to delete credential", "An error occurred while deleting the credential.");
  } finally {
    deletingCredentialId.value = null;
  }
};

const resetNewCredentialForm = () => {
  newCredential.name = "";
  newCredential.username = "";
  newCredential.password = "";
  newCredential.is_default = false;
  showCredentialPassword.value = false;
};

const createCredential = async () => {
  if (!newCredential.name || !newCredential.username || !newCredential.password) {
    notifications.error("Missing fields", "Please fill in all required fields.");
    return;
  }
  savingCredential.value = true;
  try {
    await credentialsApi.create({
      name: newCredential.name,
      registry_type_slug: "docker-hub",
      username: newCredential.username,
      password: newCredential.password,
      is_default: newCredential.is_default,
    });
    notifications.success("Credential saved", "The credential has been added.");
    resetNewCredentialForm();
    showAddCredentialForm.value = false;
    await fetchCredentials();
  } catch (error) {
    console.error("Failed to create credential:", error);
    notifications.error("Failed to save credential", "An error occurred while saving the credential.");
  } finally {
    savingCredential.value = false;
  }
};

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
      infrastructureSettings.default_proxy_network = data.infrastructure.default_proxy_network || "proxy";
      infrastructureSettings.default_database_network = data.infrastructure.default_database_network || "database";
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

    if (data.security) {
      securitySettings.enabled = data.security.enabled ?? false;
      securitySettings.retention_days = data.security.retention_days || 30;
      securitySettings.rate_threshold = data.security.rate_threshold || 100;
      securitySettings.auto_block_enabled = data.security.auto_block_enabled ?? false;
      securitySettings.auto_block_threshold = data.security.auto_block_threshold || 50;
      securitySettings.auto_block_duration = data.security.auto_block_duration || "24h";
      securitySettings.detection_window = data.security.detection_window || "2m";
      securitySettings.not_found_threshold = data.security.not_found_threshold || 10;
      securitySettings.auth_failure_threshold = data.security.auth_failure_threshold || 5;
      securitySettings.unique_paths_threshold = data.security.unique_paths_threshold || 20;
      securitySettings.repeated_hits_threshold = data.security.repeated_hits_threshold || 30;
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

const saveSecuritySettings = async () => {
  savingSecurity.value = true;

  try {
    const response = await settingsApi.updateSecurity({
      enabled: securitySettings.enabled,
      retention_days: securitySettings.retention_days,
      rate_threshold: securitySettings.rate_threshold,
      auto_block_enabled: securitySettings.auto_block_enabled,
      auto_block_threshold: securitySettings.auto_block_threshold,
      auto_block_duration: securitySettings.auto_block_duration,
      detection_window: securitySettings.detection_window,
      not_found_threshold: securitySettings.not_found_threshold,
      auth_failure_threshold: securitySettings.auth_failure_threshold,
      unique_paths_threshold: securitySettings.unique_paths_threshold,
      repeated_hits_threshold: securitySettings.repeated_hits_threshold,
    });

    const data = response.data;

    // Check for nginx errors
    if (data.nginx_error) {
      notifications.error("Security Update Warning", data.nginx_error);
    } else if (data.nginx_action) {
      const action = data.nginx_action;
      if (action.errors && action.errors.length > 0) {
        notifications.error("Security Update Warning", action.errors.join(", "));
      } else if (action.container_recreated) {
        notifications.success("Settings Saved", "Security configuration updated and nginx container recreated");
      } else if (action.nginx_reloaded) {
        notifications.success("Settings Saved", "Security configuration updated and nginx reloaded");
      } else {
        notifications.success("Settings Saved", "Security configuration has been updated");
      }
    } else {
      notifications.success("Settings Saved", "Security configuration has been updated");
    }

    // Sync local state with server response
    if (data.security) {
      securitySettings.enabled = data.security.enabled;
      securitySettings.retention_days = data.security.retention_days;
      securitySettings.rate_threshold = data.security.rate_threshold;
      securitySettings.auto_block_enabled = data.security.auto_block_enabled;
      securitySettings.auto_block_threshold = data.security.auto_block_threshold;
      securitySettings.auto_block_duration = data.security.auto_block_duration;
      securitySettings.detection_window = data.security.detection_window;
      securitySettings.not_found_threshold = data.security.not_found_threshold;
      securitySettings.auth_failure_threshold = data.security.auth_failure_threshold;
      securitySettings.unique_paths_threshold = data.security.unique_paths_threshold;
      securitySettings.repeated_hits_threshold = data.security.repeated_hits_threshold;
    }
  } catch (e: any) {
    const errorMsg = e.response?.data?.error || "Failed to save security settings";
    const details = e.response?.data?.details || "";
    notifications.error("Error", details ? `${errorMsg}: ${details}` : errorMsg);
  } finally {
    savingSecurity.value = false;
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
  fetchCredentials();
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
  border-radius: var(--radius-sm);
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
  border-radius: var(--radius-sm);
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
  border-radius: var(--radius-sm);
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
  border-radius: var(--radius-sm);
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
  border-radius: var(--radius-sm);
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
  border-radius: var(--radius-sm);
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
  border-radius: var(--radius-sm);
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
  border-radius: var(--radius-sm);
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
  border-radius: var(--radius-md);
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
  border-radius: var(--radius-sm);
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
  border-radius: var(--radius-sm);
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
  border-radius: var(--radius-sm);
  font-family: "SF Mono", "Fira Code", monospace;
  font-size: 0.75rem;
}

.config-preview {
  background: #1f2937;
  color: #d1d5db;
  padding: 1rem;
  border-radius: var(--radius-sm);
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

.subsection-title {
  font-size: 0.875rem;
  font-weight: 600;
  color: #374151;
  margin: 1.25rem 0 0.25rem;
  padding-top: 1rem;
  border-top: 1px solid #f3f4f6;
}

.subsection-hint {
  font-size: 0.75rem;
  color: #6b7280;
  margin-bottom: 1rem;
}

.form-input {
  padding: 0.5rem 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: var(--radius-sm);
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
  border-radius: var(--radius-sm);
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
  border-radius: var(--radius-sm);
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

/* Credentials Tab Styles */
.section-description {
  color: #6b7280;
  font-size: 0.875rem;
  margin-bottom: 1.5rem;
  line-height: 1.5;
}

.loading-inline {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: #6b7280;
  font-size: 0.875rem;
  padding: 1rem 0;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 2rem;
  text-align: center;
}

.empty-state i {
  font-size: 2.5rem;
  color: #d1d5db;
  margin-bottom: 1rem;
}

.empty-state p {
  color: #374151;
  font-weight: 500;
  margin: 0 0 0.5rem 0;
}

.empty-hint {
  color: #9ca3af;
  font-size: 0.8125rem;
  max-width: 320px;
}

.credentials-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.credential-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem;
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: var(--radius-sm);
}

.credential-info {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
}

.credential-name {
  font-weight: 500;
  color: #111827;
}

.credential-meta {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  font-size: 0.8125rem;
  color: #6b7280;
}

.credential-username {
  display: flex;
  align-items: center;
  gap: 0.375rem;
}

.credential-username i {
  font-size: 0.75rem;
}

.credential-badge {
  padding: 0.125rem 0.5rem;
  border-radius: 9999px;
  font-size: 0.6875rem;
  font-weight: 600;
  text-transform: uppercase;
}

.credential-badge.default {
  background: #dbeafe;
  color: #1d4ed8;
}

.credential-actions {
  display: flex;
  gap: 0.5rem;
}

.btn-danger-ghost {
  background: transparent;
  border: 1px solid transparent;
  color: #ef4444;
}

.btn-danger-ghost:hover:not(:disabled) {
  background: #fef2f2;
  border-color: #fecaca;
}

/* Header action button */
.card-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.header-action {
  margin-left: auto;
}

.btn-sm {
  padding: 0.375rem 0.75rem;
  font-size: 0.8125rem;
}

/* Add Credential Form */
.add-credential-form {
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: var(--radius-sm);
  padding: 1.25rem;
  margin-bottom: 1.5rem;
}

.add-credential-form h4 {
  margin: 0 0 1rem 0;
  font-size: 0.9375rem;
  font-weight: 600;
  color: #111827;
}

.credential-form-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1rem;
}

.credential-form-grid .form-group {
  margin-bottom: 0;
}

.credential-form-grid .checkbox-group {
  grid-column: 1 / -1;
}

.form-control {
  width: 100%;
  padding: 0.5rem 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: var(--radius-md);
  font-size: 0.875rem;
  transition:
    border-color 0.2s,
    box-shadow 0.2s;
}

.form-control:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.password-input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}

.password-input-wrapper .form-control {
  padding-right: 2.5rem;
}

.password-toggle-btn {
  position: absolute;
  right: 0.5rem;
  background: none;
  border: none;
  color: #9ca3af;
  cursor: pointer;
  padding: 0.25rem;
}

.password-toggle-btn:hover {
  color: #6b7280;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
  color: #374151;
  cursor: pointer;
}

.required {
  color: #ef4444;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  margin-top: 1.25rem;
  padding-top: 1rem;
  border-top: 1px solid #e5e7eb;
}

/* Confirmation Modal */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.confirm-modal {
  background: white;
  border-radius: var(--radius-sm);
  padding: 1.5rem;
  max-width: 400px;
  width: 90%;
  text-align: center;
}

.confirm-icon {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 1rem;
}

.confirm-icon.danger {
  background: #fef2f2;
  color: #ef4444;
}

.confirm-icon i {
  font-size: 1.5rem;
}

.confirm-modal h3 {
  margin: 0 0 0.5rem 0;
  font-size: 1.125rem;
  font-weight: 600;
  color: #111827;
}

.confirm-modal p {
  margin: 0 0 1.5rem 0;
  color: #6b7280;
  font-size: 0.875rem;
  line-height: 1.5;
}

.confirm-actions {
  display: flex;
  gap: 0.75rem;
  justify-content: center;
}

.btn-danger {
  background: #ef4444;
  color: white;
  border: none;
}

.btn-danger:hover:not(:disabled) {
  background: #dc2626;
}

.btn-danger:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.content-grid.single-column {
  grid-template-columns: 1fr;
}
</style>
