<template>
  <div class="deployment-detail">
    <div class="detail-header">
      <div class="header-left">
        <router-link :to="backPath" class="back-link">
          <i class="pi pi-arrow-left" />
          {{ backLabel }}
        </router-link>
        <div class="deployment-title">
          <h1>{{ deployment?.name || $route.params.name }}</h1>
          <span class="status-badge" :class="deployment?.status">
            {{ deployment?.status || "loading" }}
          </span>
        </div>
      </div>
      <div class="header-actions">
        <button
          class="btn btn-success"
          :disabled="loading || deployment?.status === 'running'"
          @click="handleOperation('start')"
        >
          <i class="pi pi-play" /> Start
        </button>
        <button
          class="btn btn-warning"
          :disabled="loading || deployment?.status === 'stopped'"
          @click="handleOperation('stop')"
        >
          <i class="pi pi-stop" /> Stop
        </button>
        <button
          class="btn btn-info"
          :disabled="loading || deployment?.status === 'stopped'"
          @click="handleOperation('restart')"
        >
          <i class="pi pi-refresh" /> Restart
        </button>
        <button
          class="btn btn-secondary"
          :disabled="loading"
          @click="showRebuildModal = true"
          title="Recreate containers with latest images"
        >
          <i class="pi pi-sync" /> Rebuild
        </button>
        <button class="btn btn-secondary" :disabled="loading" @click="openPullImageModal">
          <i class="pi pi-download" /> Pull Image
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
                <div v-if="deployment.metadata?.type" class="info-row">
                  <span class="label">Type</span>
                  <span class="value type-badge">{{ deployment.metadata.type }}</span>
                </div>
                <div v-if="!isInfrastructure" class="info-row action-row">
                  <button class="btn btn-sm btn-secondary" @click="migrateToInfrastructure">
                    <i class="pi pi-server" />
                    Mark as Infrastructure
                  </button>
                </div>
              </div>
            </div>

            <div class="info-card">
              <div class="card-header">
                <i class="pi pi-globe" />
                <h3>Domain & SSL</h3>
                <button class="btn btn-sm btn-icon" title="Edit Domain Settings" @click="openDomainSettings">
                  <i class="pi pi-pencil" />
                </button>
              </div>
              <div class="card-body">
                <template v-if="proxyStatus && proxyStatus.exposed">
                  <div class="info-row">
                    <span class="label">Domain</span>
                    <span class="value domain-link">
                      <a
                        :href="(proxyStatus.ssl_enabled ? 'https://' : 'http://') + proxyStatus.domain"
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
                      <span class="status-badge" :class="proxyStatus.virtual_host_exists ? 'running' : 'stopped'">
                        {{ proxyStatus.virtual_host_exists ? "Configured" : "Not Configured" }}
                      </span>
                    </span>
                  </div>
                  <div class="info-row">
                    <span class="label">SSL</span>
                    <span class="value">
                      <span class="status-badge" :class="proxyStatus.ssl_enabled ? 'running' : 'stopped'">
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
                      <span class="value" :class="{ 'text-warning': proxyStatus.certificate.days_left <= 30 }">
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
                    <button
                      v-if="proxyStatus.ssl_enabled"
                      class="btn btn-sm btn-warning"
                      :disabled="disablingSSL"
                      @click="handleDisableSSL"
                    >
                      <i :class="disablingSSL ? 'pi pi-spin pi-spinner' : 'pi pi-lock-open'" />
                      Disable SSL
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
                <div v-if="services.length === 0" class="empty-services">No services configured</div>
                <div v-else class="services-list">
                  <div v-for="service in services" :key="service.name" class="service-item">
                    <div class="service-header">
                      <span class="service-name">{{ service.name }}</span>
                      <span class="service-status" :class="service.status">{{ service.status }}</span>
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
                <option v-for="service in services" :key="service.name" :value="service.container_id">
                  {{ service.name }}
                </option>
              </select>
            </div>
            <div class="terminal-actions">
              <button class="btn btn-sm btn-primary" :disabled="services.length === 0" @click="connectTerminal">
                <i class="pi pi-play" /> Connect
              </button>
              <button class="btn btn-sm btn-secondary" :disabled="services.length === 0" @click="reconnectTerminal">
                <i class="pi pi-refresh" /> Reconnect
              </button>
            </div>
          </div>
          <div class="terminal-container">
            <ContainerTerminal
              v-if="services.length > 0"
              ref="terminalRef"
              :container-id="terminalService || services[0]?.container_id || ''"
              @connected="onTerminalConnected"
              @disconnected="onTerminalDisconnected"
              @error="onTerminalError"
            />
            <div v-else class="terminal-placeholder">
              <i class="pi pi-desktop" />
              <h3>Terminal Access</h3>
              <p>No services available</p>
            </div>
          </div>
        </div>

        <div v-if="activeTab === 'environment'" class="env-tab">
          <div class="env-header">
            <h3>Environment Variables</h3>
            <button class="btn btn-sm btn-primary" @click="openAddEnvModal">
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

        <div v-if="activeTab === 'actions'" class="actions-tab">
          <div class="quick-actions-header">
            <div class="header-text">
              <h3>Quick Actions</h3>
              <p class="subtitle">Execute predefined commands on your deployment</p>
            </div>
            <button class="btn btn-primary" @click="openAddActionModal"><i class="pi pi-plus" /> Add Action</button>
          </div>

          <div v-if="!deployment?.metadata?.quick_actions?.length" class="no-actions">
            <i class="pi pi-bolt" />
            <p>No quick actions configured for this deployment.</p>
            <span class="hint">Click "Add Action" to create your first quick action.</span>
          </div>

          <div v-else class="actions-grid">
            <div
              v-for="action in deployment.metadata.quick_actions"
              :key="action.id"
              class="action-card"
              :class="{ executing: executingAction === action.id }"
            >
              <div class="action-card-header">
                <div class="action-title">
                  <div class="action-icon">
                    <i :class="action.icon || 'pi pi-play'" />
                  </div>
                  <h4>{{ action.name }}</h4>
                </div>
                <div class="action-meta">
                  <button class="action-meta-btn" title="Edit" @click="openEditActionModal(action)">
                    <i class="pi pi-pencil" />
                  </button>
                  <button
                    class="action-meta-btn action-meta-btn-danger"
                    title="Delete"
                    @click="deleteAction(action.id)"
                  >
                    <i class="pi pi-trash" />
                  </button>
                </div>
              </div>
              <div class="action-info">
                <p v-if="action.description">{{ action.description }}</p>
                <code class="action-command">{{ action.command }}</code>
              </div>
              <button
                class="btn btn-primary action-run-btn"
                :disabled="executingAction !== null || deployment?.status !== 'running'"
                @click="executeAction(action)"
              >
                <i v-if="executingAction === action.id" class="pi pi-spin pi-spinner" />
                <i v-else class="pi pi-play" />
                {{ executingAction === action.id ? "Running..." : "Run" }}
              </button>
            </div>
          </div>

          <div v-if="actionOutput" class="action-output">
            <div class="output-header">
              <h4>
                <i class="pi pi-code" />
                Output
              </h4>
              <button class="btn btn-sm btn-secondary" @click="actionOutput = ''">Clear</button>
            </div>
            <pre class="output-content">{{ actionOutput }}</pre>
          </div>
        </div>

        <div v-if="activeTab === 'security'" class="security-tab">
          <div class="security-enable-bar">
            <div class="enable-bar-left">
              <i class="pi pi-shield" :class="{ enabled: securityConfig.enabled }" />
              <span class="enable-bar-label">Security Protection</span>
              <span class="enable-bar-status" :class="{ active: securityConfig.enabled }">
                {{ securityConfig.enabled ? "Enabled" : "Disabled" }}
              </span>
            </div>
            <label class="toggle-switch">
              <input v-model="securityConfig.enabled" type="checkbox" @change="saveSecurityConfig" />
              <span class="toggle-slider" />
            </label>
          </div>

          <div class="security-summary">
            <div class="summary-card">
              <div class="summary-icon protected">
                <i class="pi pi-lock" />
              </div>
              <div class="summary-content">
                <span class="summary-value">{{
                  (securityConfig.protected_paths || []).filter((p) => p.enabled).length
                }}</span>
                <span class="summary-label">Protected Paths</span>
              </div>
            </div>
            <div class="summary-card">
              <div class="summary-icon rate">
                <i class="pi pi-gauge" />
              </div>
              <div class="summary-content">
                <span class="summary-value">{{
                  (securityConfig.rate_limits || []).filter((r) => r.enabled).length
                }}</span>
                <span class="summary-label">Rate Limits</span>
              </div>
            </div>
            <div class="summary-card">
              <div class="summary-icon events">
                <i class="pi pi-exclamation-triangle" />
              </div>
              <div class="summary-content">
                <span class="summary-value">{{ securityEvents.length }}</span>
                <span class="summary-label">Recent Events</span>
              </div>
            </div>
            <router-link :to="`/security?deployment=${deployment?.name}`" class="summary-card summary-link">
              <div class="summary-icon link">
                <i class="pi pi-external-link" />
              </div>
              <div class="summary-content">
                <span class="summary-label">View All Events</span>
                <span class="summary-hint">Global security dashboard</span>
              </div>
            </router-link>
          </div>

          <div class="security-grid">
            <div class="security-section">
              <div class="section-header">
                <div class="section-title">
                  <i class="pi pi-lock" />
                  <h3>Protected Paths</h3>
                </div>
                <span class="section-hint">Block access to sensitive files</span>
              </div>
              <div class="section-body">
                <div class="presets-section">
                  <span class="presets-label">Quick Add:</span>
                  <div class="presets-row">
                    <button
                      v-for="preset in protectedPathPresets"
                      :key="preset.pattern"
                      class="preset-btn"
                      :class="{ active: isPathProtected(preset.pattern) }"
                      @click="toggleProtectedPath(preset.pattern)"
                      :title="preset.pattern"
                    >
                      <i :class="isPathProtected(preset.pattern) ? 'pi pi-check' : 'pi pi-plus'" />
                      {{ preset.label }}
                    </button>
                  </div>
                </div>
                <div class="paths-list">
                  <div v-if="(securityConfig.protected_paths || []).length === 0" class="empty-state">
                    <i class="pi pi-shield" />
                    <p>No protected paths</p>
                    <span>Click presets above or add custom paths</span>
                  </div>
                  <div v-else class="items-list">
                    <div
                      v-for="(path, index) in securityConfig.protected_paths || []"
                      :key="index"
                      class="list-item"
                      :class="{ disabled: !path.enabled }"
                    >
                      <code>{{ path.pattern }}</code>
                      <div class="item-actions">
                        <label class="toggle-switch small">
                          <input v-model="path.enabled" type="checkbox" @change="saveSecurityConfig" />
                          <span class="toggle-slider" />
                        </label>
                        <button
                          class="btn btn-icon btn-sm btn-ghost"
                          title="Remove"
                          @click="removeProtectedPath(index)"
                        >
                          <i class="pi pi-times" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
                <div class="add-form">
                  <input
                    v-model="newProtectedPath"
                    type="text"
                    class="form-input"
                    placeholder="Custom path (e.g., /storage/*)"
                    @keyup.enter="addProtectedPath"
                  />
                  <button class="btn btn-sm btn-primary" :disabled="!newProtectedPath" @click="addProtectedPath">
                    <i class="pi pi-plus" /> Add
                  </button>
                </div>
              </div>
            </div>

            <div class="security-section">
              <div class="section-header">
                <div class="section-title">
                  <i class="pi pi-gauge" />
                  <h3>Rate Limiting</h3>
                </div>
                <span class="section-hint">Limit requests per path</span>
              </div>
              <div class="section-body">
                <div class="rates-list">
                  <div v-if="(securityConfig.rate_limits || []).length === 0" class="empty-state">
                    <i class="pi pi-gauge" />
                    <p>No rate limits</p>
                    <span>Add limits to protect against abuse</span>
                  </div>
                  <div v-else class="items-list">
                    <div
                      v-for="(limit, index) in securityConfig.rate_limits || []"
                      :key="index"
                      class="list-item"
                      :class="{ disabled: !limit.enabled }"
                    >
                      <div class="rate-info">
                        <code>{{ limit.path }}</code>
                        <span class="rate-config">
                          <span class="rate-badge">{{ limit.rate }}/min</span>
                          <span class="burst-badge">burst: {{ limit.burst }}</span>
                        </span>
                      </div>
                      <div class="item-actions">
                        <label class="toggle-switch small">
                          <input v-model="limit.enabled" type="checkbox" @change="saveSecurityConfig" />
                          <span class="toggle-slider" />
                        </label>
                        <button class="btn btn-icon btn-sm btn-ghost" title="Remove" @click="removeRateLimit(index)">
                          <i class="pi pi-times" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
                <div class="add-form rate-form">
                  <input v-model="newRateLimit.path" type="text" class="form-input" placeholder="Path" />
                  <div class="rate-inputs">
                    <div class="input-group">
                      <input v-model.number="newRateLimit.rate" type="number" class="form-input" placeholder="10" />
                      <span class="input-suffix">/min</span>
                    </div>
                    <div class="input-group">
                      <input v-model.number="newRateLimit.burst" type="number" class="form-input" placeholder="5" />
                      <span class="input-suffix">burst</span>
                    </div>
                  </div>
                  <button class="btn btn-sm btn-primary" :disabled="!newRateLimit.path" @click="addRateLimit">
                    <i class="pi pi-plus" /> Add
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div class="security-section events-section">
            <div class="section-header">
              <div class="section-title">
                <i class="pi pi-history" />
                <h3>Recent Security Events</h3>
              </div>
              <router-link :to="`/security?deployment=${deployment?.name}`" class="view-all-btn">
                View all <i class="pi pi-arrow-right" />
              </router-link>
            </div>
            <div class="section-body">
              <div v-if="securityEvents.length === 0" class="empty-state horizontal">
                <i class="pi pi-check-circle" />
                <div class="empty-text">
                  <p>No security events</p>
                  <span>Security events for this deployment will appear here</span>
                </div>
              </div>
              <div v-else class="events-table">
                <div class="events-header">
                  <span class="col-severity">Severity</span>
                  <span class="col-type">Event</span>
                  <span class="col-ip">Source IP</span>
                  <span class="col-path">Path</span>
                  <span class="col-time">Time</span>
                </div>
                <div class="events-body">
                  <div v-for="event in securityEvents" :key="event.id" class="event-row">
                    <span class="col-severity">
                      <span class="severity-badge" :class="event.severity">{{ event.severity }}</span>
                    </span>
                    <span class="col-type">{{ formatEventType(event.event_type) }}</span>
                    <code class="col-ip">{{ event.source_ip }}</code>
                    <code class="col-path">{{ event.request_path || "-" }}</code>
                    <span class="col-time">{{ formatTimeAgo(event.created_at) }}</span>
                  </div>
                </div>
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
              {{ composeFilename }}
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
                <button class="btn btn-sm btn-secondary" @click="copyConfig"><i class="pi pi-copy" /> Copy</button>
                <button v-if="!isEditingConfig" class="btn btn-sm btn-primary" @click="isEditingConfig = true">
                  <i class="pi pi-pencil" /> Edit
                </button>
                <template v-else>
                  <button class="btn btn-sm btn-secondary" @click="cancelConfigEdit">Cancel</button>
                  <button class="btn btn-sm btn-success" @click="saveConfig"><i class="pi pi-check" /> Save</button>
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
                  <button class="btn btn-sm btn-secondary" @click="cancelServiceConfigEdit">Cancel</button>
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
      <div v-if="showOperationModal" class="modal-overlay">
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
            <button class="btn btn-secondary" :disabled="operationRunning" @click="showOperationModal = false">
              Close
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <Teleport to="body">
      <div v-if="showDeleteDeploymentModal" class="modal-overlay">
        <div class="delete-modal modal-container">
          <div class="modal-header danger">
            <h3>
              <i class="pi pi-trash" />
              Delete Deployment
            </h3>
            <button v-if="!deletingDeployment" class="close-btn" @click="showDeleteDeploymentModal = false">
              <i class="pi pi-times" />
            </button>
          </div>
          <div class="modal-body">
            <p class="delete-warning">
              Are you sure you want to delete <strong>{{ deployment?.name }}</strong
              >? This will remove all containers, volumes, and configuration.
            </p>
            <div class="delete-options">
              <h4>Additional cleanup options:</h4>
              <label class="delete-option">
                <input v-model="deleteOptions.deleteVhost" type="checkbox" />
                <span class="option-content">
                  <span class="option-label">Delete Virtual Host</span>
                  <span class="option-hint">Remove nginx proxy configuration</span>
                </span>
              </label>
              <label class="delete-option">
                <input v-model="deleteOptions.deleteSSL" type="checkbox" />
                <span class="option-content">
                  <span class="option-label">Delete SSL Certificate</span>
                  <span class="option-hint">Remove Let's Encrypt certificate for this domain</span>
                </span>
              </label>
              <label class="delete-option">
                <input v-model="deleteOptions.deleteDatabase" type="checkbox" />
                <span class="option-content">
                  <span class="option-label">Delete Database</span>
                  <span class="option-hint"> Remove associated database and user (if using shared database) </span>
                </span>
              </label>
            </div>
            <p class="danger-text">
              <i class="pi pi-exclamation-triangle" />
              This action cannot be undone.
            </p>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" :disabled="deletingDeployment" @click="showDeleteDeploymentModal = false">
              Cancel
            </button>
            <button class="btn btn-danger" :disabled="deletingDeployment" @click="deleteDeployment">
              <i v-if="deletingDeployment" class="pi pi-spin pi-spinner" />
              <i v-else class="pi pi-trash" />
              {{ deletingDeployment ? "Deleting..." : "Delete Deployment" }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <Teleport to="body">
      <div v-if="showPullImageModal" class="modal-overlay">
        <div class="pull-modal modal-container">
          <div class="modal-header">
            <h3>
              <i class="pi pi-download" />
              Pull Images
            </h3>
            <button class="close-btn" @click="showPullImageModal = false">
              <i class="pi pi-times" />
            </button>
          </div>
          <div class="modal-body">
            <div v-if="loadingImages" class="loading-images">
              <i class="pi pi-spin pi-spinner" />
              <span>Loading image information...</span>
            </div>
            <template v-else>
              <div v-if="deploymentImages.length === 0" class="no-images">
                <p>No pullable images found in this deployment.</p>
              </div>
              <template v-else>
                <div class="images-list">
                  <div v-for="img in deploymentImages" :key="img.service" class="image-item">
                    <span class="service-name">{{ img.service }}</span>
                    <code class="image-name">{{ img.image || "(build)" }}</code>
                    <span v-if="img.is_build" class="image-badge build">Build</span>
                    <span v-else-if="img.is_latest" class="image-badge latest">Latest</span>
                    <span v-else class="image-badge versioned">Versioned</span>
                  </div>
                </div>
                <div v-if="hasLatestImages" class="warning-box">
                  <i class="pi pi-exclamation-triangle" />
                  <span>
                    Images tagged as <strong>:latest</strong> or without a tag may change over time. Pulling will
                    overwrite existing images with the newest version, which may change the behavior of your deployment.
                  </span>
                </div>
                <div v-if="hasVersionedImages" class="info-box">
                  <i class="pi pi-info-circle" />
                  <span>
                    Versioned images (e.g., <code>nginx:1.25.3</code>) are immutable. Re-pulling them is usually
                    unnecessary.
                  </span>
                </div>
              </template>
            </template>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" @click="showPullImageModal = false">Cancel</button>
            <button
              v-if="hasLatestImages && hasVersionedImages"
              class="btn btn-info"
              :disabled="loadingImages"
              @click="executePull(true)"
            >
              <i class="pi pi-download" />
              Pull Latest Only
            </button>
            <button
              class="btn btn-primary"
              :disabled="loadingImages || deploymentImages.length === 0"
              @click="executePull(false)"
            >
              <i class="pi pi-download" />
              Pull All Images
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <Teleport to="body">
      <div v-if="showRebuildModal" class="modal-overlay">
        <div class="rebuild-modal modal-container">
          <div class="modal-header">
            <h3>
              <i class="pi pi-sync" />
              Rebuild Containers
            </h3>
            <button class="close-btn" @click="showRebuildModal = false">
              <i class="pi pi-times" />
            </button>
          </div>
          <div class="modal-body">
            <div class="warning-box">
              <i class="pi pi-exclamation-triangle" />
              <div>
                <strong>This will recreate all containers</strong>
                <p>
                  Rebuilding will stop all running containers, remove them, and create new ones using the currently
                  available images. This is useful after pulling new images.
                </p>
              </div>
            </div>
            <div class="info-box">
              <i class="pi pi-info-circle" />
              <span>
                <strong>When to use:</strong> After pulling new images with "Pull Image", use rebuild to apply the
                changes. A simple restart does not use newly pulled images.
              </span>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" @click="showRebuildModal = false">Cancel</button>
            <button class="btn btn-warning" @click="executeRebuild">
              <i class="pi pi-sync" />
              Rebuild Containers
            </button>
          </div>
        </div>
      </div>
    </Teleport>

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
      <div v-if="showDomainSettingsModal" class="modal-overlay">
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
                <input v-model="domainSettings.domain" type="text" placeholder="app.example.com" class="form-input" />
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
            <button class="btn btn-secondary" @click="showDomainSettingsModal = false">Cancel</button>
            <button class="btn btn-primary" :disabled="savingDomainSettings" @click="saveDomainSettings">
              <i v-if="savingDomainSettings" class="pi pi-spin pi-spinner" />
              {{ savingDomainSettings ? "Saving..." : "Save Settings" }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <Teleport to="body">
      <div v-if="showAddEnvModal" class="modal-overlay">
        <div class="env-modal modal-container">
          <div class="modal-header">
            <h3>
              <i class="pi pi-list" />
              {{ editingEnvVar ? "Edit Variable" : "Add Variable" }}
            </h3>
            <button class="close-btn" @click="showAddEnvModal = false">
              <i class="pi pi-times" />
            </button>
          </div>
          <div class="modal-body">
            <div class="form-group">
              <label>Key</label>
              <input
                v-model="newEnvKey"
                type="text"
                placeholder="VARIABLE_NAME"
                class="form-input"
                :disabled="!!editingEnvVar"
              />
              <span class="hint">The environment variable name (e.g., DB_HOST)</span>
            </div>
            <div class="form-group">
              <label>Value</label>
              <input v-model="newEnvValue" type="text" placeholder="value" class="form-input" />
              <span class="hint">The value for this variable</span>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" @click="showAddEnvModal = false">Cancel</button>
            <button class="btn btn-primary" :disabled="savingEnvVars || !newEnvKey.trim()" @click="saveEnvVar">
              <i v-if="savingEnvVars" class="pi pi-spin pi-spinner" />
              {{ savingEnvVars ? "Saving..." : editingEnvVar ? "Update" : "Add" }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <Teleport to="body">
      <div v-if="showActionModal" class="modal-overlay">
        <div class="action-modal modal-container">
          <div class="modal-header">
            <h3>
              <i class="pi pi-bolt" />
              {{ editingActionId ? "Edit Quick Action" : "Add Quick Action" }}
            </h3>
            <button class="close-btn" @click="showActionModal = false">
              <i class="pi pi-times" />
            </button>
          </div>
          <div class="modal-body">
            <div class="form-group">
              <label>Name <span class="required">*</span></label>
              <input v-model="actionForm.name" type="text" placeholder="e.g., Clear Cache" class="form-input" />
              <span class="hint">A descriptive name for the action</span>
            </div>
            <div class="form-group">
              <label>Command <span class="required">*</span></label>
              <input
                v-model="actionForm.command"
                type="text"
                placeholder="e.g., php artisan cache:clear"
                class="form-input mono"
              />
              <span class="hint">The shell command to execute in the container</span>
            </div>
            <div class="form-group">
              <label>Description</label>
              <input
                v-model="actionForm.description"
                type="text"
                placeholder="e.g., Flush the application cache"
                class="form-input"
              />
              <span class="hint">Optional description of what this action does</span>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label>Icon</label>
                <select v-model="actionForm.icon" class="form-input">
                  <option value="pi pi-play">Play</option>
                  <option value="pi pi-bolt">Bolt</option>
                  <option value="pi pi-refresh">Refresh</option>
                  <option value="pi pi-trash">Trash</option>
                  <option value="pi pi-database">Database</option>
                  <option value="pi pi-cog">Cog</option>
                  <option value="pi pi-code">Code</option>
                  <option value="pi pi-sync">Sync</option>
                  <option value="pi pi-download">Download</option>
                  <option value="pi pi-upload">Upload</option>
                </select>
                <span class="hint">Icon to display for this action</span>
              </div>
              <div class="form-group">
                <label>Target Service</label>
                <select v-model="actionForm.service" class="form-input">
                  <option value="">Default (first service)</option>
                  <option v-for="svc in deployment?.services" :key="svc.name" :value="svc.name">
                    {{ svc.name }}
                  </option>
                </select>
                <span class="hint">Container to run the command in</span>
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" @click="showActionModal = false">Cancel</button>
            <button
              class="btn btn-primary"
              :disabled="savingAction || !actionForm.name || !actionForm.command"
              @click="saveAction"
            >
              <i v-if="savingAction" class="pi pi-spin pi-spinner" />
              {{ savingAction ? "Saving..." : editingActionId ? "Update Action" : "Add Action" }}
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
import {
  deploymentsApi,
  proxyApi,
  certificatesApi,
  filesApi,
  infrastructureApi,
  securityApi,
  type EnvVar,
} from "@/services/api";
import { useNotificationsStore } from "@/stores/notifications";
import type { ProxyStatus, QuickAction, SecurityEvent, DeploymentSecurityConfig } from "@/types";
import FileBrowser from "@/components/FileBrowser.vue";
import LogViewer from "@/components/LogViewer.vue";
import ConfirmModal from "@/components/ConfirmModal.vue";
import ContainerTerminal from "@/components/ContainerTerminal.vue";

const route = useRoute();
const router = useRouter();
const notifications = useNotificationsStore();

const backPath = computed(() => {
  return route.query.from === "infrastructure" ? "/infrastructure" : "/deployments";
});

const backLabel = computed(() => {
  return route.query.from === "infrastructure" ? "Back to Infrastructure" : "Back to Deployments";
});

const deployment = ref<any>(null);
const loading = ref(false);
const error = ref("");
const activeTab = ref("overview");
const proxyStatus = ref<ProxyStatus | null>(null);
const settingUpProxy = ref(false);
const requestingCert = ref(false);
const disablingSSL = ref(false);

const securityConfig = ref<DeploymentSecurityConfig>({
  enabled: false,
  blocked_ips: [],
  protected_paths: [],
  rate_limits: [],
});
const securityEvents = ref<SecurityEvent[]>([]);
const newProtectedPath = ref("");
const newRateLimit = ref({ path: "", rate: 10, burst: 5, enabled: true });

const protectedPathPresets = [
  { pattern: "/.env", label: ".env" },
  { pattern: "/.git", label: ".git" },
  { pattern: "/wp-config.php", label: "wp-config" },
  { pattern: "/.htaccess", label: ".htaccess" },
  { pattern: "/composer.json", label: "composer.json" },
  { pattern: "/package.json", label: "package.json" },
];

const tabs = [
  { id: "overview", label: "Overview", icon: "pi pi-info-circle" },
  { id: "files", label: "Files", icon: "pi pi-folder" },
  { id: "logs", label: "Logs", icon: "pi pi-file-edit" },
  { id: "terminal", label: "Terminal", icon: "pi pi-desktop" },
  { id: "environment", label: "Environment", icon: "pi pi-list" },
  { id: "actions", label: "Quick Actions", icon: "pi pi-bolt" },
  { id: "security", label: "Security", icon: "pi pi-shield" },
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
const editingEnvVar = ref<{ key: string; value: string } | null>(null);
const newEnvKey = ref("");
const newEnvValue = ref("");
const savingEnvVars = ref(false);

const composeConfig = ref("");
const composeFilename = ref("docker-compose.yml");
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
const deleteOptions = ref({
  deleteVhost: true,
  deleteSSL: true,
  deleteDatabase: false,
});

const showPullImageModal = ref(false);
const showRebuildModal = ref(false);
const loadingImages = ref(false);
const deploymentImages = ref<
  Array<{
    service: string;
    image: string;
    is_latest: boolean;
    is_build: boolean;
  }>
>([]);

const executingAction = ref<string | null>(null);
const actionOutput = ref("");
const showActionModal = ref(false);
const savingAction = ref(false);
const editingActionId = ref<string | null>(null);
const actionForm = ref({
  name: "",
  command: "",
  description: "",
  icon: "pi pi-play",
  service: "",
});
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

const fetchSecurityConfig = async () => {
  try {
    const response = await securityApi.getDeploymentSecurity(route.params.name as string);
    securityConfig.value = response.data.security || {
      enabled: false,
      blocked_ips: [],
      protected_paths: [],
      rate_limits: [],
    };
  } catch {
    securityConfig.value = { enabled: false, blocked_ips: [], protected_paths: [], rate_limits: [] };
  }
};

const fetchSecurityEvents = async () => {
  try {
    const response = await securityApi.getDeploymentEvents(route.params.name as string, 10);
    securityEvents.value = response.data.events || [];
  } catch {
    securityEvents.value = [];
  }
};

const saveSecurityConfig = async () => {
  try {
    const response = await securityApi.updateDeploymentSecurity(route.params.name as string, securityConfig.value);
    const data = response.data as { security: typeof securityConfig.value; vhost_updated?: boolean; warning?: string };

    if (data.warning) {
      notifications.warning("Saved with Warning", data.warning);
    } else if (data.vhost_updated) {
      notifications.success("Saved & Applied", "Security configuration updated and nginx vhost regenerated");
    } else {
      notifications.success("Saved", "Security configuration updated");
    }
  } catch (e: any) {
    notifications.error("Error", e.response?.data?.error || "Failed to save security configuration");
  }
};

const isPathProtected = (pattern: string) => {
  return (securityConfig.value.protected_paths || []).some((p) => p.pattern === pattern);
};

const toggleProtectedPath = (pattern: string) => {
  if (!securityConfig.value.protected_paths) securityConfig.value.protected_paths = [];
  const index = securityConfig.value.protected_paths.findIndex((p) => p.pattern === pattern);
  if (index >= 0) {
    securityConfig.value.protected_paths.splice(index, 1);
  } else {
    securityConfig.value.protected_paths.push({ pattern, enabled: true });
  }
  saveSecurityConfig();
};

const addProtectedPath = () => {
  if (!newProtectedPath.value) return;
  if (!securityConfig.value.protected_paths) securityConfig.value.protected_paths = [];
  if (!isPathProtected(newProtectedPath.value)) {
    securityConfig.value.protected_paths.push({ pattern: newProtectedPath.value, enabled: true });
    saveSecurityConfig();
  }
  newProtectedPath.value = "";
};

const removeProtectedPath = (index: number) => {
  if (!securityConfig.value.protected_paths) return;
  securityConfig.value.protected_paths.splice(index, 1);
  saveSecurityConfig();
};

const addRateLimit = () => {
  if (!newRateLimit.value.path) return;
  if (!securityConfig.value.rate_limits) securityConfig.value.rate_limits = [];
  securityConfig.value.rate_limits.push({
    path: newRateLimit.value.path,
    rate: newRateLimit.value.rate || 10,
    burst: newRateLimit.value.burst || 5,
    enabled: true,
  });
  saveSecurityConfig();
  newRateLimit.value = { path: "", rate: 10, burst: 5, enabled: true };
};

const removeRateLimit = (index: number) => {
  if (!securityConfig.value.rate_limits) return;
  securityConfig.value.rate_limits.splice(index, 1);
  saveSecurityConfig();
};

const formatEventType = (type: string) => {
  return type.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
};

const formatTimeAgo = (dateString: string) => {
  if (!dateString) return "N/A";
  const date = new Date(dateString);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
};

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

    services.value = deployment.value?.services || [];

    fetchStats();

    try {
      const envResponse = await deploymentsApi.getEnvVars(route.params.name as string);
      envVars.value = (envResponse.data.env_vars || []).map((e: EnvVar) => ({
        ...e,
        hidden: /password|secret|key|token/i.test(e.key),
      }));
    } catch {
      envVars.value = [];
    }

    try {
      const composeResponse = await deploymentsApi.getComposeFile(route.params.name as string);
      composeConfig.value = composeResponse.data.content || composeResponse.data || "No compose file found";
      composeFilename.value = composeResponse.data.filename || "docker-compose.yml";
    } catch (composeErr) {
      composeConfig.value = "Error loading compose file";
      console.error("Failed to load compose file:", composeErr);
    }

    try {
      const serviceResponse = await filesApi.getContent(route.params.name as string, "/service.yml");
      serviceConfig.value = serviceResponse.data || "No service.yml found";
    } catch (serviceErr) {
      serviceConfig.value = "# Service configuration not found\n# This file will be created when you save";
      console.error("Failed to load service.yml:", serviceErr);
    }

    if (services.value.length > 0) {
      terminalService.value = services.value[0].container_id;
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

const handleDisableSSL = async () => {
  if (!deployment.value) return;

  disablingSSL.value = true;
  try {
    await deploymentsApi.disableSSL(deployment.value.name);
    notifications.success("SSL Disabled", `SSL has been disabled for ${deployment.value.name}`);
    await fetchDeployment();
  } catch (err: any) {
    const msg = err.response?.data?.error || err.message;
    notifications.error("Failed to Disable SSL", msg);
  } finally {
    disablingSSL.value = false;
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

const fetchStats = async () => {
  try {
    const response = await deploymentsApi.getStats(route.params.name as string);
    const stats = response.data;
    if (stats?.summary) {
      resourceUsage.value = {
        cpu: Math.round(stats.summary.cpu_percent * 10) / 10,
        memory: Math.round(stats.summary.memory_percent * 10) / 10,
        disk: 0,
        network: 0,
      };
    }
  } catch (err) {
    console.error("Failed to fetch stats:", err);
    resourceUsage.value = { cpu: 0, memory: 0, disk: 0, network: 0 };
  }
};

const handleOperation = async (operation: string, onlyLatest: boolean = false) => {
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
    } else if (operation === "rebuild") {
      response = await deploymentsApi.rebuild(route.params.name as string);
    } else if (operation === "pull") {
      response = await deploymentsApi.pullImage(route.params.name as string, onlyLatest);
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

const openPullImageModal = async () => {
  loadingImages.value = true;
  showPullImageModal.value = true;
  deploymentImages.value = [];

  try {
    const response = await deploymentsApi.getImages(route.params.name as string);
    deploymentImages.value = response.data.images || [];
  } catch (err) {
    console.error("Failed to fetch images:", err);
  } finally {
    loadingImages.value = false;
  }
};

const executePull = async (onlyLatest: boolean) => {
  showPullImageModal.value = false;
  await handleOperation("pull", onlyLatest);
};

const executeRebuild = async () => {
  showRebuildModal.value = false;
  await handleOperation("rebuild");
};

const executeAction = async (action: { id: string; name: string }) => {
  executingAction.value = action.id;
  actionOutput.value = "";

  try {
    const response = await deploymentsApi.executeQuickAction(route.params.name as string, action.id);
    actionOutput.value = response.data.output || "Action completed successfully";
    notifications.success("Action Executed", `${action.name} completed successfully`);
  } catch (err: any) {
    const errorOutput = err.response?.data?.output || err.response?.data?.error || err.message;
    actionOutput.value = errorOutput;
    notifications.error("Action Failed", `${action.name} failed`);
  } finally {
    executingAction.value = null;
  }
};

const openAddActionModal = () => {
  editingActionId.value = null;
  actionForm.value = {
    name: "",
    command: "",
    description: "",
    icon: "pi pi-play",
    service: "",
  };
  showActionModal.value = true;
};

const openEditActionModal = (action: QuickAction) => {
  editingActionId.value = action.id;
  actionForm.value = {
    name: action.name,
    command: action.command,
    description: action.description || "",
    icon: action.icon || "pi pi-play",
    service: action.service || "",
  };
  showActionModal.value = true;
};

const saveAction = async () => {
  if (!actionForm.value.name || !actionForm.value.command) {
    notifications.error("Validation Error", "Name and command are required");
    return;
  }

  savingAction.value = true;
  try {
    const currentActions = deployment.value?.metadata?.quick_actions || [];
    let updatedActions;

    if (editingActionId.value) {
      updatedActions = currentActions.map((a: QuickAction) =>
        a.id === editingActionId.value
          ? {
              ...a,
              name: actionForm.value.name,
              command: actionForm.value.command,
              description: actionForm.value.description || undefined,
              icon: actionForm.value.icon || undefined,
              service: actionForm.value.service || undefined,
            }
          : a,
      );
    } else {
      const newAction = {
        id: `action-${Date.now()}`,
        name: actionForm.value.name,
        command: actionForm.value.command,
        description: actionForm.value.description || undefined,
        icon: actionForm.value.icon || undefined,
        service: actionForm.value.service || undefined,
      };
      updatedActions = [...currentActions, newAction];
    }

    const metadata = {
      ...deployment.value?.metadata,
      quick_actions: updatedActions,
    };

    await deploymentsApi.updateMetadata(route.params.name as string, metadata as any);
    showActionModal.value = false;
    notifications.success("Action Saved", editingActionId.value ? "Quick action updated" : "Quick action added");
    await fetchDeployment();
  } catch (err: any) {
    notifications.error("Save Failed", err.response?.data?.error || err.message);
  } finally {
    savingAction.value = false;
  }
};

const deleteAction = async (actionId: string) => {
  try {
    const currentActions = deployment.value?.metadata?.quick_actions || [];
    const updatedActions = currentActions.filter((a: QuickAction) => a.id !== actionId);

    const metadata = {
      ...deployment.value?.metadata,
      quick_actions: updatedActions,
    };

    await deploymentsApi.updateMetadata(route.params.name as string, metadata as any);
    notifications.success("Action Deleted", "Quick action removed");
    await fetchDeployment();
  } catch (err: any) {
    notifications.error("Delete Failed", err.response?.data?.error || err.message);
  }
};

const hasLatestImages = computed(() => {
  return deploymentImages.value.some((img) => img.is_latest && !img.is_build);
});

const hasVersionedImages = computed(() => {
  return deploymentImages.value.some((img) => !img.is_latest && !img.is_build);
});

const confirmDelete = () => {
  showDeleteDeploymentModal.value = true;
};

const deleteDeployment = async () => {
  deletingDeployment.value = true;
  try {
    await deploymentsApi.delete(route.params.name as string, {
      deleteSSL: deleteOptions.value.deleteSSL,
      deleteDatabase: deleteOptions.value.deleteDatabase,
      deleteVhost: deleteOptions.value.deleteVhost,
    });
    showDeleteDeploymentModal.value = false;
    notifications.success("Deleted", `Deployment "${deployment.value?.name}" has been deleted`);
    router.push(backPath.value);
  } catch (err: any) {
    const msg = err.response?.data?.error || err.message;
    notifications.error("Delete Failed", msg);
  } finally {
    deletingDeployment.value = false;
  }
};

const isInfrastructure = computed(() => {
  return deployment.value?.metadata?.type === "infrastructure";
});

const migrateToInfrastructure = async () => {
  try {
    await infrastructureApi.migrate(route.params.name as string);
    notifications.success("Migrated", "Deployment moved to Infrastructure");
    router.push("/infrastructure");
  } catch (err: any) {
    const msg = err.response?.data?.error || err.message;
    notifications.error("Migration Failed", msg);
  }
};

const openTerminal = (service: any) => {
  terminalService.value = service.container_id;
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

const terminalRef = ref<InstanceType<typeof ContainerTerminal> | null>(null);

const connectTerminal = async () => {
  await nextTick();
  if (terminalRef.value) {
    terminalRef.value.connect();
  }
};

const reconnectTerminal = async () => {
  await nextTick();
  if (terminalRef.value) {
    terminalRef.value.disconnect();
    await nextTick();
    terminalRef.value?.connect();
  }
};

const onTerminalConnected = () => {
  notifications.success("Connected", "Terminal connected successfully");
};

const onTerminalDisconnected = () => {
  notifications.info("Disconnected", "Terminal connection closed");
};

const onTerminalError = (message: string) => {
  notifications.error("Connection Error", message);
};

const saveEnvVarsToServer = async () => {
  savingEnvVars.value = true;
  try {
    const envData = envVars.value.map((e) => ({ key: e.key, value: e.value }));
    await deploymentsApi.updateEnvVars(route.params.name as string, envData);
    return true;
  } catch (err: any) {
    const msg = err.response?.data?.error || err.message;
    notifications.error("Save Failed", msg);
    return false;
  } finally {
    savingEnvVars.value = false;
  }
};

const openAddEnvModal = () => {
  editingEnvVar.value = null;
  newEnvKey.value = "";
  newEnvValue.value = "";
  showAddEnvModal.value = true;
};

const editEnvVar = (env: { key: string; value: string }) => {
  editingEnvVar.value = { key: env.key, value: env.value };
  newEnvKey.value = env.key;
  newEnvValue.value = env.value;
  showAddEnvModal.value = true;
};

const saveEnvVar = async () => {
  if (!newEnvKey.value.trim()) {
    notifications.error("Validation Error", "Key cannot be empty");
    return;
  }

  if (editingEnvVar.value) {
    const index = envVars.value.findIndex((e) => e.key === editingEnvVar.value!.key);
    if (index !== -1) {
      envVars.value[index] = {
        key: newEnvKey.value.trim(),
        value: newEnvValue.value,
        hidden: /password|secret|key|token/i.test(newEnvKey.value),
      };
    }
  } else {
    if (envVars.value.some((e) => e.key === newEnvKey.value.trim())) {
      notifications.error("Validation Error", "Key already exists");
      return;
    }
    envVars.value.push({
      key: newEnvKey.value.trim(),
      value: newEnvValue.value,
      hidden: /password|secret|key|token/i.test(newEnvKey.value),
    });
  }

  const success = await saveEnvVarsToServer();
  if (success) {
    showAddEnvModal.value = false;
    notifications.success("Saved", editingEnvVar.value ? "Variable updated" : "Variable added");
    editingEnvVar.value = null;
    newEnvKey.value = "";
    newEnvValue.value = "";
  }
};

const confirmDeleteEnv = (key: string) => {
  envKeyToDelete.value = key;
  showDeleteEnvModal.value = true;
};

const deleteEnvVar = async () => {
  const keyToDelete = envKeyToDelete.value;
  envVars.value = envVars.value.filter((e) => e.key !== keyToDelete);
  showDeleteEnvModal.value = false;

  const success = await saveEnvVarsToServer();
  if (success) {
    notifications.success("Deleted", `Environment variable "${keyToDelete}" removed`);
  }
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

watch(activeTab, (newTab) => {
  if (newTab === "security") {
    fetchSecurityConfig();
    fetchSecurityEvents();
  }
});

onMounted(() => {
  fetchDeployment();
  refreshInterval = window.setInterval(() => {
    if (logsFollow.value && activeTab.value === "logs") {
      fetchLogs();
    }
    if (activeTab.value === "overview") {
      fetchStats();
    }
  }, 5000);
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
  height: 500px;
  overflow: hidden;
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

.env-modal {
  max-width: 500px;
}

.env-modal .modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--space-4);
  border-bottom: 1px solid var(--color-gray-200);
}

.env-modal .modal-header h3 {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  margin: 0;
  font-size: var(--text-lg);
}

.env-modal .modal-body {
  padding: var(--space-4);
}

.env-modal .modal-footer {
  padding: var(--space-3) var(--space-4);
  border-top: 1px solid var(--color-gray-200);
  display: flex;
  justify-content: flex-end;
  gap: var(--space-2);
}

.delete-modal {
  max-width: 500px;
}

.delete-modal .modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--space-4);
  border-bottom: 1px solid var(--color-gray-200);
}

.delete-modal .modal-header.danger {
  background: var(--color-danger-50);
  border-bottom-color: var(--color-danger-200);
}

.delete-modal .modal-header.danger h3 {
  color: var(--color-danger-700);
}

.delete-modal .modal-header h3 {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  margin: 0;
  font-size: var(--text-lg);
}

.delete-modal .modal-body {
  padding: var(--space-4);
}

.delete-warning {
  margin: 0 0 var(--space-4) 0;
  color: var(--color-gray-700);
  line-height: 1.5;
}

.delete-warning strong {
  color: var(--color-gray-900);
}

.delete-options {
  background: var(--color-gray-50);
  border-radius: var(--radius-md);
  padding: var(--space-4);
  margin-bottom: var(--space-4);
}

.delete-options h4 {
  margin: 0 0 var(--space-3) 0;
  font-size: var(--text-sm);
  font-weight: var(--font-semibold);
  color: var(--color-gray-700);
}

.delete-option {
  display: flex;
  align-items: flex-start;
  gap: var(--space-3);
  padding: var(--space-2) 0;
  cursor: pointer;
  border-bottom: 1px solid var(--color-gray-200);
}

.delete-option:last-child {
  border-bottom: none;
  padding-bottom: 0;
}

.delete-option input[type="checkbox"] {
  width: 18px;
  height: 18px;
  margin-top: 2px;
  cursor: pointer;
}

.option-content {
  flex: 1;
}

.option-label {
  display: block;
  font-weight: var(--font-medium);
  color: var(--color-gray-900);
  font-size: var(--text-sm);
}

.option-hint {
  display: block;
  font-size: var(--text-xs);
  color: var(--color-gray-500);
  margin-top: var(--space-1);
}

.danger-text {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  margin: 0;
  padding: var(--space-3);
  background: var(--color-danger-50);
  color: var(--color-danger-700);
  border-radius: var(--radius-md);
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
}

.delete-modal .modal-footer {
  padding: var(--space-3) var(--space-4);
  border-top: 1px solid var(--color-gray-200);
  display: flex;
  justify-content: flex-end;
  gap: var(--space-2);
}

.pull-modal {
  max-width: 550px;
}

.pull-modal .modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--space-3) var(--space-4);
  border-bottom: 1px solid var(--color-gray-200);
}

.pull-modal .modal-header h3 {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  margin: 0;
  font-size: var(--text-lg);
}

.pull-modal .modal-body {
  padding: var(--space-4);
}

.loading-images {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  padding: var(--space-4);
  color: var(--color-gray-600);
}

.loading-images i {
  font-size: 1.25rem;
}

.no-images {
  text-align: center;
  padding: var(--space-4);
  color: var(--color-gray-600);
}

.images-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  margin-bottom: var(--space-4);
}

.image-item {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-3);
  background: var(--color-gray-50);
  border-radius: var(--radius-md);
  font-size: var(--text-sm);
}

.image-item .service-name {
  font-weight: var(--font-medium);
  min-width: 100px;
}

.image-item .image-name {
  flex: 1;
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  color: var(--color-gray-600);
}

.image-badge {
  padding: var(--space-1) var(--space-2);
  border-radius: var(--radius-sm);
  font-size: var(--text-xs);
  font-weight: var(--font-medium);
}

.image-badge.latest {
  background: var(--color-warning-100);
  color: var(--color-warning-800);
}

.image-badge.versioned {
  background: var(--color-success-100);
  color: var(--color-success-800);
}

.image-badge.build {
  background: var(--color-gray-200);
  color: var(--color-gray-700);
}

.warning-box {
  display: flex;
  align-items: flex-start;
  gap: var(--space-2);
  padding: var(--space-3);
  background: var(--color-warning-50);
  border: 1px solid var(--color-warning-200);
  border-radius: var(--radius-md);
  color: var(--color-warning-800);
  font-size: var(--text-sm);
  margin-bottom: var(--space-3);
}

.warning-box i {
  color: var(--color-warning-600);
  margin-top: 2px;
}

.info-box {
  display: flex;
  align-items: flex-start;
  gap: var(--space-2);
  padding: var(--space-3);
  background: var(--color-info-50);
  border: 1px solid var(--color-info-200);
  border-radius: var(--radius-md);
  color: var(--color-info-800);
  font-size: var(--text-sm);
}

.info-box i {
  color: var(--color-info-600);
  margin-top: 2px;
}

.info-box code {
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  background: var(--color-info-100);
  padding: 0 var(--space-1);
  border-radius: var(--radius-xs);
}

.pull-modal .modal-footer {
  padding: var(--space-3) var(--space-4);
  border-top: 1px solid var(--color-gray-200);
  display: flex;
  justify-content: flex-end;
  gap: var(--space-2);
}

.rebuild-modal {
  max-width: 500px;
}

.rebuild-modal .modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--space-3) var(--space-4);
  border-bottom: 1px solid var(--color-gray-200);
}

.rebuild-modal .modal-header h3 {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  margin: 0;
  font-size: var(--text-lg);
}

.rebuild-modal .modal-body {
  padding: var(--space-4);
}

.rebuild-modal .modal-body .warning-box div {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.rebuild-modal .modal-body .warning-box p {
  margin: 0;
  font-weight: normal;
}

.rebuild-modal .modal-footer {
  padding: var(--space-3) var(--space-4);
  border-top: 1px solid var(--color-gray-200);
  display: flex;
  justify-content: flex-end;
  gap: var(--space-2);
}

.actions-tab {
  padding: var(--space-4);
}

.quick-actions-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: var(--space-6);
}

.quick-actions-header .header-text h3 {
  font-size: var(--text-xl);
  font-weight: var(--font-semibold);
  color: var(--color-gray-900);
  margin: 0;
}

.quick-actions-header .header-text .subtitle {
  color: var(--color-gray-500);
  margin-top: var(--space-1);
  font-size: var(--text-sm);
}

.no-actions {
  text-align: center;
  padding: var(--space-8);
  background: var(--color-gray-50);
  border-radius: var(--radius-lg);
  color: var(--color-gray-500);
}

.no-actions i {
  font-size: 2.5rem;
  margin-bottom: var(--space-4);
  opacity: 0.5;
}

.no-actions p {
  font-size: var(--text-md);
  margin: 0;
}

.no-actions .hint {
  display: block;
  font-size: var(--text-sm);
  margin-top: var(--space-2);
  opacity: 0.8;
}

.actions-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: var(--space-4);
  margin-bottom: var(--space-6);
}

.action-card {
  display: flex;
  flex-direction: column;
  padding: var(--space-4);
  background: white;
  border: 1px solid var(--color-gray-200);
  border-radius: var(--radius-lg);
  transition: all var(--transition-base);
}

.action-card:hover {
  border-color: var(--color-primary-300);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.action-card:hover .action-meta {
  opacity: 1;
}

.action-card.executing {
  border-color: var(--color-primary-400);
  background: var(--color-primary-50);
}

.action-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--space-2);
}

