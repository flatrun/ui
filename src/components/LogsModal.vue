<template>
  <BaseModal
    :visible="visible"
    :title="title"
    :subtitle="subtitle"
    icon="pi pi-file"
    size="lg"
    no-padding
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
    subtitle: "", // Will be set by parent or default to translation key
    loading: false,
    emptyMessage: "", // Will be set by parent or default to translation key
  },
);

const emit = defineEmits(["close", "refresh"]);
</script>

<style scoped>
.logs-modal-content {
  height: 500px;
  overflow: hidden;
}
</style>
