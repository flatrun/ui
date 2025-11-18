<template>
  <BaseModal
    :visible="visible"
    :close-disabled="isRunning"
    :close-on-overlay="!isRunning"
    size="lg"
    @close="handleClose"
  >
    <template #header>
      <div class="header-info">
        <span
          class="operation-badge"
          :class="operation"
        >{{ operation }}</span>
        <h3>{{ title }}</h3>
      </div>
    </template>

    <div class="status-section">
      <div
        class="status-indicator"
        :class="statusClass"
      >
        <i :class="statusIcon" />
      </div>
      <div class="status-text">
        <span class="status-label">{{ statusLabel }}</span>
        <span
          v-if="startTime"
          class="status-time"
        >
          {{ elapsedTime }}
        </span>
      </div>
    </div>

    <div class="output-section">
      <div class="output-header">
        <span>Output</span>
        <button
          v-if="output"
          class="copy-btn"
          @click="copyOutput"
        >
          <i class="pi pi-copy" />
          Copy
        </button>
      </div>
      <pre
        ref="outputRef"
        class="output-content"
      >{{
        output || "Waiting for output..."
      }}</pre>
    </div>

    <template #footer>
      <button
        class="btn btn-secondary"
        :disabled="isRunning"
        @click="handleClose"
      >
        Close
      </button>
    </template>
  </BaseModal>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from "vue";
import { useNotificationsStore } from "@/stores/notifications";
import BaseModal from "./base/BaseModal.vue";

const props = defineProps<{
  visible: boolean;
  operation: "start" | "stop" | "restart";
  deploymentName: string;
  output: string;
  isRunning: boolean;
  isSuccess: boolean | null;
}>();

const emit = defineEmits(["close"]);

const notifications = useNotificationsStore();
const outputRef = ref<HTMLPreElement | null>(null);
const startTime = ref<number | null>(null);
const elapsedTime = ref("0s");

const title = computed(() => {
  const ops: Record<string, string> = {
    start: "Starting",
    stop: "Stopping",
    restart: "Restarting",
  };
  return `${ops[props.operation]} ${props.deploymentName}`;
});

const statusClass = computed(() => {
  if (props.isRunning) return "running";
  if (props.isSuccess === true) return "success";
  if (props.isSuccess === false) return "error";
  return "pending";
});

const statusIcon = computed(() => {
  if (props.isRunning) return "pi pi-spin pi-spinner";
  if (props.isSuccess === true) return "pi pi-check";
  if (props.isSuccess === false) return "pi pi-times";
  return "pi pi-clock";
});

const statusLabel = computed(() => {
  if (props.isRunning) return "In Progress...";
  if (props.isSuccess === true) return "Completed Successfully";
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

watch(
  () => props.output,
  () => {
    nextTick(() => {
      if (outputRef.value) {
        outputRef.value.scrollTop = outputRef.value.scrollHeight;
      }
    });
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

const copyOutput = () => {
  if (props.output) {
    navigator.clipboard.writeText(props.output);
    notifications.success("Copied", "Output copied to clipboard");
  }
};
</script>

<style scoped>
.header-info {
  display: flex;
  align-items: center;
  gap: var(--space-3);
}

.operation-badge {
  padding: var(--space-1) var(--space-3);
  border-radius: var(--radius-md);
  font-size: var(--text-sm);
  font-weight: var(--font-semibold);
  text-transform: uppercase;
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

.header-info h3 {
  font-size: var(--text-xl);
  font-weight: var(--font-semibold);
  color: var(--color-gray-900);
  margin: 0;
}

.status-section {
  display: flex;
  align-items: center;
  gap: var(--space-4);
  padding: var(--space-4);
  background: var(--color-gray-50);
  border-radius: var(--radius-lg);
  margin-bottom: var(--space-6);
}

.status-indicator {
  width: 48px;
  height: 48px;
  border-radius: var(--radius-lg);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.25rem;
}

.status-indicator.pending {
  background: var(--color-gray-100);
  color: var(--color-gray-500);
}

.status-indicator.running {
  background: var(--color-info-50);
  color: var(--color-primary-600);
}

.status-indicator.success {
  background: var(--color-success-50);
  color: var(--color-success-600);
}

.status-indicator.error {
  background: var(--color-danger-50);
  color: var(--color-danger-600);
}

.status-text {
  display: flex;
  flex-direction: column;
}

.status-label {
  font-weight: var(--font-semibold);
  color: var(--color-gray-900);
}

.status-time {
  font-size: var(--text-md);
  color: var(--color-gray-500);
  margin-top: var(--space-1);
}

.output-section {
  display: flex;
  flex-direction: column;
}

.output-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--space-3);
  font-weight: var(--font-semibold);
  color: var(--color-gray-700);
}

.copy-btn {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: 0.375rem var(--space-3);
  background: var(--color-gray-100);
  border: none;
  border-radius: var(--radius-md);
  font-size: var(--text-sm);
  color: var(--color-gray-500);
  cursor: pointer;
  transition: all var(--transition-base);
}

.copy-btn:hover {
  background: var(--color-gray-200);
  color: var(--color-gray-700);
}

.output-content {
  margin: 0;
  padding: var(--space-4);
  background: var(--color-gray-900);
  color: var(--color-gray-300);
  font-family: var(--font-mono);
  font-size: var(--text-base);
  line-height: 1.6;
  border-radius: var(--radius-lg);
  overflow: auto;
  white-space: pre-wrap;
  word-break: break-all;
  min-height: 200px;
  max-height: 300px;
}

.btn {
  padding: 0.625rem var(--space-5);
  border-radius: var(--radius-md);
  font-weight: var(--font-medium);
  font-size: var(--text-md);
  cursor: pointer;
  transition: all var(--transition-base);
}

.btn-secondary {
  background: var(--color-gray-100);
  border: 1px solid var(--color-gray-300);
  color: var(--color-gray-700);
}

.btn-secondary:hover:not(:disabled) {
  background: var(--color-gray-200);
}

.btn-secondary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