.action-title {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.action-title h4 {
  font-size: var(--text-md);
  font-weight: var(--font-medium);
  color: var(--color-gray-900);
  margin: 0;
}

.action-meta {
  display: flex;
  gap: var(--space-1);
  opacity: 0;
  transition: opacity var(--transition-base);
}

.action-meta-btn {
  width: 24px;
  height: 24px;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  border-radius: var(--radius-sm);
  color: var(--color-gray-400);
  cursor: pointer;
  transition: all var(--transition-base);
}

.action-meta-btn:hover {
  background: var(--color-gray-100);
  color: var(--color-gray-600);
}

.action-meta-btn-danger:hover {
  background: var(--color-danger-50);
  color: var(--color-danger-600);
}

.action-meta-btn i {
  font-size: 0.75rem;
}

.action-icon {
  width: 32px;
  height: 32px;
  border-radius: var(--radius-md);
  background: var(--color-primary-100);
  color: var(--color-primary-600);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.action-icon i {
  font-size: 0.9rem;
}

.action-info {
  flex: 1;
  min-width: 0;
  margin-bottom: var(--space-3);
}

.action-info p {
  font-size: var(--text-sm);
  color: var(--color-gray-500);
  margin: 0 0 var(--space-2);
}

.action-command {
  display: block;
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  color: var(--color-gray-600);
  background: var(--color-gray-100);
  padding: var(--space-1) var(--space-2);
  border-radius: var(--radius-sm);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.action-output {
  background: var(--color-gray-900);
  border-radius: var(--radius-lg);
  overflow: hidden;
}

.action-output .output-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-3) var(--space-4);
  background: var(--color-gray-800);
}

.action-output .output-header h4 {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  margin: 0;
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  color: var(--color-gray-300);
}

.action-output .output-content {
  margin: 0;
  padding: var(--space-4);
  font-family: var(--font-mono);
  font-size: var(--text-sm);
  color: var(--color-gray-100);
  white-space: pre-wrap;
  word-break: break-all;
  max-height: 300px;
  overflow-y: auto;
}

.action-run-btn {
  width: 100%;
  margin-top: auto;
}

.action-modal {
  max-width: 500px;
}

.action-modal .form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-4);
}

