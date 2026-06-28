<template>
  <div class="modal-overlay" @click.self="$emit('close')">
    <div class="modal-content">
      <div class="modal-header">
        <h2>{{ title }}</h2>
        <button class="btn btn-icon" type="button" @click="$emit('close')">
          <i class="pi pi-times" />
        </button>
      </div>

      <div class="dialog-tabs">
        <button
          v-for="tab in visibleTabs"
          :key="tab.id"
          class="tab-btn"
          :class="{ active: activeTab === tab.id }"
          type="button"
          @click="$emit('update:activeTab', tab.id)"
        >
          <i v-if="tab.icon" :class="tab.icon" />
          {{ tab.label }}
          <span v-if="tab.count !== undefined && tab.count > 0" class="tab-count">{{ tab.count }}</span>
        </button>
      </div>

      <form @submit.prevent="$emit('submit')">
        <div v-for="tab in visibleTabs" :key="tab.id" v-show="activeTab === tab.id" class="tab-panel">
          <slot :name="tab.id" />
        </div>
        <div class="modal-actions">
          <button type="button" class="btn" @click="$emit('close')">{{ cancelLabel }}</button>
          <button type="submit" class="btn btn-primary" :disabled="submitting">
            {{ submitting ? submittingLabel : submitLabel }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";

export interface TabbedFormModalTab {
  id: string;
  label: string;
  icon?: string;
  count?: number;
  visible?: boolean;
}

const props = withDefaults(
  defineProps<{
    title: string;
    tabs: TabbedFormModalTab[];
    activeTab: string;
    submitting?: boolean;
    submitLabel?: string;
    submittingLabel?: string;
    cancelLabel?: string;
  }>(),
  {
    submitting: false,
    submitLabel: "Save",
    submittingLabel: "Saving...",
    cancelLabel: "Cancel",
  },
);

defineEmits<{
  close: [];
  submit: [];
  "update:activeTab": [value: string];
}>();

const visibleTabs = computed(() => props.tabs.filter((t) => t.visible !== false));
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 1rem;
}

.modal-content {
  background: var(--surface-raised);
  border: 1px solid var(--border);
  border-radius: var(--radius-xl);
  width: 100%;
  max-width: 640px;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 1.5rem;
  border-bottom: 1px solid var(--border);
}

.modal-header h2 {
  font-size: 1.125rem;
  font-weight: 600;
  margin: 0;
}

.modal-content form {
  display: flex;
  flex-direction: column;
  min-height: 0;
  flex: 1;
}

.dialog-tabs {
  display: flex;
  border-bottom: 1px solid var(--border);
  padding: 0 1.5rem;
  gap: 0.25rem;
  flex-shrink: 0;
}

.tab-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.625rem 1rem;
  background: transparent;
  border: none;
  border-bottom: 2px solid transparent;
  color: var(--text-muted);
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.15s;
  margin-bottom: -1px;
}

.tab-btn:hover {
  color: var(--text);
}

.tab-btn.active {
  color: var(--color-primary-600, #2563eb);
  border-bottom-color: var(--color-primary-500, #3b82f6);
}

.tab-count {
  font-size: 0.6875rem;
  padding: 0.0625rem 0.375rem;
  border-radius: 999px;
  background: var(--surface-inset);
  color: var(--text);
  font-weight: 500;
}

.tab-btn.active .tab-count {
  background: var(--color-primary-50, #dbeafe);
  color: var(--color-primary-700, #1d4ed8);
}

.tab-panel {
  padding: 1.25rem 1.5rem;
  overflow-y: auto;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
  padding: 1rem 1.5rem;
  border-top: 1px solid var(--border);
  flex-shrink: 0;
}

.btn {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.5rem 0.875rem;
  border: 1px solid var(--border);
  border-radius: 6px;
  background: var(--surface-raised);
  color: var(--text);
  cursor: pointer;
  font-size: 0.875rem;
  transition: all 0.15s;
}

.btn:hover {
  background: var(--surface-sunken);
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-icon {
  padding: 0.375rem;
  border-color: transparent;
  background: transparent;
}

.btn-icon:hover {
  background: var(--surface-inset);
}

.btn-primary {
  background: var(--color-primary-500, #3b82f6);
  color: white;
  border-color: var(--color-primary-500, #3b82f6);
  font-weight: 600;
}

.btn-primary:hover {
  background: var(--color-primary-600, #2563eb);
  border-color: var(--color-primary-600, #2563eb);
}
</style>
