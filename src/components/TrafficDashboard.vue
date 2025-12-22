<template>
  <div class="traffic-dashboard">
    <div v-if="loading && !stats" class="loading-state">
      <i class="pi pi-spin pi-spinner" />
      <span>Analyzing traffic patterns...</span>
    </div>

    <div v-else-if="stats" class="traffic-content">
      <!-- Header with tabs and controls -->
      <div class="dashboard-header">
        <div class="tabs">
          <button
            v-for="tab in subTabs"
            :key="tab.id"
            class="tab"
            :class="{ active: activeSubTab === tab.id }"
            @click="activeSubTab = tab.id"
          >
            <i :class="tab.icon" />
            {{ tab.label }}
            <span v-if="tab.id === 'performance' && performanceAlerts.length" class="tab-badge">
              {{ performanceAlerts.length }}
            </span>
          </button>
        </div>
        <div class="header-actions">
          <select v-model="timeRange" class="select-compact" @change="fetchData">
            <option value="1h">1h</option>
            <option value="6h">6h</option>
            <option value="24h">24h</option>
            <option value="7d">7d</option>
          </select>
          <button class="btn-icon" :disabled="loading" @click="fetchData" title="Refresh">
            <i class="pi pi-refresh" :class="{ 'pi-spin': loading }" />
          </button>
        </div>
      </div>

      <!-- Intelligent Insights Bar -->
      <div v-if="insights.length > 0 || recommendations.length > 0" class="insights-bar">
        <div class="insights-list">
          <div v-for="insight in insights" :key="insight.id" class="insight-chip" :class="insight.type">
            <i :class="insight.icon" />
            <span>{{ insight.text }}</span>
          </div>
        </div>
        <div v-if="recommendations.length > 0" class="recommendations">
          <button
            v-for="rec in recommendations.slice(0, 2)"
            :key="rec.id"
            class="recommendation-btn"
            :class="rec.severity"
            @click="handleRecommendation(rec)"
          >
            <i :class="rec.icon" />
            {{ rec.action }}
          </button>
        </div>
      </div>

      <!-- Overview Tab -->
      <div v-show="activeSubTab === 'overview'" class="tab-content">
        <!-- Stats Grid -->
        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-header">
              <span class="stat-label">Requests</span>
              <span v-if="requestsTrend !== 0" class="trend" :class="requestsTrend > 0 ? 'up' : 'down'">
                <i :class="requestsTrend > 0 ? 'pi pi-arrow-up' : 'pi pi-arrow-down'" />
                {{ Math.abs(requestsTrend) }}%
              </span>
            </div>
            <span class="stat-value">{{ formatNumber(stats.total_requests) }}</span>
            <div class="stat-sparkline">
              <div v-for="(h, idx) in hourlySparkline" :key="idx" class="spark-bar" :style="{ height: h + '%' }" />
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-header">
              <span class="stat-label">Data Transfer</span>
            </div>
            <span class="stat-value">{{ formatBytes(stats.total_bytes) }}</span>
            <span class="stat-sub"
              >{{ formatBytes(stats.total_bytes / Math.max(stats.total_requests, 1)) }}/req avg</span
            >
          </div>
          <div class="stat-card">
            <div class="stat-header">
              <span class="stat-label">Response Time</span>
              <span v-if="stats.avg_response_time_ms > 500" class="trend down">slow</span>
            </div>
            <span class="stat-value" :class="{ warning: stats.avg_response_time_ms > 500 }">
              {{ formatTime(stats.avg_response_time_ms) }}
            </span>
            <span class="stat-sub">p95: {{ formatTime(estimatedP95) }}</span>
          </div>
          <div class="stat-card" :class="{ error: globalErrorRate > THRESHOLDS.ERROR_RATE_WARNING }">
            <div class="stat-header">
              <span class="stat-label">Error Rate</span>
              <span v-if="globalErrorRate > THRESHOLDS.ERROR_RATE_WARNING" class="trend down">high</span>
            </div>
            <span class="stat-value">{{ globalErrorRate }}%</span>
            <div class="error-breakdown">
              <span class="error-item" title="4xx errors">4xx: {{ stats.by_status_group?.["4xx"] || 0 }}</span>
              <span class="error-item" title="5xx errors">5xx: {{ stats.by_status_group?.["5xx"] || 0 }}</span>
            </div>
          </div>
        </div>

        <!-- Two column layout -->
        <div class="two-col">
          <!-- Domains Traffic -->
          <div class="panel">
            <div class="panel-header">
              <h3>Domains</h3>
              <span class="count">{{ domainStats.length }}</span>
            </div>
            <div class="deployment-list">
              <div
                v-for="dep in domainStats"
                :key="dep.name"
                class="deployment-row"
                :class="{
                  warning: dep.error_rate > THRESHOLDS.ERROR_RATE_WARNING,
                  critical: dep.error_rate > THRESHOLDS.ERROR_RATE_CRITICAL,
                }"
                @click="navigateToDeploymentLogs(dep.name)"
              >
                <div class="dep-main">
                  <span class="dep-name">{{ dep.name }}</span>
                  <div class="dep-bar-mini">
                    <div class="bar-fill success" :style="{ width: getStatusPct(dep, '2xx') + '%' }" />
                    <div
                      class="bar-fill error"
                      :style="{ width: getStatusPct(dep, '4xx') + getStatusPct(dep, '5xx') + '%' }"
                    />
                  </div>
                </div>
                <div class="dep-stats">
                  <span class="dep-stat">{{ formatNumber(dep.total_requests) }}</span>
                  <span class="dep-stat" :class="{ slow: dep.avg_response_time > THRESHOLDS.RESPONSE_SLOW }">
                    {{ formatTime(dep.avg_response_time) }}
                  </span>
                  <span class="dep-stat" :class="{ high: dep.error_rate > THRESHOLDS.ERROR_RATE_WARNING }">
                    {{ dep.error_rate.toFixed(1) }}%
                  </span>
                </div>
                <i class="pi pi-chevron-right" />
              </div>
              <div v-if="domainStats.length === 0" class="empty-inline">No traffic recorded yet</div>
            </div>
          </div>

          <!-- Unknown Domains + Suspicious IPs + Top Sources -->
          <div class="panel-stack">
            <div v-if="unknownDomainStats.length > 0" class="panel warning-panel">
              <div class="panel-header">
                <h3><i class="pi pi-question-circle" /> Unknown Domains</h3>
                <span class="count">{{ unknownDomainStats.length }}</span>
              </div>
              <div class="unknown-list">
                <div
                  v-for="domain in unknownDomainStats.slice(0, 5)"
                  :key="domain.name"
                  class="unknown-row"
                  @click="navigateToDeploymentLogs(domain.name)"
                >
                  <code>{{ domain.name }}</code>
                  <span>{{ formatNumber(domain.total_requests) }} req</span>
                </div>
              </div>
            </div>

            <div v-if="suspiciousIPs.length > 0" class="panel warning-panel">
              <div class="panel-header">
                <h3><i class="pi pi-exclamation-triangle" /> Suspicious IPs</h3>
                <span class="count">{{ suspiciousIPs.length }}</span>
              </div>
              <div class="suspicious-list">
                <div v-for="ip in suspiciousIPs" :key="ip.ip" class="suspicious-row">
                  <div class="suspicious-info">
                    <code>{{ ip.ip }}</code>
                    <span class="suspicious-stat">{{ formatNumber(ip.request_count) }} requests</span>
                  </div>
                  <div class="suspicious-actions">
                    <button class="btn-action" title="View requests" @click="filterByIP(ip.ip)">
                      <i class="pi pi-eye" />
                    </button>
                    <button class="btn-action danger" title="Block IP" @click="blockIP(ip.ip)">
                      <i class="pi pi-ban" />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div class="panel">
              <div class="panel-header">
                <h3>Top Sources</h3>
              </div>
              <div class="ip-list">
                <div v-for="ip in topIPs" :key="ip.ip" class="ip-row">
                  <code>{{ ip.ip }}</code>
                  <div class="ip-stats">
                    <span>{{ formatNumber(ip.requests) }}</span>
                    <span class="muted">{{ formatBytes(ip.bytes) }}</span>
                  </div>
                  <button class="btn-icon-xs" title="View requests" @click="filterByIP(ip.ip)">
                    <i class="pi pi-filter" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Method & Status Distribution -->
        <div class="distribution-row">
          <div class="distribution-card">
            <h4>By Method</h4>
            <div class="dist-bars">
              <div v-for="(count, method) in stats.by_method" :key="method" class="dist-item">
                <span class="dist-label">{{ method }}</span>
                <div class="dist-bar">
                  <div class="dist-fill" :style="{ width: getMethodPct(method) + '%' }" />
                </div>
                <span class="dist-value">{{ formatNumber(count) }}</span>
              </div>
            </div>
          </div>
          <div class="distribution-card">
            <h4>By Status</h4>
            <div class="status-grid">
              <div class="status-item success">
                <span class="status-code">2xx</span>
                <span class="status-count">{{ formatNumber(stats.by_status_group?.["2xx"] || 0) }}</span>
              </div>
              <div class="status-item redirect">
                <span class="status-code">3xx</span>
                <span class="status-count">{{ formatNumber(stats.by_status_group?.["3xx"] || 0) }}</span>
              </div>
              <div class="status-item client-error">
                <span class="status-code">4xx</span>
                <span class="status-count">{{ formatNumber(stats.by_status_group?.["4xx"] || 0) }}</span>
              </div>
              <div class="status-item server-error">
                <span class="status-code">5xx</span>
                <span class="status-count">{{ formatNumber(stats.by_status_group?.["5xx"] || 0) }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Request Logs Tab -->
      <div v-show="activeSubTab === 'logs'" class="tab-content">
        <div class="filters-bar">
          <select v-model="logFilters.deployment" class="select-compact" @change="fetchLogs">
            <option value="">All domains</option>
            <option v-for="dep in allDomains" :key="dep" :value="dep">{{ dep }}</option>
          </select>
          <select v-model="logFilters.status_group" class="select-compact" @change="fetchLogs">
            <option value="">All status</option>
            <option value="2xx">2xx</option>
            <option value="3xx">3xx</option>
            <option value="4xx">4xx</option>
            <option value="5xx">5xx</option>
          </select>
          <select v-model="logFilters.method" class="select-compact" @change="fetchLogs">
            <option value="">All methods</option>
            <option value="GET">GET</option>
            <option value="POST">POST</option>
            <option value="PUT">PUT</option>
            <option value="DELETE">DELETE</option>
          </select>
          <input
            v-model="logFilters.path"
            type="text"
            class="input-compact"
            placeholder="Filter path..."
            @keyup.enter="fetchLogs"
          />
          <button v-if="hasActiveFilters" class="btn-text" @click="clearLogFilters">Clear</button>
        </div>

        <div class="logs-table-wrap">
          <table v-if="logs.length > 0" class="data-table">
            <thead>
              <tr>
                <th class="sortable" @click="toggleSort('created_at')">
                  Time
                  <i
                    v-if="sortField === 'created_at'"
                    :class="sortDir === 'asc' ? 'pi pi-sort-up' : 'pi pi-sort-down'"
                  />
                </th>
                <th>Domain</th>
                <th>Method</th>
                <th>Path</th>
                <th class="sortable" @click="toggleSort('status_code')">
                  Status
                  <i
                    v-if="sortField === 'status_code'"
                    :class="sortDir === 'asc' ? 'pi pi-sort-up' : 'pi pi-sort-down'"
                  />
                </th>
                <th>IP</th>
                <th class="sortable" @click="toggleSort('response_time_ms')">
                  Time
                  <i
                    v-if="sortField === 'response_time_ms'"
                    :class="sortDir === 'asc' ? 'pi pi-sort-up' : 'pi pi-sort-down'"
                  />
                </th>
                <th>Size</th>
                <th />
              </tr>
            </thead>
            <tbody>
              <tr v-for="log in sortedLogs" :key="log.id" :class="{ 'error-row': log.status_code >= 400 }">
                <td class="cell-time">{{ formatLogTime(log.created_at) }}</td>
                <td class="cell-domain">{{ log.deployment_name }}</td>
                <td>
                  <span class="method-tag" :class="log.request_method.toLowerCase()">
                    {{ log.request_method }}
                  </span>
                </td>
                <td class="cell-path" :title="log.request_path">{{ log.request_path }}</td>
                <td>
                  <span class="status-tag" :class="getStatusClass(log.status_code)">
                    {{ log.status_code }}
                  </span>
                </td>
                <td class="cell-ip">
                  <code>{{ log.source_ip }}</code>
                </td>
                <td class="cell-time" :class="getTimeClass(log.response_time_ms)">
                  {{ formatTime(log.response_time_ms) }}
                </td>
                <td class="cell-size">{{ formatBytes(log.bytes_sent) }}</td>
                <td class="cell-actions">
                  <button class="btn-icon-sm" title="Filter by this IP" @click.stop="filterByIP(log.source_ip)">
                    <i class="pi pi-filter" />
                  </button>
                  <button class="btn-icon-sm danger" title="Block this IP" @click.stop="blockIP(log.source_ip)">
                    <i class="pi pi-ban" />
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
          <div v-else-if="!logsLoading" class="empty-inline">No logs match your filters</div>
          <div v-else class="loading-inline"><i class="pi pi-spin pi-spinner" /> Loading...</div>
        </div>

        <div v-if="logsTotal > logFilters.limit" class="pagination">
          <button class="btn-sm" :disabled="logFilters.offset === 0" @click="prevPage">Prev</button>
          <span
            >{{ logFilters.offset + 1 }}-{{ Math.min(logFilters.offset + logFilters.limit, logsTotal) }} /
            {{ logsTotal }}</span
          >
          <button class="btn-sm" :disabled="logFilters.offset + logFilters.limit >= logsTotal" @click="nextPage">
            Next
          </button>
        </div>
      </div>

      <!-- Performance Tab -->
      <div v-show="activeSubTab === 'performance'" class="tab-content">
        <!-- Alerts -->
        <div v-if="performanceAlerts.length > 0" class="alerts-panel">
          <div class="alert-row" v-for="alert in performanceAlerts" :key="alert.id" :class="alert.severity">
            <i :class="alert.icon" />
            <div class="alert-text">
              <strong>{{ alert.title }}</strong>
              <span>{{ alert.description }}</span>
            </div>
            <button v-if="alert.payload" class="btn-sm" @click="handleAlertAction(alert)">View</button>
          </div>
        </div>

        <!-- Slow Endpoints -->
        <div class="panel">
          <div class="panel-header">
            <h3>Slowest Endpoints</h3>
            <span class="muted">by avg response time</span>
          </div>
          <table v-if="slowEndpoints.length > 0" class="data-table compact">
            <thead>
              <tr>
                <th>Deployment</th>
                <th>Path</th>
                <th>Requests</th>
                <th>Avg Time</th>
                <th>Errors</th>
                <th />
              </tr>
            </thead>
            <tbody>
              <tr v-for="ep in slowEndpoints" :key="`${ep.deployment}-${ep.path}`">
                <td>
                  <span class="tag">{{ ep.deployment }}</span>
                </td>
                <td class="cell-path">{{ ep.path }}</td>
                <td>{{ formatNumber(ep.requests) }}</td>
                <td :class="getTimeClass(ep.avgTime)">{{ formatTime(ep.avgTime) }}</td>
                <td>{{ ep.errors }}</td>
                <td class="cell-actions">
                  <button class="btn-icon-sm" title="View logs" @click="filterByPath(ep.path, ep.deployment)">
                    <i class="pi pi-external-link" />
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
          <div v-else class="empty-inline">No slow endpoints detected</div>
        </div>

        <!-- Hourly Chart -->
        <div v-if="stats.requests_per_hour?.length > 0" class="panel">
          <div class="panel-header">
            <h3>Request Volume (24h)</h3>
          </div>
          <div class="hourly-chart">
            <div
              v-for="hour in stats.requests_per_hour"
              :key="hour.hour"
              class="hour-bar"
              :style="{ height: getHourlyBarHeight(hour.request_count) + '%' }"
              :title="`${formatHour(hour.hour)}: ${hour.request_count} requests`"
              :class="{ highlight: isCurrentHour(hour.hour) }"
            />
          </div>
          <div class="hourly-labels">
            <span v-for="(hour, idx) in stats.requests_per_hour" :key="idx" v-show="idx % 4 === 0">
              {{ formatHour(hour.hour) }}
            </span>
          </div>
        </div>

        <div v-if="performanceAlerts.length === 0 && slowEndpoints.length === 0" class="empty-state-sm">
          <i class="pi pi-check-circle" />
          <span>No performance issues detected</span>
        </div>
      </div>
    </div>

    <div v-else class="empty-state">
      <i class="pi pi-chart-line" />
      <p>No traffic data yet</p>
      <button class="btn-primary" @click="fetchData">Check for Traffic</button>
    </div>

    <ConfirmModal
      :visible="showBlockIPModal"
      title="Block IP Address"
      :message="`Block all requests from ${ipToBlock}? This will take effect immediately.`"
      variant="danger"
      confirm-text="Block IP"
      :loading="blockingIP"
      @confirm="confirmBlockIP"
      @cancel="cancelBlockIP"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, watch } from "vue";
