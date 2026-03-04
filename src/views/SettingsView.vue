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
      <span>{{ t("settings.loading") }}</span>
    </div>

    <div v-else class="settings-content">
      <!-- General Tab -->
      <div v-show="activeTab === 'general'" class="tab-content">
        <div class="content-grid">
          <div class="settings-card">
            <div class="card-header">
              <i class="pi pi-info-circle" />
              <h3>{{ t("settings.general.systemInfo.title") }}</h3>
            </div>
            <div class="card-body">
              <div class="info-grid">
                <div class="info-item">
                  <span class="info-label">{{ t("settings.general.systemInfo.agentStatus") }}</span>
                  <span class="status-badge enabled">{{ t("settings.general.systemInfo.online") }}</span>
                </div>
                <div class="info-item">
                  <span class="info-label">{{ t("settings.general.systemInfo.agentVersion") }}</span>
                  <code>{{ agentVersion }}</code>
                </div>
                <div class="info-item">
                  <span class="info-label">{{ t("settings.general.systemInfo.uiVersion") }}</span>
                  <code>{{ uiVersion }}</code>
                </div>
              </div>
            </div>
          </div>

          <div class="settings-card">
            <div class="card-header">
              <i class="pi pi-bolt" />
              <h3>{{ t("settings.general.quickActions.title") }}</h3>
            </div>
            <div class="card-body">
              <div class="actions-grid">
                <button class="action-btn" @click="testConnection">
                  <i class="pi pi-check-circle" />
                  <span>{{ t("settings.general.quickActions.testConnection") }}</span>
                </button>
                <button class="action-btn" :disabled="refreshingTemplates" @click="refreshTemplates">
                  <i class="pi pi-box" :class="{ 'pi-spin': refreshingTemplates }" />
                  <span>
                    {{
                      refreshingTemplates
                        ? t("settings.general.quickActions.refreshing")
                        : t("settings.general.quickActions.refreshTemplates")
                    }}
                  </span>
                </button>
                <button class="action-btn" @click="refreshData">
                  <i class="pi pi-sync" />
                  <span>{{ t("settings.general.quickActions.refreshAll") }}</span>
                </button>
                <button class="action-btn" @click="clearCache">
                  <i class="pi pi-trash" />
                  <span>{{ t("settings.general.quickActions.clearCache") }}</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        <div class="settings-card">
          <div class="card-header">
            <i class="pi pi-cog" />
            <h3>{{ t("settings.general.agentConfig.title") }}</h3>
            <span class="badge">{{ t("settings.general.agentConfig.readOnly") }}</span>
          </div>
          <div class="card-body">
            <div class="config-grid">
              <div class="config-item">
                <span class="config-label">{{ t("settings.general.agentConfig.deploymentsPath") }}</span>
                <code>{{ settings.deployments_path }}</code>
              </div>
              <div class="config-item">
                <span class="config-label">{{ t("settings.general.agentConfig.apiPort") }}</span>
                <code>{{ settings.api_port }}</code>
              </div>
              <div class="config-item">
                <span class="config-label">{{ t("settings.general.agentConfig.cors") }}</span>
                <span class="status-badge" :class="settings.enable_cors ? 'enabled' : 'disabled'">
                  {{ settings.enable_cors ? t("settings.value.enabled") : t("settings.value.disabled") }}
                </span>
              </div>
              <div class="config-item full-width">
                <span class="config-label">{{ t("settings.general.agentConfig.allowedOrigins") }}</span>
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
            <h3>{{ t("settings.general.configPreview.title") }}</h3>
            <i class="pi chevron" :class="configCollapsed ? 'pi-chevron-down' : 'pi-chevron-up'" />
          </div>
          <div v-show="!configCollapsed" class="card-body">
            <div class="config-note">
              <i class="pi pi-info-circle" />
              <i18n-t keypath="settings.general.configPreview.note" tag="p">
                <code>/etc/flatrun/config.yml</code>
              </i18n-t>
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
            <h3>{{ t("settings.domain.title") }}</h3>
          </div>
          <div class="card-body">
            <div class="form-grid">
              <div class="form-group full-width">
                <label class="form-label">{{ t("settings.domain.defaultDomain.label") }}</label>
                <span class="form-hint">{{ t("settings.domain.defaultDomain.hint") }}</span>
                <input
                  v-model="domainSettings.default_domain"
                  type="text"
                  :placeholder="t('settings.domain.defaultDomain.placeholder')"
                  class="form-input"
                />
              </div>

              <div class="form-group">
                <label class="form-label">{{ t("settings.domain.subdomainStyle.label") }}</label>
                <span class="form-hint">{{ t("settings.domain.subdomainStyle.hint") }}</span>
                <select v-model="domainSettings.subdomain_style" class="form-select">
                  <option value="words">{{ t("settings.domain.subdomainStyle.options.words") }}</option>
                  <option value="hex">{{ t("settings.domain.subdomainStyle.options.hex") }}</option>
                  <option value="short">{{ t("settings.domain.subdomainStyle.options.short") }}</option>
                </select>
              </div>

              <div class="form-group">
                <div class="toggle-row">
                  <div class="toggle-info">
                    <label class="form-label">{{ t("settings.domain.autoSubdomain.label") }}</label>
                    <span class="form-hint">{{ t("settings.domain.autoSubdomain.hint") }}</span>
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
                    <label class="form-label">{{ t("settings.domain.autoSsl.label") }}</label>
                    <span class="form-hint">{{ t("settings.domain.autoSsl.hint") }}</span>
                  </div>
                  <label class="toggle-switch">
                    <input v-model="domainSettings.auto_ssl" type="checkbox" />
                    <span class="toggle-slider" />
                  </label>
                </div>
              </div>
            </div>

            <div v-if="canWriteSettings" class="card-footer">
              <button class="btn btn-primary" :disabled="savingDomain" @click="saveDomainSettings">
                <i v-if="savingDomain" class="pi pi-spin pi-spinner" />
                <i v-else class="pi pi-save" />
                <span>{{ t("settings.actions.saveChanges") }}</span>
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
            <h3>{{ t("settings.infrastructure.networks.title") }}</h3>
          </div>
          <div class="card-body">
            <div class="form-grid">
              <div class="form-group">
                <label class="form-label">{{ t("settings.infrastructure.networks.proxyNetwork.label") }}</label>
                <span class="form-hint">{{ t("settings.infrastructure.networks.proxyNetwork.hint") }}</span>
                <input
                  v-model="infrastructureSettings.default_proxy_network"
                  type="text"
                  :placeholder="t('settings.infrastructure.networks.proxyNetwork.placeholder')"
                  class="form-input"
                />
              </div>
              <div class="form-group">
                <label class="form-label">{{ t("settings.infrastructure.networks.databaseNetwork.label") }}</label>
                <span class="form-hint">{{ t("settings.infrastructure.networks.databaseNetwork.hint") }}</span>
                <input
                  v-model="infrastructureSettings.default_database_network"
                  type="text"
                  :placeholder="t('settings.infrastructure.networks.databaseNetwork.placeholder')"
                  class="form-input"
                />
              </div>
            </div>
          </div>
        </div>

        <div class="settings-card">
          <div class="card-header">
            <i class="pi pi-server" />
            <h3>{{ t("settings.infrastructure.nginx.title") }}</h3>
            <label class="toggle-switch">
              <input v-model="nginxSettings.enabled" type="checkbox" />
              <span class="toggle-slider" />
            </label>
          </div>
          <div v-if="nginxSettings.enabled" class="card-body">
            <div class="form-grid">
              <div class="form-group">
                <label class="form-label">{{ t("settings.infrastructure.nginx.dockerImage") }}</label>
                <input
                  v-model="nginxSettings.image"
                  type="text"
                  :placeholder="t('settings.infrastructure.nginx.placeholders.image')"
                  class="form-input"
                />
              </div>
              <div class="form-group">
                <label class="form-label">{{ t("settings.infrastructure.nginx.containerName") }}</label>
                <input
                  v-model="nginxSettings.container_name"
                  type="text"
                  :placeholder="t('settings.infrastructure.nginx.placeholders.containerName')"
                  class="form-input"
                />
              </div>
              <div class="form-group">
                <label class="form-label">{{ t("settings.infrastructure.nginx.configPath.label") }}</label>
                <span class="form-hint">{{ t("settings.infrastructure.nginx.configPath.hint") }}</span>
                <input
                  v-model="nginxSettings.config_path"
                  type="text"
                  :placeholder="t('settings.infrastructure.nginx.placeholders.configPath')"
                  class="form-input"
                />
              </div>
              <div class="form-group full-width">
                <label class="form-label">{{ t("settings.infrastructure.nginx.reloadCommand.label") }}</label>
                <span class="form-hint">{{ t("settings.infrastructure.nginx.reloadCommand.hint") }}</span>
                <input
                  v-model="nginxSettings.reload_command"
                  type="text"
                  :placeholder="t('settings.infrastructure.nginx.placeholders.reloadCommand')"
                  class="form-input"
                />
              </div>
              <div class="form-group full-width">
                <div class="toggle-row">
                  <div class="toggle-info">
                    <label class="form-label">{{ t("settings.infrastructure.nginx.external.label") }}</label>
                    <span class="form-hint">{{ t("settings.infrastructure.nginx.external.hint") }}</span>
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
            <h3>{{ t("settings.infrastructure.certbot.title") }}</h3>
            <label class="toggle-switch">
              <input v-model="certbotSettings.enabled" type="checkbox" />
              <span class="toggle-slider" />
            </label>
          </div>
          <div v-if="certbotSettings.enabled" class="card-body">
            <div class="form-grid">
              <div class="form-group">
                <label class="form-label">{{ t("settings.infrastructure.certbot.dockerImage") }}</label>
                <input
                  v-model="certbotSettings.image"
                  type="text"
                  :placeholder="t('settings.infrastructure.certbot.placeholders.image')"
                  class="form-input"
                />
              </div>
              <div class="form-group">
                <label class="form-label">{{ t("settings.infrastructure.certbot.email.label") }}</label>
                <span class="form-hint">{{ t("settings.infrastructure.certbot.email.hint") }}</span>
                <input
                  v-model="certbotSettings.email"
                  type="email"
                  :placeholder="t('settings.infrastructure.certbot.placeholders.email')"
                  class="form-input"
                />
              </div>
              <div class="form-group">
                <label class="form-label">{{ t("settings.infrastructure.certbot.certsPath.label") }}</label>
                <span class="form-hint">{{ t("settings.infrastructure.certbot.certsPath.hint") }}</span>
                <input
                  v-model="certbotSettings.certs_path"
                  type="text"
                  :placeholder="t('settings.infrastructure.certbot.placeholders.certsPath')"
                  class="form-input"
                />
              </div>
              <div class="form-group">
                <label class="form-label">{{ t("settings.infrastructure.certbot.webrootPath.label") }}</label>
                <span class="form-hint">{{ t("settings.infrastructure.certbot.webrootPath.hint") }}</span>
                <input
                  v-model="certbotSettings.webroot_path"
                  type="text"
                  :placeholder="t('settings.infrastructure.certbot.placeholders.webrootPath')"
                  class="form-input"
                />
              </div>
              <div class="form-group">
                <label class="form-label">{{ t("settings.infrastructure.certbot.dnsProvider.label") }}</label>
                <span class="form-hint">{{ t("settings.infrastructure.certbot.dnsProvider.hint") }}</span>
                <select v-model="certbotSettings.dns_provider" class="form-select">
                  <option value="">{{ t("settings.infrastructure.certbot.dnsProvider.none") }}</option>
                  <option value="cloudflare">Cloudflare</option>
                  <option value="route53">AWS Route53</option>
                  <option value="digitalocean">DigitalOcean</option>
                </select>
              </div>
              <div class="form-group">
                <div class="toggle-row">
                  <div class="toggle-info">
                    <label class="form-label">{{ t("settings.infrastructure.certbot.staging.label") }}</label>
                    <span class="form-hint">{{ t("settings.infrastructure.certbot.staging.hint") }}</span>
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
            <h3>{{ t("settings.infrastructure.sharedDatabase.title") }}</h3>
            <label class="toggle-switch">
              <input v-model="infrastructureSettings.database.enabled" type="checkbox" />
              <span class="toggle-slider" />
            </label>
          </div>
          <div v-if="infrastructureSettings.database.enabled" class="card-body">
            <div class="form-grid">
              <div class="form-group">
                <label class="form-label">{{ t("settings.infrastructure.sharedDatabase.databaseType") }}</label>
                <select v-model="infrastructureSettings.database.type" class="form-select">
                  <option value="mysql">MySQL</option>
                  <option value="mariadb">MariaDB</option>
                  <option value="postgres">PostgreSQL</option>
                </select>
              </div>
              <div class="form-group">
                <label class="form-label">{{ t("settings.infrastructure.sharedDatabase.containerName") }}</label>
                <input
                  v-model="infrastructureSettings.database.container"
                  type="text"
                  placeholder="mysql"
                  class="form-input"
                />
              </div>
              <div class="form-group">
                <label class="form-label">{{ t("settings.infrastructure.sharedDatabase.host.label") }}</label>
                <span class="form-hint">{{ t("settings.infrastructure.sharedDatabase.host.hint") }}</span>
                <input
                  v-model="infrastructureSettings.database.host"
                  type="text"
                  placeholder="mysql"
                  class="form-input"
                />
              </div>
              <div class="form-group">
                <label class="form-label">{{ t("settings.infrastructure.sharedDatabase.port") }}</label>
                <input
                  v-model.number="infrastructureSettings.database.port"
                  type="number"
                  placeholder="3306"
                  class="form-input"
                />
              </div>
              <div class="form-group">
                <label class="form-label">{{ t("settings.infrastructure.sharedDatabase.rootUser") }}</label>
                <input
                  v-model="infrastructureSettings.database.root_user"
                  type="text"
                  placeholder="root"
                  class="form-input"
                />
              </div>
              <div class="form-group">
                <label class="form-label">{{ t("settings.infrastructure.sharedDatabase.rootPassword") }}</label>
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
            <h3>{{ t("settings.infrastructure.sharedRedis.title") }}</h3>
            <label class="toggle-switch">
              <input v-model="infrastructureSettings.redis.enabled" type="checkbox" />
              <span class="toggle-slider" />
            </label>
          </div>
          <div v-if="infrastructureSettings.redis.enabled" class="card-body">
            <div class="form-grid">
              <div class="form-group">
                <label class="form-label">{{ t("settings.infrastructure.sharedRedis.containerName") }}</label>
                <input
                  v-model="infrastructureSettings.redis.container"
                  type="text"
                  placeholder="redis"
                  class="form-input"
                />
              </div>
              <div class="form-group">
                <label class="form-label">{{ t("settings.infrastructure.sharedRedis.host") }}</label>
                <input v-model="infrastructureSettings.redis.host" type="text" placeholder="redis" class="form-input" />
              </div>
              <div class="form-group">
                <label class="form-label">{{ t("settings.infrastructure.sharedRedis.port") }}</label>
                <input
                  v-model.number="infrastructureSettings.redis.port"
                  type="number"
                  placeholder="6379"
                  class="form-input"
                />
              </div>
              <div class="form-group">
                <label class="form-label">{{ t("settings.infrastructure.sharedRedis.password.label") }}</label>
                <span class="form-hint">{{ t("settings.infrastructure.sharedRedis.password.hint") }}</span>
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

        <div v-if="canWriteSettings" class="save-footer">
          <button class="btn btn-primary" :disabled="savingInfrastructure" @click="saveInfrastructureSettings">
            <i v-if="savingInfrastructure" class="pi pi-spin pi-spinner" />
            <i v-else class="pi pi-save" />
            <span>{{ t("settings.infrastructure.actions.save") }}</span>
          </button>
        </div>
      </div>

      <!-- Security Tab -->
      <div v-show="activeTab === 'security'" class="tab-content">
        <div class="settings-card">
          <div class="card-header">
            <i class="pi pi-shield" />
            <h3>{{ t("settings.security.module.title") }}</h3>
            <label class="toggle-switch">
              <input v-model="securitySettings.enabled" type="checkbox" />
              <span class="toggle-slider" />
            </label>
          </div>
          <div v-if="securitySettings.enabled" class="card-body">
            <div class="config-note">
              <i class="pi pi-info-circle" />
              <p>{{ t("settings.security.module.description") }}</p>
            </div>

            <div class="form-grid">
              <div class="form-group">
                <label class="form-label">{{ t("settings.security.module.retentionDays.label") }}</label>
                <span class="form-hint">{{ t("settings.security.module.retentionDays.hint") }}</span>
                <input
                  v-model.number="securitySettings.retention_days"
                  type="number"
                  placeholder="30"
                  class="form-input"
                />
              </div>

              <div class="form-group">
                <label class="form-label">{{ t("settings.security.module.rateThreshold.label") }}</label>
                <span class="form-hint">{{ t("settings.security.module.rateThreshold.hint") }}</span>
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
            <h3>{{ t("settings.security.autoBlocking.title") }}</h3>
            <label class="toggle-switch">
              <input v-model="securitySettings.auto_block_enabled" type="checkbox" />
              <span class="toggle-slider" />
            </label>
          </div>
          <div v-if="securitySettings.auto_block_enabled" class="card-body">
            <div class="form-grid">
              <div class="form-group">
                <label class="form-label">{{ t("settings.security.autoBlocking.duration.label") }}</label>
                <span class="form-hint">{{ t("settings.security.autoBlocking.duration.hint") }}</span>
                <input
                  v-model="securitySettings.auto_block_duration"
                  type="text"
                  placeholder="24h"
                  class="form-input"
                />
              </div>

              <div class="form-group">
                <label class="form-label">{{ t("settings.security.autoBlocking.detectionWindow.label") }}</label>
                <span class="form-hint">{{ t("settings.security.autoBlocking.detectionWindow.hint") }}</span>
                <input v-model="securitySettings.detection_window" type="text" placeholder="2m" class="form-input" />
              </div>
            </div>

            <h4 class="subsection-title">{{ t("settings.security.autoBlocking.thresholds.title") }}</h4>
            <p class="subsection-hint">{{ t("settings.security.autoBlocking.thresholds.hint") }}</p>

            <div class="form-grid">
              <div class="form-group">
                <label class="form-label">{{ t("settings.security.autoBlocking.thresholds.notFound.label") }}</label>
                <span class="form-hint">{{ t("settings.security.autoBlocking.thresholds.notFound.hint") }}</span>
                <input
                  v-model.number="securitySettings.not_found_threshold"
                  type="number"
                  placeholder="10"
                  class="form-input"
                />
              </div>

              <div class="form-group">
                <label class="form-label">{{ t("settings.security.autoBlocking.thresholds.authFailures.label") }}</label>
                <span class="form-hint">{{ t("settings.security.autoBlocking.thresholds.authFailures.hint") }}</span>
                <input
                  v-model.number="securitySettings.auth_failure_threshold"
                  type="number"
                  placeholder="5"
                  class="form-input"
                />
              </div>

              <div class="form-group">
                <label class="form-label">{{ t("settings.security.autoBlocking.thresholds.uniquePaths.label") }}</label>
                <span class="form-hint">{{ t("settings.security.autoBlocking.thresholds.uniquePaths.hint") }}</span>
                <input
                  v-model.number="securitySettings.unique_paths_threshold"
                  type="number"
                  placeholder="20"
                  class="form-input"
                />
              </div>

              <div class="form-group">
                <label class="form-label">{{ t("settings.security.autoBlocking.thresholds.repeatedHits.label") }}</label>
                <span class="form-hint">{{ t("settings.security.autoBlocking.thresholds.repeatedHits.hint") }}</span>
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

        <div v-if="canWriteSettings" class="save-footer">
          <button class="btn btn-primary" :disabled="savingSecurity" @click="saveSecuritySettings">
            <i v-if="savingSecurity" class="pi pi-spin pi-spinner" />
            <i v-else class="pi pi-save" />
            <span>{{ t("settings.security.actions.save") }}</span>
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
            <h3>{{ t("settings.credentials.title") }}</h3>
            <button
              v-if="canWriteRegistries && !showAddCredentialForm"
              class="btn btn-primary btn-sm header-action"
              @click="showAddCredentialForm = true"
            >
              <i class="pi pi-plus" />
              {{ t("settings.credentials.actions.addCredential") }}
            </button>
          </div>
          <div class="card-body">
            <p class="section-description">{{ t("settings.credentials.description") }}</p>

            <!-- Add Credential Form -->
            <div v-if="showAddCredentialForm" class="add-credential-form">
              <h4>{{ t("settings.credentials.addForm.title") }}</h4>
              <div class="credential-form-grid">
                <div class="form-group">
                  <label class="form-label">
                    {{ t("settings.credentials.fields.name") }} <span class="required">*</span>
                  </label>
                  <input
                    v-model="newCredential.name"
                    type="text"
                    class="form-control"
                    :placeholder="t('settings.credentials.placeholders.name')"
                  />
                </div>
                <div class="form-group">
                  <label class="form-label">
                    {{ t("settings.credentials.fields.username") }} <span class="required">*</span>
                  </label>
                  <input
                    v-model="newCredential.username"
                    type="text"
                    class="form-control"
                    :placeholder="t('settings.credentials.placeholders.username')"
                  />
                </div>
                <div class="form-group">
                  <label class="form-label">
                    {{ t("settings.credentials.fields.passwordOrToken") }} <span class="required">*</span>
                  </label>
                  <div class="password-input-wrapper">
                    <input
                      v-model="newCredential.password"
                      :type="showCredentialPassword ? 'text' : 'password'"
                      class="form-control"
                      :placeholder="t('settings.credentials.placeholders.passwordOrToken')"
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
                    <span>{{ t("settings.credentials.fields.setDefault") }}</span>
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
                  {{ t("common.cancel") }}
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
                  {{ t("settings.credentials.actions.saveCredential") }}
                </button>
              </div>
            </div>

            <div v-if="loadingCredentials" class="loading-inline">
              <i class="pi pi-spin pi-spinner" />
              <span>{{ t("settings.credentials.loading") }}</span>
            </div>

            <div v-else-if="credentials.length === 0 && !showAddCredentialForm" class="empty-state">
              <i class="pi pi-key" />
              <p>{{ t("settings.credentials.empty.title") }}</p>
              <span class="empty-hint">{{ t("settings.credentials.empty.description") }}</span>
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
                    <span v-if="cred.is_default" class="credential-badge default">{{ t("settings.value.default") }}</span>
                  </div>
                </div>
                <div v-if="canDeleteRegistries" class="credential-actions">
                  <button
                    class="btn btn-icon btn-danger-ghost"
                    :disabled="deletingCredentialId === cred.id"
                    :title="t('settings.credentials.actions.deleteCredential')"
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
                <h3>{{ t("settings.credentials.delete.title") }}</h3>
                <i18n-t keypath="settings.credentials.delete.message" tag="p">
                  <strong>{{ credentialToDelete?.name }}</strong>
                </i18n-t>
                <div class="confirm-actions">
                  <button class="btn btn-secondary" @click="cancelDeleteCredential">{{ t("common.cancel") }}</button>
                  <button class="btn btn-danger" :disabled="deletingCredentialId !== null" @click="deleteCredential">
                    <i v-if="deletingCredentialId" class="pi pi-spin pi-spinner" />
                    {{ t("settings.credentials.actions.delete") }}
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
import { useI18n } from "vue-i18n";
import { settingsApi, healthApi, templatesApi, credentialsApi } from "@/services/api";
import type { DomainSettings } from "@/services/api";
import type { RegistryCredential } from "@/types";
import { useNotificationsStore } from "@/stores/notifications";
import { useAuthStore } from "@/stores/auth";
import SecurityHealthCard from "@/components/SecurityHealthCard.vue";

