<template>
  <div class="range-picker" role="tablist">
    <button
      v-for="r in ranges"
      :key="r"
      class="range-seg"
      :class="{ active: modelValue === r }"
      role="tab"
      :aria-selected="modelValue === r"
      @click="$emit('update:modelValue', r)"
    >
      {{ r }}
    </button>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  modelValue: string;
  ranges: string[];
}>();
defineEmits<{ (e: "update:modelValue", value: string): void }>();
</script>

<style scoped>
.range-picker {
  display: inline-flex;
  padding: 2px;
  gap: 2px;
  background: var(--surface-inset);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
}

.range-seg {
  padding: 0.2rem 0.7rem;
  border: none;
  background: transparent;
  border-radius: calc(var(--radius-sm) - 2px);
  font-size: var(--text-xs);
  font-weight: var(--font-medium);
  color: var(--text-muted);
  cursor: pointer;
  transition:
    color var(--transition-base),
    background var(--transition-base);
}

.range-seg:hover {
  color: var(--text);
}

.range-seg.active {
  background: var(--surface-raised);
  color: var(--color-primary-600);
  box-shadow: var(--shadow-sm);
}
</style>