.action-modal .form-input.mono {
  font-family: var(--font-mono);
}

.action-modal .required {
  color: var(--color-danger-500);
}

/* Security Tab Styles */
.security-tab {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  padding: 1rem;
}

.security-summary {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1rem;
}

.summary-card {
  display: flex;
  align-items: center;
  gap: 0.875rem;
  padding: 1rem 1.25rem;
  background: white;
  border-radius: 4px;
  border: 1px solid #e5e7eb;
}

.summary-card.summary-link {
  text-decoration: none;
  cursor: pointer;
  transition: all 0.2s;
}

.summary-card.summary-link:hover {
  border-color: #3b82f6;
  box-shadow: 0 2px 8px rgba(59, 130, 246, 0.1);
}

.summary-icon {
  width: 42px;
  height: 42px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.125rem;
}

.summary-icon.protected {
  background: rgba(34, 197, 94, 0.1);
  color: #22c55e;
}

.summary-icon.rate {
  background: rgba(59, 130, 246, 0.1);
  color: #3b82f6;
}

.summary-icon.events {
  background: rgba(249, 115, 22, 0.1);
  color: #f97316;
}

.summary-icon.link {
  background: rgba(139, 92, 246, 0.1);
  color: #8b5cf6;
}

.summary-content {
  display: flex;
  flex-direction: column;
}