import { storeToRefs } from "pinia";
import { useTrafficStore } from "@/stores/traffic";
import { useDeploymentsStore } from "@/stores/deployments";
import { useNotificationsStore } from "@/stores/notifications";
import { securityApi } from "@/services/api";
import ConfirmModal from "@/components/ConfirmModal.vue";

const props = defineProps<{
  deployment?: string;
  autoFetch?: boolean;
}>();

const trafficStore = useTrafficStore();
const deploymentsStore = useDeploymentsStore();
const notifications = useNotificationsStore();
const { stats, logs, logsTotal, loading } = storeToRefs(trafficStore);
const { deployments } = storeToRefs(deploymentsStore);

const timeRange = ref("24h");
const activeSubTab = ref("overview");
const logsLoading = ref(false);
const sortField = ref("created_at");
const sortDir = ref<"asc" | "desc">("desc");

const showBlockIPModal = ref(false);
const ipToBlock = ref("");
const blockingIP = ref(false);

// Detection Thresholds - can be moved to backend/config later
const THRESHOLDS = {
  // IP Analysis
  SUSPICIOUS_IP_RATIO: 0.3, // 30% of total traffic
  SUSPICIOUS_IP_REQUESTS: 500, // absolute request count
  DOMINANT_IP_RATIO: 0.5, // 50% - triggers insight
  INVESTIGATE_IP_RATIO: 0.7, // 70% - triggers recommendation

  // Traffic Trends
  TRAFFIC_CHANGE_SIGNIFICANT: 20, // ±20% change

  // Error Rates
  ERROR_RATE_WARNING: 5, // 5% - warning level
  ERROR_RATE_CRITICAL: 10, // 10% - critical level

  // Response Times (ms)
  RESPONSE_SLOW: 500, // considered slow
  RESPONSE_VERY_SLOW: 1000, // triggers insight
  RESPONSE_CRITICAL: 2000, // triggers alert
  SLOW_ENDPOINT_MIN: 200, // minimum to show in slow endpoints

  // Server Errors
  SERVER_ERRORS_HIGH: 100, // 5xx count threshold

  // Display Limits
  MAX_INSIGHTS: 3,
  MAX_ALERTS: 5,
  MAX_TOP_IPS: 5,
  MAX_SLOW_ENDPOINTS: 10,
  LOGS_PER_PAGE: 25,
} as const;

