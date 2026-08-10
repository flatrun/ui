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
        <div class="av-tabs">
          <button class="av-tab" :class="{ active: scope === 'metrics' }" @click="scope = 'metrics'">
            <Icon name="activity" :size="14" />
            Metric rules
          </button>
          <button class="av-tab" :class="{ active: scope === 'logs' }" @click="scope = 'logs'">
            <Icon name="file-search" :size="14" />
            Log rules
          </button>
        </div>

        <AlertRulesPanel v-if="scope === 'metrics'" :deployments="deploymentNames" />
        <template v-else>
          <LogRulesPanel :deployments="deploymentNames" @changed="load" />

          <section class="av-incidents">
            <h3><Icon name="siren" :size="15" /> Incidents</h3>
            <p v-if="!incidents.length" class="av-clear">
              Nothing raised yet. A rule raises an incident once the same fault has happened often enough.
            </p>
            <article v-for="incident in incidents" :key="incident.id" class="av-incident">
              <header>
                <span class="av-incident-rule">{{ incident.rule_name }}</span>
                <span class="av-incident-where">
                  {{ incident.deployment }}<template v-if="incident.service">/{{ incident.service }}</template>
                </span>
                <span class="av-incident-count">{{ incident.count }}x</span>
                <span class="av-row-when">{{ relTime(incident.last_seen) }}</span>
              </header>

              <p v-if="incident.triage?.summary" class="av-incident-summary">
                {{ incident.triage.summary }}
                <span v-if="incident.triage.confidence" class="av-incident-conf">
                  ({{ incident.triage.confidence }} confidence)
                </span>
              </p>
              <p v-if="incident.triage?.next_step" class="av-incident-next">
                Next: {{ incident.triage.next_step }}
              </p>
              <p v-else-if="incident.triage?.skipped" class="av-incident-skipped">
                Not explained: {{ incident.triage.skipped }}
              </p>

              <pre class="av-incident-sample">{{ incident.sample }}</pre>

              <p v-if="incident.responses?.length" class="av-incident-responses">
                <span v-for="(r, i) in incident.responses" :key="i">
                  {{ r.responder }}: {{ r.error || r.detail }}
                </span>
              </p>
            </article>
          </section>
        </template>
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
              <p v-if="!firing.length" class="av-clear"><Icon name="check" :size="14" /> Nothing firing.</p>
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
import LogRulesPanel from "@/components/LogRulesPanel.vue";
import type { Incident } from "@/services/observability";

const deploymentsStore = useDeploymentsStore();
const deploymentNames = computed(() => deploymentsStore.deployments.map((d) => d.name).sort());

const scope = ref<"metrics" | "logs">("metrics");
const firing = ref<AlertEvent[]>([]);
const events = ref<AlertEvent[]>([]);
const incidents = ref<Incident[]>([]);
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
  const [firingResult, eventsResult, incidentsResult] = await Promise.allSettled([
    observabilityApi.firingAlerts(),
    observabilityApi.alertEvents(),
    observabilityApi.incidents(),
  ]);
  if (firingResult.status === "fulfilled") firing.value = firingResult.value.data || [];
  if (eventsResult.status === "fulfilled") events.value = eventsResult.value.data || [];
  if (incidentsResult.status === "fulfilled") incidents.value = (incidentsResult.value.data || []).slice().reverse();
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
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.av-tabs {
  display: flex;
  gap: var(--space-1);
  background: var(--surface-inset);
  padding: var(--space-1);
  border-radius: var(--radius-sm);
  align-self: flex-start;
}

.av-tab {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-4);
  border: none;
  background: transparent;
  border-radius: var(--radius-sm);
  font-size: var(--text-md);
  color: var(--text-muted);
  cursor: pointer;
  transition: all var(--transition-base);
}

.av-tab:hover {
  color: var(--text);
}

.av-tab.active {
  background: var(--surface-raised);
  color: var(--text);
  box-shadow: var(--shadow-xs);
}

.av-incidents {
  background: var(--surface-raised);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: var(--space-4);
}

.av-incidents h3 {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  margin: 0 0 var(--space-3);
  font-size: var(--text-lg);
}

.av-incident {
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  padding: var(--space-3);
  background: var(--surface);
  margin-bottom: var(--space-2);
}

.av-incident header {
  display: flex;
  align-items: baseline;
  gap: var(--space-2);
  flex-wrap: wrap;
}

.av-incident-rule {
  font-weight: var(--font-medium);
  color: var(--text);
}

.av-incident-where,
.av-incident-count {
  font-size: var(--text-sm);
  color: var(--text-muted);
}

.av-incident-summary {
  margin: var(--space-2) 0 0;
  color: var(--text);
}

.av-incident-conf,
.av-incident-next,
.av-incident-skipped,
.av-incident-responses {
  font-size: var(--text-sm);
  color: var(--text-muted);
}

.av-incident-next,
.av-incident-skipped {
  margin: var(--space-1) 0 0;
}

.av-incident-responses {
  display: flex;
  gap: var(--space-3);
  margin: var(--space-2) 0 0;
}

.av-incident-sample {
  margin: var(--space-2) 0 0;
  padding: var(--space-2);
  background: var(--surface-inset);
  border-radius: var(--radius-sm);
  font-size: var(--text-xs);
  overflow-x: auto;
  white-space: pre-wrap;
  word-break: break-word;
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