.summary-value {
  font-size: 1.375rem;
  font-weight: 700;
  color: #1f2937;
  line-height: 1.2;
}

.summary-label {
  font-size: 0.75rem;
  color: #6b7280;
}

.summary-hint {
  font-size: 0.6875rem;
  color: #9ca3af;
}

.security-enable-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: white;
  border-radius: 4px;
  border: 1px solid #e5e7eb;
  padding: 0.75rem 1rem;
}

.enable-bar-left {
  display: flex;
  align-items: center;
  gap: 0.625rem;
}

.enable-bar-left > i {
  font-size: 1rem;
  color: #9ca3af;
  transition: color 0.2s;
}

.enable-bar-left > i.enabled {
  color: #22c55e;
}

.enable-bar-label {
  font-size: 0.875rem;
  font-weight: 600;
  color: #1f2937;
}

.enable-bar-status {
  font-size: 0.75rem;
  color: #9ca3af;
  padding: 0.125rem 0.5rem;
  background: #f3f4f6;
  border-radius: 4px;
}

.enable-bar-status.active {
  color: #059669;
  background: #d1fae5;
}

.security-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.25rem;
}

.security-section {
  background: white;
  border-radius: 4px;
  border: 1px solid #e5e7eb;
  overflow: hidden;
}

.security-section .section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.875rem 1.25rem;
  border-bottom: 1px solid #f3f4f6;
  background: #fafafa;
}

