<template>
  <div class="deployment-traffic">
    <div class="traffic-header">
      <div class="traffic-title">
        <i class="pi pi-chart-line" />
        <h4>Traffic Stats</h4>
      </div>
      <div class="traffic-controls">
        <select v-model="timeRange" class="time-select" @change="fetchData">
          <option value="1h">Last 1 hour</option>
          <option value="6h">Last 6 hours</option>
          <option value="24h">Last 24 hours</option>
          <option value="7d">Last 7 days</option>
        </select>
        <button class="btn btn-icon btn-sm" :disabled="loading" @click="fetchData">
          <i class="pi pi-refresh" :class="{ 'pi-spin': loading }" />
        </button>
      </div>
    </div>

    <div v-if="loading && !stats" class="loading-state">
      <i class="pi pi-spin pi-spinner" />
      <span>Loading traffic stats...</span>
    </div>

    <div v-else-if="stats" class="traffic-content">
      <div class="stats-row">
        <div class="stat-item">
          <span class="stat-value">{{ formatNumber(stats.total_requests) }}</span>
          <span class="stat-label">Requests</span>
        </div>
        <div class="stat-item">
          <span class="stat-value">{{ formatTime(stats.avg_response_time_ms) }}</span>
          <span class="stat-label">Avg Response</span>
        </div>
        <div class="stat-item">
          <span class="stat-value">{{ formatBytes(stats.total_bytes) }}</span>
          <span class="stat-label">Total Bytes</span>
        </div>
        <div class="stat-item">
          <span class="stat-value" :class="{ error: errorRate > 5 }">{{ errorRate }}%</span>
          <span class="stat-label">Error Rate</span>
        </div>
      </div>

      <div class="status-distribution">
        <div
          v-for="(count, status) in stats.by_status_group"
          :key="status"
          class="status-bar"
          :class="getStatusClass(status)"
          :style="{ width: getStatusWidth(count) + '%' }"
          :title="`${status}: ${count} requests`"
        />
      </div>
      <div class="status-legend">
        <span v-for="(count, status) in stats.by_status_group" :key="status" class="legend-item">
          <span class="legend-dot" :class="getStatusClass(status)" />
          {{ status }}: {{ formatNumber(count) }}
        </span>
      </div>

      <div v-if="stats.top_paths?.length > 0" class="top-paths">
        <h5>Top Paths</h5>
        <div class="paths-list">
          <div v-for="path in stats.top_paths.slice(0, 5)" :key="path.path" class="path-item">
            <span class="path-name">{{ path.path }}</span>
            <div class="path-stats">
              <span class="path-count">{{ formatNumber(path.request_count) }}</span>
              <span class="path-time">{{ formatTime(path.avg_time_ms) }}</span>
              <span v-if="path.error_count > 0" class="path-errors">{{ path.error_count }} errors</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-else class="empty-state">
      <span>No traffic data for this deployment</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from "vue";
import { useTrafficStore } from "@/stores/traffic";
import type { TrafficStats } from "@/services/api";

const props = defineProps<{
  deployment: string;
  autoFetch?: boolean;
}>();

const trafficStore = useTrafficStore();
const stats = ref<TrafficStats | null>(null);
const loading = ref(false);
const timeRange = ref("24h");

const errorRate = computed(() => {
  if (!stats.value || stats.value.total_requests === 0) return 0;
  const errors = (stats.value.by_status_group?.["4xx"] || 0) + (stats.value.by_status_group?.["5xx"] || 0);
  return Number(((errors / stats.value.total_requests) * 100).toFixed(1));
});

const fetchData = async () => {
  loading.value = true;
  try {
    const result = await trafficStore.fetchDeploymentStats(props.deployment, timeRange.value);
    stats.value = result.stats;
  } catch {
    stats.value = null;
  } finally {
    loading.value = false;
  }
};

