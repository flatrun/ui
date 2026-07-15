<template>
  <BaseCard class="dhs" title="Metrics & Health" icon="activity">
    <template #actions>
      <button class="dhs-link" @click="emit('open')">
        View details
        <Icon name="arrow-right" :size="14" />
      </button>
    </template>

    <!-- The verdict first. Someone opening a deployment is asking one question, and a grid
         of numbers makes them answer it themselves. -->
    <div class="dhs-verdict" :class="`dhs-verdict--${verdict.tone}`">
      <span class="dhs-dot" />
      <div>
        <p class="dhs-headline">{{ verdict.headline }}</p>
        <p class="dhs-detail">{{ verdict.detail }}</p>
      </div>
    </div>

    <dl class="dhs-stats">
      <div v-for="stat in stats" :key="stat.label" class="dhs-stat">
        <dt>{{ stat.label }}</dt>
        <dd :class="{ 'dhs-stat--bad': stat.bad }">{{ stat.value }}</dd>
      </div>
    </dl>
  </BaseCard>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from "vue";
import { observabilityApi, METRIC } from "@/services/observability";
import type { ContainerHealth, DeploymentMetrics } from "@/services/observability";
import { servingApi } from "@/services/api";
import type { REDPoint } from "@/services/api";
import BaseCard from "@/components/base/BaseCard.vue";
import Icon from "@/components/base/Icon.vue";

const props = defineProps<{ deploymentName: string; status?: string }>();
const emit = defineEmits<{ open: [] }>();

const health = ref<ContainerHealth[]>([]);
const metrics = ref<DeploymentMetrics | null>(null);
const points = ref<REDPoint[]>([]);
let timer: ReturnType<typeof setInterval> | null = null;

const unhealthy = computed(() => health.value.filter((h) => h.status === "unhealthy"));
const starting = computed(() => health.value.filter((h) => h.status === "starting"));

const totals = computed(() => {
  const requests = points.value.reduce((sum, p) => sum + p.requests, 0);
  const errors = points.value.reduce((sum, p) => sum + p.errors, 0);
  const p95 = points.value.reduce((max, p) => Math.max(max, p.p95_time_ms), 0);
  return { requests, errors, p95, errorRate: requests ? (errors / requests) * 100 : 0 };
});

const sum = (metric: string) =>
  (metrics.value?.containers ?? []).reduce((total, c) => total + (c.metrics?.[metric] ?? 0), 0);

const memoryPercent = computed(() => {
  const limit = sum(METRIC.memLimit);
  return limit ? (sum(METRIC.memUsage) / limit) * 100 : 0;
});

// One sentence saying what is true, in the order an operator cares about it: broken beats
// slow, slow beats idle.
const verdict = computed(() => {
  if (props.status && props.status !== "running") {
    return { tone: "idle", headline: "Not running", detail: "Start the deployment to see how it behaves." };
  }
  if (unhealthy.value.length) {
    const names = unhealthy.value.map((h) => h.container).join(", ");
    return { tone: "bad", headline: "Needs attention", detail: `${names} is failing its health check.` };
  }
  if (totals.value.errorRate > 5) {
    return {
      tone: "bad",
      headline: "Serving errors",
      detail: `${totals.value.errorRate.toFixed(1)}% of requests failed in the last hour.`,
    };
  }
  if (starting.value.length) {
    const names = starting.value.map((h) => h.container).join(", ");
    return { tone: "warn", headline: "Starting up", detail: `${names} has not passed its health check yet.` };
  }
  if (!totals.value.requests) {
    return { tone: "ok", headline: "Healthy", detail: "No requests reached it in the last hour." };
  }
  return {
    tone: "ok",
    headline: "Healthy",
    detail: `${totals.value.requests.toLocaleString()} requests in the last hour, 95% under ${formatMs(totals.value.p95)}.`,
  };
});

const stats = computed(() => [
  { label: "CPU", value: `${sum(METRIC.cpu).toFixed(1)}%`, bad: sum(METRIC.cpu) > 80 },
  { label: "Memory", value: `${memoryPercent.value.toFixed(0)}%`, bad: memoryPercent.value > 90 },
  { label: "Requests", value: totals.value.requests.toLocaleString(), bad: false },
  { label: "Errors", value: `${totals.value.errorRate.toFixed(1)}%`, bad: totals.value.errorRate > 1 },
  { label: "Latency p95", value: formatMs(totals.value.p95), bad: totals.value.p95 > 1000 },
]);

function formatMs(v: number): string {
  if (!v) return "-";
  return v >= 1000 ? `${(v / 1000).toFixed(2)}s` : `${Math.round(v)}ms`;
}

const refresh = async () => {
  // Each source is optional: the plugin may be off, traffic logging may be off. A summary
  // that fails whole because one number is missing is worse than one that shows the rest.
  const [healthResult, metricsResult, servingResult] = await Promise.allSettled([
    observabilityApi.health(),
    observabilityApi.latest(),
    servingApi.series(props.deploymentName, "1h"),
  ]);

  if (healthResult.status === "fulfilled") {
    health.value = (healthResult.value.data || []).filter((h) => h.deployment === props.deploymentName);
  }
  if (metricsResult.status === "fulfilled") {
    metrics.value = (metricsResult.value.data || []).find((d) => d.deployment === props.deploymentName) ?? null;
  }
  if (servingResult.status === "fulfilled") {
    points.value = servingResult.value.data.points || [];
  }
};

onMounted(() => {
  refresh();
  timer = setInterval(refresh, 15000);
});

onUnmounted(() => {
  if (timer) clearInterval(timer);
});
</script>

<style scoped>
.dhs-link {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  border: 0;
  background: none;
  color: var(--accent);
  font-size: var(--text-sm);
  cursor: pointer;
  padding: 0;
}

.dhs-link:hover {
  text-decoration: underline;
}

.dhs-verdict {
  display: flex;
  align-items: flex-start;
  gap: var(--space-3);
}

.dhs-dot {
  width: 10px;
  height: 10px;
  border-radius: var(--radius-full);
  margin-top: 6px;
  flex-shrink: 0;
  background: var(--text-subtle);
}

.dhs-verdict--ok .dhs-dot {
  background: var(--color-success-500);
}

.dhs-verdict--warn .dhs-dot {
  background: var(--color-warning-500);
}

.dhs-verdict--bad .dhs-dot {
  background: var(--color-danger-500);
}

.dhs-headline {
  margin: 0;
  font-size: var(--text-lg);
  color: var(--text);
}

.dhs-verdict--bad .dhs-headline {
  color: var(--color-danger-600);
}

.dhs-detail {
  margin: var(--space-1) 0 0;
  color: var(--text-muted);
  font-size: var(--text-sm);
}

.dhs-stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(90px, 1fr));
  gap: var(--space-3);
  margin: var(--space-4) 0 0;
  padding-top: var(--space-4);
  border-top: 1px solid var(--border-subtle);
}

.dhs-stat dt {
  font-size: var(--text-xs);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--text-muted);
}

.dhs-stat dd {
  margin: var(--space-1) 0 0;
  font-size: var(--text-lg);
  font-variant-numeric: tabular-nums;
  color: var(--text);
}

.dhs-stat--bad {
  color: var(--color-danger-500);
}
</style>
