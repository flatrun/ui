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

    <div class="av-body">
      <div class="av-main">
        <AlertRulesPanel :deployments="deploymentNames" />
      </div>

      <aside class="av-side">
        <section class="av-panel" :class="{ 'is-firing': firing.length }">
          <div class="av-block">
            <h3 :class="{ danger: firing.length }">
              <Icon name="triangle-alert" :size="15" />
              Firing now
              <span class="av-count" :class="{ danger: firing.length }">{{ firing.length }}</span>
            </h3>
            <div class="av-scroll">
              <p v-if="!firing.length" class="av-clear">
                <Icon name="check" :size="14" /> Nothing firing.
              </p>
              <div v-for="event in firing" :key="`${event.rule_id}-${event.container}`" class="av-row av-row--firing">
                <span class="av-dot" />
                <span class="av-row-rule">{{ event.rule_name }}</span>
                <span class="av-row-where">{{ event.container }}</span>
                <span class="av-row-when">{{ relTime(event.at) }}</span>
              </div>
            </div>
          </div>

          <div class="av-divider" />

          <div class="av-block">
            <h3><Icon name="history" :size="15" /> Recent</h3>
            <div class="av-scroll">
              <p v-if="!history.length" class="av-clear">Nothing recent.</p>
              <div v-for="(event, i) in history" :key="i" class="av-row av-row--history">
                <span class="av-state" :class="`av-state--${event.state}`">{{ event.state }}</span>
                <span class="av-row-rule">{{ event.rule_name }}</span>
                <span class="av-row-where">{{ event.container }}</span>
                <span class="av-row-when">{{ relTime(event.at) }}</span>
              </div>
            </div>
          </div>
        </section>
      </aside>
    </div>
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

const eventKey = (e: AlertEvent) => `${e.rule_id}\u0000${e.container}\u0000${e.at}`;

const firingKeys = computed(() => new Set(firing.value.map(eventKey)));
const history = computed(() =>
  events.value
    .slice()
    .reverse()
    .filter((e) => !firingKeys.value.has(eventKey(e)))
    .slice(0, 20),
);

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

.av-body {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: var(--space-4);
  align-items: start;
}

.av-main {
  min-width: 0;
}

.av-side {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  position: sticky;
  top: var(--space-4);
}

.av-panel {
  background: var(--surface-raised);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  padding: var(--space-3) var(--space-4);
}

.av-panel.is-firing {
  border-color: var(--color-danger-300, #fca5a5);
}

.av-divider {
  height: 1px;
  background: var(--border);
  margin: var(--space-3) 0;
}

.av-panel h3 {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  margin: 0 0 var(--space-2);
  font-size: var(--text-sm);
  color: var(--text);
}

.av-panel h3.danger {
  color: var(--color-danger-600);
}

.av-count {
  margin-left: auto;
  min-width: 1.5rem;
  text-align: center;
  padding: 0 var(--space-1);
  border-radius: var(--radius-full);
  background: var(--surface-inset);
  color: var(--text-muted);
  font-size: var(--text-xs);
  font-variant-numeric: tabular-nums;
}

.av-count.danger {
  background: var(--color-danger-100, #fee2e2);
  color: var(--color-danger-700, #b91c1c);
}

.av-scroll {
  max-height: 240px;
  overflow-y: auto;
}

.av-clear {
  display: flex;
  align-items: center;
  gap: var(--space-1);
  margin: 0;
  padding: var(--space-2) 0;
  color: var(--text-muted);
  font-size: var(--text-sm);
}

.av-row {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-2) 0;
  border-bottom: 1px solid var(--border-subtle);
  font-size: var(--text-sm);
}

.av-row:last-child {
  border-bottom: 0;
}

.av-dot {
  width: 8px;
  height: 8px;
  border-radius: var(--radius-full);
  background: var(--color-danger-500);
  flex-shrink: 0;
}

.av-row-rule {
  flex: 1;
  min-width: 0;
  color: var(--text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.av-row-where {
  color: var(--text-muted);
  max-width: 40%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.av-row-when {
  color: var(--text-subtle);
  white-space: nowrap;
  font-size: var(--text-xs);
}

.av-state {
  font-size: var(--text-xs);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  min-width: 3rem;
}

.av-state--firing {
  color: var(--color-danger-500);
}

.av-state--ok {
  color: var(--color-success-500);
}

@media (max-width: 900px) {
  .av-body {
    grid-template-columns: 1fr;
  }

  .av-side {
    position: static;
  }
}
</style>
