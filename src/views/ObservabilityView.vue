<template>
  <div class="observability-view">
    <div class="view-header">
      <div>
        <h2>Observability</h2>
        <p class="subtitle">Health and resources across all deployments.</p>
      </div>
      <button class="btn btn-icon" :disabled="loading" @click="load">
        <Icon name="refresh-cw" :size="16" :spin="loading" />
      </button>
    </div>

    <div v-if="loading && !containerCount" class="state-panel">
      <Icon name="loader-circle" spin :size="26" />
      <p>Loading…</p>
    </div>

    <div v-else-if="error" class="state-panel">
      <div class="state-art"><Icon name="plug-zap" :size="34" /></div>
      <h3>Observability app not running</h3>
      <p>Enable the Observability app to collect metrics and health.</p>
      <router-link class="btn btn-primary" to="/marketplace"><Icon name="store" :size="16" /> Marketplace</router-link>
    </div>

    <template v-else>
      <!-- Summary: do I need to worry? -->
      <div class="summary-row">
        <div class="summary-card">
          <span class="summary-num">{{ containerCount }}</span>
          <span class="summary-label">Containers</span>
        </div>
        <div class="summary-card ok">
          <span class="summary-num">{{ healthyCount }}</span>
          <span class="summary-label">Healthy</span>
        </div>
        <div class="summary-card" :class="{ bad: unhealthy.length }">
          <span class="summary-num">{{ unhealthy.length }}</span>
          <span class="summary-label">Unhealthy</span>
        </div>
        <div class="summary-card" :class="{ warn: recoveries.length }">
          <span class="summary-num">{{ recoveries.length }}</span>
          <span class="summary-label">Auto-recovered</span>
        </div>
      </div>

      <!-- Needs attention -->
      <section v-if="unhealthy.length" class="panel attention">
        <h3><Icon name="triangle-alert" :size="16" /> Needs attention</h3>
        <component
          :is="isManaged(u.deployment) ? 'router-link' : 'div'"
          v-for="u in unhealthy"
          :key="u.container"
          class="attention-row"
          :to="isManaged(u.deployment) ? `/deployments/${u.deployment}?tab=plugin:observability` : undefined"
        >
          <span class="dot dot--unhealthy" />
          <span class="a-container">{{ u.container }}</span>
          <span class="a-deployment">{{ deploymentLabel(u.deployment) }}</span>
          <Icon v-if="isManaged(u.deployment)" name="chevron-right" :size="14" />
        </component>
      </section>

      <div class="charts-head">
        <h3>Fleet resources</h3>
        <TimeRangePicker :model-value="since" :ranges="ranges" @update:model-value="setRange" />
      </div>
      <div class="two-col">
        <section class="panel">
          <div class="chart-title"><Icon name="flame" :size="15" /> CPU</div>
          <TimeSeriesChart
            v-if="cpuSeries"
            :containers="cpuSeries.containers"
            :timestamps="cpuSeries.timestamps"
            :values="cpuSeries.values"
            unit="percent"
            area
          />
          <p v-else class="muted">No data.</p>
        </section>
        <section class="panel">
          <div class="chart-title"><Icon name="memory-stick" :size="15" /> Memory</div>
          <TimeSeriesChart
            v-if="memSeries"
            :containers="memSeries.containers"
            :timestamps="memSeries.timestamps"
            :values="memSeries.values"
            unit="bytes"
            area
          />
          <p v-else class="muted">No data.</p>
        </section>
      </div>

      <!-- Recovery timeline -->
      <AlertRulesPanel class="alerts-panel" :deployments="deploymentNames" />

      <section v-if="recoveries.length" class="panel">
        <h3><Icon name="rotate-ccw" :size="16" /> Recent auto-recoveries</h3>
        <div v-for="(r, i) in recoveries.slice().reverse()" :key="i" class="recovery-row">
          <span class="r-container">{{ r.container }}</span>
          <span class="r-deployment">{{ r.deployment || "unassigned" }}</span>
          <span class="r-when">{{ relTime(r.at) }}</span>
        </div>
      </section>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from "vue";
import Icon from "@/components/base/Icon.vue";
import TimeSeriesChart from "@/components/charts/TimeSeriesChart.vue";
import AlertRulesPanel from "@/components/AlertRulesPanel.vue";
import TimeRangePicker from "@/components/base/TimeRangePicker.vue";
import {
  observabilityApi,
  METRIC,
  type ContainerHealth,
  type RecoveryEvent,
  type MetricSeries,
} from "@/services/observability";
import { useDeploymentsStore } from "@/stores/deployments";

// Observability watches every Docker container by compose project; only some are FlatRun
// deployments. Link to the deployment page only for managed ones, so a stray container never
// links to a page that does not exist.
const deploymentsStore = useDeploymentsStore();
const managed = computed(() => new Set(deploymentsStore.deployments.map((d) => d.name)));
const isManaged = (name: string) => managed.value.has(name);
const deploymentNames = computed(() => deploymentsStore.deployments.map((d) => d.name).sort());
const deploymentLabel = (name: string) => (name ? (isManaged(name) ? name : `${name} (external)`) : "unassigned");

const containerCount = ref(0);
const healthList = ref<ContainerHealth[]>([]);
const recoveries = ref<RecoveryEvent[]>([]);
const series = ref<Record<string, MetricSeries>>({});
const loading = ref(true);
const error = ref(false);
const ranges = ["15m", "1h", "6h", "24h"];
const since = ref("15m");
let timer: number | undefined;

