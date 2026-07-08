<template>
  <label class="base-field">
    <span v-if="label" class="base-field-label">{{ label }}</span>
    <slot />
    <span v-if="hint" class="base-field-hint">{{ hint }}</span>
  </label>
</template>

<script setup lang="ts">
defineProps<{ label?: string; hint?: string }>();
</script>

<style scoped>
.base-field {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.base-field-label {
  font-size: var(--text-xs);
  color: var(--text-muted);
}

.base-field-hint {
  font-size: var(--text-xs);
  color: var(--text-subtle);
}
</style>