// Alert/Recommendation Types
type InsightType = "info" | "warning" | "success" | "anomaly";
type AlertSeverity = "warning" | "critical";
type ActionType =
  | { type: "filter_ip"; ip: string }
  | { type: "filter_deployment"; deployment: string }
  | { type: "filter_path"; path: string; deployment?: string }
  | { type: "navigate"; tab: string }
  | { type: "block_ip"; ip: string };

const subTabs = [
  { id: "overview", label: "Overview", icon: "pi pi-chart-bar" },
  { id: "logs", label: "Logs", icon: "pi pi-list" },
  { id: "performance", label: "Performance", icon: "pi pi-bolt" },
];

const logFilters = reactive({
  deployment: "",
  status_group: "",
  method: "",
  path: "",
  source_ip: "",
  limit: THRESHOLDS.LOGS_PER_PAGE,
  offset: 0,
});

interface Insight {
  id: string;
  type: InsightType;
  icon: string;
  text: string;
  payload?: ActionType;
}

interface Recommendation {
  id: string;
  severity: AlertSeverity;
  icon: string;
  action: string;
  payload: ActionType;
}

interface PerformanceAlert {
  id: string;
  severity: AlertSeverity;
  icon: string;
  title: string;
  description: string;
  payload?: ActionType;
}

