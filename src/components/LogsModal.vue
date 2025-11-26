<template>
  <BaseModal
    :visible="visible"
    :title="deploymentName"
    subtitle="Container logs output"
    icon="pi pi-file"
    size="lg"
    @close="emit('close')"
  >
    <div class="logs-container">
      <div class="logs-toolbar">
        <div class="toolbar-info">
          <i class="pi pi-list" />
          <span>{{ lineCount }} lines</span>
        </div>
        <div class="toolbar-actions">
          <button
            class="toolbar-btn"
            @click="copyLogs"
          >
            <i class="pi pi-copy" />
            Copy
          </button>
          <button
            class="toolbar-btn"
            @click="downloadLogs"
          >
            <i class="pi pi-download" />
            Download
          </button>
        </div>
      </div>
      <pre
        ref="logsRef"
        class="logs-output"
      >{{ logs || 'No logs available' }}</pre>
    </div>
  </BaseModal>
</template>

<script setup lang="ts">
import { ref, computed } from "vue";
import { useNotificationsStore } from "@/stores/notifications";
import BaseModal from "./base/BaseModal.vue";

const props = defineProps<{
  visible: boolean;
  deploymentName: string;
  logs: string;
}>();

const emit = defineEmits(["close"]);
const notifications = useNotificationsStore();
const logsRef = ref<HTMLPreElement | null>(null);

const lineCount = computed(() => {
  if (!props.logs) return 0;
  return props.logs.split("\n").length;
});

const copyLogs = () => {
  navigator.clipboard.writeText(props.logs);
  notifications.success("Copied", "Logs copied to clipboard");
};

const downloadLogs = () => {
  const blob = new Blob([props.logs], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${props.deploymentName}-logs.txt`;
  a.click();
  URL.revokeObjectURL(url);
  notifications.success("Downloaded", "Logs file downloaded");
};
</script>

<style scoped>
.logs-container {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.logs-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--space-3) var(--space-4);
  background: var(--color-gray-50);
  border-radius: var(--radius-lg);
  border: 1px solid var(--color-gray-100);
}

.toolbar-info {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  font-size: var(--text-sm);
  color: var(--color-gray-500);
}

.toolbar-actions {
  display: flex;
  gap: var(--space-2);
}

.toolbar-btn {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-4);
  background: white;
  border: 1px solid var(--color-gray-200);
  border-radius: var(--radius-md);
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  color: var(--color-gray-600);
  cursor: pointer;
  transition: all var(--transition-base);
}

.toolbar-btn:hover {
  background: var(--color-gray-50);
  border-color: var(--color-gray-300);
  color: var(--color-gray-900);
}

.logs-output {
  margin: 0;
  padding: var(--space-5);
  background: var(--color-gray-950);
  color: var(--color-gray-300);
  font-family: var(--font-mono);
  font-size: var(--text-sm);
  line-height: 1.7;
  border-radius: var(--radius-lg);
  overflow: auto;
  white-space: pre-wrap;
  word-break: break-all;
  min-height: 300px;
  max-height: 500px;
  border: 1px solid var(--color-gray-800);
}
</style>
