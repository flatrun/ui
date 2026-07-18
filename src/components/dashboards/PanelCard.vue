<template>
  <div class="panel-card" :style="{ gridColumn: `span ${clampWidth(panel.width)}` }">
    <div class="panel-head">
      <span class="panel-title">{{ panel.title }}</span>
      <span class="panel-scope">{{ panel.deployment || "all deployments" }}</span>
      <div v-if="editable" class="panel-actions">
        <button class="icon-btn" title="Edit panel" @click="emit('edit')"><Icon name="pencil" :size="14" /></button>
        <button class="icon-btn" title="Remove panel" @click="emit('remove')">
          <Icon name="trash-2" :size="14" />
        </button>
      </div>
    </div>

    <div class="panel-body">
      <div v-if="loading" class="panel-msg">Loading</div>
      <div v-else-if="error" class="panel-msg error">{{ error }}</div>
      <template v-else-if="panel.type === 'stat'">
        <div class="stat-value">{{ statDisplay }}</div>
        <div class="stat-sub">{{ seriesLabel }}</div>
      </template>
      <TimeSeriesChart
        v-else-if="series && series.timestamps.length"
        :containers="series.containers"
        :timestamps="series.timestamps"
        :values="series.values"
        :unit="unit"
        area
      />
      <div v-else class="panel-msg">No data in this range</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from "vue";
import Icon from "@/components/base/Icon.vue";
import TimeSeriesChart from "@/components/charts/TimeSeriesChart.vue";
import { observabilityApi, type MetricSeries } from "@/services/observability";
import { servingApi, type DashboardPanel } from "@/services/api";

const props = defineProps<{
  panel: DashboardPanel;
  since: string;
  editable?: boolean;
}>();

const emit = defineEmits<{ edit: []; remove: [] }>();

const loading = ref(false);
const error = ref("");
const series = ref<MetricSeries | null>(null);

const unit = computed<"percent" | "bytes" | "ms" | "count">(() => {
  if (props.panel.source === "serving") return props.panel.series === "latency" ? "ms" : "count";
  if (props.panel.series.startsWith("container.cpu")) return "percent";
  if (props.panel.series.startsWith("container.memory")) return "bytes";
  if (props.panel.series.startsWith("container.network")) return "bytes";
  return "count";
});

const seriesLabel = computed(() => {
  if (props.panel.source === "serving") return `serving · ${props.panel.series}`;
  return props.panel.series.replace("container.", "");
});

// The stat panel shows the most recent value across containers.
const statDisplay = computed(() => {
  if (!series.value) return "-";
  let latest: number | null = null;
  for (const row of series.value.values) {
    for (let i = row.length - 1; i >= 0; i--) {
      if (row[i] != null) {
        latest = (latest ?? 0) + (row[i] as number);
        break;
      }
    }
  }
  if (latest == null) return "-";
  return formatStat(latest, unit.value);
});

function formatStat(v: number, u: string): string {
  if (u === "percent") return `${v.toFixed(1)}%`;
  if (u === "ms") return v >= 1000 ? `${(v / 1000).toFixed(2)}s` : `${v.toFixed(0)}ms`;
  if (u === "bytes") {
    if (v >= 1 << 30) return `${(v / (1 << 30)).toFixed(1)}G`;
    if (v >= 1 << 20) return `${(v / (1 << 20)).toFixed(0)}M`;
    if (v >= 1 << 10) return `${(v / (1 << 10)).toFixed(0)}K`;
    return `${v}B`;
  }
  return v >= 1000 ? `${(v / 1000).toFixed(1)}k` : `${Math.round(v)}`;
}

function clampWidth(w: number): number {
  if (!w || w < 1) return 6;
  return Math.min(12, w);
}

async function load() {
  loading.value = true;
  error.value = "";
  try {
    if (props.panel.source === "serving") {
      if (!props.panel.deployment) {
        error.value = "No deployment set";
        return;
      }
      const { data } = await servingApi.series(props.panel.deployment, props.since);
      const points = data.points || [];
      const field = props.panel.series;
      series.value = {
        containers: [props.panel.deployment],
        timestamps: points.map((p) => Math.floor(Date.parse(p.time) / 1000)),
        values: [points.map((p) => (field === "errors" ? p.errors : field === "latency" ? p.avg_time_ms : p.requests))],
      };
    } else {
      const { data } = await observabilityApi.timeseries(props.panel.deployment || "", props.since);
      series.value = data.metrics?.[props.panel.series] ?? { containers: [], timestamps: [], values: [] };
    }
  } catch (e: any) {
    error.value = e.response?.data?.error || e.message || "Failed to load";
  } finally {
    loading.value = false;
  }
}

watch(() => [props.panel.source, props.panel.series, props.panel.deployment, props.since], load, { immediate: true });
</script>

<style scoped>
.panel-card {
  display: flex;
  flex-direction: column;
  background: var(--surface-raised);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  min-height: 200px;
  overflow: hidden;
}
.panel-head {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  border-bottom: 1px solid var(--border-subtle);
}
.panel-title {
  font-weight: 600;
  font-size: 0.9rem;
}
.panel-scope {
  font-size: 0.75rem;
  color: var(--text-muted);
  margin-left: auto;
}
.panel-actions {
  display: flex;
  gap: 0.25rem;
}
.icon-btn {
  display: inline-flex;
  padding: 0.25rem;
  border: none;
  background: transparent;
  color: var(--text-muted);
  cursor: pointer;
  border-radius: var(--radius-sm);
}
.icon-btn:hover {
  color: var(--text);
  background: var(--surface-inset);
}
.panel-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 1rem;
  min-height: 140px;
}
.panel-msg {
  color: var(--text-muted);
  font-size: 0.85rem;
  text-align: center;
}
.panel-msg.error {
  color: var(--danger, #ef4444);
}
.stat-value {
  font-size: 2.25rem;
  font-weight: 700;
  line-height: 1.1;
}
.stat-sub {
  margin-top: 0.25rem;
  font-size: 0.8rem;
  color: var(--text-muted);
}
</style>