declare const __APP_VERSION__: string;

const authStore = useAuthStore();
const canWriteSettings = authStore.hasPermission("settings:write");
const canWriteRegistries = authStore.hasPermission("registries:write");
const canDeleteRegistries = authStore.hasPermission("registries:delete");
const notifications = useNotificationsStore();
const { t } = useI18n();
const loading = ref(false);
const savingDomain = ref(false);
const savingInfrastructure = ref(false);
const refreshingTemplates = ref(false);
const agentVersion = ref("unknown");
const activeTab = ref("general");
const configCollapsed = ref(true);

const tabs = computed(() => [
  { id: "general", label: t("settings.tabs.general"), icon: "pi pi-home" },
  { id: "domain", label: t("settings.tabs.domain"), icon: "pi pi-globe" },
  { id: "infrastructure", label: t("settings.tabs.infrastructure"), icon: "pi pi-server" },
  { id: "security", label: t("settings.tabs.security"), icon: "pi pi-shield" },
  { id: "healthchecks", label: t("settings.tabs.healthChecks"), icon: "pi pi-heart" },
  { id: "credentials", label: t("settings.tabs.credentials"), icon: "pi pi-key" },
]);

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
    notifications.success(
      t("settings.credentials.notifications.deletedTitle"),
      t("settings.credentials.notifications.deletedDesc"),
    );
    showDeleteConfirm.value = false;
    credentialToDelete.value = null;
  } catch (error) {
    console.error("Failed to delete credential:", error);
    notifications.error(
      t("settings.credentials.notifications.deleteFailedTitle"),
      t("settings.credentials.notifications.deleteFailedDesc"),
    );
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
    notifications.error(
      t("settings.credentials.notifications.missingFieldsTitle"),
      t("settings.credentials.notifications.missingFieldsDesc"),
    );
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
    notifications.success(t("settings.credentials.notifications.savedTitle"), t("settings.credentials.notifications.savedDesc"));
    resetNewCredentialForm();
    showAddCredentialForm.value = false;
    await fetchCredentials();
  } catch (error) {
    console.error("Failed to create credential:", error);
    notifications.error(
      t("settings.credentials.notifications.saveFailedTitle"),
      t("settings.credentials.notifications.saveFailedDesc"),
    );
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
    notifications.error(t("common.error"), t("settings.notifications.loadFailed"));
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
    notifications.success(t("settings.notifications.savedTitle"), t("settings.notifications.domainSaved"));
  } catch (e: any) {
    notifications.error(t("common.error"), t("settings.notifications.domainSaveFailed"));
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
    notifications.success(t("settings.notifications.savedTitle"), t("settings.notifications.infrastructureSaved"));
  } catch (e: any) {
    notifications.error(t("common.error"), t("settings.notifications.infrastructureSaveFailed"));
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
      notifications.error(t("settings.security.notifications.updateWarningTitle"), data.nginx_error);
    } else if (data.nginx_action) {
      const action = data.nginx_action;
      if (action.errors && action.errors.length > 0) {
        notifications.error(t("settings.security.notifications.updateWarningTitle"), action.errors.join(", "));
      } else if (action.container_recreated) {
        notifications.success(t("settings.notifications.savedTitle"), t("settings.security.notifications.savedRecreated"));
      } else if (action.nginx_reloaded) {
        notifications.success(t("settings.notifications.savedTitle"), t("settings.security.notifications.savedReloaded"));
      } else {
        notifications.success(t("settings.notifications.savedTitle"), t("settings.security.notifications.saved"));
      }
    } else {
      notifications.success(t("settings.notifications.savedTitle"), t("settings.security.notifications.saved"));
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
    const errorMsg = e.response?.data?.error || t("settings.security.notifications.saveFailed");
    const details = e.response?.data?.details || "";
    notifications.error(t("common.error"), details ? `${errorMsg}: ${details}` : errorMsg);
  } finally {
    savingSecurity.value = false;
  }
};

const testConnection = async () => {
  try {
    await healthApi.check();
    notifications.success(
      t("settings.general.quickActions.connectionOkTitle"),
      t("settings.general.quickActions.connectionOkDesc"),
    );
  } catch {
    notifications.error(
      t("settings.general.quickActions.connectionFailedTitle"),
      t("settings.general.quickActions.connectionFailedDesc"),
    );
  }
};

const refreshData = () => {
  notifications.info(t("settings.general.quickActions.refreshingTitle"), t("settings.general.quickActions.refreshingDesc"));
  window.location.reload();
};

const clearCache = () => {
  localStorage.clear();
  notifications.success(
    t("settings.general.quickActions.cacheClearedTitle"),
    t("settings.general.quickActions.cacheClearedDesc"),
  );
};

const refreshTemplates = async () => {
  refreshingTemplates.value = true;
  try {
    const response = await templatesApi.refresh();
    notifications.success(
      t("settings.general.quickActions.templatesRefreshedTitle"),
      t("settings.general.quickActions.templatesRefreshedDesc", { n: response.data.count }),
    );
  } catch {
    notifications.error(t("common.error"), t("settings.general.quickActions.templatesRefreshFailed"));
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