.section-title {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.section-title i {
  color: #3b82f6;
  font-size: 1rem;
}

.section-title h3 {
  margin: 0;
  font-size: 0.9375rem;
  font-weight: 600;
  color: #1f2937;
}

.section-hint {
  font-size: 0.75rem;
  color: #9ca3af;
}

.section-body {
  padding: 1rem 1.25rem;
}

.view-all-btn {
  font-size: 0.8125rem;
  color: #3b82f6;
  text-decoration: none;
  display: flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.375rem 0.75rem;
  border-radius: 6px;
  transition: all 0.2s;
}

.view-all-btn:hover {
  background: rgba(59, 130, 246, 0.1);
  color: #2563eb;
}

.view-all-btn i {
  font-size: 0.625rem;
}

.presets-section {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 1rem;
  flex-wrap: wrap;
}

.presets-label {
  font-size: 0.75rem;
  font-weight: 600;
  color: #6b7280;
  white-space: nowrap;
}

.presets-row {
  display: flex;
  flex-wrap: wrap;
  gap: 0.375rem;
}

.preset-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.25rem 0.5rem;
  background: #f3f4f6;
  border: 1px solid #e5e7eb;
  border-radius: 4px;
  font-size: 0.75rem;
  color: #374151;
  cursor: pointer;
  transition: all 0.15s;
}

