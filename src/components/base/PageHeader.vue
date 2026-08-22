<template>
  <header class="page-header">
    <div class="page-header-copy">
      <h1>{{ title }}</h1>
      <p v-if="subtitle">{{ subtitle }}</p>
    </div>
    <div v-if="$slots.actions" class="page-header-actions">
      <slot name="actions" />
    </div>
  </header>
</template>

<script setup lang="ts">
defineProps<{
  title: string;
  subtitle?: string;
}>();
</script>

<style scoped>
.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-4);
  min-height: 78px;
  padding: var(--space-4) var(--space-5);
  background: var(--surface-raised);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  box-shadow: var(--shadow-sm);
}

.page-header-copy {
  min-width: 0;
}

h1 {
  margin: 0;
  color: var(--text);
  font-size: var(--text-2xl);
  font-weight: var(--font-semibold);
}

p {
  max-width: 72ch;
  margin: var(--space-1) 0 0;
  color: var(--text-muted);
  font-size: var(--text-sm);
}

.page-header-actions {
  display: flex;
  align-items: center;
  flex: none;
  gap: var(--space-2);
}

@media (max-width: 640px) {
  .page-header {
    display: grid;
    min-height: auto;
    padding: var(--space-4);
  }

  .page-header-actions {
    width: 100%;
  }

  .page-header-actions :deep(.btn-primary) {
    flex: 1;
  }
}
</style>
