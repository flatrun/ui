<template>
  <BaseModal
    :visible="visible"
    :title="`Logs: ${deploymentName}`"
    icon="pi pi-file"
    size="lg"
    @close="emit('close')"
  >
    <div class="logs-toolbar">
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
    <pre
      ref="logsRef"
      class="logs-output"
    >{{ logs }}</pre>
  </BaseModal>
</template>

<script setup lang="ts">
import { ref } from "vue";
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
.logs-toolbar {
  display: flex;
  gap: var(--space-2);
  margin-bottom: var(--space-4);
}

.toolbar-btn {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-4);
  background: var(--color-gray-100);
  border: none;
  border-radius: var(--radius-md);
  font-size: var(--text-base);
  color: var(--color-gray-600);
  cursor: pointer;
  transition: all var(--transition-base);
}

.toolbar-btn:hover {
  background: var(--color-gray-200);
  color: var(--color-gray-900);
}

.logs-output {
  margin: 0;
  padding: var(--space-5);
  background: #0f172a;
  color: #e2e8f0;
  font-family: var(--font-mono);
  font-size: var(--text-base);
  line-height: 1.7;
  border-radius: var(--radius-lg);
  overflow: auto;
  white-space: pre-wrap;
  word-break: break-all;
  min-height: 300px;
  max-height: 500px;
}
</style>
