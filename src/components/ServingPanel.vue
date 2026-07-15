<template>
  <div class="serving-panel">
    <div class="sp-header">
      <div>
        <h3>Serving</h3>
        <p class="sp-subtitle">
          What users are getting, measured at the proxy every request crosses. Nothing is installed in the container to
          produce this.
        </p>
      </div>
      <TimeRangePicker v-model="range" :ranges="ranges" />
    </div>

    <div v-if="error" class="sp-error">
      <Icon name="triangle-alert" :size="16" />
      {{ error }}
    </div>

    <div v-else-if="loading && !points.length" class="sp-empty">
      <Icon name="loader" :size="18" spin />
      Reading requests...
    </div>

    <div v-else-if="!points.length" class="sp-empty">
      <Icon name="inbox" :size="24" />
      <p>No requests in this window.</p>
      <span class="sp-hint">Traffic is recorded for deployments served through the proxy.</span>
    </div>

    <template v-else>
      <div class="sp-stats">
        <div class="sp-stat">
          <span class="sp-stat-label">Requests</span>
          <span class="sp-stat-value">{{ totalRequests.toLocaleString() }}</span>
        </div>
        <div class="sp-stat">
          <span class="sp-stat-label">Errors</span>
          <span class="sp-stat-value" :class="{ bad: errorRate > 1 }">{{ errorRate.toFixed(1) }}%</span>
        </div>
        <div class="sp-stat">
          <span class="sp-stat-label">Latency p95</span>
          <span class="sp-stat-value">{{ formatMs(peakP95) }}</span>
        </div>
      </div>

      <div class="sp-charts">
        <div class="sp-chart">
          <h4>Requests</h4>
          <TimeSeriesChart :containers="['requests']" :timestamps="timestamps" :values="[requests]" unit="count" area />
        </div>
        <div class="sp-chart">
          <h4>Errors</h4>
          <TimeSeriesChart
            :containers="['5xx %']"
            :timestamps="timestamps"
            :values="[errorRates]"
            unit="percent"
            area
          />
        </div>
        <div class="sp-chart sp-chart-wide">
          <h4>Response time</h4>
          <TimeSeriesChart :containers="['p95', 'average']" :timestamps="timestamps" :values="[p95, avg]" unit="ms" />
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from "vue";
import { servingApi } from "@/services/api";
import type { REDPoint } from "@/services/api";
import Icon from "@/components/base/Icon.vue";
import TimeRangePicker from "@/components/base/TimeRangePicker.vue";
import TimeSeriesChart from "@/components/charts/TimeSeriesChart.vue";

const props = defineProps<{ deploymentName: string }>();

const ranges = ["15m", "1h", "6h", "24h"];
const range = ref("1h");
const points = ref<REDPoint[]>([]);
const loading = ref(false);
const error = ref("");
let timer: ReturnType<typeof setInterval> | null = null;

const timestamps = computed(() => points.value.map((p) => Math.floor(new Date(p.time).getTime() / 1000)));
const requests = computed(() => points.value.map((p) => p.requests));
const errorRates = computed(() => points.value.map((p) => (p.requests ? (p.errors / p.requests) * 100 : 0)));
const p95 = computed(() => points.value.map((p) => p.p95_time_ms));
const avg = computed(() => points.value.map((p) => p.avg_time_ms));

const totalRequests = computed(() => points.value.reduce((sum, p) => sum + p.requests, 0));
const totalErrors = computed(() => points.value.reduce((sum, p) => sum + p.errors, 0));
const errorRate = computed(() => (totalRequests.value ? (totalErrors.value / totalRequests.value) * 100 : 0));
// The worst p95 in the window, since an average of percentiles says nothing.
const peakP95 = computed(() => points.value.reduce((max, p) => Math.max(max, p.p95_time_ms), 0));

const formatMs = (v: number) => (v >= 1000 ? `${(v / 1000).toFixed(2)}s` : `${Math.round(v)}ms`);

const fetchSeries = async () => {
  loading.value = true;
  try {
    const response = await servingApi.series(props.deploymentName, range.value);
    points.value = response.data.points || [];
    error.value = "";
  } catch (err: any) {
    // Traffic logging is optional, so say what is missing rather than showing an empty chart.
    error.value =
      err.response?.status === 503
        ? "Traffic logging is not enabled, so there is nothing to measure."
        : err.response?.data?.error || err.message || "Could not read serving metrics";
  } finally {
    loading.value = false;
  }
};

watch(range, fetchSeries);

onMounted(() => {
  fetchSeries();
  timer = setInterval(fetchSeries, 15000);
});

onUnmounted(() => {
  if (timer) clearInterval(timer);
});
</script>

<style scoped>
.serving-panel {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  padding: var(--space-4);
}

.sp-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: var(--space-4);
  flex-wrap: wrap;
}

.sp-header h3 {
  margin: 0 0 var(--space-1);
  font-size: var(--text-md);
}

.sp-subtitle {
  margin: 0;
  max-width: 62ch;
  color: var(--text-muted);
  font-size: var(--text-sm);
}

.sp-stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: var(--space-3);
}

.sp-stat {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
  padding: var(--space-3);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-sm);
  background: var(--surface-inset);
}

.sp-stat-label {
  font-size: var(--text-xs);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--text-muted);
}

.sp-stat-value {
  font-size: var(--text-xl);
  font-variant-numeric: tabular-nums;
}

.sp-stat-value.bad {
  color: var(--color-danger-500);
}

.sp-charts {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: var(--space-4);
}

.sp-chart-wide {
  grid-column: 1 / -1;
}

.sp-chart h4 {
  margin: 0 0 var(--space-2);
  font-size: var(--text-sm);
  color: var(--text-muted);
  font-weight: 500;
}

.sp-empty,
.sp-error {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-8);
  color: var(--text-muted);
  font-size: var(--text-sm);
}

.sp-error {
  flex-direction: row;
  justify-content: flex-start;
  padding: var(--space-3) var(--space-4);
  border-radius: var(--radius-sm);
  background: var(--color-danger-50);
  border: 1px solid var(--color-danger-200);
  color: var(--color-danger-700);
}

.sp-hint {
  font-size: var(--text-xs);
  color: var(--text-subtle);
}
</style>
