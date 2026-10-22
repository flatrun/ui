<template>
  <div class="deployment-metrics">
    <p v-if="!samples.timestamps.length" class="muted">Collecting samples...</p>
    <template v-else>
      <h4>CPU</h4>
      <TimeSeriesChart
        :containers="[deploymentName]"
        :timestamps="samples.timestamps"
        :values="[samples.cpu]"
        unit="percent"
        :height="height"
        area
      />
      <h4>Memory</h4>
      <TimeSeriesChart
        :containers="[deploymentName]"
        :timestamps="samples.timestamps"
        :values="[samples.memory]"
        unit="bytes"
        :height="height"
        area
      />
    </template>
  </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, reactive, watch } from "vue";
import { deploymentsApi } from "@/services/api";
import TimeSeriesChart from "@/components/charts/TimeSeriesChart.vue";

const props = withDefaults(defineProps<{ deploymentName: string; height?: number }>(), { height: 140 });

const MAX_SAMPLES = 60;
const INTERVAL_MS = 5000;
const samples = reactive({ timestamps: [] as number[], cpu: [] as (number | null)[], memory: [] as (number | null)[] });
let timer: ReturnType<typeof setInterval> | null = null;

async function sample(name: string) {
  try {
    const { data } = await deploymentsApi.getStats(name);
    samples.timestamps.push(Math.floor(Date.now() / 1000));
    samples.cpu.push(data.summary.cpu_percent);
    samples.memory.push(data.summary.memory_usage);
    if (samples.timestamps.length > MAX_SAMPLES) {
      samples.timestamps.shift();
      samples.cpu.shift();
      samples.memory.shift();
    }
  } catch {
    // A stopped deployment has no stats; keep what was collected.
  }
}

function stop() {
  if (timer) clearInterval(timer);
  timer = null;
}

watch(
  () => props.deploymentName,
  (name) => {
    stop();
    samples.timestamps = [];
    samples.cpu = [];
    samples.memory = [];
    if (!name) return;
    sample(name);
    timer = setInterval(() => sample(name), INTERVAL_MS);
  },
  { immediate: true },
);

onBeforeUnmount(stop);
</script>

<style scoped>
.deployment-metrics {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

h4 {
  margin: var(--space-2) 0 0;
  color: var(--text-muted);
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
}

.muted {
  color: var(--text-muted);
}
</style>