.preset-btn:hover {
  background: #e5e7eb;
}

.preset-btn.active {
  background: #dbeafe;
  border-color: #93c5fd;
  color: #1d4ed8;
}

.preset-btn i {
  font-size: 0.5625rem;
}

.paths-list,
.rates-list {
  margin-bottom: 1rem;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 2rem 1rem;
  text-align: center;
  color: #9ca3af;
  background: #f9fafb;
  border-radius: 8px;
  border: 1px dashed #e5e7eb;
}

.empty-state i {
  font-size: 1.5rem;
  margin-bottom: 0.5rem;
  opacity: 0.5;
}

.empty-state p {
  margin: 0;
  font-size: 0.875rem;
  font-weight: 500;
  color: #6b7280;
}

.empty-state span {
  font-size: 0.75rem;
}

.empty-state.horizontal {
  flex-direction: row;
  gap: 1rem;
  text-align: left;
  padding: 1.5rem;
}

.empty-state.horizontal i {
  margin-bottom: 0;
  font-size: 1.25rem;
  color: #22c55e;
}

.empty-text {
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
}

.items-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.list-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.625rem 0.875rem;
  background: #f9fafb;
  border-radius: 6px;
  border: 1px solid #e5e7eb;
  transition: all 0.2s;
}

.list-item:hover {
  border-color: #d1d5db;
}

