<template>
  <input
    class="base-input"
    :value="modelValue"
    :type="type"
    :placeholder="placeholder"
    :disabled="disabled"
    @input="$emit('update:modelValue', ($event.target as HTMLInputElement).value)"
  />
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    modelValue?: string | number;
    type?: string;
    placeholder?: string;
    disabled?: boolean;
  }>(),
  { type: "text" },
);
defineEmits<{ (e: "update:modelValue", value: string): void }>();
</script>

<style scoped>
.base-input {
  width: 100%;
  padding: var(--space-2) var(--space-3);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  background: var(--surface);
  color: var(--text);
  font-size: var(--text-md);
  transition: all var(--transition-base);
}

.base-input:focus {
  outline: none;
  border-color: var(--accent);
  box-shadow: 0 0 0 var(--ring-width) var(--ring-color);
}

.base-input:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.base-input::placeholder {
  color: var(--text-subtle);
}
</style>
