<template>
  <div class="base-select">
    <select
      class="base-select-el"
      :value="modelValue"
      :disabled="disabled"
      @change="$emit('update:modelValue', ($event.target as HTMLSelectElement).value)"
    >
      <slot />
    </select>
    <Icon name="chevron-down" :size="16" class="base-select-chevron" />
  </div>
</template>

<script setup lang="ts">
import Icon from "./Icon.vue";

defineProps<{ modelValue?: string | number; disabled?: boolean }>();
defineEmits<{ (e: "update:modelValue", value: string): void }>();
</script>

<style scoped>
.base-select {
  position: relative;
  width: 100%;
}

.base-select-el {
  appearance: none;
  -webkit-appearance: none;
  width: 100%;
  padding: var(--space-2) var(--space-3);
  padding-right: 2rem;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  background: var(--surface);
  color: var(--text);
  font-size: var(--text-md);
  cursor: pointer;
  transition: all var(--transition-base);
}

.base-select-el:focus {
  outline: none;
  border-color: var(--accent);
  box-shadow: 0 0 0 var(--ring-width) var(--ring-color);
}

.base-select-el:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.base-select-chevron {
  position: absolute;
  right: 0.6rem;
  top: 50%;
  transform: translateY(-50%);
  color: var(--text-muted);
  pointer-events: none;
}
</style>
