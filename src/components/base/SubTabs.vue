<template>
  <div class="sub-tabs">
    <div class="sub-tabs-bar" role="tablist">
      <button
        v-for="tab in tabs"
        :key="tab.id"
        role="tab"
        class="sub-tab"
        :class="{ active: modelValue === tab.id }"
        :aria-selected="modelValue === tab.id"
        @click="emit('update:modelValue', tab.id)"
      >
        <i v-if="tab.icon" :class="tab.icon" />
        {{ tab.label }}
      </button>
    </div>
    <div class="sub-tabs-panel" role="tabpanel">
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
export interface SubTab {
  id: string;
  label: string;
  icon?: string;
}

defineProps<{
  tabs: SubTab[];
  modelValue: string;
}>();

const emit = defineEmits<{
  "update:modelValue": [id: string];
}>();
</script>

<style scoped>
.sub-tabs-bar {
  display: flex;
  gap: 2px;
  padding: 0 0.75rem;
}

.sub-tab {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.55rem 1rem;
  border: 1px solid transparent;
  border-bottom: none;
  border-radius: var(--radius-md, 8px) var(--radius-md, 8px) 0 0;
  background: transparent;
  font-size: 0.8rem;
  font-weight: 500;
  color: var(--color-gray-500, #6b7280);
  cursor: pointer;
  margin-bottom: -1px;
  position: relative;
  transition:
    color 0.15s ease,
    background 0.15s ease;
}

.sub-tab i {
  font-size: 0.75rem;
}

.sub-tab:hover {
  color: var(--color-gray-700, #374151);
  background: var(--color-gray-100, #f3f4f6);
}

.sub-tab.active {
  color: var(--color-primary-600, #2563eb);
  background: white;
  border-color: var(--color-gray-200, #e5e7eb);
  z-index: 1;
}

.sub-tab.active:hover {
  background: white;
}

.sub-tabs-panel {
  background: white;
  border: 1px solid var(--color-gray-200, #e5e7eb);
  border-radius: var(--radius-md, 8px);
  padding: 1rem 1.25rem;
}
</style>