const globalErrorRate = computed(() => {
  if (!stats.value || stats.value.total_requests === 0) return 0;
  const errors = (stats.value.by_status_group?.["4xx"] || 0) + (stats.value.by_status_group?.["5xx"] || 0);
  return Number(((errors / stats.value.total_requests) * 100).toFixed(1));
});

const requestsTrend = computed(() => {
  if (!stats.value?.requests_per_hour?.length) return 0;
  const hours = stats.value.requests_per_hour;
  if (hours.length < 12) return 0;
  const recent = hours.slice(-6).reduce((s, h) => s + h.request_count, 0);
  const earlier = hours.slice(-12, -6).reduce((s, h) => s + h.request_count, 0);
  if (earlier === 0) return 0;
  return Math.round(((recent - earlier) / earlier) * 100);
});

const hourlySparkline = computed(() => {
  if (!stats.value?.requests_per_hour?.length) return [];
  const hours = stats.value.requests_per_hour.slice(-12);
  const max = Math.max(...hours.map((h) => h.request_count), 1);
  return hours.map((h) => Math.max((h.request_count / max) * 100, 5));
});

const estimatedP95 = computed(() => {
  if (!stats.value) return 0;
  return stats.value.avg_response_time_ms * 2.5;
});

const insights = computed((): Insight[] => {
  if (!stats.value) return [];
  const list: Insight[] = [];

  if (requestsTrend.value > THRESHOLDS.TRAFFIC_CHANGE_SIGNIFICANT) {
    list.push({
      id: "traffic-up",
      type: "info",
      icon: "pi pi-arrow-up",
      text: `Traffic up ${requestsTrend.value}% vs previous period`,
    });
  } else if (requestsTrend.value < -THRESHOLDS.TRAFFIC_CHANGE_SIGNIFICANT) {
    list.push({
      id: "traffic-down",
      type: "warning",
      icon: "pi pi-arrow-down",
      text: `Traffic down ${Math.abs(requestsTrend.value)}% vs previous period`,
    });
  }

  if (globalErrorRate.value > THRESHOLDS.ERROR_RATE_CRITICAL) {
    list.push({
      id: "high-errors",
      type: "anomaly",
      icon: "pi pi-exclamation-circle",
      text: `Elevated error rate: ${globalErrorRate.value}%`,
      payload: { type: "navigate", tab: "performance" },
    });
  }

  if (stats.value.avg_response_time_ms > THRESHOLDS.RESPONSE_VERY_SLOW) {
    list.push({
      id: "slow-response",
      type: "warning",
      icon: "pi pi-clock",
      text: `Slow avg response: ${formatTime(stats.value.avg_response_time_ms)}`,
      payload: { type: "navigate", tab: "performance" },
    });
  }

  const topIP = stats.value.top_ips?.[0];
  if (topIP && topIP.request_count > stats.value.total_requests * THRESHOLDS.DOMINANT_IP_RATIO) {
    list.push({
      id: "dominant-ip",
      type: "anomaly",
      icon: "pi pi-user",
      text: `${topIP.ip} made ${Math.round((topIP.request_count / stats.value.total_requests) * 100)}% of requests`,
      payload: { type: "filter_ip", ip: topIP.ip },
    });
  }

  return list.slice(0, THRESHOLDS.MAX_INSIGHTS);
});

const domainStats = computed(() => {
  if (!stats.value?.deployment_stats) return [];
  return [...stats.value.deployment_stats].sort((a, b) => b.total_requests - a.total_requests);
});

const unknownDomainStats = computed(() => {
  if (!stats.value?.deployment_stats) return [];
  const knownNames = deployments.value.map((d) => d.name);
  return stats.value.deployment_stats
    .filter((ds) => !knownNames.includes(ds.name))
    .sort((a, b) => b.total_requests - a.total_requests);
});

const suspiciousIPs = computed(() => {
  if (!stats.value?.top_ips) return [];
  return stats.value.top_ips.filter((ip) => {
    const requestRatio = ip.request_count / Math.max(stats.value!.total_requests, 1);
    return requestRatio > THRESHOLDS.SUSPICIOUS_IP_RATIO || ip.request_count > THRESHOLDS.SUSPICIOUS_IP_REQUESTS;
  });
});

const recommendations = computed((): Recommendation[] => {
  if (!stats.value) return [];
  const list: Recommendation[] = [];

  const topIP = stats.value.top_ips?.[0];
  if (topIP && topIP.request_count > stats.value.total_requests * THRESHOLDS.INVESTIGATE_IP_RATIO) {
    list.push({
      id: "investigate-ip",
      severity: "warning",
      icon: "pi pi-ban",
      action: `Investigate ${topIP.ip}`,
      payload: { type: "filter_ip", ip: topIP.ip },
    });
  }

  if (suspiciousIPs.value.length > 0) {
    list.push({
      id: "suspicious-ips",
      severity: "warning",
      icon: "pi pi-exclamation-triangle",
      action: "Review suspicious IPs",
      payload: { type: "navigate", tab: "overview" },
    });
  }

  const slowest = stats.value.top_paths?.find((p) => p.avg_time_ms > THRESHOLDS.RESPONSE_CRITICAL);
  if (slowest) {
    list.push({
      id: "slow-endpoint",
      severity: "critical",
      icon: "pi pi-clock",
      action: "Investigate slow endpoint",
      payload: { type: "filter_path", path: slowest.path, deployment: slowest.deployment },
    });
  }

  return list;
});

const allDomains = computed(() => {
  return domainStats.value.map((d) => d.name);
});

const topIPs = computed(() => {
  if (!stats.value?.top_ips) return [];
  return stats.value.top_ips.slice(0, THRESHOLDS.MAX_TOP_IPS).map((ip) => ({
    ip: ip.ip,
    requests: ip.request_count,
    bytes: ip.bytes_sent,
  }));
});

