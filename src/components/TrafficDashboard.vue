<template>
  <div class="traffic-dashboard">
    <div v-if="loading && !stats" class="loading-state">
      <i class="pi pi-spin pi-spinner" />
      <span>Analyzing traffic patterns...</span>
    </div>

    <div v-else-if="stats" class="traffic-content">
      <!-- Quick Insights Bar -->
      <div class="insights-bar">
        <div class="time-range">
          <select v-model="timeRange" class="time-select" @change="fetchData">
            <option value="1h">Last hour</option>
            <option value="6h">Last 6 hours</option>
            <option value="24h">Last 24 hours</option>
            <option value="7d">Last 7 days</option>
          </select>
          <button class="btn-refresh" :disabled="loading" @click="fetchData">
            <i class="pi pi-refresh" :class="{ 'pi-spin': loading }" />
          </button>
        </div>
        <div class="insights-summary">
          <span class="insight-item" :class="overallHealthClass">
            <i :class="overallHealthIcon" />
            {{ overallHealthText }}
          </span>
          <span v-if="hasAnomalies" class="insight-item warning">
            <i class="pi pi-exclamation-triangle" />
            {{ anomalyCount }} anomalies detected
          </span>
        </div>
      </div>

      <!-- Deployment Performance Cards -->
      <div v-if="deploymentInsights.length > 0" class="deployments-section">
        <h3>Deployment Performance</h3>
        <div class="deployment-cards">
          <div v-for="dep in deploymentInsights" :key="dep.name" class="deployment-card" :class="dep.healthClass">
            <div class="dep-header">
              <span class="dep-name">{{ dep.name }}</span>
              <span class="dep-status" :class="dep.healthClass">{{ dep.healthLabel }}</span>
            </div>
            <div class="dep-metrics">
              <div class="metric">
                <span class="metric-value">{{ formatNumber(dep.requests) }}</span>
                <span class="metric-label">requests</span>
              </div>
              <div class="metric">
                <span class="metric-value" :class="{ slow: dep.avgTime > 500 }">
                  {{ formatTime(dep.avgTime) }}
                </span>
                <span class="metric-label">avg response</span>
              </div>
              <div class="metric">
                <span class="metric-value" :class="{ high: dep.errorRate > 5 }"> {{ dep.errorRate.toFixed(1) }}% </span>
                <span class="metric-label">error rate</span>
              </div>
            </div>
            <div class="dep-bar">
              <div class="bar-segment success" :style="{ width: dep.successPct + '%' }" />
              <div class="bar-segment redirect" :style="{ width: dep.redirectPct + '%' }" />
              <div class="bar-segment client-error" :style="{ width: dep.clientErrorPct + '%' }" />
              <div class="bar-segment server-error" :style="{ width: dep.serverErrorPct + '%' }" />
            </div>
            <div v-if="dep.insight" class="dep-insight">
              <i :class="dep.insightIcon" />
              {{ dep.insight }}
            </div>
          </div>
        </div>
      </div>

      <!-- Performance Alerts -->
      <div v-if="performanceAlerts.length > 0" class="alerts-section">
        <h3>Performance Alerts</h3>
        <div class="alerts-list">
          <div v-for="alert in performanceAlerts" :key="alert.id" class="alert-item" :class="alert.severity">
            <i :class="alert.icon" />
            <div class="alert-content">
              <span class="alert-title">{{ alert.title }}</span>
              <span class="alert-desc">{{ alert.description }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Slow Endpoints -->
      <div v-if="slowEndpoints.length > 0" class="slow-endpoints-section">
        <h3>Slowest Endpoints</h3>
        <div class="endpoints-list">
          <div v-for="ep in slowEndpoints" :key="ep.path" class="endpoint-item">
            <div class="endpoint-info">
              <span class="endpoint-path">{{ ep.path }}</span>
              <span class="endpoint-requests">{{ formatNumber(ep.requests) }} requests</span>
            </div>
            <div class="endpoint-time" :class="getTimeClass(ep.avgTime)">
              {{ formatTime(ep.avgTime) }}
            </div>
            <div class="time-bar">
              <div
                class="time-fill"
                :style="{ width: getTimeBarWidth(ep.avgTime) + '%' }"
                :class="getTimeClass(ep.avgTime)"
              />
            </div>
          </div>
        </div>
      </div>

      <!-- Top Active IPs -->
      <div v-if="topIPs.length > 0" class="ips-section">
        <h3>Most Active Sources</h3>
        <div class="ips-grid">
          <div v-for="ip in topIPs" :key="ip.ip" class="ip-item">
            <span class="ip-address">{{ ip.ip }}</span>
            <span class="ip-count">{{ formatNumber(ip.requests) }} req</span>
            <span class="ip-data">{{ formatBytes(ip.bytes) }}</span>
          </div>
        </div>
      </div>

      <!-- Summary Stats Footer -->
      <div class="summary-footer">
        <div class="summary-stat">
          <span class="summary-value">{{ formatNumber(stats.total_requests) }}</span>
          <span class="summary-label">Total Requests</span>
        </div>
        <div class="summary-stat">
          <span class="summary-value">{{ formatBytes(stats.total_bytes) }}</span>
          <span class="summary-label">Data Transferred</span>
        </div>
        <div class="summary-stat">
          <span class="summary-value">{{ formatTime(stats.avg_response_time_ms) }}</span>
          <span class="summary-label">Avg Response</span>
        </div>
        <div class="summary-stat">
          <span class="summary-value" :class="{ error: globalErrorRate > 5 }">{{ globalErrorRate }}%</span>
          <span class="summary-label">Error Rate</span>
        </div>
      </div>
    </div>

    <div v-else class="empty-state">
      <i class="pi pi-chart-line" />
      <h4>No Traffic Data Yet</h4>
      <p>Traffic will appear here once requests flow through your deployments.</p>
      <div class="empty-actions">
        <select v-model="timeRange" class="time-select">
          <option value="1h">Last hour</option>
          <option value="6h">Last 6 hours</option>
          <option value="24h">Last 24 hours</option>
          <option value="7d">Last 7 days</option>
        </select>
        <button class="btn btn-primary" @click="fetchData">Check for Traffic</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { storeToRefs } from "pinia";
import { useTrafficStore } from "@/stores/traffic";

const props = defineProps<{
  deployment?: string;
  autoFetch?: boolean;
}>();

const trafficStore = useTrafficStore();
const { stats, loading } = storeToRefs(trafficStore);

const timeRange = ref("24h");

interface DeploymentInsight {
  name: string;
  requests: number;
  avgTime: number;
  errorRate: number;
  successPct: number;
  redirectPct: number;
  clientErrorPct: number;
  serverErrorPct: number;
  healthClass: string;
  healthLabel: string;
  insight: string | null;
  insightIcon: string;
}

interface PerformanceAlert {
  id: string;
  severity: string;
  icon: string;
  title: string;
  description: string;
}

const globalErrorRate = computed(() => {
  if (!stats.value || stats.value.total_requests === 0) return 0;
  const errors = (stats.value.by_status_group?.["4xx"] || 0) + (stats.value.by_status_group?.["5xx"] || 0);
  return Number(((errors / stats.value.total_requests) * 100).toFixed(1));
});

const overallHealthClass = computed(() => {
  const rate = globalErrorRate.value;
  if (rate > 10) return "critical";
  if (rate > 5) return "warning";
  if (rate > 1) return "degraded";
  return "healthy";
});

const overallHealthIcon = computed(() => {
  const cls = overallHealthClass.value;
  if (cls === "critical") return "pi pi-times-circle";
  if (cls === "warning") return "pi pi-exclamation-circle";
  if (cls === "degraded") return "pi pi-minus-circle";
  return "pi pi-check-circle";
});

const overallHealthText = computed(() => {
  const cls = overallHealthClass.value;
  if (cls === "critical") return "Critical issues detected";
  if (cls === "warning") return "Elevated error rate";
  if (cls === "degraded") return "Minor issues";
  return "All systems healthy";
});

const hasAnomalies = computed(() => performanceAlerts.value.length > 0);
const anomalyCount = computed(() => performanceAlerts.value.length);

const deploymentInsights = computed((): DeploymentInsight[] => {
  if (!stats.value?.deployment_stats) return [];

  return stats.value.deployment_stats
    .map((dep) => {
      const total = dep.total_requests || 1;
      const successPct = (dep.status_2xx / total) * 100;
      const redirectPct = (dep.status_3xx / total) * 100;
      const clientErrorPct = (dep.status_4xx / total) * 100;
      const serverErrorPct = (dep.status_5xx / total) * 100;

      let healthClass = "healthy";
      let healthLabel = "Healthy";
      if (dep.error_rate > 10) {
        healthClass = "critical";
        healthLabel = "Critical";
      } else if (dep.error_rate > 5) {
        healthClass = "warning";
        healthLabel = "Degraded";
      } else if (dep.avg_response_time > 1000) {
        healthClass = "slow";
        healthLabel = "Slow";
      }

      let insight: string | null = null;
      let insightIcon = "pi pi-info-circle";
      if (dep.status_5xx > 0 && dep.status_5xx / total > 0.05) {
        insight = `${dep.status_5xx} server errors (${((dep.status_5xx / total) * 100).toFixed(1)}%)`;
        insightIcon = "pi pi-exclamation-triangle";
      } else if (dep.avg_response_time > 1000) {
        insight = `Response time above 1s threshold`;
        insightIcon = "pi pi-clock";
      } else if (dep.status_4xx > dep.status_2xx * 0.1) {
        insight = `High client error ratio`;
        insightIcon = "pi pi-exclamation-circle";
      }

      return {
        name: dep.name,
        requests: dep.total_requests,
        avgTime: dep.avg_response_time,
        errorRate: dep.error_rate,
        successPct,
        redirectPct,
        clientErrorPct,
        serverErrorPct,
        healthClass,
        healthLabel,
        insight,
        insightIcon,
      };
    })
    .sort((a, b) => b.requests - a.requests);
});

const performanceAlerts = computed((): PerformanceAlert[] => {
  if (!stats.value) return [];

  const alerts: PerformanceAlert[] = [];

  if (stats.value.deployment_stats) {
    stats.value.deployment_stats.forEach((dep) => {
      if (dep.error_rate > 10) {
        alerts.push({
          id: `error-${dep.name}`,
          severity: "critical",
          icon: "pi pi-times-circle",
          title: `High error rate on ${dep.name}`,
          description: `${dep.error_rate.toFixed(1)}% of requests failing`,
        });
      }
      if (dep.avg_response_time > 2000) {
        alerts.push({
          id: `slow-${dep.name}`,
          severity: "warning",
          icon: "pi pi-clock",
          title: `Slow responses on ${dep.name}`,
          description: `Average ${formatTime(dep.avg_response_time)} response time`,
        });
      }
    });
  }

  const serverErrors = stats.value.by_status_group?.["5xx"] || 0;
  if (serverErrors > 100) {
    alerts.push({
      id: "5xx-high",
      severity: "critical",
      icon: "pi pi-server",
      title: "Elevated server errors",
      description: `${formatNumber(serverErrors)} 5xx errors in the selected period`,
    });
  }

  return alerts.slice(0, 5);
});

const slowEndpoints = computed(() => {
  if (!stats.value?.top_paths) return [];
  return stats.value.top_paths
    .filter((p) => p.avg_time_ms > 200)
    .sort((a, b) => b.avg_time_ms - a.avg_time_ms)
    .slice(0, 5)
    .map((p) => ({
      path: p.path,
      requests: p.request_count,
      avgTime: p.avg_time_ms,
    }));
});

const maxEndpointTime = computed(() => {
  if (!slowEndpoints.value.length) return 1000;
  return Math.max(...slowEndpoints.value.map((e) => e.avgTime), 1000);
});

const topIPs = computed(() => {
  if (!stats.value?.top_ips) return [];
  return stats.value.top_ips.slice(0, 6).map((ip) => ({
    ip: ip.ip,
    requests: ip.request_count,
    bytes: ip.bytes_sent,
  }));
});

const fetchData = async () => {
  if (props.deployment) {
    await trafficStore.fetchDeploymentStats(props.deployment, timeRange.value);
  } else {
    await trafficStore.fetchStats({ since: timeRange.value });
  }
};

const formatNumber = (num: number): string => {
  if (!num) return "0";
  if (num >= 1000000) return (num / 1000000).toFixed(1) + "M";
  if (num >= 1000) return (num / 1000).toFixed(1) + "K";
  return num.toString();
};

const formatBytes = (bytes: number): string => {
  if (!bytes) return "0 B";
  if (bytes >= 1073741824) return (bytes / 1073741824).toFixed(1) + " GB";
  if (bytes >= 1048576) return (bytes / 1048576).toFixed(1) + " MB";
  if (bytes >= 1024) return (bytes / 1024).toFixed(1) + " KB";
  return bytes + " B";
};

const formatTime = (ms: number): string => {
  if (!ms) return "0ms";
  if (ms >= 1000) return (ms / 1000).toFixed(2) + "s";
  return Math.round(ms) + "ms";
};

const getTimeClass = (ms: number): string => {
  if (ms > 1000) return "critical";
  if (ms > 500) return "slow";
  if (ms > 200) return "moderate";
  return "fast";
};

const getTimeBarWidth = (ms: number): number => {
  return Math.min((ms / maxEndpointTime.value) * 100, 100);
};

onMounted(() => {
  if (props.autoFetch) {
    fetchData();
  }
});
</script>

<style scoped>
.traffic-dashboard {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.loading-state,
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  padding: 3rem;
  background: white;
  border-radius: 12px;
  border: 1px solid #e5e7eb;
  text-align: center;
}

.empty-state i {
  font-size: 2.5rem;
  color: #d1d5db;
}

.empty-state h4 {
  margin: 0;
  font-size: 1rem;
  color: #374151;
}

.empty-state p {
  margin: 0;
  font-size: 0.875rem;
  color: #6b7280;
}

.empty-actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-top: 0.5rem;
}

