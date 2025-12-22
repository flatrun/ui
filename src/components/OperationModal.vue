<template>
  <BaseModal :visible="visible" :close-disabled="isRunning" :close-on-overlay="false" size="lg" @close="handleClose">
    <template #header>
      <div class="header-info">
        <span class="operation-badge" :class="operation">{{ operation }}</span>
        <h3>{{ title }}</h3>
      </div>
    </template>

    <div class="status-section">
      <div class="status-indicator" :class="statusClass">
        <i :class="statusIcon" />
      </div>
      <div class="status-text">
        <span class="status-label">{{ statusLabel }}</span>
        <span v-if="startTime" class="status-time">
          {{ elapsedTime }}
        </span>
      </div>
    </div>

    <div class="output-section">
      <LogViewer
        :logs="output"
        :loading="isRunning && !output"
        empty-message="Waiting for output..."
        :file-name="`${deploymentName}-${operation}.txt`"
        :max-height="300"
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

const props = defineProps<{
  visible: boolean;
  operation: "start" | "stop" | "restart";
  deploymentName: string;
  output: string;
  isRunning: boolean;
  isSuccess: boolean | null;
}>();

const emit = defineEmits(["close"]);

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
  padding: var(--space-5);
  background: linear-gradient(135deg, var(--color-gray-50), white);
  border: 1px solid var(--color-gray-100);
  border-radius: var(--radius-lg);
  margin-bottom: var(--space-6);
}

.status-indicator {
  width: 56px;
  height: 56px;
  border-radius: var(--radius-xl);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
  transition: all 0.3s ease;
}

.status-indicator.pending {
  background: var(--color-gray-100);
  color: var(--color-gray-500);
}

.status-indicator.running {
  background: linear-gradient(135deg, var(--color-primary-50), var(--color-info-50));
  color: var(--color-primary-600);
  box-shadow: 0 0 0 4px var(--color-primary-50);
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
  gap: var(--space-1);
}

.status-label {
  font-size: var(--text-lg);
  font-weight: var(--font-semibold);
  color: var(--color-gray-900);
}

.status-time {
  font-size: var(--text-sm);
  color: var(--color-gray-500);
}

.output-section {
  margin-top: var(--space-4);
  border-radius: var(--radius-md);
  overflow: hidden;
}

.btn {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-3) var(--space-5);
  border-radius: var(--radius-md);
  font-weight: var(--font-medium);
  font-size: var(--text-md);
  cursor: pointer;
  transition: all var(--transition-base);
}

.btn-secondary {
  background: white;
  border: 1px solid var(--color-gray-200);
  color: var(--color-gray-700);
}

.btn-secondary:hover:not(:disabled) {
  background: var(--color-gray-50);
}

.btn-secondary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