const performanceAlerts = computed((): PerformanceAlert[] => {
  if (!stats.value) return [];
  const alerts: PerformanceAlert[] = [];

  if (stats.value.deployment_stats) {
    stats.value.deployment_stats.forEach((dep) => {
      if (dep.error_rate > THRESHOLDS.ERROR_RATE_CRITICAL) {
        alerts.push({
          id: `error-${dep.name}`,
          severity: "critical",
          icon: "pi pi-times-circle",
          title: `High error rate: ${dep.name}`,
          description: `${dep.error_rate.toFixed(1)}% of requests failing`,
          payload: { type: "filter_deployment", deployment: dep.name },
        });
      }
      if (dep.avg_response_time > THRESHOLDS.RESPONSE_CRITICAL) {
        alerts.push({
          id: `slow-${dep.name}`,
          severity: "warning",
          icon: "pi pi-clock",
          title: `Slow responses: ${dep.name}`,
          description: `Avg ${formatTime(dep.avg_response_time)}`,
          payload: { type: "filter_deployment", deployment: dep.name },
        });
      }
    });
  }

  const serverErrors = stats.value.by_status_group?.["5xx"] || 0;
  if (serverErrors > THRESHOLDS.SERVER_ERRORS_HIGH) {
    alerts.push({
      id: "5xx-high",
      severity: "critical",
      icon: "pi pi-server",
      title: "Elevated server errors",
      description: `${formatNumber(serverErrors)} 5xx errors`,
      payload: { type: "navigate", tab: "logs" },
    });
  }

  return alerts.slice(0, THRESHOLDS.MAX_ALERTS);
});

const slowEndpoints = computed(() => {
  if (!stats.value?.top_paths) return [];
  return stats.value.top_paths
    .filter((p) => p.avg_time_ms > THRESHOLDS.SLOW_ENDPOINT_MIN)
    .sort((a, b) => b.avg_time_ms - a.avg_time_ms)
    .slice(0, THRESHOLDS.MAX_SLOW_ENDPOINTS)
    .map((p) => ({
      path: p.path,
      deployment: p.deployment,
      requests: p.request_count,
      avgTime: p.avg_time_ms,
      errors: p.error_count,
    }));
});

const maxHourlyRequests = computed(() => {
  if (!stats.value?.requests_per_hour?.length) return 1;
  return Math.max(...stats.value.requests_per_hour.map((h) => h.request_count), 1);
});

const hasActiveFilters = computed(() => {
  return (
    logFilters.deployment || logFilters.status_group || logFilters.method || logFilters.path || logFilters.source_ip
  );
});

const sortedLogs = computed(() => {
  if (!logs.value.length) return [];
  const sorted = [...logs.value];
  sorted.sort((a, b) => {
    let aVal: any, bVal: any;
    switch (sortField.value) {
      case "created_at":
        aVal = new Date(a.created_at).getTime();
        bVal = new Date(b.created_at).getTime();
        break;
      case "status_code":
        aVal = a.status_code;
        bVal = b.status_code;
        break;
      case "response_time_ms":
        aVal = a.response_time_ms;
        bVal = b.response_time_ms;
        break;
      default:
        return 0;
    }
    return sortDir.value === "asc" ? aVal - bVal : bVal - aVal;
  });
  return sorted;
});

const fetchData = async () => {
  await deploymentsStore.fetchDeployments();
  if (props.deployment) {
    await trafficStore.fetchDeploymentStats(props.deployment, timeRange.value);
  } else {
    await trafficStore.fetchStats({ since: timeRange.value });
  }
};

const fetchLogs = async () => {
  logsLoading.value = true;
  const startTime = getStartTime(timeRange.value);
  await trafficStore.fetchLogs({
    deployment: logFilters.deployment || undefined,
    status_group: logFilters.status_group || undefined,
    method: logFilters.method || undefined,
    path: logFilters.path || undefined,
    source_ip: logFilters.source_ip || undefined,
    start_time: startTime,
    limit: logFilters.limit,
    offset: logFilters.offset,
  });
  logsLoading.value = false;
};

const getStartTime = (range: string): string => {
  const now = new Date();
  switch (range) {
    case "1h":
      now.setHours(now.getHours() - 1);
      break;
    case "6h":
      now.setHours(now.getHours() - 6);
      break;
    case "24h":
      now.setHours(now.getHours() - 24);
      break;
    case "7d":
      now.setDate(now.getDate() - 7);
      break;
  }
  return now.toISOString();
};

const navigateToDeploymentLogs = (name: string) => {
  logFilters.deployment = name;
  logFilters.offset = 0;
  activeSubTab.value = "logs";
  fetchLogs();
};

const filterByIP = (ip: string) => {
  logFilters.source_ip = ip;
  logFilters.offset = 0;
  activeSubTab.value = "logs";
  fetchLogs();
};

const filterByPath = (path: string, deployment: string) => {
  logFilters.path = path;
  logFilters.deployment = deployment;
  logFilters.offset = 0;
  activeSubTab.value = "logs";
  fetchLogs();
};

const blockIP = (ip: string) => {
  ipToBlock.value = ip;
  showBlockIPModal.value = true;
};

const confirmBlockIP = async () => {
  blockingIP.value = true;
  try {
    await securityApi.blockIP(ipToBlock.value, "Blocked from traffic dashboard - suspicious activity");
    notifications.success("IP Blocked", `${ipToBlock.value} has been blocked`);
    showBlockIPModal.value = false;
    await fetchData();
  } catch (e: any) {
    notifications.error("Error", `Failed to block IP: ${e.message}`);
  } finally {
    blockingIP.value = false;
  }
};

const cancelBlockIP = () => {
  showBlockIPModal.value = false;
  ipToBlock.value = "";
};

const clearLogFilters = () => {
  logFilters.deployment = "";
  logFilters.status_group = "";
  logFilters.method = "";
  logFilters.path = "";
  logFilters.source_ip = "";
  logFilters.offset = 0;
  fetchLogs();
};

const toggleSort = (field: string) => {
  if (sortField.value === field) {
    sortDir.value = sortDir.value === "asc" ? "desc" : "asc";
  } else {
    sortField.value = field;
    sortDir.value = "desc";
  }
};

const prevPage = () => {
  logFilters.offset = Math.max(0, logFilters.offset - logFilters.limit);
  fetchLogs();
};

const nextPage = () => {
  logFilters.offset += logFilters.limit;
  fetchLogs();
};

// Unified action handler for all alerts/recommendations
const executeAction = (payload: ActionType) => {
  switch (payload.type) {
    case "filter_ip":
      filterByIP(payload.ip);
      break;
    case "filter_deployment":
      navigateToDeploymentLogs(payload.deployment);
      break;
    case "filter_path":
      filterByPath(payload.path, payload.deployment || "");
      break;
    case "navigate":
      activeSubTab.value = payload.tab;
      break;
    case "block_ip":
      blockIP(payload.ip);
      break;
  }
};