const formatNumber = (num: number): string => {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + "M";
  if (num >= 1000) return (num / 1000).toFixed(1) + "K";
  return num?.toString() || "0";
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

const getStatusClass = (status: string): string => {
  if (status.startsWith("2")) return "status-2xx";
  if (status.startsWith("3")) return "status-3xx";
  if (status.startsWith("4")) return "status-4xx";
  if (status.startsWith("5")) return "status-5xx";
  return "status-other";
};

const getStatusWidth = (count: number): number => {
  if (!stats.value || stats.value.total_requests === 0) return 0;
  return Math.max((count / stats.value.total_requests) * 100, 2);
};

watch(
  () => props.deployment,
  () => {
    if (props.deployment) {
      fetchData();
    }
  },
);

onMounted(() => {
  if (props.autoFetch && props.deployment) {
    fetchData();
  }
});
</script>

<style scoped>
.deployment-traffic {
  background: white;
  border-radius: 12px;
  border: 1px solid #e5e7eb;
  padding: 1rem;
}

.traffic-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.traffic-title {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.traffic-title i {
  color: #3b82f6;
}

.traffic-title h4 {
  margin: 0;
  font-size: 0.875rem;
  font-weight: 600;
  color: #1f2937;
}

.traffic-controls {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.time-select {
  padding: 0.375rem 0.5rem;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  font-size: 0.75rem;
  color: #374151;
  background: white;
  cursor: pointer;
}

.loading-state,
.empty-state {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 2rem;
  color: #9ca3af;
  font-size: 0.8125rem;
}

.traffic-content {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.stats-row {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 0.75rem;
}

.stat-item {
  text-align: center;
}

.stat-value {
  display: block;
  font-size: 1.25rem;
  font-weight: 700;
  color: #1f2937;
}

.stat-value.error {
  color: #dc2626;
}

.stat-label {
  font-size: 0.6875rem;
  color: #6b7280;
  text-transform: uppercase;
}

.status-distribution {
  display: flex;
  height: 8px;
  border-radius: 4px;
  overflow: hidden;
  background: #f3f4f6;
}

.status-bar {
  height: 100%;
  transition: width 0.3s ease;
}

.status-bar.status-2xx {
  background: #22c55e;
}

.status-bar.status-3xx {
  background: #3b82f6;
}

.status-bar.status-4xx {
  background: #f59e0b;
}

.status-bar.status-5xx {
  background: #ef4444;
}

.status-legend {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  justify-content: center;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.6875rem;
  color: #6b7280;
}

.legend-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.legend-dot.status-2xx {
  background: #22c55e;
}

.legend-dot.status-3xx {
  background: #3b82f6;
}

.legend-dot.status-4xx {
  background: #f59e0b;
}

.legend-dot.status-5xx {
  background: #ef4444;
}

.top-paths {
  margin-top: 0.5rem;
}

.top-paths h5 {
  margin: 0 0 0.5rem 0;
  font-size: 0.75rem;
  font-weight: 600;
  color: #374151;
  text-transform: uppercase;
}

.paths-list {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
}

.path-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.375rem 0.5rem;
  background: #f9fafb;
  border-radius: 4px;
}

.path-name {
  font-size: 0.75rem;
  font-family: ui-monospace, monospace;
  color: #374151;
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.path-stats {
  display: flex;
  gap: 0.75rem;
  align-items: center;
}

.path-count,
.path-time {
  font-size: 0.6875rem;
  color: #6b7280;
}

.path-errors {
  font-size: 0.6875rem;
  color: #dc2626;
  font-weight: 500;
}

.btn {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem;
  font-size: 0.875rem;
  font-weight: 500;
  border-radius: 6px;
  border: none;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-sm {
  padding: 0.25rem;
}

.btn-icon {
  background: transparent;
  color: #6b7280;
}

.btn-icon:hover:not(:disabled) {
  background: #f3f4f6;
  color: #374151;
}

@media (max-width: 640px) {
  .stats-row {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>
