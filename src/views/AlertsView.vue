<template>
  <div class="alerts-view">
    <header class="av-head">
      <div>
        <h2>Alerts</h2>
        <p class="av-sub">
          Rules watch the metrics FlatRun collects and tell you through your notification targets when a deployment
          crosses a line you care about.
        </p>
      </div>
      <router-link to="/settings" class="av-targets">
        <Icon name="solar:alt-arrow-right-linear" :size="14" />
        Notification targets
      </router-link>
    </header>

    <section v-if="firing.length" class="av-firing">
      <h3><Icon name="triangle-alert" :size="16" /> Firing now</h3>
      <div v-for="event in firing" :key="`${event.rule_id}-${event.container}`" class="av-firing-row">
        <span class="av-dot" />
        <span class="av-firing-rule">{{ event.rule_name }}</span>
        <span class="av-firing-where">{{ event.container }}</span>
        <span class="av-firing-when">{{ relTime(event.at) }}</span>
      </div>
    </section>

    <AlertRulesPanel :deployments="deploymentNames" />

    <section v-if="history.length" class="av-history">
      <h3><Icon name="history" :size="16" /> Recent</h3>
      <div v-for="(event, i) in history" :key="i" class="av-history-row">
        <span class="av-state" :class="`av-state--${event.state}`">{{ event.state }}</span>
        <span class="av-history-rule">{{ event.rule_name }}</span>
        <span class="av-history-where">{{ event.container }}</span>
        <span class="av-history-when">{{ relTime(event.at) }}</span>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from "vue";
import { observabilityApi } from "@/services/observability";
import type { AlertEvent } from "@/services/observability";
import { useDeploymentsStore } from "@/stores/deployments";
import Icon from "@/components/base/Icon.vue";
import AlertRulesPanel from "@/components/AlertRulesPanel.vue";

const deploymentsStore = useDeploymentsStore();
const deploymentNames = computed(() => deploymentsStore.deployments.map((d) => d.name).sort());

const firing = ref<AlertEvent[]>([]);
const events = ref<AlertEvent[]>([]);
let timer: ReturnType<typeof setInterval> | null = null;

// Most recent first, and only so many: this is a glance at what has been happening, not an
// audit log.
const history = computed(() => events.value.slice().reverse().slice(0, 20));

const relTime = (iso: string) => {
  const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
};

const load = async () => {
  const [firingResult, eventsResult] = await Promise.allSettled([
    observabilityApi.firingAlerts(),
    observabilityApi.alertEvents(),
  ]);
  if (firingResult.status === "fulfilled") firing.value = firingResult.value.data || [];
  if (eventsResult.status === "fulfilled") events.value = eventsResult.value.data || [];
};

onMounted(() => {
  deploymentsStore.fetchDeployments();
  load();
  timer = setInterval(load, 15000);
});

onUnmounted(() => {
  if (timer) clearInterval(timer);
});
</script>

<style scoped>
.alerts-view {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  padding: var(--space-4);
}

.av-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: var(--space-4);
  flex-wrap: wrap;
}

.av-head h2 {
  margin: 0 0 var(--space-1);
}

.av-sub {
  margin: 0;
  max-width: 70ch;
  color: var(--text-muted);
  font-size: var(--text-sm);
}

.av-targets {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  color: var(--accent);
  font-size: var(--text-sm);
  text-decoration: none;
  white-space: nowrap;
}

.av-targets:hover {
  text-decoration: underline;
}

.av-firing,
.av-history {
  background: var(--surface-raised);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  padding: var(--space-4);
}

.av-firing {
  border-color: var(--color-danger-200);
}

.av-firing h3,
.av-history h3 {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  margin: 0 0 var(--space-3);
  font-size: var(--text-md);
}

.av-firing h3 {
  color: var(--color-danger-600);
}

.av-firing-row,
.av-history-row {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-2) 0;
  border-bottom: 1px solid var(--border-subtle);
  font-size: var(--text-sm);
}

.av-firing-row:last-child,
.av-history-row:last-child {
  border-bottom: 0;
}

.av-dot {
  width: 8px;
  height: 8px;
  border-radius: var(--radius-full);
  background: var(--color-danger-500);
  flex-shrink: 0;
}

.av-firing-rule,
.av-history-rule {
  flex: 1;
  color: var(--text);
}

.av-firing-where,
.av-history-where {
  color: var(--text-muted);
}

.av-firing-when,
.av-history-when {
  color: var(--text-subtle);
  white-space: nowrap;
}

.av-state {
  font-size: var(--text-xs);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  min-width: 3.5rem;
}

.av-state--firing {
  color: var(--color-danger-500);
}

.av-state--ok {
  color: var(--color-success-500);
}
</style>