const handleRecommendation = (rec: Recommendation) => executeAction(rec.payload);

const handleAlertAction = (alert: PerformanceAlert) => {
  if (alert.payload) {
    executeAction(alert.payload);
  }
};

const getStatusPct = (dep: any, group: string) => {
  const total = dep.total_requests || 1;
  switch (group) {
    case "2xx":
      return (dep.status_2xx / total) * 100;
    case "3xx":
      return (dep.status_3xx / total) * 100;
    case "4xx":
      return (dep.status_4xx / total) * 100;
    case "5xx":
      return (dep.status_5xx / total) * 100;
    default:
      return 0;
  }
};

const getMethodPct = (method: string) => {
  if (!stats.value?.by_method) return 0;
  const total = Object.values(stats.value.by_method).reduce((s, v) => s + v, 0);
  return total ? ((stats.value.by_method[method] || 0) / total) * 100 : 0;
};

const getStatusClass = (code: number) => {
  if (code >= 500) return "s5xx";
  if (code >= 400) return "s4xx";
  if (code >= 300) return "s3xx";
  return "s2xx";
};

const getTimeClass = (ms: number) => {
  if (ms > THRESHOLDS.RESPONSE_VERY_SLOW) return "critical";
  if (ms > THRESHOLDS.RESPONSE_SLOW) return "slow";
  if (ms > THRESHOLDS.SLOW_ENDPOINT_MIN) return "moderate";
  return "fast";
};

const getHourlyBarHeight = (count: number) => Math.max((count / maxHourlyRequests.value) * 100, 2);

const isCurrentHour = (hourStr: string) => {
  const hour = new Date(hourStr).getHours();
  return hour === new Date().getHours();
};

const formatNumber = (num: number): string => {
  if (!num) return "0";
  if (num >= 1000000) return (num / 1000000).toFixed(1) + "M";
  if (num >= 1000) return (num / 1000).toFixed(1) + "K";
  return num.toString();
};

const formatBytes = (bytes: number): string => {
  if (!bytes) return "0B";
  if (bytes >= 1073741824) return (bytes / 1073741824).toFixed(1) + "GB";
  if (bytes >= 1048576) return (bytes / 1048576).toFixed(1) + "MB";
  if (bytes >= 1024) return (bytes / 1024).toFixed(1) + "KB";
  return bytes + "B";
};

const formatTime = (ms: number): string => {
  if (!ms) return "0ms";
  if (ms >= 1000) return (ms / 1000).toFixed(1) + "s";
  return Math.round(ms) + "ms";
};

const formatLogTime = (dateString: string) => {
  const date = new Date(dateString);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  return date.toLocaleDateString([], { month: "short", day: "numeric" });
};

const formatHour = (hourStr: string): string => {
  return new Date(hourStr).toLocaleTimeString([], { hour: "2-digit", hour12: false });
};

watch(activeSubTab, (tab) => {
  if (tab === "logs" && logs.value.length === 0) fetchLogs();
});

onMounted(() => {
  if (props.autoFetch) fetchData();
});
</script>

<style scoped>
.traffic-dashboard {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  font-size: 0.8125rem;
}

.loading-state,
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  padding: 2rem;
  color: #6b7280;
}

.empty-state i {
  font-size: 2rem;
  opacity: 0.5;
}

.traffic-content {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

/* Header */
.dashboard-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.375rem;
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: var(--radius-sm);
}

.tabs {
  display: flex;
  gap: 2px;
}

.tab {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.375rem 0.75rem;
  background: transparent;
  border: none;
  border-radius: var(--radius-sm);
  font-size: 0.75rem;
  font-weight: 500;
  color: #6b7280;
  cursor: pointer;
}

.tab:hover {
  background: #f3f4f6;
}
.tab.active {
  background: #3b82f6;
  color: #fff;
}
.tab i {
  font-size: 0.75rem;
}
.tab-badge {
  background: #ef4444;
  color: #fff;
  font-size: 0.625rem;
  padding: 0 0.375rem;
  border-radius: 9999px;
  margin-left: 0.25rem;
}

.header-actions {
  display: flex;
  gap: 0.375rem;
}

.select-compact {
  padding: 0.25rem 0.5rem;
  border: 1px solid #e5e7eb;
  border-radius: var(--radius-sm);
  font-size: 0.75rem;
  background: #fff;
}

.input-compact {
  padding: 0.25rem 0.5rem;
  border: 1px solid #e5e7eb;
  border-radius: var(--radius-sm);
  font-size: 0.75rem;
  min-width: 120px;
}

.btn-icon {
  padding: 0.25rem;
  border: none;
  background: transparent;
  color: #6b7280;
  cursor: pointer;
  border-radius: var(--radius-sm);
}
.btn-icon:hover {
  background: #f3f4f6;
}

/* Insights Bar */
.insights-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem 0.75rem;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: var(--radius-sm);
  gap: 1rem;
}

.insights-list {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.insight-chip {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.25rem 0.5rem;
  border-radius: var(--radius-sm);
  font-size: 0.6875rem;
  font-weight: 500;
}

.insight-chip.info {
  background: #dbeafe;
  color: #1d4ed8;
}
.insight-chip.warning {
  background: #fef3c7;
  color: #b45309;
}
.insight-chip.success {
  background: #d1fae5;
  color: #059669;
}
.insight-chip.anomaly {
  background: #fce7f3;
  color: #be185d;
}
.insight-chip i {
  font-size: 0.625rem;
}

.recommendations {
  display: flex;
  gap: 0.375rem;
}

.recommendation-btn {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.25rem 0.5rem;
  border: none;
  border-radius: var(--radius-sm);
  font-size: 0.6875rem;
  font-weight: 500;
  cursor: pointer;
}

.recommendation-btn.warning {
  background: #fef3c7;
  color: #b45309;
}
.recommendation-btn.critical {
  background: #fee2e2;
  color: #dc2626;
}
.recommendation-btn:hover {
  filter: brightness(0.95);
}

/* Tab Content */
.tab-content {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

/* Stats Grid */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 0.5rem;
}

.stat-card {
  padding: 0.75rem;
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: var(--radius-sm);
}

.stat-card.error {
  border-color: #fca5a5;
  background: #fef2f2;
}

.stat-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.25rem;
}

.stat-label {
  font-size: 0.6875rem;
  color: #6b7280;
  text-transform: uppercase;
}

.trend {
  font-size: 0.625rem;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 2px;
}
.trend.up {
  color: #059669;
}
.trend.down {
  color: #dc2626;
}
.trend i {
  font-size: 0.5rem;
}

