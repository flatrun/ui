<template>
  <div ref="host" class="ts-chart" />
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, nextTick } from "vue";
import uPlot from "uplot";
import "uplot/dist/uPlot.min.css";

const props = defineProps<{
  containers: string[];
  timestamps: number[]; // unix seconds
  values: (number | null)[][]; // [container][time]
  unit?: "percent" | "bytes";
  area?: boolean;
}>();

const host = ref<HTMLElement | null>(null);
let chart: uPlot | null = null;
let ro: ResizeObserver | null = null;

// A fixed palette that reads well in light and dark. uPlot draws on canvas, so it can't use
// CSS variables directly.
const palette = ["#6366f1", "#10b981", "#f59e0b", "#ec4899", "#0ea5e9", "#8b5cf6", "#ef4444", "#14b8a6"];

function fmtValue(v: number | null): string {
  if (v == null) return "-";
  if (props.unit === "percent") return `${v.toFixed(1)}%`;
  if (props.unit === "bytes") {
    if (v >= 1 << 30) return `${(v / (1 << 30)).toFixed(1)}G`;
    if (v >= 1 << 20) return `${(v / (1 << 20)).toFixed(0)}M`;
    if (v >= 1 << 10) return `${(v / (1 << 10)).toFixed(0)}K`;
    return `${v}B`;
  }
  return String(v);
}

function data(): uPlot.AlignedData {
  return [props.timestamps, ...props.values.map((row) => row.map((v) => (v == null ? null : v)))] as uPlot.AlignedData;
}

function options(width: number): uPlot.Options {
  const stroke = "#8894a8";
  const grid = "rgba(136, 148, 168, 0.15)";
  return {
    width,
    height: 180,
    padding: [8, 8, 0, 0],
    cursor: { points: { size: 5 }, focus: { prox: 24 } },
    legend: { live: true },
    scales: { x: { time: true } },
    series: [
      {},
      ...props.containers.map((label, i) => ({
        label,
        stroke: palette[i % palette.length],
        width: 1.5,
        fill: props.area ? palette[i % palette.length] + "22" : undefined,
        value: (_u: uPlot, v: number | null) => fmtValue(v),
      })),
    ],
    axes: [
      { stroke, grid: { stroke: grid, width: 1 }, ticks: { stroke: grid } },
      {
        stroke,
        grid: { stroke: grid, width: 1 },
        ticks: { stroke: grid },
        size: 52,
        values: (_u: uPlot, vals: number[]) => vals.map((v) => fmtValue(v)),
      },
    ],
  };
}

function render() {
  if (!host.value) return;
  const width = host.value.clientWidth || 320;
  if (chart) {
    chart.destroy();
    chart = null;
  }
  chart = new uPlot(options(width), data(), host.value);
}

watch(
  () => [props.timestamps, props.values, props.containers],
  () => {
    if (chart && props.containers.length === chart.series.length - 1) {
      chart.setData(data());
    } else {
      render();
    }
  },
  { deep: true },
);

onMounted(async () => {
  await nextTick();
  render();
  ro = new ResizeObserver(() => {
    if (chart && host.value) chart.setSize({ width: host.value.clientWidth || 320, height: 180 });
  });
  if (host.value) ro.observe(host.value);
});

onUnmounted(() => {
  ro?.disconnect();
  chart?.destroy();
});
</script>

<style scoped>
.ts-chart {
  width: 100%;
}

.ts-chart :deep(.u-legend) {
  font-size: var(--text-xs);
  color: var(--text-muted);
}

.ts-chart :deep(.u-title) {
  font-size: var(--text-sm);
  color: var(--text);
}
</style>
