<template>
  <BaseModal
    :visible="visible"
    :title="title"
    :subtitle="subtitle"
    icon="pi pi-file"
    size="lg"
    @close="emit('close')"
  >
    <div class="logs-modal-content">
      <LogViewer
        :logs="logs"
        :loading="loading"
        :file-name="`${title}-logs.txt`"
        :empty-message="emptyMessage"
        @refresh="emit('refresh')"
      />
    </div>
  </BaseModal>
</template>

<script setup lang="ts">
import BaseModal from "./base/BaseModal.vue";
import LogViewer from "./LogViewer.vue";

withDefaults(
  defineProps<{
    visible: boolean;
    title: string;
    subtitle?: string;
    logs: string;
    loading?: boolean;
    emptyMessage?: string;
  }>(),
  {
    subtitle: "Container logs output",
    loading: false,
    emptyMessage: "No logs available",
  },
);

const emit = defineEmits(["close", "refresh"]);
</script>

<style scoped>
.logs-modal-content {
  height: 500px;
}
</style>
