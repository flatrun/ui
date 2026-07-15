<template>
  <div class="metrics-panel">
    <SubTabs v-model="view" :tabs="views">
      <template v-if="view === 'containers'">
        <div class="panel-toolbar">
          <div class="health-strip">
            <span
              v-for="h in healthList"
              :key="h.container"
              class="hchip"
              :class="`hchip--${h.status}`"
              :title="`${h.container}: ${h.status}`"
            >
              <span class="hdot" />
              {{ h.container }}
            </span>
          </div>
          <TimeRangePicker :model-value="since" :ranges="ranges" @update:model-value="setRange" />
        </div>

        <div v-if="recoveries.length" class="recovery-banner">
          <Icon name="rotate-ccw" :size="15" />
          <span>Auto-restarted {{ recoveries.length }} time{{ recoveries.length > 1 ? "s" : "" }} recently.</span>
        </div>

        <div v-if="error" class="panel-empty">
          <Icon name="plug-zap" :size="26" />
          <p>Metrics unavailable. Is the Observability app running?</p>
        </div>
        <div v-else-if="!hasData" class="panel-empty">
          <Icon name="activity" :size="26" />
          <p>No metrics for this deployment yet.</p>
        </div>

        <div v-else class="chart-grid">
          <div v-for="panel in panels" :key="panel.metric" class="chart-card">
            <div class="chart-title">{{ panel.title }}</div>
            <TimeSeriesChart
              v-if="metrics[panel.metric]"
              :containers="metrics[panel.metric].containers"
              :timestamps="metrics[panel.metric].timestamps"
              :values="metrics[panel.metric].values"
              :unit="panel.unit"
              :area="panel.area"
            />
            <div v-else class="chart-blank">No data</div>
          </div>
        </div>
      </template>

      <ServingPanel v-else :deployment-name="deployment" />
    </SubTabs>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from "vue";
import Icon from "@/components/base/Icon.vue";
import TimeSeriesChart from "@/components/charts/TimeSeriesChart.vue";
import TimeRangePicker from "@/components/base/TimeRangePicker.vue";
import SubTabs from "@/components/base/SubTabs.vue";
import ServingPanel from "@/components/ServingPanel.vue";
import { pluginApi } from "@/services/pluginApi";

const props = defineProps<{
  pluginName: string;
  endpoint: string;
  context?: Record<string, unknown>;
}>();

interface MetricSeries {
  containers: string[];
  timestamps: number[];
  values: (number | null)[][];
}

const api = pluginApi(props.pluginName);
const deployment = String(props.context?.deployment ?? "");

// Containers say what the deployment is doing; serving says whether anyone is getting
// anything out of it. Both belong under metrics and health.
const views = [
  { id: "containers", label: "Containers" },
  { id: "serving", label: "Serving" },
];
const view = ref("containers");

const ranges = ["15m", "1h", "6h", "24h"];
const since = ref("15m");

const metrics = ref<Record<string, MetricSeries>>({});
const healthList = ref<{ container: string; status: string }[]>([]);
const recoveries = ref<{ container: string; at: string }[]>([]);
const error = ref(false);
let timer: number | undefined;

const panels = [
  { metric: "container.cpu.usage", title: "CPU", unit: "percent" as const, area: true },
  { metric: "container.memory.usage", title: "Memory", unit: "bytes" as const, area: true },
  { metric: "container.network.io.rx", title: "Network In", unit: "bytes" as const, area: false },
  { metric: "container.network.io.tx", title: "Network Out", unit: "bytes" as const, area: false },
];

const hasData = computed(() => Object.keys(metrics.value).length > 0);

async function load() {
  error.value = false;
  try {
    const [ts, health, events] = await Promise.all([
      api.get<{ metrics: Record<string, MetricSeries> }>("/metrics/timeseries", { deployment, since: since.value }),
      api.get<{ container: string; status: string }[]>("/health", { deployment }),
      api.get<{ container: string; deployment: string; at: string }[]>("/health/events"),
    ]);
    metrics.value = ts.data.metrics || {};
    healthList.value = health.data || [];
    recoveries.value = (events.data || []).filter((e) => e.deployment === deployment);
  } catch {
    error.value = true;
  }
}

function setRange(r: string) {
  since.value = r;
  load();
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
.metrics-panel {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.panel-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
  flex-wrap: wrap;
}

.health-strip {
  display: flex;
  flex-wrap: wrap;
  gap: 0.375rem;
}

.hchip {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  font-size: var(--text-xs);
  padding: 0.125rem 0.5rem;
  border-radius: var(--radius-full);
  background: var(--surface-inset);
  color: var(--text-muted);
}

.hdot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--text-subtle);
}

.hchip--healthy .hdot {
  background: var(--color-success-500);
}

.hchip--unhealthy {
  color: var(--color-danger-600, #dc2626);
}

.hchip--unhealthy .hdot {
  background: var(--color-danger-500, #ef4444);
}

.hchip--starting .hdot {
  background: var(--color-warning-500);
}

.recovery-banner {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-3);
  background: var(--color-warning-50);
  color: var(--color-warning-700);
  border-radius: var(--radius-sm);
  font-size: var(--text-sm);
}

.panel-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-8);
  color: var(--text-muted);
}

.chart-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(340px, 1fr));
  gap: var(--space-4);
}

.chart-card {
  background: var(--surface-raised);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  padding: var(--space-3);
}

.chart-title {
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  color: var(--text);
  margin-bottom: var(--space-2);
}

.chart-blank {
  color: var(--text-subtle);
  font-size: var(--text-sm);
  padding: var(--space-6);
  text-align: center;
}
</style>
