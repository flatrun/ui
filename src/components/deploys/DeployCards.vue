<template>
  <div class="deploy-cards">
    <p v-if="!items.length" class="empty">No deploys yet. Deploy the latest commit to start the history.</p>

    <template v-else>
      <article v-for="d in current" :key="d.id" class="card" :class="['is-' + d.phase, { lead: true }]">
        <DeployRow :deploy="d" :actions="actionsFor(d)" @logs="openLogs(d)" @action="(a: CardAction) => run(a, d)" />
        <footer class="card-foot" :class="d.phase">
          <Icon :name="footIcon(d)" :size="13" :spin="running(d)" />
          <span>{{ footText(d) }}</span>
        </footer>
      </article>

      <section v-if="history.length" class="history">
        <button type="button" class="history-toggle" :aria-expanded="showHistory" @click="showHistory = !showHistory">
          <Icon :name="showHistory ? 'chevron-down' : 'chevron-right'" :size="14" />
          History
          <span class="count">{{ history.length }}</span>
        </button>
        <div v-if="showHistory" class="history-list">
          <article v-for="d in history" :key="d.id" class="card" :class="'is-' + d.phase">
            <DeployRow
              :deploy="d"
              :actions="actionsFor(d)"
              @logs="openLogs(d)"
              @action="(a: CardAction) => run(a, d)"
            />
          </article>
        </div>
      </section>
    </template>

    <SlidePanel :visible="!!viewing" :title="viewingTitle" size="lg" @close="viewing = null">
      <div v-if="viewing" class="logs-body">
        <p class="logs-meta">
          <strong>{{ phaseLabel[viewing.phase] }}</strong>
          <span v-if="viewing.shortRevision" class="mono">{{ viewing.shortRevision }}</span>
          <span>{{ timeAgo(viewing.startedAt) }}</span>
          <span v-if="viewing.durationMs !== undefined"
            >took {{ duration(viewing.startedAt, viewing.finishedAt) }}</span
          >
        </p>
        <p v-if="viewing.error" class="logs-error">{{ viewing.error }}</p>
        <DeployLogsPanel
          :output="logs.output"
          :phase="viewing.phase"
          :phases="logs.phases"
          :running="logs.loading"
          :file-name="`${deploymentName}-${viewing.id}`"
          :max-height="560"
        />
      </div>
    </SlidePanel>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from "vue";
import Icon from "@/components/base/Icon.vue";
import SlidePanel from "@/components/base/SlidePanel.vue";
import DeployLogsPanel from "./DeployLogsPanel.vue";
import DeployRow, { type CardAction, phaseLabel } from "./DeployRow.vue";
import { deploymentsApi } from "@/services/api";
import { deploysFrom, type Deploy, type PhaseStart } from "@/model/project";
import type { DeployRecord } from "@/types";
import { duration, timeAgo } from "@/utils/time";

const props = defineProps<{
  deploymentName: string;
  deploys: DeployRecord[];
  jobRunning: boolean;
  canWrite?: boolean;
}>();

const emit = defineEmits<{
  redeploy: [];
  restart: [];
  rollback: [deployId: string];
}>();

const items = computed(() => deploysFrom(props.deploys));
const isCurrent = (d: Deploy) => d.phase !== "removed" && (d === items.value[0] || d.phase === "active");
const current = computed(() => {
  const list = items.value.filter(isCurrent);
  return list.length > 2 ? list.slice(0, 2) : list;
});
const history = computed(() => items.value.filter((d) => !current.value.includes(d)));
const showHistory = ref(true);

const viewing = ref<Deploy | null>(null);
const logs = reactive<{ output: string; phases: PhaseStart[]; loading: boolean }>({
  output: "",
  phases: [],
  loading: false,
});
const viewingTitle = computed(() => viewing.value?.message || "Deploy logs");

function running(d: Deploy) {
  return d.phase === "queued" || d.phase === "building" || d.phase === "deploying";
}

function footIcon(d: Deploy) {
  if (running(d)) return "loader-circle";
  return d.phase === "failed" ? "circle-x" : "circle-check";
}

function footText(d: Deploy) {
  if (running(d)) return `${phaseLabel[d.phase]}...`;
  if (d.phase === "failed") return "Deploy failed";
  return "Deploy successful";
}

function actionsFor(d: Deploy): CardAction[] {
  if (!props.canWrite) return [];
  if (d.phase === "active") return ["redeploy", "restart"];
  if (d.phase === "removed" && d.revision) return ["rollback"];
  return [];
}

function run(action: CardAction, d: Deploy) {
  if (props.jobRunning) return;
  if (action === "redeploy") emit("redeploy");
  else if (action === "restart") emit("restart");
  else emit("rollback", d.id);
}

async function openLogs(d: Deploy) {
  viewing.value = d;
  logs.output = "";
  logs.phases = [];
  logs.loading = true;
  try {
    const { data } = await deploymentsApi.deployLogs(props.deploymentName, d.id);
    logs.output = data.output;
    logs.phases = data.phases ?? [];
  } catch {
    logs.output = "";
  } finally {
    logs.loading = false;
  }
}
</script>

<style scoped>
.deploy-cards {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.empty {
  margin: 0;
  color: var(--text-muted);
  font-size: var(--text-sm);
}

.card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
}

.card.lead.is-active {
  border-color: var(--status-running);
}

.card.lead.is-failed {
  border-color: var(--status-failed);
}

.card.lead.is-building,
.card.lead.is-deploying,
.card.lead.is-queued {
  border-color: var(--accent);
}

.card-foot {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-3);
  border-top: 1px solid var(--border-subtle);
  color: var(--status-running);
  font-size: var(--text-sm);
}

.card-foot.failed {
  color: var(--status-failed);
}

.card-foot.queued,
.card-foot.building,
.card-foot.deploying {
  color: var(--accent);
}

.history {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.history-toggle {
  display: inline-flex;
  align-self: flex-start;
  align-items: center;
  gap: var(--space-1);
  padding: 0;
  background: none;
  border: 0;
  color: var(--text-muted);
  cursor: pointer;
  font: inherit;
  font-size: var(--text-xs);
  font-weight: var(--font-semibold);
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.count {
  color: var(--text-subtle);
}

.history-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.history-list .card {
  background: var(--surface-sunken);
}

.logs-body {
  padding: var(--space-4) var(--space-5);
}

.logs-meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-3);
  margin: 0 0 var(--space-3);
  color: var(--text-muted);
  font-size: var(--text-sm);
}

.logs-error {
  margin: 0 0 var(--space-3);
  color: var(--status-failed);
  font-size: var(--text-sm);
  white-space: pre-wrap;
}

.mono {
  font-family: var(--font-mono);
}
</style>
