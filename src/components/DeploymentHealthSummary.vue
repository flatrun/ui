<template>
  <!-- One row. Someone opening a deployment is asking one question, so the answer sits on the
       line their eye lands on, and the figures sit beside it rather than under it. -->
  <div class="dhs" :class="`dhs--${verdict.tone}`">
    <Icon class="dhs-glyph" :name="verdict.icon" :size="22" />

    <p class="dhs-verdict">
      <span class="dhs-headline">{{ verdict.headline }}</span>
      <span class="dhs-detail">{{ verdict.detail }}</span>
    </p>

    <dl class="dhs-stats">
      <div v-for="stat in stats" :key="stat.label" class="dhs-stat" :class="{ 'dhs-stat--bad': stat.bad }">
        <dt :title="stat.label"><Icon :name="stat.icon" :size="15" /></dt>
        <dd>{{ stat.value }}</dd>
      </div>
    </dl>

    <button class="dhs-link" @click="emit('open')">
      Details
      <Icon name="solar:alt-arrow-right-linear" :size="14" />
    </button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from "vue";
import { observabilityApi, METRIC } from "@/services/observability";
import type { ContainerHealth, DeploymentMetrics } from "@/services/observability";
import { servingApi } from "@/services/api";
import type { REDPoint } from "@/services/api";
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
    return {
      tone: "idle",
      icon: "solar:stop-circle-bold",
      headline: "Not running",
      detail: "Start it to see how it behaves.",
    };
  }
  if (unhealthy.value.length) {
    return {
      tone: "bad",
      icon: "solar:danger-triangle-bold",
      headline: "Needs attention",
      detail: `${unhealthy.value.map((h) => h.container).join(", ")} is failing its health check.`,
    };
  }
  if (totals.value.errorRate > 5) {
    return {
      tone: "bad",
      icon: "solar:danger-triangle-bold",
      headline: "Serving errors",
      detail: `${totals.value.errorRate.toFixed(1)}% of requests failed in the last hour.`,
    };
  }
  if (starting.value.length) {
    return {
      tone: "warn",
      icon: "solar:clock-circle-bold",
      headline: "Starting up",
      detail: `${starting.value.map((h) => h.container).join(", ")} has not passed its health check yet.`,
    };
  }
  if (!totals.value.requests) {
    return {
      tone: "ok",
      icon: "solar:check-circle-bold",
      headline: "Healthy",
      detail: "No requests in the last hour.",
    };
  }
  return {
    tone: "ok",
    icon: "solar:check-circle-bold",
    headline: "Healthy",
    detail: `${totals.value.requests.toLocaleString()} requests in the last hour, 95% under ${formatMs(totals.value.p95)}.`,
  };
});

const stats = computed(() => [
  { label: "CPU", icon: "solar:cpu-bold-duotone", value: `${sum(METRIC.cpu).toFixed(1)}%`, bad: sum(METRIC.cpu) > 80 },
  {
    label: "Memory",
    icon: "solar:ssd-square-bold-duotone",
    value: `${memoryPercent.value.toFixed(0)}%`,
    bad: memoryPercent.value > 90,
  },
  {
    label: "Requests, last hour",
    icon: "solar:global-bold-duotone",
    value: compact(totals.value.requests),
    bad: false,
  },
  {
    label: "Failed requests",
    icon: "solar:danger-circle-bold-duotone",
    value: `${totals.value.errorRate.toFixed(1)}%`,
    bad: totals.value.errorRate > 1,
  },
  {
    label: "95% of requests finish under",
    icon: "solar:stopwatch-bold-duotone",
    value: formatMs(totals.value.p95),
    bad: totals.value.p95 > 1000,
  },
]);

function formatMs(v: number): string {
  if (!v) return "-";
  return v >= 1000 ? `${(v / 1000).toFixed(2)}s` : `${Math.round(v)}ms`;
}

function compact(v: number): string {
  if (v >= 1000) return `${(v / 1000).toFixed(1)}k`;
  return String(v);
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
.dhs {
  position: relative;
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-2) var(--space-3) var(--space-2) var(--space-5);
  background: var(--surface-raised);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
}

/* A status is read from the left edge before anything else is. It sits inside the card as
   its own mark rather than running the full height as a border would. */
.dhs::before {
  content: "";
  position: absolute;
  left: var(--space-2);
  top: var(--space-2);
  bottom: var(--space-2);
  width: 3px;
  border-radius: var(--radius-full);
  background: var(--text-subtle);
}

.dhs--ok::before {
  background: var(--color-success-500);
}

.dhs--warn::before {
  background: var(--color-warning-500);
}

.dhs--bad::before {
  background: var(--color-danger-500);
}

.dhs-glyph {
  color: var(--text-subtle);
  flex-shrink: 0;
}

.dhs--ok .dhs-glyph {
  color: var(--color-success-500);
}

.dhs--warn .dhs-glyph {
  color: var(--color-warning-500);
}

.dhs--bad .dhs-glyph {
  color: var(--color-danger-500);
}

.dhs-verdict {
  display: flex;
  align-items: baseline;
  gap: var(--space-2);
  margin: 0;
  min-width: 0;
  flex: 1;
}

.dhs-headline {
  font-size: var(--text-sm);
  font-weight: 600;
  color: var(--text);
  white-space: nowrap;
}

.dhs--bad .dhs-headline {
  color: var(--color-danger-600);
}

/* The detail is the first thing worth losing when the row runs out of room. */
.dhs-detail {
  font-size: var(--text-sm);
  color: var(--text-muted);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.dhs-stats {
  display: flex;
  align-items: center;
  gap: var(--space-4);
  margin: 0;
  flex-shrink: 0;
}

.dhs-stat {
  display: flex;
  align-items: center;
  gap: var(--space-1);
  color: var(--text-muted);
}

.dhs-stat dt {
  display: flex;
  cursor: help;
}

.dhs-stat dd {
  margin: 0;
  font-size: var(--text-sm);
  font-variant-numeric: tabular-nums;
  color: var(--text);
}

.dhs-stat--bad,
.dhs-stat--bad dd {
  color: var(--color-danger-500);
}

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
  flex-shrink: 0;
  white-space: nowrap;
}

.dhs-link:hover {
  text-decoration: underline;
}

/* Narrow screens cannot hold one line, so it becomes two rather than scrolling sideways. */
@media (max-width: 900px) {
  .dhs {
    flex-wrap: wrap;
  }

  .dhs-verdict {
    flex-basis: 100%;
    order: -1;
  }
}
</style>