async function load() {
  loading.value = true;
  error.value = false;
  try {
    const [metrics, health, events, ts] = await Promise.all([
      observabilityApi.latest(),
      observabilityApi.health(),
      observabilityApi.recoveries(),
      observabilityApi.timeseries("", since.value),
    ]);
    containerCount.value = (metrics.data || []).reduce((n, d) => n + d.containers.length, 0);
    healthList.value = health.data || [];
    recoveries.value = events.data || [];
    series.value = ts.data.metrics || {};
    if (!deploymentsStore.deployments.length) await deploymentsStore.fetchDeployments();
  } catch {
    error.value = true;
  } finally {
    loading.value = false;
  }
}

function setRange(r: string) {
  since.value = r;
  load();
}

const healthyCount = computed(() => healthList.value.filter((h) => h.status === "healthy").length);
const unhealthy = computed(() => healthList.value.filter((h) => h.status === "unhealthy"));
const cpuSeries = computed(() => series.value[METRIC.cpu]);
const memSeries = computed(() => series.value[METRIC.memUsage]);

function relTime(iso: string): string {
  const secs = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (secs < 60) return "just now";
  if (secs < 3600) return `${Math.floor(secs / 60)}m ago`;
  return `${Math.floor(secs / 3600)}h ago`;
}

onMounted(() => {
  load();
  timer = window.setInterval(load, 10000);
});
onUnmounted(() => {
  if (timer) window.clearInterval(timer);
});
</script>

<style scoped>
.observability-view {
  display: flex;
  flex-direction: column;
  gap: var(--space-5);
}

.view-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
}

.view-header h2 {
  margin: 0;
  font-size: var(--text-xl);
  color: var(--text);
}

.subtitle {
  margin: var(--space-1) 0 0 0;
  color: var(--text-muted);
  font-size: var(--text-sm);
}

.btn {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  padding: var(--space-2) var(--space-3);
  border-radius: var(--radius-sm);
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  cursor: pointer;
  border: 1px solid transparent;
  text-decoration: none;
}

.btn-icon {
  background: var(--surface-raised);
  border-color: var(--border);
  color: var(--text-muted);
}

.btn-primary {
  background: var(--color-primary-500);
  color: white;
}

.state-panel {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: var(--space-3);
  padding: var(--space-12) var(--space-6);
  background: var(--surface-raised);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  color: var(--text-muted);
}

.state-art {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--surface-sunken);
  color: var(--text-subtle);
}

.state-panel h3 {
  margin: 0;
  color: var(--text);
}

.summary-row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: var(--space-3);
}

.summary-card {
  background: var(--surface-raised);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  padding: var(--space-4);
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.summary-num {
  font-size: var(--text-2xl);
  font-weight: var(--font-bold);
  color: var(--text);
  font-variant-numeric: tabular-nums;
}

.summary-label {
  font-size: var(--text-sm);
  color: var(--text-muted);
}

.summary-card.ok .summary-num {
  color: var(--color-success-600);
}

.summary-card.bad {
  border-color: var(--color-danger-300, #fca5a5);
}

.summary-card.bad .summary-num {
  color: var(--color-danger-600, #dc2626);
}

.summary-card.warn .summary-num {
  color: var(--color-warning-600);
}

.panel {
  background: var(--surface-raised);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  padding: var(--space-4);
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.panel h3 {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  margin: 0 0 var(--space-2) 0;
  font-size: var(--text-md);
  color: var(--text);
}

.attention {
  border-color: var(--color-danger-200, #fecaca);
}

.attention-row {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-2);
  border-radius: var(--radius-sm);
  text-decoration: none;
  color: var(--text);
}

.attention-row:hover {
  background: var(--surface-sunken);
}

.a-container {
  font-weight: var(--font-medium);
  font-size: var(--text-sm);
}

.a-deployment {
  margin-left: auto;
  color: var(--text-muted);
  font-size: var(--text-xs);
}

.dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.dot--unhealthy {
  background: var(--color-danger-500, #ef4444);
}

.charts-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.charts-head h3 {
  margin: 0;
  font-size: var(--text-md);
  color: var(--text);
}

.two-col {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-4);
}

@media (max-width: 720px) {
  .two-col {
    grid-template-columns: 1fr;
  }
}

.consumer-row {
  display: grid;
  grid-template-columns: 1fr 2fr auto;
  align-items: center;
  gap: var(--space-3);
  font-size: var(--text-sm);
}

.c-name {
  color: var(--text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.c-val {
  color: var(--text-muted);
  font-variant-numeric: tabular-nums;
}

.bar {
  height: 6px;
  border-radius: var(--radius-full);
  background: var(--surface-inset);
  overflow: hidden;
}

.bar-fill {
  height: 100%;
  background: var(--color-primary-500);
}

.bar-fill.mem {
  background: #8b5cf6;
}

.recovery-row {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-1) 0;
  font-size: var(--text-sm);
}

.r-container {
  font-weight: var(--font-medium);
  color: var(--text);
}

.r-deployment {
  color: var(--text-muted);
  font-size: var(--text-xs);
}

.r-when {
  margin-left: auto;
  color: var(--text-subtle);
  font-size: var(--text-xs);
}

.muted {
  color: var(--text-muted);
  font-size: var(--text-sm);
  margin: 0;
}
</style>
