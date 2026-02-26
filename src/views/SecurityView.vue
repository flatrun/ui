<template>
  <div class="security-view">
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
      <button class="btn btn-icon" :disabled="loading" @click="refreshData">
        <i class="pi pi-refresh" :class="{ 'pi-spin': loading }" />
      </button>
    </div>

    <div v-if="loading && !events.length" class="loading-state">
      <i class="pi pi-spin pi-spinner" />
      <span>{{ t("security.loading") }}</span>
    </div>

    <div v-else class="security-content">
      <!-- Dashboard/Stats Tab -->
      <div v-show="activeTab === 'stats'" class="tab-content dashboard-tab">
        <!-- Overview Stats -->
        <div class="dashboard-stats-grid">
          <div class="dashboard-stat-card">
            <div class="stat-icon total">
              <i class="pi pi-shield" />
            </div>
            <div class="stat-content">
              <span class="stat-value">{{ stats?.total_events || 0 }}</span>
              <span class="stat-label">{{ t("security.stats.totalEvents") }}</span>
            </div>
          </div>
          <div class="dashboard-stat-card">
            <div class="stat-icon day">
              <i class="pi pi-clock" />
            </div>
            <div class="stat-content">
              <span class="stat-value">{{ stats?.last_24_hours || 0 }}</span>
              <span class="stat-label">{{ t("security.stats.last24h") }}</span>
            </div>
          </div>
          <div class="dashboard-stat-card">
            <div class="stat-icon week">
              <i class="pi pi-calendar" />
            </div>
            <div class="stat-content">
              <span class="stat-value">{{ stats?.last_7_days || 0 }}</span>
              <span class="stat-label">{{ t("security.stats.last7d") }}</span>
            </div>
          </div>
          <div class="dashboard-stat-card">
            <div class="stat-icon blocked">
              <i class="pi pi-ban" />
            </div>
            <div class="stat-content">
              <span class="stat-value">{{ stats?.blocked_ips_count || 0 }}</span>
              <span class="stat-label">{{ t("security.stats.blockedIps") }}</span>
            </div>
          </div>
          <div class="dashboard-stat-card">
            <div class="stat-icon routes">
              <i class="pi pi-lock" />
            </div>
            <div class="stat-content">
              <span class="stat-value">{{ stats?.protected_routes_count || 0 }}</span>
              <span class="stat-label">{{ t("security.stats.protectedRoutes") }}</span>
            </div>
          </div>
        </div>

        <!-- Severity Breakdown & Trend -->
        <div class="dashboard-row">
          <div class="dashboard-card severity-card">
            <h3>{{ t("security.severity.title") }}</h3>
            <div class="severity-bars">
              <div class="severity-bar-item">
                <div class="severity-bar-label">
                  <span class="severity-dot critical" />
                  <span>{{ t("security.severity.critical") }}</span>
                </div>
                <div class="severity-bar-track">
                  <div class="severity-bar-fill critical" :style="{ width: getSeverityPercentage('critical') + '%' }" />
                </div>
                <span class="severity-bar-value">{{ stats?.by_severity?.critical || 0 }}</span>
              </div>
              <div class="severity-bar-item">
                <div class="severity-bar-label">
                  <span class="severity-dot high" />
                  <span>{{ t("security.severity.high") }}</span>
                </div>
                <div class="severity-bar-track">
                  <div class="severity-bar-fill high" :style="{ width: getSeverityPercentage('high') + '%' }" />
                </div>
                <span class="severity-bar-value">{{ stats?.by_severity?.high || 0 }}</span>
              </div>
              <div class="severity-bar-item">
                <div class="severity-bar-label">
                  <span class="severity-dot medium" />
                  <span>{{ t("security.severity.medium") }}</span>
                </div>
                <div class="severity-bar-track">
                  <div class="severity-bar-fill medium" :style="{ width: getSeverityPercentage('medium') + '%' }" />
                </div>
                <span class="severity-bar-value">{{ stats?.by_severity?.medium || 0 }}</span>
              </div>
              <div class="severity-bar-item">
                <div class="severity-bar-label">
                  <span class="severity-dot low" />
                  <span>{{ t("security.severity.low") }}</span>
                </div>
                <div class="severity-bar-track">
                  <div class="severity-bar-fill low" :style="{ width: getSeverityPercentage('low') + '%' }" />
                </div>
                <span class="severity-bar-value">{{ stats?.by_severity?.low || 0 }}</span>
              </div>
            </div>
          </div>

          <div class="dashboard-card trend-card">
            <h3>{{ t("security.trend.title") }}</h3>
            <div v-if="stats?.events_trend?.length" class="trend-chart">
              <div class="trend-bars">
                <div
                  v-for="point in stats.events_trend"
                  :key="point.date"
                  class="trend-bar-container"
                  :title="`${point.date}: ${point.count} events`"
                >
                  <div class="trend-bar" :style="{ height: getTrendBarHeight(point.count) + '%' }" />
                  <span class="trend-bar-label">{{ formatTrendDate(point.date) }}</span>
                </div>
              </div>
            </div>
            <div v-else class="no-data">
              <i class="pi pi-chart-line" />
              <span>{{ t("security.trend.noData") }}</span>
            </div>
          </div>
        </div>

        <!-- Top Deployments & Top IPs -->
        <div class="dashboard-row">
          <div class="dashboard-card">
            <h3>{{ t("security.topDeployments.title") }}</h3>
            <div v-if="stats?.top_deployments?.length" class="top-list">
              <div v-for="(dep, index) in stats.top_deployments" :key="dep.name" class="top-list-item">
                <span class="top-rank">{{ index + 1 }}</span>
                <div class="top-info">
                  <span class="top-name">{{ dep.name }}</span>
                  <div class="top-meta">
                    <span v-if="dep.critical" class="top-badge critical"
                      >{{ dep.critical }} {{ t("security.topDeployments.critical") }}</span
                    >
                    <span v-if="dep.high" class="top-badge high"
                      >{{ dep.high }} {{ t("security.topDeployments.high") }}</span
                    >
                  </div>
                </div>
                <span class="top-count">{{ dep.event_count }}</span>
              </div>
            </div>
            <div v-else class="no-data">
              <i class="pi pi-server" />
              <span>{{ t("security.topDeployments.noData") }}</span>
            </div>
          </div>

          <div class="dashboard-card">
            <h3>{{ t("security.topIps.title") }}</h3>
            <div v-if="stats?.top_offending_ips?.length" class="top-list">
              <div v-for="(ip, index) in stats.top_offending_ips" :key="ip.ip" class="top-list-item">
                <span class="top-rank">{{ index + 1 }}</span>
                <div class="top-info">
                  <code class="top-ip">{{ ip.ip }}</code>
                  <span class="top-meta-text">{{ t("security.topIps.lastSeen") }} {{ formatTime(ip.last_seen) }}</span>
                </div>
                <div class="top-actions">
                  <span class="top-count">{{ ip.event_count }}</span>
                  <button
                    v-if="canWrite"
                    class="btn btn-icon btn-sm"
                    :title="t('security.actions.blockIp')"
                    @click="showBlockIPDialog(ip.ip)"
                  >
                    <i class="pi pi-ban" />
                  </button>
                </div>
              </div>
            </div>
            <div v-else class="no-data">
              <i class="pi pi-users" />
              <span>{{ t("security.topIps.noData") }}</span>
            </div>
          </div>
        </div>

        <!-- Recent Critical Events -->
        <div class="dashboard-card full-width">
          <h3>{{ t("security.recentEvents.title") }}</h3>
          <div v-if="stats?.recent_critical?.length" class="critical-events-list">
            <div v-for="event in stats.recent_critical" :key="event.id" class="critical-event-item">
              <div class="critical-event-time">{{ formatTime(event.created_at) }}</div>
              <span class="severity-badge critical">{{ event.severity }}</span>
              <span class="critical-event-type">{{ formatEventType(event.event_type) }}</span>
              <code class="critical-event-ip">{{ event.source_ip }}</code>
              <span class="critical-event-path">{{ event.request_path || "-" }}</span>
              <button
                v-if="canWrite"
                class="btn btn-icon btn-sm"
                :title="t('security.actions.blockIp')"
                @click="showBlockIPDialog(event.source_ip)"
              >
                <i class="pi pi-ban" />
              </button>
            </div>
          </div>
          <div v-else class="no-data">
            <i class="pi pi-check-circle" />
            <span>{{ t("security.recentEvents.noData") }}</span>
          </div>
        </div>
      </div>

      <!-- Traffic Tab -->
      <div v-show="activeTab === 'traffic'" class="tab-content">
        <TrafficDashboard :auto-fetch="true" />
      </div>

      <!-- Events Tab -->
      <div v-show="activeTab === 'events'" class="tab-content">
        <div class="stats-row">
          <div class="stat-card">
            <span class="stat-value">{{ stats?.total_events || 0 }}</span>
            <span class="stat-label">{{ t("security.stats.totalEvents") }}</span>
          </div>
          <div class="stat-card">
            <span class="stat-value">{{ stats?.last_24_hours || 0 }}</span>
            <span class="stat-label">{{ t("security.stats.last24h") }}</span>
          </div>
          <div class="stat-card" :class="{ warning: (stats?.by_severity?.critical || 0) > 0 }">
            <span class="stat-value">{{ stats?.by_severity?.critical || 0 }}</span>
            <span class="stat-label">{{ t("security.severity.critical") }}</span>
          </div>
          <div class="stat-card" :class="{ warning: (stats?.by_severity?.high || 0) > 0 }">
            <span class="stat-value">{{ stats?.by_severity?.high || 0 }}</span>
            <span class="stat-label">{{ t("security.severity.high") }}</span>
          </div>
        </div>

        <div class="filters-row">
          <select v-model="filters.severity" class="filter-select" @change="fetchEvents">
            <option value="">{{ t("security.events.filters.allSeverities") }}</option>
            <option value="critical">{{ t("security.severity.critical") }}</option>
            <option value="high">{{ t("security.severity.high") }}</option>
            <option value="medium">{{ t("security.severity.medium") }}</option>
            <option value="low">{{ t("security.severity.low") }}</option>
          </select>
          <select v-model="filters.event_type" class="filter-select" @change="fetchEvents">
            <option value="">{{ t("security.events.filters.allTypes") }}</option>
            <option value="unauthorized_access">{{ t("security.events.types.unauthorized_access") }}</option>
            <option value="forbidden_access">{{ t("security.events.types.forbidden_access") }}</option>
            <option value="not_found_probe">{{ t("security.events.types.not_found_probe") }}</option>
            <option value="server_error">{{ t("security.events.types.server_error") }}</option>
            <option value="rate_limit_exceeded">{{ t("security.events.types.rate_limit_exceeded") }}</option>
            <option value="suspicious_path">{{ t("security.events.types.suspicious_path") }}</option>
            <option value="scanner_detected">{{ t("security.events.types.scanner_detected") }}</option>
          </select>
          <input
            v-model="filters.source_ip"
            type="text"
            :placeholder="t('security.events.filters.filterByIp')"
            class="filter-input"
            @keyup.enter="fetchEvents"
          />
          <button class="btn btn-secondary btn-sm" @click="clearFilters">
            {{ t("security.events.filters.clear") }}
          </button>
        </div>

        <div class="events-table-container">
          <table v-if="events.length > 0" class="events-table">
            <thead>
              <tr>
                <th>{{ t("security.events.table.time") }}</th>
                <th>{{ t("security.events.table.severity") }}</th>
                <th>{{ t("security.events.table.type") }}</th>
                <th>{{ t("security.events.table.sourceIp") }}</th>
                <th>{{ t("security.events.table.path") }}</th>
                <th>{{ t("security.events.table.status") }}</th>
                <th />
              </tr>
            </thead>
            <tbody>
              <tr v-for="event in events" :key="event.id">
                <td class="time-cell">{{ formatTime(event.created_at) }}</td>
                <td>
                  <span class="severity-badge" :class="event.severity">
                    {{ event.severity }}
                  </span>
                </td>
                <td>{{ formatEventType(event.event_type) }}</td>
                <td class="ip-cell">
                  <code>{{ event.source_ip }}</code>
                </td>
                <td class="path-cell" :title="event.request_path">
                  {{ event.request_path || "-" }}
                </td>
                <td>{{ event.status_code || "-" }}</td>
                <td class="actions-cell">
                  <button
                    v-if="canWrite"
                    class="btn btn-icon btn-sm"
                    :title="t('security.actions.blockIp')"
                    @click="showBlockIPDialog(event.source_ip)"
                  >
                    <i class="pi pi-ban" />
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
          <div v-else class="empty-state">
            <i class="pi pi-shield" />
            <p>{{ t("security.events.empty.title") }}</p>
            <span class="empty-hint">{{ t("security.events.empty.hint") }}</span>
          </div>
        </div>

        <div v-if="eventsTotal > filters.limit" class="pagination">
          <button class="btn btn-secondary btn-sm" :disabled="filters.offset === 0" @click="prevPage">
            {{ t("security.events.pagination.previous") }}
          </button>
          <span class="pagination-info">
            {{ filters.offset + 1 }}-{{ Math.min(filters.offset + filters.limit, eventsTotal) }} of {{ eventsTotal }}
          </span>
          <button
            class="btn btn-secondary btn-sm"
            :disabled="filters.offset + filters.limit >= eventsTotal"
            @click="nextPage"
          >
            {{ t("security.events.pagination.next") }}
          </button>
        </div>
      </div>

      <!-- Blocked IPs Tab -->
      <div v-show="activeTab === 'blocked'" class="tab-content">
        <div class="section-header">
          <h3>{{ t("security.blocked.title") }}</h3>
          <button v-if="canWrite" class="btn btn-primary btn-sm" @click="showAddBlockDialog = true">
            <i class="pi pi-plus" />
            {{ t("security.blocked.blockIp") }}
          </button>
        </div>

        <div class="blocked-list">
          <div v-if="blockedIPs.length === 0" class="empty-state">
            <i class="pi pi-ban" />
            <p>{{ t("security.blocked.empty.title") }}</p>
            <span class="empty-hint">{{ t("security.blocked.empty.hint") }}</span>
          </div>
          <div v-else class="blocked-items">
            <div v-for="ip in blockedIPs" :key="ip.id" class="blocked-item">
              <div class="blocked-info">
                <code class="blocked-ip">{{ ip.ip }}</code>
                <span v-if="ip.reason" class="blocked-reason">{{ ip.reason }}</span>
                <div class="blocked-meta">
                  <span v-if="ip.auto_blocked" class="badge auto">{{ t("security.blocked.auto") }}</span>
                  <span class="blocked-time">{{ t("security.blocked.blocked") }} {{ formatTime(ip.blocked_at) }}</span>
                  <span v-if="ip.expires_at" class="blocked-expires">
                    {{ t("security.blocked.expires") }} {{ formatTime(ip.expires_at) }}
                  </span>
                </div>
              </div>
              <button
                v-if="canWrite"
                class="btn btn-danger-ghost btn-sm"
                :disabled="unblockingIP === ip.ip"
                @click="handleUnblockIP(ip.ip)"
              >
                <i v-if="unblockingIP === ip.ip" class="pi pi-spin pi-spinner" />
                <i v-else class="pi pi-times" />
                {{ t("security.blocked.unblock") }}
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Protected Routes Tab -->
      <div v-show="activeTab === 'routes'" class="tab-content">
        <div class="section-header">
          <h3>{{ t("security.routes.title") }}</h3>
          <button v-if="canWrite" class="btn btn-primary btn-sm" @click="showAddRouteDialog = true">
            <i class="pi pi-plus" />
            {{ t("security.routes.addRoute") }}
          </button>
        </div>

        <div class="routes-list">
          <div v-if="protectedRoutes.length === 0" class="empty-state">
            <i class="pi pi-lock" />
            <p>{{ t("security.routes.empty.title") }}</p>
            <span class="empty-hint">{{ t("security.routes.empty.hint") }}</span>
          </div>
          <div v-else class="routes-items">
            <div v-for="route in protectedRoutes" :key="route.id" class="route-item">
              <div class="route-info">
                <code class="route-pattern">{{ route.path_pattern }}</code>
                <div class="route-config">
                  <span class="route-rate">{{ route.rate_limit }} {{ t("security.routes.rateLimit") }}</span>
                  <span class="route-block"
                    >{{ t("security.routes.blockDuration") }} {{ route.block_duration
                    }}{{ t("security.routes.seconds") }}</span
                  >
                </div>
              </div>
              <div class="route-actions">
                <label v-if="canWrite" class="toggle-switch small">
                  <input type="checkbox" :checked="route.enabled" @change="toggleRoute(route)" />
                  <span class="toggle-slider" />
                </label>
                <button
                  v-if="canWrite"
                  class="btn btn-icon btn-sm"
                  :title="t('security.actions.edit')"
                  @click="editRoute(route)"
                >
                  <i class="pi pi-pencil" />
                </button>
                <button
                  v-if="canWrite"
                  class="btn btn-icon btn-danger-ghost btn-sm"
                  :title="t('security.actions.delete')"
                  @click="confirmDeleteRoute(route)"
                >
                  <i class="pi pi-trash" />
                </button>
              </div>
            </div>
          </div>
        </div>

        <div v-if="canWrite" class="presets-section">
          <h4>{{ t("security.routes.presets.title") }}</h4>
          <div class="presets-row">
            <button class="preset-btn" @click="addPreset('wp-login')">
              <i class="pi pi-lock" />
              {{ t("security.routes.presets.wpLogin") }}
            </button>
            <button class="preset-btn" @click="addPreset('admin')">
              <i class="pi pi-cog" />
              {{ t("security.routes.presets.admin") }}
            </button>
            <button class="preset-btn" @click="addPreset('api')">
              <i class="pi pi-code" />
              {{ t("security.routes.presets.api") }}
            </button>
          </div>
        </div>
      </div>

      <!-- Health Tab -->
      <div v-show="activeTab === 'health'" class="tab-content">
        <div class="health-actions">
          <button
            v-if="canWrite"
            class="btn btn-secondary"
            :disabled="refreshingScripts"
            @click="refreshSecurityScripts"
          >
            <i class="pi pi-sync" :class="{ 'pi-spin': refreshingScripts }" />
            {{ refreshingScripts ? t("security.health.regenerating") : t("security.health.regenerateScripts") }}
          </button>
          <span class="health-actions-hint"> {{ t("security.health.scriptsHint") }} </span>
        </div>
        <SecurityHealthCard :auto-fetch="true" />
      </div>

      <!-- Settings Tab -->
      <div v-show="activeTab === 'settings'" class="tab-content">
        <div class="settings-section">
          <h3>{{ t("security.settings.title") }}</h3>

          <div class="settings-card">
            <div class="setting-item">
              <div class="setting-info">
                <h4>{{ t("security.settings.realtimeCapture.title") }}</h4>
                <p>
                  {{ t("security.settings.realtimeCapture.description") }}
                </p>
                <div class="setting-requirements">
                  <span class="requirement-label">{{ t("security.settings.realtimeCapture.requires") }}</span>
                  <span class="requirement-value">{{ t("security.settings.realtimeCapture.openresty") }}</span>
                </div>
              </div>
              <div class="setting-control">
                <label class="toggle-switch" :class="{ disabled: togglingRealtimeCapture || !canWrite }">
                  <input
                    type="checkbox"
                    :checked="realtimeCapture"
                    :disabled="togglingRealtimeCapture || !canWrite"
                    @change="toggleRealtimeCapture"
                  />
                  <span class="toggle-slider" />
                </label>
                <span v-if="togglingRealtimeCapture" class="toggle-status">
                  <i class="pi pi-spin pi-spinner" />
                </span>
                <span v-else class="toggle-status" :class="{ active: realtimeCapture }">
                  {{
                    realtimeCapture
                      ? t("security.settings.realtimeCapture.enabled")
                      : t("security.settings.realtimeCapture.disabled")
                  }}
                </span>
              </div>
            </div>

            <div v-if="realtimeCapture" class="setting-note info">
              <i class="pi pi-info-circle" />
              <span>
                {{ t("security.settings.realtimeCapture.activeNote") }}
              </span>
            </div>

            <div v-if="!realtimeCapture" class="setting-note warning">
              <i class="pi pi-exclamation-triangle" />
              <span>
                {{ t("security.settings.realtimeCapture.disabledNote") }}
              </span>
            </div>
          </div>

          <div class="settings-card">
            <div class="setting-item">
              <div class="setting-info">
                <h4>{{ t("security.settings.moduleStatus.title") }}</h4>
                <p>{{ t("security.settings.moduleStatus.description") }}</p>
              </div>
              <div class="setting-control">
                <span class="status-badge" :class="{ active: securityEnabled }">
                  {{
                    securityEnabled
                      ? t("security.settings.moduleStatus.active")
                      : t("security.settings.moduleStatus.inactive")
                  }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Block IP Dialog -->
    <Teleport to="body">
      <div v-if="showAddBlockDialog" class="modal-overlay" @click.self="showAddBlockDialog = false">
        <div class="modal-dialog">
          <div class="modal-header">
            <h3>{{ t("security.modals.blockIp.title") }}</h3>
            <button class="btn btn-icon" @click="showAddBlockDialog = false">
              <i class="pi pi-times" />
            </button>
          </div>
          <div class="modal-body">
            <div class="form-group">
              <label class="form-label">{{ t("security.modals.blockIp.ipAddress") }}</label>
              <input
                v-model="blockForm.ip"
                type="text"
                class="form-input"
                :placeholder="t('security.modals.blockIp.ipPlaceholder')"
              />
            </div>
            <div class="form-group">
              <label class="form-label">{{ t("security.modals.blockIp.reason") }}</label>
              <input
                v-model="blockForm.reason"
                type="text"
                class="form-input"
                :placeholder="t('security.modals.blockIp.reasonPlaceholder')"
              />
            </div>
            <div class="form-group">
              <label class="form-label">{{ t("security.modals.blockIp.duration") }}</label>
              <input v-model.number="blockForm.duration" type="number" class="form-input" placeholder="0" />
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" @click="showAddBlockDialog = false">
              {{ t("security.modals.blockIp.cancel") }}
            </button>
            <button class="btn btn-primary" :disabled="!blockForm.ip || blockingIP" @click="handleBlockIP">
              <i v-if="blockingIP" class="pi pi-spin pi-spinner" />
              {{ t("security.modals.blockIp.block") }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Add/Edit Route Dialog -->
    <Teleport to="body">
      <div v-if="showAddRouteDialog || showEditRouteDialog" class="modal-overlay" @click.self="closeRouteDialog">
        <div class="modal-dialog">
          <div class="modal-header">
            <h3>
              {{ showEditRouteDialog ? t("security.modals.route.editTitle") : t("security.modals.route.addTitle") }}
            </h3>
            <button class="btn btn-icon" @click="closeRouteDialog">
              <i class="pi pi-times" />
            </button>
          </div>
          <div class="modal-body">
            <div class="form-group">
              <label class="form-label">{{ t("security.modals.route.pathPattern") }}</label>
              <input
                v-model="routeForm.path_pattern"
                type="text"
                class="form-input"
                :placeholder="t('security.modals.route.pathPlaceholder')"
              />
              <span class="form-hint">{{ t("security.modals.route.pathHint") }}</span>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label class="form-label">{{ t("security.modals.route.rateLimit") }}</label>
                <input v-model.number="routeForm.rate_limit" type="number" class="form-input" placeholder="10" />
              </div>
              <div class="form-group">
                <label class="form-label">{{ t("security.modals.route.blockDuration") }}</label>
                <input v-model.number="routeForm.block_duration" type="number" class="form-input" placeholder="3600" />
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" @click="closeRouteDialog">{{ t("security.modals.route.cancel") }}</button>
            <button class="btn btn-primary" :disabled="!routeForm.path_pattern || savingRoute" @click="saveRoute">
              <i v-if="savingRoute" class="pi pi-spin pi-spinner" />
              {{ showEditRouteDialog ? t("security.modals.route.update") : t("security.modals.route.add") }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Delete Route Confirmation -->
    <Teleport to="body">
      <div v-if="showDeleteRouteDialog" class="modal-overlay" @click.self="showDeleteRouteDialog = false">
        <div class="confirm-modal">
          <div class="confirm-icon danger">
            <i class="pi pi-exclamation-triangle" />
          </div>
          <h3>{{ t("security.modals.deleteRoute.title") }}</h3>
          <p>
            {{ t("security.modals.deleteRoute.confirm") }} <strong>{{ routeToDelete?.path_pattern }}</strong
            >?
          </p>
          <div class="confirm-actions">
            <button class="btn btn-secondary" @click="showDeleteRouteDialog = false">
              {{ t("security.modals.deleteRoute.cancel") }}
            </button>
            <button class="btn btn-danger" :disabled="deletingRoute" @click="deleteRoute">
              <i v-if="deletingRoute" class="pi pi-spin pi-spinner" />
              {{ t("security.modals.deleteRoute.delete") }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, computed } from "vue";
import { storeToRefs } from "pinia";
import { useI18n } from "vue-i18n";
import { useSecurityStore } from "@/stores/security";
import { useNotificationsStore } from "@/stores/notifications";
import { useAuthStore } from "@/stores/auth";
import type { ProtectedRoute } from "@/types";
import SecurityHealthCard from "@/components/SecurityHealthCard.vue";
import TrafficDashboard from "@/components/TrafficDashboard.vue";

const securityStore = useSecurityStore();
const notifications = useNotificationsStore();
const authStore = useAuthStore();
const canWrite = authStore.hasPermission("security:write");

const loading = ref(false);
const activeTab = ref("stats");

const { t, te, locale } = useI18n();

const tabs = computed(() => [
  { id: "stats", label: t("security.tabs.overview"), icon: "pi pi-chart-bar" },
  { id: "traffic", label: t("security.tabs.traffic"), icon: "pi pi-chart-line" },
  { id: "events", label: t("security.tabs.events"), icon: "pi pi-list" },
  { id: "blocked", label: t("security.tabs.blocked"), icon: "pi pi-ban" },
  { id: "routes", label: t("security.tabs.routes"), icon: "pi pi-lock" },
  { id: "health", label: t("security.tabs.health"), icon: "pi pi-heart" },
  { id: "settings", label: t("security.tabs.settings"), icon: "pi pi-cog" },
]);

const { stats, events, eventsTotal, blockedIPs, protectedRoutes, securityEnabled, realtimeCapture } =
  storeToRefs(securityStore);
const togglingRealtimeCapture = ref(false);
const refreshingScripts = ref(false);

const filters = reactive({
  severity: "",
  event_type: "",
  source_ip: "",
  limit: 25,
  offset: 0,
});

const showAddBlockDialog = ref(false);
const blockForm = reactive({ ip: "", reason: "", duration: 0 });
const blockingIP = ref(false);
const unblockingIP = ref<string | null>(null);

const showAddRouteDialog = ref(false);
const showEditRouteDialog = ref(false);
const showDeleteRouteDialog = ref(false);
const routeForm = reactive({ id: 0, path_pattern: "", rate_limit: 10, block_duration: 3600 });
const routeToDelete = ref<ProtectedRoute | null>(null);
const savingRoute = ref(false);
const deletingRoute = ref(false);

const fetchStats = async () => {
  await securityStore.fetchStats();
};

const fetchEvents = async () => {
  loading.value = true;
  await securityStore.fetchEvents({
    severity: filters.severity || undefined,
    event_type: filters.event_type || undefined,
    source_ip: filters.source_ip || undefined,
    limit: filters.limit,
    offset: filters.offset,
  });
  loading.value = false;
};

const fetchBlockedIPs = async () => {
  await securityStore.fetchBlockedIPs();
};

const fetchProtectedRoutes = async () => {
  await securityStore.fetchProtectedRoutes();
};

const fetchRealtimeCaptureStatus = async () => {
  await securityStore.fetchRealtimeCaptureStatus();
};

const refreshData = async () => {
  loading.value = true;
  await Promise.all([
    fetchStats(),
    fetchEvents(),
    fetchBlockedIPs(),
    fetchProtectedRoutes(),
    fetchRealtimeCaptureStatus(),
  ]);
  loading.value = false;
  notifications.success(t("security.notifications.refreshed"), t("security.notifications.dataUpdated"));
};

const toggleRealtimeCapture = async () => {
  togglingRealtimeCapture.value = true;
  try {
    const newValue = !realtimeCapture.value;
    await securityStore.setRealtimeCapture(newValue);
    realtimeCapture.value = securityStore.realtimeCapture;
    notifications.success(
      newValue ? t("security.notifications.realtimeEnabled") : t("security.notifications.realtimeDisabled"),
      newValue ? t("security.notifications.realtimeEnabledDesc") : t("security.notifications.realtimeDisabledDesc"),
    );
  } catch (e: any) {
    const errorData = e.response?.data;
    const errorMsg = errorData?.error || "Failed to toggle realtime capture";
    const details = errorData?.details;

    if (typeof errorData?.realtime_capture === "boolean") {
      realtimeCapture.value = errorData.realtime_capture;
    }

    notifications.error(t("security.notifications.failed"), details ? `${errorMsg}: ${details}` : errorMsg);
  } finally {
    togglingRealtimeCapture.value = false;
  }
};

const refreshSecurityScripts = async () => {
  refreshingScripts.value = true;
  try {
    const result = await securityStore.refreshScripts();
    const vhostCount = result.vhosts_updated?.length || 0;
    notifications.success(
      t("security.notifications.scriptsRegenerated"),
      `Agent IP: ${result.agent_ip}, ${vhostCount} vhost(s) updated`,
    );
  } catch (e: any) {
    const errorMsg = e.response?.data?.error || t("security.notifications.failed");
    notifications.error(t("security.notifications.failed"), errorMsg);
  } finally {
    refreshingScripts.value = false;
  }
};

const clearFilters = () => {
  filters.severity = "";
  filters.event_type = "";
  filters.source_ip = "";
  filters.offset = 0;
  fetchEvents();
};

const prevPage = () => {
  filters.offset = Math.max(0, filters.offset - filters.limit);
  fetchEvents();
};

const nextPage = () => {
  filters.offset += filters.limit;
  fetchEvents();
};

const formatTime = (dateString: string) => {
  if (!dateString) return t("common.na");
  const date = new Date(dateString);
  const now = new Date();
  const diff = now.getTime() - date.getTime();

  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return t("common.time.justNow");
  if (minutes < 60) return t("common.time.mAgo", { n: minutes });

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return t("common.time.hAgo", { n: hours });

  const days = Math.floor(hours / 24);
  if (days < 7) return t("common.time.dAgo", { n: days });

  return date.toLocaleDateString();
};

const formatEventType = (type: string) => {
  const translationKey = `security.events.types.${type}`;
  if (te(translationKey)) return t(translationKey);
  return type.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
};

const getSeverityPercentage = (severity: string): number => {
  if (!stats.value?.by_severity) return 0;
  const total = Object.values(stats.value.by_severity).reduce((sum, val) => sum + val, 0);
  if (total === 0) return 0;
  return Math.round(((stats.value.by_severity[severity] || 0) / total) * 100);
};

const getTrendBarHeight = (count: number): number => {
  if (!stats.value?.events_trend?.length) return 0;
  const maxCount = Math.max(...stats.value.events_trend.map((p) => p.count));
  if (maxCount === 0) return 0;
  return Math.round((count / maxCount) * 100);
};

const formatTrendDate = (dateStr: string): string => {
  const date = new Date(dateStr);
  return date.toLocaleDateString(locale.value, { weekday: "short" });
};

const showBlockIPDialog = (ip: string) => {
  blockForm.ip = ip;
  blockForm.reason = t("security.notifications.manualBlockReason");
  blockForm.duration = 0;
  showAddBlockDialog.value = true;
};

const handleBlockIP = async () => {
  if (!blockForm.ip) return;
  blockingIP.value = true;
  try {
    await securityStore.blockIP(blockForm.ip, blockForm.reason, blockForm.duration);
    notifications.success(
      t("security.notifications.ipBlocked"),
      `${blockForm.ip} ${t("security.notifications.hasBeenBlocked")}`,
    );
    showAddBlockDialog.value = false;
    blockForm.ip = "";
    blockForm.reason = "";
    blockForm.duration = 0;
  } catch (e: any) {
    notifications.error(
      t("security.notifications.failed"),
      e.response?.data?.error || t("security.notifications.blockIpFailed"),
    );
  } finally {
    blockingIP.value = false;
  }
};

const handleUnblockIP = async (ip: string) => {
  unblockingIP.value = ip;
  try {
    await securityStore.unblockIP(ip);
    notifications.success(
      t("security.notifications.ipUnblocked"),
      `${ip} ${t("security.notifications.hasBeenUnblocked")}`,
    );
  } catch (e: any) {
    notifications.error(
      t("security.notifications.failed"),
      e.response?.data?.error || t("security.notifications.unblockIpFailed"),
    );
  } finally {
    unblockingIP.value = null;
  }
};

const editRoute = (route: ProtectedRoute) => {
  routeForm.id = route.id;
  routeForm.path_pattern = route.path_pattern;
  routeForm.rate_limit = route.rate_limit;
  routeForm.block_duration = route.block_duration;
  showEditRouteDialog.value = true;
};

const closeRouteDialog = () => {
  showAddRouteDialog.value = false;
  showEditRouteDialog.value = false;
  routeForm.id = 0;
  routeForm.path_pattern = "";
  routeForm.rate_limit = 10;
  routeForm.block_duration = 3600;
};

const saveRoute = async () => {
  if (!routeForm.path_pattern) return;
  savingRoute.value = true;
  try {
    if (showEditRouteDialog.value) {
      await securityStore.updateProtectedRoute(routeForm.id, {
        path_pattern: routeForm.path_pattern,
        rate_limit: routeForm.rate_limit,
        block_duration: routeForm.block_duration,
      });
      notifications.success(t("security.notifications.routeUpdated"), t("security.notifications.routeUpdatedDesc"));
    } else {
      await securityStore.addProtectedRoute({
        path_pattern: routeForm.path_pattern,
        rate_limit: routeForm.rate_limit,
        block_duration: routeForm.block_duration,
      });
      notifications.success(t("security.notifications.routeAdded"), t("security.notifications.routeAddedDesc"));
    }
    closeRouteDialog();
  } catch (e: any) {
    notifications.error(
      t("security.notifications.failed"),
      e.response?.data?.error || t("security.notifications.saveRouteFailed"),
    );
  } finally {
    savingRoute.value = false;
  }
};

const toggleRoute = async (route: ProtectedRoute) => {
  try {
    await securityStore.updateProtectedRoute(route.id, { enabled: !route.enabled });
  } catch (e: any) {
    notifications.error(
      t("security.notifications.failed"),
      e.response?.data?.error || t("security.notifications.toggleRouteFailed"),
    );
  }
};

const confirmDeleteRoute = (route: ProtectedRoute) => {
  routeToDelete.value = route;
  showDeleteRouteDialog.value = true;
};

const deleteRoute = async () => {
  if (!routeToDelete.value) return;
  deletingRoute.value = true;
  try {
    await securityStore.deleteProtectedRoute(routeToDelete.value.id);
    notifications.success(t("security.notifications.routeDeleted"), t("security.notifications.routeDeletedDesc"));
    showDeleteRouteDialog.value = false;
    routeToDelete.value = null;
  } catch (e: any) {
    notifications.error(
      t("security.notifications.failed"),
      e.response?.data?.error || t("security.notifications.deleteRouteFailed"),
    );
  } finally {
    deletingRoute.value = false;
  }
};

const addPreset = async (preset: string) => {
  const presets: Record<string, Partial<ProtectedRoute>> = {
    "wp-login": { path_pattern: "/wp-login.php", rate_limit: 5, block_duration: 3600 },
    admin: { path_pattern: "/admin/*", rate_limit: 10, block_duration: 1800 },
    api: { path_pattern: "/api/*", rate_limit: 60, block_duration: 600 },
  };

  const presetConfig = presets[preset];
  if (!presetConfig) return;

  try {
    await securityStore.addProtectedRoute(presetConfig);
    notifications.success(
      t("security.notifications.presetAdded"),
      `${preset} ${t("security.notifications.presetAddedDesc")}`,
    );
  } catch (e: any) {
    notifications.error(
      t("security.notifications.failed"),
      e.response?.data?.error || t("security.notifications.addPresetFailed"),
    );
  }
};

onMounted(() => {
  refreshData();
});
</script>

<style scoped>
.security-view {
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

.security-content {
  display: flex;
  flex-direction: column;
}

.tab-content {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.health-actions {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  background: white;
  border-radius: var(--radius-sm);
  border: 1px solid #e5e7eb;
}

.health-actions-hint {
  font-size: 0.8125rem;
  color: #6b7280;
}

.stats-row {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1rem;
}

.stat-card {
  background: white;
  padding: 1rem;
  border-radius: var(--radius-sm);
  border: 1px solid #e5e7eb;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.stat-card.warning {
  border-color: #fca5a5;
  background: #fef2f2;
}

.stat-value {
  font-size: 1.5rem;
  font-weight: 700;
  color: #1f2937;
}

.stat-card.warning .stat-value {
  color: #dc2626;
}

.stat-label {
  font-size: 0.75rem;
  color: #6b7280;
}

.filters-row {
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.filter-select,
.filter-input {
  padding: 0.5rem 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: var(--radius-sm);
  font-size: 0.875rem;
  background: white;
}

.filter-select {
  min-width: 160px;
}

.filter-input {
  min-width: 200px;
}

.events-table-container {
  background: white;
  border-radius: var(--radius-sm);
  border: 1px solid #e5e7eb;
  overflow: hidden;
}

.events-table {
  width: 100%;
  border-collapse: collapse;
}

.events-table th {
  text-align: left;
  padding: 0.75rem 1rem;
  font-size: 0.6875rem;
  font-weight: 600;
  color: #9ca3af;
  text-transform: uppercase;
  background: #f9fafb;
  border-bottom: 1px solid #e5e7eb;
}

.events-table td {
  padding: 0.75rem 1rem;
  font-size: 0.8125rem;
  border-bottom: 1px solid #f3f4f6;
}

.events-table tbody tr:hover {
  background: #f9fafb;
}

.time-cell {
  color: #9ca3af;
  font-size: 0.75rem;
}

.ip-cell code {
  background: #f3f4f6;
  padding: 0.125rem 0.375rem;
  border-radius: var(--radius-sm);
  font-size: 0.75rem;
}

.path-cell {
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.severity-badge {
  display: inline-block;
  padding: 0.125rem 0.5rem;
  border-radius: var(--radius-sm);
  font-size: 0.6875rem;
  font-weight: 600;
  text-transform: capitalize;
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

.actions-cell {
  text-align: right;
}

.pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1rem;
}

.pagination-info {
  font-size: 0.8125rem;
  color: #6b7280;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 3rem;
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
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.section-header h3 {
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
  color: #1f2937;
}

.blocked-list,
.routes-list {
  background: white;
  border-radius: var(--radius-sm);
  border: 1px solid #e5e7eb;
}

.blocked-items,
.routes-items {
  display: flex;
  flex-direction: column;
}

.blocked-item,
.route-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  border-bottom: 1px solid #f3f4f6;
}

.blocked-item:last-child,
.route-item:last-child {
  border-bottom: none;
}

.blocked-info,
.route-info {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
}

.blocked-ip,
.route-pattern {
  font-family: "SF Mono", "Fira Code", monospace;
  font-size: 0.875rem;
  background: #f3f4f6;
  padding: 0.25rem 0.5rem;
  border-radius: var(--radius-sm);
}

.blocked-reason {
  font-size: 0.8125rem;
  color: #6b7280;
}

.blocked-meta {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  font-size: 0.75rem;
  color: #9ca3af;
}

.badge.auto {
  background: #dbeafe;
  color: #1d4ed8;
  padding: 0.125rem 0.375rem;
  border-radius: var(--radius-sm);
  font-size: 0.625rem;
  font-weight: 600;
}

.route-config {
  display: flex;
  gap: 1rem;
  font-size: 0.75rem;
  color: #6b7280;
}

.route-actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.toggle-switch {
  position: relative;
  display: inline-block;
  width: 44px;
  height: 24px;
}

.toggle-switch.small {
  width: 36px;
  height: 20px;
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
  border-radius: 24px;
}

.toggle-slider::before {
  position: absolute;
  content: "";
  height: 16px;
  width: 16px;
  left: 2px;
  bottom: 2px;
  background-color: white;
  transition: 0.3s;
  border-radius: 50%;
}

.toggle-switch.small .toggle-slider::before {
  height: 14px;
  width: 14px;
  left: 3px;
  bottom: 3px;
}

.toggle-switch input:checked + .toggle-slider {
  background-color: #3b82f6;
}

.toggle-switch input:checked + .toggle-slider::before {
  transform: translateX(20px);
}

.toggle-switch.small input:checked + .toggle-slider::before {
  transform: translateX(16px);
}

.presets-section {
  background: white;
  border-radius: var(--radius-sm);
  border: 1px solid #e5e7eb;
  padding: 1rem;
}

.presets-section h4 {
  margin: 0 0 0.75rem 0;
  font-size: 0.875rem;
  font-weight: 600;
  color: #374151;
}

.presets-row {
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.preset-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  background: #f3f4f6;
  border: 1px solid #e5e7eb;
  border-radius: var(--radius-sm);
  font-size: 0.8125rem;
  color: #374151;
  cursor: pointer;
  transition: all 0.2s;
}

.preset-btn:hover {
  background: #e5e7eb;
}

.preset-btn i {
  color: #3b82f6;
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

.btn-sm {
  padding: 0.375rem 0.75rem;
  font-size: 0.8125rem;
}

.btn-icon {
  padding: 0.5rem;
  background: transparent;
  color: #6b7280;
}

.btn-icon:hover:not(:disabled) {
  background: #f3f4f6;
  color: #374151;
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

.btn-secondary {
  background: white;
  color: #374151;
  border: 1px solid #d1d5db;
}

.btn-secondary:hover:not(:disabled) {
  background: #f9fafb;
}

.btn-secondary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-danger {
  background: #ef4444;
  color: white;
}

.btn-danger:hover:not(:disabled) {
  background: #dc2626;
}

.btn-danger-ghost {
  background: transparent;
  color: #ef4444;
  border: 1px solid transparent;
}

.btn-danger-ghost:hover:not(:disabled) {
  background: #fef2f2;
  border-color: #fecaca;
}

.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-dialog {
  background: white;
  border-radius: var(--radius-sm);
  width: 100%;
  max-width: 480px;
  max-height: 90vh;
  overflow: hidden;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 1.25rem;
  border-bottom: 1px solid #e5e7eb;
}

.modal-header h3 {
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
}

.modal-body {
  padding: 1.25rem;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  padding: 1rem 1.25rem;
  border-top: 1px solid #e5e7eb;
}

.form-group {
  margin-bottom: 1rem;
}

.form-group:last-child {
  margin-bottom: 0;
}

.form-label {
  display: block;
  font-size: 0.8125rem;
  font-weight: 600;
  color: #374151;
  margin-bottom: 0.375rem;
}

.form-input {
  width: 100%;
  padding: 0.5rem 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: var(--radius-sm);
  font-size: 0.875rem;
}

.form-input:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.form-hint {
  display: block;
  font-size: 0.75rem;
  color: #9ca3af;
  margin-top: 0.25rem;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
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
}

.confirm-modal p {
  margin: 0 0 1.5rem 0;
  color: #6b7280;
  font-size: 0.875rem;
}

.confirm-actions {
  display: flex;
  gap: 0.75rem;
  justify-content: center;
}

/* Settings Tab Styles */
.settings-section {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.settings-section h3 {
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
  color: #1f2937;
}

.settings-card {
  background: white;
  border-radius: var(--radius-sm);
  border: 1px solid #e5e7eb;
  padding: 1.25rem;
}

.setting-item {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 2rem;
}

.setting-info {
  flex: 1;
}

.setting-info h4 {
  margin: 0 0 0.5rem 0;
  font-size: 0.9375rem;
  font-weight: 600;
  color: #1f2937;
}

.setting-info p {
  margin: 0 0 0.75rem 0;
  font-size: 0.8125rem;
  color: #6b7280;
  line-height: 1.5;
}

.setting-requirements {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.75rem;
}

.requirement-label {
  color: #9ca3af;
}

.requirement-value {
  background: #f3f4f6;
  padding: 0.125rem 0.5rem;
  border-radius: var(--radius-sm);
  color: #374151;
  font-family: "SF Mono", "Fira Code", monospace;
}

.setting-control {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-shrink: 0;
}

.toggle-status {
  font-size: 0.8125rem;
  color: #9ca3af;
  min-width: 60px;
}

.toggle-status.active {
  color: #059669;
}

.toggle-switch.disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.status-badge {
  display: inline-flex;
  align-items: center;
  padding: 0.25rem 0.75rem;
  border-radius: 9999px;
  font-size: 0.75rem;
  font-weight: 600;
  background: #f3f4f6;
  color: #6b7280;
}

.status-badge.active {
  background: #d1fae5;
  color: #059669;
}

.setting-note {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  margin-top: 1rem;
  padding: 0.875rem 1rem;
  border-radius: var(--radius-sm);
  font-size: 0.8125rem;
  line-height: 1.5;
}

.setting-note i {
  flex-shrink: 0;
  margin-top: 0.125rem;
}

.setting-note.info {
  background: #eff6ff;
  color: #1e40af;
}

.setting-note.info i {
  color: #3b82f6;
}

.setting-note.warning {
  background: #fffbeb;
  color: #92400e;
}

.setting-note.warning i {
  color: #f59e0b;
}

/* Dashboard Tab Styles */
.dashboard-tab {
  gap: 1.5rem;
}

.dashboard-stats-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 1rem;
}

.dashboard-stat-card {
  background: white;
  border-radius: var(--radius-sm);
  border: 1px solid #e5e7eb;
  padding: 1.25rem;
  display: flex;
  align-items: center;
  gap: 1rem;
}

.stat-icon {
  width: 48px;
  height: 48px;
  border-radius: var(--radius-sm);
  display: flex;
  align-items: center;
  justify-content: center;
}

.stat-icon i {
  font-size: 1.25rem;
}

.stat-icon.total {
  background: #eff6ff;
  color: #3b82f6;
}

.stat-icon.day {
  background: #f0fdf4;
  color: #22c55e;
}

.stat-icon.week {
  background: #faf5ff;
  color: #a855f7;
}

.stat-icon.blocked {
  background: #fef2f2;
  color: #ef4444;
}

.stat-icon.routes {
  background: #fffbeb;
  color: #f59e0b;
}

.stat-content {
  display: flex;
  flex-direction: column;
}

.dashboard-stat-card .stat-value {
  font-size: 1.5rem;
  font-weight: 700;
  color: #1f2937;
  line-height: 1.2;
}

.dashboard-stat-card .stat-label {
  font-size: 0.75rem;
  color: #6b7280;
  margin-top: 0.25rem;
}

.dashboard-row {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1.25rem;
}

.dashboard-card {
  background: white;
  border-radius: var(--radius-sm);
  border: 1px solid #e5e7eb;
  padding: 1.25rem;
}

.dashboard-card.full-width {
  grid-column: 1 / -1;
}

.dashboard-card h3 {
  margin: 0 0 1rem 0;
  font-size: 0.9375rem;
  font-weight: 600;
  color: #1f2937;
}

.severity-bars {
  display: flex;
  flex-direction: column;
  gap: 0.875rem;
}

.severity-bar-item {
  display: grid;
  grid-template-columns: 100px 1fr 50px;
  align-items: center;
  gap: 0.75rem;
}

.severity-bar-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.8125rem;
  color: #374151;
}

.severity-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.severity-dot.critical {
  background: #dc2626;
}

.severity-dot.high {
  background: #ea580c;
}

.severity-dot.medium {
  background: #d97706;
}

.severity-dot.low {
  background: #9ca3af;
}

.severity-bar-track {
  height: 8px;
  background: #f3f4f6;
  border-radius: var(--radius-sm);
  overflow: hidden;
}

.severity-bar-fill {
  height: 100%;
  border-radius: var(--radius-sm);
  transition: width 0.3s ease;
}

.severity-bar-fill.critical {
  background: #dc2626;
}

.severity-bar-fill.high {
  background: #ea580c;
}

.severity-bar-fill.medium {
  background: #d97706;
}

.severity-bar-fill.low {
  background: #9ca3af;
}

.severity-bar-value {
  font-size: 0.8125rem;
  font-weight: 600;
  color: #374151;
  text-align: right;
}

.trend-chart {
  height: 180px;
  display: flex;
  flex-direction: column;
}

.trend-bars {
  flex: 1;
  display: flex;
  align-items: flex-end;
  justify-content: space-around;
  gap: 0.5rem;
  padding-bottom: 1.5rem;
}

.trend-bar-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  height: 100%;
  position: relative;
}

.trend-bar {
  width: 100%;
  max-width: 40px;
  background: linear-gradient(180deg, #3b82f6 0%, #60a5fa 100%);
  border-radius: var(--radius-sm) 4px 0 0;
  min-height: 4px;
  margin-top: auto;
  transition: height 0.3s ease;
}

.trend-bar-label {
  position: absolute;
  bottom: 0;
  font-size: 0.6875rem;
  color: #9ca3af;
  white-space: nowrap;
}

.top-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.top-list-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem;
  background: #f9fafb;
  border-radius: var(--radius-sm);
}

.top-rank {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: #e5e7eb;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.75rem;
  font-weight: 600;
  color: #6b7280;
}

.top-info {
  flex: 1;
  min-width: 0;
}

.top-name {
  font-size: 0.875rem;
  font-weight: 500;
  color: #1f2937;
}

.top-ip {
  font-size: 0.8125rem;
  background: transparent;
  padding: 0;
  color: #374151;
}

.top-meta {
  display: flex;
  gap: 0.5rem;
  margin-top: 0.25rem;
}

.top-meta-text {
  font-size: 0.75rem;
  color: #9ca3af;
}

.top-badge {
  font-size: 0.625rem;
  font-weight: 600;
  padding: 0.125rem 0.375rem;
  border-radius: var(--radius-sm);
}

.top-badge.critical {
  background: #fee2e2;
  color: #991b1b;
}

.top-badge.high {
  background: #ffedd5;
  color: #9a3412;
}

.top-actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.top-count {
  font-size: 0.875rem;
  font-weight: 600;
  color: #374151;
}

.critical-events-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.critical-event-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  background: #fef2f2;
  border-radius: var(--radius-sm);
  border-left: 3px solid #dc2626;
}

.critical-event-time {
  font-size: 0.75rem;
  color: #9ca3af;
  min-width: 70px;
}

.critical-event-type {
  font-size: 0.8125rem;
  color: #374151;
  min-width: 120px;
}

.critical-event-ip {
  font-size: 0.75rem;
  background: #fecaca;
  padding: 0.125rem 0.375rem;
  border-radius: var(--radius-sm);
  color: #991b1b;
}

.critical-event-path {
  flex: 1;
  font-size: 0.8125rem;
  color: #6b7280;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.no-data {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  color: #9ca3af;
  gap: 0.5rem;
}

.no-data i {
  font-size: 2rem;
  opacity: 0.5;
}

.no-data span {
  font-size: 0.8125rem;
}

@media (max-width: 1200px) {
  .dashboard-stats-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}

@media (max-width: 768px) {
  .stats-row {
    grid-template-columns: repeat(2, 1fr);
  }

  .dashboard-stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .dashboard-row {
    grid-template-columns: 1fr;
  }

  .dashboard-stat-card {
    padding: 1rem;
  }

  .stat-icon {
    width: 40px;
    height: 40px;
  }

  .dashboard-stat-card .stat-value {
    font-size: 1.25rem;
  }

  .critical-event-item {
    flex-wrap: wrap;
  }

  .critical-event-path {
    flex-basis: 100%;
    margin-top: 0.5rem;
  }

  .filters-row {
    flex-direction: column;
  }

  .filter-select,
  .filter-input {
    width: 100%;
  }

  .tab span {
    display: none;
  }

  .form-row {
    grid-template-columns: 1fr;
  }

  .setting-item {
    flex-direction: column;
    gap: 1rem;
  }

  .setting-control {
    width: 100%;
    justify-content: space-between;
  }
}
</style>