.stat-value {
  font-size: 1.25rem;
  font-weight: 700;
  color: #1f2937;
}
.stat-value.warning {
  color: #b45309;
}
.stat-card.error .stat-value {
  color: #dc2626;
}

.stat-sub {
  font-size: 0.625rem;
  color: #9ca3af;
}

.stat-sparkline {
  display: flex;
  align-items: flex-end;
  gap: 2px;
  height: 20px;
  margin-top: 0.375rem;
}

.spark-bar {
  flex: 1;
  background: #3b82f6;
  border-radius: 1px;
  opacity: 0.6;
}

.error-breakdown {
  display: flex;
  gap: 0.5rem;
  margin-top: 0.25rem;
}

.error-item {
  font-size: 0.625rem;
  color: #6b7280;
}

/* Two Column Layout */
.two-col {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.75rem;
}

.panel-stack {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

/* Panel */
.panel {
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: var(--radius-sm);
  overflow: hidden;
}

.warning-panel {
  border-color: #fcd34d;
  background: #fffbeb;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem 0.75rem;
  border-bottom: 1px solid #e5e7eb;
}

.warning-panel .panel-header {
  border-color: #fcd34d;
}

.panel-header h3 {
  margin: 0;
  font-size: 0.6875rem;
  font-weight: 600;
  color: #374151;
  text-transform: uppercase;
  letter-spacing: 0.025em;
  display: flex;
  align-items: center;
  gap: 0.375rem;
}

.panel-header h3 i {
  color: #f59e0b;
}

.count {
  font-size: 0.625rem;
  background: #e5e7eb;
  padding: 0.125rem 0.375rem;
  border-radius: 9999px;
  color: #6b7280;
}

/* Deployment List */
.deployment-list {
  max-height: 240px;
  overflow-y: auto;
}

.deployment-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  border-bottom: 1px solid #f3f4f6;
  cursor: pointer;
}

.deployment-row:hover {
  background: #f9fafb;
}
.deployment-row:last-child {
  border-bottom: none;
}
.deployment-row.warning {
  border-left: 2px solid #f59e0b;
}
.deployment-row.critical {
  border-left: 2px solid #ef4444;
}

.dep-main {
  flex: 1;
  min-width: 0;
}

.dep-name {
  font-size: 0.8125rem;
  font-weight: 500;
  color: #1f2937;
  display: block;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.dep-bar-mini {
  display: flex;
  height: 3px;
  background: #e5e7eb;
  border-radius: 1px;
  margin-top: 0.25rem;
  overflow: hidden;
}

.bar-fill {
  height: 100%;
}
.bar-fill.success {
  background: #22c55e;
}
.bar-fill.error {
  background: #ef4444;
}

.dep-stats {
  display: flex;
  gap: 0.75rem;
}

.dep-stat {
  font-size: 0.6875rem;
  color: #6b7280;
  white-space: nowrap;
}

.dep-stat.slow {
  color: #b45309;
}
.dep-stat.high {
  color: #dc2626;
}

.deployment-row i {
  color: #d1d5db;
  font-size: 0.625rem;
}

/* Unknown Domains */
.unknown-list {
  max-height: 120px;
  overflow-y: auto;
}

.unknown-row {
  display: flex;
  justify-content: space-between;
  padding: 0.375rem 0.75rem;
  border-bottom: 1px solid #fcd34d40;
  cursor: pointer;
}

.unknown-row:hover {
  background: #fef3c7;
}

.unknown-row:last-child {
  border-bottom: none;
}

.unknown-row code {
  font-size: 0.75rem;
  color: #92400e;
}

.unknown-row span {
  font-size: 0.6875rem;
  color: #b45309;
}

/* Suspicious IPs */
.suspicious-list {
  max-height: 150px;
  overflow-y: auto;
}

.suspicious-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem 0.75rem;
  border-bottom: 1px solid #fcd34d40;
}

.suspicious-row:last-child {
  border-bottom: none;
}

.suspicious-info {
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
}

.suspicious-info code {
  font-size: 0.75rem;
  color: #92400e;
  font-weight: 500;
}

.suspicious-stat {
  font-size: 0.625rem;
  color: #b45309;
}

.suspicious-actions {
  display: flex;
  gap: 0.25rem;
}

.btn-action {
  padding: 0.25rem 0.375rem;
  border: none;
  background: #fff;
  border-radius: var(--radius-xs);
  cursor: pointer;
  color: #6b7280;
  font-size: 0.75rem;
}

.btn-action:hover {
  background: #f3f4f6;
  color: #374151;
}

.btn-action.danger {
  color: #dc2626;
}

.btn-action.danger:hover {
  background: #fee2e2;
  color: #991b1b;
}

.btn-icon-xs {
  padding: 0.125rem;
  border: none;
  background: transparent;
  color: #9ca3af;
  cursor: pointer;
  border-radius: var(--radius-xs);
  font-size: 0.625rem;
}

.btn-icon-xs:hover {
  background: #f3f4f6;
  color: #374151;
}

/* IP List */
.ip-list {
  padding: 0.25rem 0;
}

.ip-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.375rem 0.75rem;
}

.ip-row code {
  font-size: 0.75rem;
  color: #1f2937;
}

.ip-stats {
  display: flex;
  gap: 0.75rem;
  font-size: 0.6875rem;
}

.muted {
  color: #9ca3af;
}

/* Distribution */
.distribution-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.75rem;
}

.distribution-card {
  padding: 0.75rem;
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: var(--radius-sm);
}

.distribution-card h4 {
  margin: 0 0 0.5rem 0;
  font-size: 0.6875rem;
  font-weight: 600;
  color: #6b7280;
  text-transform: uppercase;
}

.dist-bars {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
}

.dist-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.dist-label {
  font-size: 0.6875rem;
  color: #374151;
  width: 50px;
}

.dist-bar {
  flex: 1;
  height: 6px;
  background: #e5e7eb;
  border-radius: var(--radius-xs);
}

.dist-fill {
  height: 100%;
  background: #3b82f6;
  border-radius: var(--radius-xs);
}

.dist-value {
  font-size: 0.6875rem;
  color: #6b7280;
  width: 40px;
  text-align: right;
}

.status-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 0.375rem;
}

.status-item {
  text-align: center;
  padding: 0.5rem;
  border-radius: var(--radius-sm);
}

.status-item.success {
  background: #d1fae5;
}
.status-item.redirect {
  background: #dbeafe;
}
.status-item.client-error {
  background: #fef3c7;
}
.status-item.server-error {
  background: #fee2e2;
}

.status-code {
  font-size: 0.625rem;
  font-weight: 600;
  display: block;
}
.status-item.success .status-code {
  color: #059669;
}
.status-item.redirect .status-code {
  color: #1d4ed8;
}
.status-item.client-error .status-code {
  color: #b45309;
}
.status-item.server-error .status-code {
  color: #dc2626;
}

