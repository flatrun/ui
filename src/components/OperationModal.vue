<template>
  <BaseModal :visible="visible" :close-disabled="isRunning" :close-on-overlay="false" size="lg" @close="handleClose">
    <template #header>
      <div class="header-info">
        <span class="operation-badge" :class="operation">{{ operation }}</span>
        <h3>{{ title }}</h3>
        <span class="header-status" :class="statusClass">
          <Icon v-if="isRunning" name="loader-circle" :size="16" spin />
          <Icon v-else-if="isSuccess === true" name="check" :size="16" />
          <Icon v-else-if="isSuccess === false" name="x" :size="16" />
          <span class="header-status-label">{{ statusLabel }}</span>
          <span v-if="startTime" class="header-elapsed">{{ elapsedTime }}</span>
        </span>
      </div>
    </template>

    <div class="output-section">
      <LogViewer
        :logs="output"
        :loading="isRunning && !output"
        empty-message="Waiting for output..."
        :file-name="`${deploymentName}-${operation}.txt`"
        :max-height="300"
        :assist-context="isRunning ? null : assistContext"
      />
    </div>

    <template #footer>
      <button class="btn btn-secondary" :disabled="isRunning" @click="handleClose">Close</button>
    </template>
  </BaseModal>
</template>

<script setup lang="ts">
import { ref, computed, watch } from "vue";
import BaseModal from "./base/BaseModal.vue";
import LogViewer from "./LogViewer.vue";
import Icon from "./base/Icon.vue";
import type { AssistContext } from "@/stores/assist";

const props = defineProps<{
  visible: boolean;
  operation: "start" | "stop" | "restart" | "rebuild";
  deploymentName: string;
  output: string;
  isRunning: boolean;
  isSuccess: boolean | null;
}>();

const emit = defineEmits(["close"]);

const assistContext = computed<AssistContext>(() => ({
  scope: "deployment",
  deployment: props.deploymentName,
  subject: props.deploymentName,
  seedMessage: `The "${props.operation}" operation just ${
    props.isSuccess ? "finished" : "failed"
  }. Explain what happened${props.isSuccess ? "" : " and how to fix it"}.`,
  seedContext: `\`\`\`\n${props.output || "(no output captured)"}\n\`\`\``,
}));

const startTime = ref<number | null>(null);
const elapsedTime = ref("0s");

const title = computed(() => {
  const ops: Record<string, string> = {
    start: "Starting",
    stop: "Stopping",
    restart: "Restarting",
    rebuild: "Rebuilding",
  };
  return `${ops[props.operation]} ${props.deploymentName}`;
});

const statusClass = computed(() => {
  if (props.isRunning) return "running";
  if (props.isSuccess === true) return "success";
  if (props.isSuccess === false) return "error";
  return "pending";
});

const statusLabel = computed(() => {
  if (props.isRunning) return "Running";
  if (props.isSuccess === true) return "Done";
  if (props.isSuccess === false) return "Failed";
  return "Pending";
});

watch(
  () => props.visible,
  (val) => {
    if (val) {
      startTime.value = Date.now();
      updateElapsedTime();
    } else {
      startTime.value = null;
    }
  },
);

const updateElapsedTime = () => {
  if (!startTime.value || !props.visible) return;

  const elapsed = Math.floor((Date.now() - startTime.value) / 1000);
  if (elapsed < 60) {
    elapsedTime.value = `${elapsed}s`;
  } else {
    const mins = Math.floor(elapsed / 60);
    const secs = elapsed % 60;
    elapsedTime.value = `${mins}m ${secs}s`;
  }

  if (props.isRunning) {
    setTimeout(updateElapsedTime, 1000);
  }
};

const handleClose = () => {
  if (!props.isRunning) {
    emit("close");
  }
};
</script>

<style scoped>
.header-info {
  display: flex;
  align-items: center;
  gap: var(--space-3);
}

.header-status {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  margin-left: auto;
  padding: var(--space-1) var(--space-3);
  border-radius: var(--radius-full);
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
}

.header-status.running {
  background: var(--color-info-50);
  color: var(--color-info-700);
}

.header-status.success {
  background: var(--color-success-50);
  color: var(--color-success-700);
}

.header-status.error {
  background: var(--color-danger-50);
  color: var(--color-danger-700);
}

.header-status.pending {
  background: var(--surface-inset);
  color: var(--text-muted);
}

.header-elapsed {
  font-variant-numeric: tabular-nums;
  opacity: 0.75;
}

.operation-badge {
  padding: var(--space-1) var(--space-3);
  border-radius: var(--radius-full);
  font-size: var(--text-xs);
  font-weight: var(--font-semibold);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.operation-badge.start {
  background: var(--color-success-50);
  color: var(--color-success-700);
}

.operation-badge.stop {
  background: var(--color-danger-50);
  color: var(--color-danger-700);
}

.operation-badge.restart {
  background: var(--color-info-50);
  color: var(--color-info-700);
}

.operation-badge.rebuild {
  background: var(--color-warning-50);
  color: var(--color-warning-700);
}

.header-info h3 {
  font-size: var(--text-xl);
  font-weight: var(--font-semibold);
  color: var(--text);
  margin: 0;
}

.output-section {
  border-radius: var(--radius-sm);
  overflow: hidden;
}

.btn {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-3) var(--space-5);
  border-radius: var(--radius-sm);
  font-weight: var(--font-medium);
  font-size: var(--text-md);
  cursor: pointer;
  transition: all var(--transition-base);
}

.btn-secondary {
  background: var(--surface-raised);
  border: 1px solid var(--border);
  color: var(--text);
}

.btn-secondary:hover:not(:disabled) {
  background: var(--surface-sunken);
}

.btn-secondary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
