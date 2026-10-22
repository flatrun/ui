<template>
  <SlidePanel :visible="!!deployment" size="lg" @close="emit('close')">
    <template #header>
      <div v-if="deployment" class="panel-head">
        <h3>{{ deployment.name }}</h3>
        <span class="status-pill" :class="deployment.status">{{ sleeping ? "asleep" : deployment.status }}</span>
        <RouterLink :to="`/deployments/${deployment.name}`" class="open-link">
          Open <Icon name="arrow-up-right" :size="14" />
        </RouterLink>
      </div>
    </template>

    <div v-if="deployment" class="panel-content">
      <SubTabs v-model="tab" :tabs="tabs">
        <div v-if="tab === 'overview'" class="panel-section">
          <dl class="facts">
            <div>
              <dt>Status</dt>
              <dd>{{ sleeping ? "Asleep until the next request" : deployment.status }}</dd>
            </div>
            <div v-if="domain">
              <dt>Domain</dt>
              <dd>
                <a :href="`https://${domain}`" target="_blank" rel="noopener">{{ domain }}</a>
              </dd>
            </div>
            <div v-if="deployment.metadata?.source">
              <dt>Source</dt>
              <dd class="mono">{{ deployment.metadata.source.ref }}</dd>
            </div>
            <div v-if="deployment.metadata?.environment">
              <dt>Environment of</dt>
              <dd>{{ deployment.metadata.environment.base }}</dd>
            </div>
            <div>
              <dt>Services</dt>
              <dd>
                <span v-for="svc in deployment.services || []" :key="svc.name" class="svc">
                  {{ svc.name }} <small>{{ svc.image }}</small>
                </span>
              </dd>
            </div>
          </dl>
          <div class="panel-actions">
            <BaseButton
              v-if="deployment.status !== 'running'"
              variant="primary"
              size="sm"
              icon="play"
              :disabled="job.state.isRunning"
              @click="job.run('start', deployment.name)"
            >
              Start
            </BaseButton>
            <BaseButton
              v-else
              size="sm"
              icon="rotate-cw"
              :disabled="job.state.isRunning"
              @click="job.run('restart', deployment.name)"
            >
              Restart
            </BaseButton>
          </div>
        </div>

        <div v-else-if="tab === 'deploys'" class="panel-section">
          <DeploysTab
            :deployment-name="deployment.name"
            :source="deployment.metadata?.source"
            :sleep="deployment.metadata?.sleep"
            :job-running="job.state.isRunning"
            @deploy="job.run('redeploy', deployment.name)"
            @rollback="
              (id: string) =>
                job.track('rollback', deployment!.name, () => deploymentsApi.rollback(deployment!.name, id))
            "
            @changed="emit('changed')"
            @environment-created="emit('changed')"
          />
        </div>

        <div v-else-if="tab === 'variables'" class="panel-section">
          <p v-if="!vars.length" class="muted">No variables.</p>
          <div v-for="v in vars" :key="v.key" class="var-row">
            <span class="var-key">{{ v.key }}</span>
            <span class="var-value">
              <code>{{ v.value }}</code>
              <code v-if="v.resolved !== undefined" class="resolved">= {{ v.resolved }}</code>
            </span>
          </div>
          <RouterLink :to="`/deployments/${deployment.name}?tab=environment`" class="open-link"
            >Edit variables</RouterLink
          >
        </div>

        <div v-else-if="tab === 'metrics'" class="panel-section">
          <p v-if="!samples.timestamps.length" class="muted">Collecting samples...</p>
          <template v-else>
            <h4>CPU</h4>
            <TimeSeriesChart
              :containers="[deployment.name]"
              :timestamps="samples.timestamps"
              :values="[samples.cpu]"
              unit="percent"
              :height="140"
              area
            />
            <h4>Memory</h4>
            <TimeSeriesChart
              :containers="[deployment.name]"
              :timestamps="samples.timestamps"
              :values="[samples.memory]"
              unit="bytes"
              :height="140"
              area
            />
          </template>
        </div>
      </SubTabs>
    </div>

    <OperationModal
      :visible="job.state.visible"
      :operation="job.state.operation"
      :deployment-name="job.state.deploymentName"
      :output="job.state.output"
      :is-running="job.state.isRunning"
      :is-success="job.state.isSuccess"
      @close="job.close()"
    />
  </SlidePanel>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, reactive, ref, watch } from "vue";
