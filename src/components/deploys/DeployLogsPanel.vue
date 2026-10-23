<template>
  <div class="deploy-logs">
    <ol class="steps" aria-label="Deploy progress">
      <li v-for="step in steps" :key="step.id" class="step" :class="step.state">
        <span class="mark" aria-hidden="true">
          <Icon v-if="step.state === 'done'" name="check" :size="12" />
          <Icon v-else-if="step.state === 'failed'" name="x" :size="12" />
          <Icon v-else-if="step.state === 'current'" name="loader-circle" :size="12" spin />
        </span>
        <span class="label">{{ step.label }}</span>
      </li>
    </ol>

    <div class="log-tabs" role="tablist">
      <button
        v-for="t in tabs"
        :key="t.id"
        type="button"
        role="tab"
        class="log-tab"
        :aria-selected="tab === t.id"
        :class="{ active: tab === t.id }"
        @click="pick(t.id)"
      >
        {{ t.label }}
      </button>
    </div>

    <LogViewer
      :key="tab"
      :logs="tab === 'build' ? log.build : log.deploy"
      :loading="running && !output"
      :empty-message="emptyMessage"
      :file-name="`${fileName}-${tab}.txt`"
      :max-height="maxHeight"
      :assist-context="running ? null : assistContext"
      initial-mode="raw"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue";
import Icon from "@/components/base/Icon.vue";
import LogViewer from "@/components/LogViewer.vue";
import { deploySteps, splitLog, type PhaseStart } from "@/model/project";
import type { DeployPhase } from "@/types";
import type { AssistContext } from "@/stores/assist";

type Tab = "build" | "deploy";

const props = withDefaults(
  defineProps<{
    output: string;
    phase?: DeployPhase;
    phases?: PhaseStart[];
    running?: boolean;
    fileName?: string;
    maxHeight?: number;
    assistContext?: AssistContext | null;
  }>(),
  { phase: undefined, phases: () => [], running: false, fileName: "deploy", maxHeight: 360, assistContext: null },
);

const tabs: { id: Tab; label: string }[] = [
  { id: "build", label: "Build logs" },
  { id: "deploy", label: "Deploy logs" },
];

const log = computed(() => splitLog(props.output, props.phases));
const steps = computed(() => deploySteps(props.phase, props.phases));
const deploying = computed(() => props.phases.some((p) => p.phase === "deploying"));

const chosen = ref<Tab | null>(null);
const tab = computed<Tab>(() => chosen.value ?? (deploying.value || !log.value.build ? "deploy" : "build"));

const emptyMessage = computed(() => {
  if (props.running)
    return tab.value === "deploy" && !deploying.value ? "Waiting for the build..." : "Waiting for output...";
  return tab.value === "build" ? "This deploy had no build step." : "No deploy output.";
});

function pick(t: Tab) {
  chosen.value = t;
}

watch(deploying, (now) => {
  if (now && props.running) chosen.value = null;
});
</script>

<style scoped>
.deploy-logs {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.steps {
  display: flex;
  margin: 0;
  padding: 0;
  list-style: none;
}

.deploy-logs :deep(.terminal-container) {
  min-height: 320px;
}

.step {
  display: flex;
  flex: 1;
  align-items: center;
  gap: var(--space-2);
  color: var(--text-subtle);
  font-size: var(--text-sm);
}

.step:not(:last-child)::after {
  height: 1px;
  flex: 1;
  margin: 0 var(--space-2);
  background: var(--border);
  content: "";
}

.step.done:not(:last-child)::after {
  background: var(--status-running);
}

.mark {
  display: inline-grid;
  width: 18px;
  height: 18px;
  flex-shrink: 0;
  place-items: center;
  border: 1px solid var(--border-strong);
  border-radius: 50%;
}

.step.done {
  color: var(--text);
}

.step.done .mark {
  background: var(--status-running);
  border-color: var(--status-running);
  color: #fff;
}

.step.current {
  color: var(--text);
  font-weight: var(--font-medium);
}

.step.current .mark {
  border-color: var(--accent);
  color: var(--accent);
}

.step.failed {
  color: var(--status-failed);
  font-weight: var(--font-medium);
}

.step.failed .mark {
  background: var(--status-failed);
  border-color: var(--status-failed);
  color: #fff;
}

.label {
  white-space: nowrap;
}

.log-tabs {
  display: flex;
  gap: var(--space-1);
  border-bottom: 1px solid var(--border);
}

.log-tab {
  margin-bottom: -1px;
  padding: var(--space-2) var(--space-3);
  background: none;
  border: 0;
  border-bottom: 2px solid transparent;
  color: var(--text-muted);
  cursor: pointer;
  font: inherit;
  font-size: var(--text-sm);
}

.log-tab:hover {
  color: var(--text);
}

.log-tab.active {
  border-bottom-color: var(--text);
  color: var(--text);
  font-weight: var(--font-medium);
}

@media (max-width: 520px) {
  .label {
    display: none;
  }

  .step.current .label,
  .step.failed .label {
    display: inline;
  }
}
</style>
