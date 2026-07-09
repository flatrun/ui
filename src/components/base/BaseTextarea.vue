<template>
  <textarea
    class="base-textarea"
    :value="modelValue"
    :placeholder="placeholder"
    :rows="rows"
    :disabled="disabled"
    @input="$emit('update:modelValue', ($event.target as HTMLTextAreaElement).value)"
  />
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    modelValue?: string;
    placeholder?: string;
    rows?: number;
    disabled?: boolean;
  }>(),
  { rows: 3 },
);
defineEmits<{ (e: "update:modelValue", value: string): void }>();
</script>

<style scoped>
.base-textarea {
  width: 100%;
  padding: var(--space-2) var(--space-3);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  background: var(--surface);
  color: var(--text);
  font-size: var(--text-md);
  font-family: inherit;
  resize: vertical;
  transition: all var(--transition-base);
}

.base-textarea:focus {
  outline: none;
  border-color: var(--accent);
  box-shadow: 0 0 0 var(--ring-width) var(--ring-color);
}

.base-textarea:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.base-textarea::placeholder {
  color: var(--text-subtle);
}
</style>