.traffic-content {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

/* Insights Bar */
.insights-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 1rem;
  background: white;
  border-radius: 10px;
  border: 1px solid #e5e7eb;
}

.time-range {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.time-select {
  padding: 0.375rem 0.75rem;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  font-size: 0.8125rem;
  color: #374151;
  background: white;
}

.btn-refresh {
  padding: 0.375rem;
  border: none;
  background: transparent;
  color: #6b7280;
  cursor: pointer;
  border-radius: 4px;
}

.btn-refresh:hover {
  background: #f3f4f6;
}

.insights-summary {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.insight-item {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  font-size: 0.8125rem;
  font-weight: 500;
}

.insight-item.healthy {
  color: #059669;
}

.insight-item.degraded {
  color: #d97706;
}

.insight-item.warning {
  color: #ea580c;
}

.insight-item.critical {
  color: #dc2626;
}

/* Sections */
h3 {
  margin: 0 0 0.75rem 0;
  font-size: 0.8125rem;
  font-weight: 600;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

/* Deployment Cards */
.deployment-cards {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 1rem;
}

.deployment-card {
  padding: 1rem;
  background: white;
  border-radius: 10px;
  border: 1px solid #e5e7eb;
  border-left: 3px solid #22c55e;
}

.deployment-card.warning {
  border-left-color: #f59e0b;
}

.deployment-card.critical {
  border-left-color: #ef4444;
}

.deployment-card.slow {
  border-left-color: #8b5cf6;
}

.dep-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.75rem;
}

.dep-name {
  font-weight: 600;
  color: #1f2937;
  font-size: 0.9375rem;
}

.dep-status {
  font-size: 0.6875rem;
  font-weight: 600;
  padding: 0.125rem 0.5rem;
  border-radius: 9999px;
  text-transform: uppercase;
}

.dep-status.healthy {
  background: #d1fae5;
  color: #059669;
}

.dep-status.warning {
  background: #fef3c7;
  color: #d97706;
}

.dep-status.critical {
  background: #fee2e2;
  color: #dc2626;
}

.dep-status.slow {
  background: #ede9fe;
  color: #7c3aed;
}

.dep-metrics {
  display: flex;
  gap: 1.5rem;
  margin-bottom: 0.75rem;
}

.metric {
  display: flex;
  flex-direction: column;
}

.metric-value {
  font-size: 1.125rem;
  font-weight: 700;
  color: #1f2937;
}

.metric-value.slow {
  color: #7c3aed;
}

.metric-value.high {
  color: #dc2626;
}

.metric-label {
  font-size: 0.6875rem;
  color: #6b7280;
}

.dep-bar {
  display: flex;
  height: 4px;
  border-radius: 2px;
  overflow: hidden;
  background: #f3f4f6;
  margin-bottom: 0.5rem;
}

.bar-segment {
  height: 100%;
}

.bar-segment.success {
  background: #22c55e;
}

.bar-segment.redirect {
  background: #3b82f6;
}

.bar-segment.client-error {
  background: #f59e0b;
}

.bar-segment.server-error {
  background: #ef4444;
}

.dep-insight {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  font-size: 0.75rem;
  color: #6b7280;
  padding-top: 0.5rem;
  border-top: 1px solid #f3f4f6;
}

.dep-insight i {
  color: #d97706;
}

/* Alerts */
.alerts-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.alert-item {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  border-radius: 8px;
  background: #fef2f2;
}

.alert-item.warning {
  background: #fffbeb;
}

.alert-item.warning i {
  color: #d97706;
}

.alert-item.critical i {
  color: #dc2626;
}

.alert-content {
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
}

.alert-title {
  font-size: 0.875rem;
  font-weight: 600;
  color: #1f2937;
}

.alert-desc {
  font-size: 0.75rem;
  color: #6b7280;
}

/* Slow Endpoints */
.endpoints-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.endpoint-item {
  display: grid;
  grid-template-columns: 1fr auto 100px;
  gap: 1rem;
  align-items: center;
  padding: 0.75rem 1rem;
  background: white;
  border-radius: 8px;
  border: 1px solid #e5e7eb;
}

.endpoint-info {
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
  min-width: 0;
}

.endpoint-path {
  font-family: ui-monospace, monospace;
  font-size: 0.8125rem;
  color: #1f2937;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.endpoint-requests {
  font-size: 0.6875rem;
  color: #6b7280;
}

.endpoint-time {
  font-weight: 600;
  font-size: 0.875rem;
}

.endpoint-time.fast {
  color: #059669;
}

.endpoint-time.moderate {
  color: #d97706;
}

.endpoint-time.slow {
  color: #ea580c;
}

.endpoint-time.critical {
  color: #dc2626;
}

.time-bar {
  height: 6px;
  background: #f3f4f6;
  border-radius: 3px;
  overflow: hidden;
}

.time-fill {
  height: 100%;
  border-radius: 3px;
}

.time-fill.fast {
  background: #22c55e;
}

.time-fill.moderate {
  background: #f59e0b;
}

.time-fill.slow {
  background: #ea580c;
}

.time-fill.critical {
  background: #ef4444;
}

/* Top IPs */
.ips-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 0.5rem;
}

.ip-item {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  padding: 0.75rem;
  background: white;
  border-radius: 8px;
  border: 1px solid #e5e7eb;
}

.ip-address {
  font-family: ui-monospace, monospace;
  font-size: 0.8125rem;
  color: #1f2937;
}

.ip-count,
.ip-data {
  font-size: 0.6875rem;
  color: #6b7280;
}

/* Summary Footer */
.summary-footer {
  display: flex;
  justify-content: space-around;
  padding: 1rem;
  background: #f9fafb;
  border-radius: 10px;
  border: 1px solid #e5e7eb;
}

.summary-stat {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.25rem;
}

.summary-value {
  font-size: 1.25rem;
  font-weight: 700;
  color: #1f2937;
}

.summary-value.error {
  color: #dc2626;
}

.summary-label {
  font-size: 0.6875rem;
  color: #6b7280;
  text-transform: uppercase;
}

/* Buttons */
.btn {
  padding: 0.5rem 1rem;
  font-size: 0.8125rem;
  font-weight: 500;
  border-radius: 6px;
  border: none;
  cursor: pointer;
}

.btn-primary {
  background: #3b82f6;
  color: white;
}

.btn-primary:hover {
  background: #2563eb;
}

@media (max-width: 768px) {
  .insights-bar {
    flex-direction: column;
    gap: 0.75rem;
    align-items: flex-start;
  }

  .deployment-cards {
    grid-template-columns: 1fr;
  }

  .endpoint-item {
    grid-template-columns: 1fr;
    gap: 0.5rem;
  }

  .summary-footer {
    flex-wrap: wrap;
    gap: 1rem;
  }

  .summary-stat {
    flex: 1 1 40%;
  }
}
</style>
