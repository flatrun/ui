<template>
  <BaseModal :visible="visible" :size="assistOpen ? '3xl' : 'lg'" no-padding @close="handleClose">
    <template #header>
      <div class="logs-header">
        <div class="logs-header-title">
          <span class="logs-header-icon"><Icon name="file-text" :size="18" /></span>
          <div>
            <h3>{{ title }}</h3>
            <p>{{ subtitle }}</p>
          </div>
        </div>
        <button
          class="assist-toggle"
          :class="{ active: assistOpen }"
          :title="assistOpen ? 'Hide assistant' : 'Ask the assistant about these logs'"
          @click="toggleAssist"
        >
          <Icon name="bot" :size="15" />
          <span>Ask the assistant</span>
        </button>
      </div>
    </template>

    <div class="logs-modal-content" :class="{ 'with-assist': assistOpen }">
      <div class="logs-pane">
        <LogViewer
          :logs="logs"
          :loading="loading"
          :file-name="`${title}-logs.txt`"
          :empty-message="emptyMessage"
          @refresh="emit('refresh')"
        />
      </div>
      <InlineAssist v-if="assistOpen" class="logs-assist-pane" @close="closeAssist" />
    </div>
  </BaseModal>
</template>

<script setup lang="ts">
import { ref } from "vue";
import BaseModal from "./base/BaseModal.vue";
import LogViewer from "./LogViewer.vue";
import Icon from "./base/Icon.vue";
import InlineAssist from "./ai/InlineAssist.vue";
import { useAssistStore } from "@/stores/assist";

const props = withDefaults(
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

const assistStore = useAssistStore();
const assistOpen = ref(false);

const toggleAssist = () => {
  if (assistOpen.value) {
    closeAssist();
    return;
  }
  assistStore.embedded = true;
  assistStore.open({
    scope: "system",
    subject: `${props.title} logs`,
    seedContext: props.logs,
  });
  assistOpen.value = true;
};

const closeAssist = () => {
  assistOpen.value = false;
  assistStore.close();
};

const handleClose = () => {
  if (assistOpen.value) closeAssist();
  emit("close");
};
</script>

<style scoped>
.logs-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-4);
  width: 100%;
}

.logs-header-title {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  min-width: 0;
}

.logs-header-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: var(--radius-md);
  background: var(--accent-subtle);
  color: var(--accent);
  flex-shrink: 0;
}

.logs-header-title h3 {
  margin: 0;
  font-size: var(--text-2xl);
  font-weight: var(--font-semibold);
  color: var(--text);
}

.logs-header-title p {
  margin: 0;
  font-size: var(--text-md);
  color: var(--text-muted);
}

.assist-toggle {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.35rem 0.7rem;
  background: var(--surface-sunken);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  color: var(--text);
  font-size: var(--text-sm);
  cursor: pointer;
  transition: all var(--transition-base);
  flex-shrink: 0;
}

.assist-toggle:hover {
  border-color: var(--accent);
}

.assist-toggle.active {
  background: var(--accent-subtle);
  border-color: var(--accent);
  color: var(--accent);
}

.logs-modal-content {
  height: 500px;
  overflow: hidden;
}

.logs-modal-content.with-assist {
  display: flex;
  gap: var(--space-3);
  padding: var(--space-3);
}

.logs-pane {
  flex: 1;
  min-width: 0;
  height: 100%;
  overflow: hidden;
}

.logs-assist-pane {
  width: 340px;
  flex-shrink: 0;
  height: 100%;
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  overflow: hidden;
}

@media (max-width: 720px) {
  .logs-modal-content.with-assist {
    flex-direction: column;
  }
  .logs-assist-pane {
    width: 100%;
    height: 45%;
  }
}
</style>