import { RouterLink } from "vue-router";
import type { Deployment } from "@/types";
import { deploymentsApi } from "@/services/api";
import { useDeploymentJob } from "@/composables/useDeploymentJob";
import SlidePanel from "@/components/base/SlidePanel.vue";
import SubTabs from "@/components/base/SubTabs.vue";
import BaseButton from "@/components/base/BaseButton.vue";
import Icon from "@/components/base/Icon.vue";
import DeploysTab from "@/components/deploys/DeploysTab.vue";
import OperationModal from "@/components/OperationModal.vue";
import TimeSeriesChart from "@/components/charts/TimeSeriesChart.vue";

const props = defineProps<{ deployment: Deployment | null }>();
const emit = defineEmits<{ close: []; changed: [] }>();

const tabs = [
  { id: "overview", label: "Overview" },
  { id: "deploys", label: "Deploys" },
  { id: "variables", label: "Variables" },
  { id: "metrics", label: "Metrics" },
];
const tab = ref("overview");

const job = useDeploymentJob(() => emit("changed"));

const sleeping = computed(() => !!props.deployment?.metadata?.sleep?.sleeping);
const domain = computed(() => props.deployment?.metadata?.networking?.domain);

const vars = ref<{ key: string; value: string; resolved?: string }[]>([]);
async function loadVars(name: string) {
  try {
    const { data } = await deploymentsApi.getEnvVars(name);
    const resolved = data.resolved || {};
    vars.value = (data.env_vars || []).map((v) => ({
      ...v,
      resolved: v.key in resolved ? resolved[v.key] : undefined,
    }));
  } catch {
    vars.value = [];
  }
}

const MAX_SAMPLES = 60;
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

function stopSampling() {
  if (timer) clearInterval(timer);
  timer = null;
}

watch(
  () => [props.deployment?.name, tab.value] as const,
  ([name, current], previous) => {
    if (name !== previous?.[0]) {
      samples.timestamps = [];
      samples.cpu = [];
      samples.memory = [];
      if (name) loadVars(name);
    }
    stopSampling();
    if (name && current === "metrics") {
      sample(name);
      timer = setInterval(() => sample(name), 5000);
    }
  },
  { immediate: true },
);

onBeforeUnmount(stopSampling);
</script>

<style scoped>
.panel-head {
  display: flex;
  align-items: center;
  gap: var(--space-3);
}

.panel-head h3 {
  margin: 0;
  font-size: var(--text-xl);
}

.status-pill {
  padding: 1px var(--space-2);
  background: var(--surface-inset);
  border-radius: var(--radius-sm);
  color: var(--text-muted);
  font-size: var(--text-xs);
  text-transform: capitalize;
}

.status-pill.running {
  background: var(--color-success-50);
  color: var(--color-success-700);
}

.open-link {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  margin-left: auto;
  color: var(--accent);
  font-size: var(--text-sm);
  text-decoration: none;
}

.panel-content {
  padding: var(--space-4) var(--space-5);
}

.panel-section {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.facts {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  margin: 0;
}

.facts dt {
  color: var(--text-muted);
  font-size: var(--text-xs);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.facts dd {
  margin: 2px 0 0;
  overflow-wrap: anywhere;
}

.facts a {
  color: var(--accent);
}

.svc {
  display: block;
}

.svc small,
.muted {
  color: var(--text-muted);
}

.mono,
.var-value code {
  font-family: var(--font-mono);
  font-size: var(--text-sm);
}

.panel-actions {
  display: flex;
  gap: var(--space-2);
}

.var-row {
  display: grid;
  grid-template-columns: 160px minmax(0, 1fr);
  gap: var(--space-3);
  padding: var(--space-2) 0;
  border-bottom: 1px solid var(--border-subtle);
}

.var-key {
  font-weight: var(--font-medium);
  overflow-wrap: anywhere;
}

.var-value {
  display: flex;
  min-width: 0;
  flex-direction: column;
  overflow-wrap: anywhere;
}

.resolved {
  color: var(--text-muted);
  font-size: var(--text-xs);
}

h4 {
  margin: var(--space-2) 0 0;
  color: var(--text-muted);
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
}
</style>