.list-item.disabled {
  opacity: 0.6;
}

.list-item.disabled code {
  text-decoration: line-through;
}

.list-item code {
  font-family: "SF Mono", "Fira Code", monospace;
  font-size: 0.8125rem;
  background: transparent;
  color: #374151;
}

.item-actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.btn-ghost {
  background: transparent;
  border: none;
  color: #9ca3af;
}

.btn-ghost:hover {
  color: #ef4444;
  background: rgba(239, 68, 68, 0.1);
}

.rate-info {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.rate-config {
  display: flex;
  gap: 0.5rem;
}

.rate-badge,
.burst-badge {
  font-size: 0.6875rem;
  padding: 0.125rem 0.375rem;
  border-radius: 4px;
}

.rate-badge {
  background: #dbeafe;
  color: #1d4ed8;
}

.burst-badge {
  background: #f3f4f6;
  color: #6b7280;
}

.add-form {
  display: flex;
  gap: 0.5rem;
}

.add-form .form-input {
  flex: 1;
}

.rate-form {
  flex-wrap: wrap;
}

.rate-form .form-input:first-child {
  flex: 2;
  min-width: 120px;
}

.rate-inputs {
  display: flex;
  gap: 0.5rem;
}

.input-group {
  display: flex;
  align-items: center;
  background: white;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  overflow: hidden;
}

.input-group .form-input {
  border: none;
  width: 50px;
  text-align: center;
  padding: 0.5rem 0.25rem;
}

.input-suffix {
  font-size: 0.6875rem;
  color: #9ca3af;
  padding-right: 0.5rem;
  white-space: nowrap;
}

.toggle-switch {
  position: relative;
  display: inline-block;
  width: 36px;
  height: 20px;
}

.toggle-switch.small {
  width: 32px;
  height: 18px;
}

.toggle-switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.toggle-slider {
  position: absolute;
  cursor: pointer;
  inset: 0;
  background-color: #d1d5db;
  transition: 0.3s;
  border-radius: 20px;
}

.toggle-slider::before {
  position: absolute;
  content: "";
  height: 14px;
  width: 14px;
  left: 3px;
  bottom: 3px;
  background-color: white;
  transition: 0.3s;
  border-radius: 50%;
}

.toggle-switch.small .toggle-slider::before {
  height: 12px;
  width: 12px;
  left: 3px;
  bottom: 3px;
}

.toggle-switch input:checked + .toggle-slider {
  background-color: #3b82f6;
}

.toggle-switch input:checked + .toggle-slider::before {
  transform: translateX(16px);
}

.toggle-switch.small input:checked + .toggle-slider::before {
  transform: translateX(14px);
}

.events-section {
  grid-column: 1 / -1;
}

.events-table {
  border: 1px solid #e5e7eb;
  border-radius: 4px;
  overflow: hidden;
}

.events-header {
  display: grid;
  grid-template-columns: 80px 1fr 140px 1fr 100px;
  gap: 0.75rem;
  padding: 0.625rem 1rem;
  background: #f9fafb;
  border-bottom: 1px solid #e5e7eb;
  font-size: 0.6875rem;
  font-weight: 600;
  color: #6b7280;
  text-transform: uppercase;
}

.events-body {
  max-height: 300px;
  overflow-y: auto;
}

.event-row {
  display: grid;
  grid-template-columns: 80px 1fr 140px 1fr 100px;
  gap: 0.75rem;
  padding: 0.625rem 1rem;
  border-bottom: 1px solid #f3f4f6;
  align-items: center;
  font-size: 0.8125rem;
}

.event-row:last-child {
  border-bottom: none;
}

.event-row:hover {
  background: #f9fafb;
}

.col-severity {
  display: flex;
  align-items: center;
}

.col-type {
  color: #374151;
}

.col-ip,
.col-path {
  font-family: "SF Mono", "Fira Code", monospace;
  font-size: 0.75rem;
  color: #6b7280;
  background: transparent;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.col-time {
  font-size: 0.75rem;
  color: #9ca3af;
  text-align: right;
}

.severity-badge {
  display: inline-block;
  padding: 0.125rem 0.375rem;
  border-radius: 4px;
  font-size: 0.625rem;
  font-weight: 600;
  text-transform: uppercase;
}

.severity-badge.critical {
  background: #fee2e2;
  color: #991b1b;
}

.severity-badge.high {
  background: #ffedd5;
  color: #9a3412;
}

.severity-badge.medium {
  background: #fef3c7;
  color: #92400e;
}

.severity-badge.low {
  background: #f3f4f6;
  color: #4b5563;
}

@media (max-width: 1024px) {
  .security-summary {
    grid-template-columns: repeat(2, 1fr);
  }

  .security-grid {
    grid-template-columns: 1fr;
  }

  .events-header,
  .event-row {
    grid-template-columns: 70px 1fr 120px 80px;
  }

  .col-path {
    display: none;
  }
}

@media (max-width: 640px) {
  .security-summary {
    grid-template-columns: 1fr;
  }

  .presets-section {
    flex-direction: column;
    align-items: flex-start;
  }

  .events-header,
  .event-row {
    grid-template-columns: 60px 1fr 70px;
  }

  .col-ip {
    display: none;
  }
}
</style>