.status-count {
  font-size: 0.875rem;
  font-weight: 700;
  color: #1f2937;
}

/* Filters Bar */
.filters-bar {
  display: flex;
  gap: 0.375rem;
  flex-wrap: wrap;
  align-items: center;
}

.btn-text {
  background: none;
  border: none;
  color: #6b7280;
  font-size: 0.75rem;
  cursor: pointer;
  padding: 0.25rem;
}
.btn-text:hover {
  color: #374151;
}

/* Data Table */
.logs-table-wrap {
  overflow-x: auto;
}

.data-table {
  width: 100%;
  border-collapse: collapse;
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: var(--radius-sm);
}

.data-table.compact td,
.data-table.compact th {
  padding: 0.375rem 0.5rem;
}

.data-table th {
  text-align: left;
  padding: 0.5rem 0.75rem;
  font-size: 0.625rem;
  font-weight: 600;
  color: #9ca3af;
  text-transform: uppercase;
  background: #f9fafb;
  border-bottom: 1px solid #e5e7eb;
  white-space: nowrap;
}

.data-table th.sortable {
  cursor: pointer;
}
.data-table th.sortable:hover {
  color: #374151;
}
.data-table th i {
  font-size: 0.5rem;
  margin-left: 0.25rem;
}

.data-table td {
  padding: 0.375rem 0.75rem;
  font-size: 0.75rem;
  border-bottom: 1px solid #f3f4f6;
  vertical-align: middle;
}

.data-table tbody tr:hover {
  background: #f9fafb;
}
.data-table tbody tr.error-row {
  background: #fef2f2;
}

.cell-time {
  color: #9ca3af;
  white-space: nowrap;
  font-size: 0.6875rem;
}
.cell-time.fast {
  color: #059669;
}
.cell-time.moderate {
  color: #b45309;
}
.cell-time.slow {
  color: #ea580c;
}
.cell-time.critical {
  color: #dc2626;
}

.cell-domain {
  max-width: 100px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: #6b7280;
}

.cell-path {
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-family: ui-monospace, monospace;
  font-size: 0.6875rem;
}

.cell-ip code {
  background: #f3f4f6;
  padding: 0.125rem 0.25rem;
  border-radius: var(--radius-xs);
  font-size: 0.6875rem;
}

.cell-size {
  color: #9ca3af;
  font-size: 0.6875rem;
  white-space: nowrap;
}

.cell-actions {
  text-align: right;
}

.btn-icon-sm {
  padding: 0.25rem;
  border: none;
  background: transparent;
  color: #9ca3af;
  cursor: pointer;
  border-radius: var(--radius-xs);
}
.btn-icon-sm:hover {
  background: #f3f4f6;
  color: #374151;
}

.btn-icon-sm.danger {
  color: #dc2626;
}

.btn-icon-sm.danger:hover {
  background: #fee2e2;
  color: #991b1b;
}

.method-tag {
  display: inline-block;
  padding: 0.125rem 0.25rem;
  border-radius: var(--radius-xs);
  font-size: 0.5625rem;
  font-weight: 600;
}

.method-tag.get {
  background: #dbeafe;
  color: #1d4ed8;
}
.method-tag.post {
  background: #d1fae5;
  color: #059669;
}
.method-tag.put {
  background: #fef3c7;
  color: #b45309;
}
.method-tag.delete {
  background: #fee2e2;
  color: #dc2626;
}
.method-tag.patch {
  background: #ede9fe;
  color: #7c3aed;
}

.status-tag {
  display: inline-block;
  padding: 0.125rem 0.375rem;
  border-radius: var(--radius-xs);
  font-size: 0.6875rem;
  font-weight: 600;
}

.status-tag.s2xx {
  background: #d1fae5;
  color: #059669;
}
.status-tag.s3xx {
  background: #dbeafe;
  color: #1d4ed8;
}
.status-tag.s4xx {
  background: #fef3c7;
  color: #b45309;
}
.status-tag.s5xx {
  background: #fee2e2;
  color: #dc2626;
}

.tag {
  display: inline-block;
  padding: 0.125rem 0.375rem;
  background: #f3f4f6;
  border-radius: var(--radius-xs);
  font-size: 0.625rem;
  color: #6b7280;
}

.empty-inline,
.loading-inline {
  padding: 1.5rem;
  text-align: center;
  color: #9ca3af;
  font-size: 0.75rem;
}

.pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  font-size: 0.75rem;
  color: #6b7280;
}

.btn-sm {
  padding: 0.25rem 0.5rem;
  border: 1px solid #e5e7eb;
  background: #fff;
  border-radius: var(--radius-sm);
  font-size: 0.6875rem;
  cursor: pointer;
}
.btn-sm:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.btn-sm:hover:not(:disabled) {
  background: #f9fafb;
}

/* Alerts Panel */
.alerts-panel {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
}

.alert-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  border-radius: var(--radius-sm);
  background: #fef2f2;
}

.alert-row.warning {
  background: #fffbeb;
}
.alert-row.critical {
  background: #fef2f2;
}
.alert-row.warning i {
  color: #d97706;
}
.alert-row.critical i {
  color: #dc2626;
}

.alert-text {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
}

.alert-text strong {
  font-size: 0.75rem;
  color: #1f2937;
}
.alert-text span {
  font-size: 0.6875rem;
  color: #6b7280;
}

/* Hourly Chart */
.hourly-chart {
  display: flex;
  align-items: flex-end;
  gap: 2px;
  height: 60px;
  padding: 0.5rem 0.75rem;
}

.hour-bar {
  flex: 1;
  background: #3b82f6;
  border-radius: 1px 1px 0 0;
  min-height: 2px;
  opacity: 0.7;
}

.hour-bar.highlight {
  background: #1d4ed8;
  opacity: 1;
}

.hourly-labels {
  display: flex;
  justify-content: space-between;
  padding: 0 0.75rem 0.5rem;
  font-size: 0.5625rem;
  color: #9ca3af;
}

.empty-state-sm {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 1.5rem;
  color: #6b7280;
  font-size: 0.75rem;
}

.empty-state-sm i {
  color: #22c55e;
}

.btn-primary {
  padding: 0.5rem 1rem;
  background: #3b82f6;
  color: #fff;
  border: none;
  border-radius: var(--radius-sm);
  font-size: 0.8125rem;
  cursor: pointer;
}
.btn-primary:hover {
  background: #2563eb;
}

@media (max-width: 768px) {
  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }
  .two-col {
    grid-template-columns: 1fr;
  }
  .distribution-row {
    grid-template-columns: 1fr;
  }
  .filters-bar {
    flex-direction: column;
    align-items: stretch;
  }
  .insights-bar {
    flex-direction: column;
    gap: 0.5rem;
  }
}
</style>
