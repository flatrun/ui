<template>
  <div class="base-card">
    <div v-if="title || $slots.header || $slots.actions" class="base-card-header">
      <slot name="header">
        <Icon v-if="icon" :name="icon" :size="16" />
        <h3 class="base-card-title">{{ title }}</h3>
      </slot>
      <div v-if="$slots.actions" class="base-card-actions">
        <slot name="actions" />
      </div>
    </div>
    <div class="base-card-body">
      <slot />
    </div>
    <div v-if="$slots.footer" class="base-card-footer">
      <slot name="footer" />
    </div>
  </div>
</template>

<script setup lang="ts">
import Icon from "./Icon.vue";

defineProps<{ title?: string; icon?: string }>();
</script>

<style scoped>
.base-card {
  background: var(--surface-raised);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  overflow: hidden;
}

.base-card-header {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-4);
  border-bottom: 1px solid var(--border-subtle);
  color: var(--text);
}

.base-card-title {
  margin: 0;
  font-size: var(--text-md);
  font-weight: var(--font-semibold);
  color: var(--text);
}

.base-card-actions {
  margin-left: auto;
}

.base-card-body {
  padding: var(--space-4);
}

.base-card-footer {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: var(--space-3);
  padding: var(--space-4);
  border-top: 1px solid var(--border-subtle);
}
</style>
