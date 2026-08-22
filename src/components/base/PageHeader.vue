<template>
  <header class="page-header">
    <div v-if="icon" class="page-header-icon">
      <Icon :name="icon" :size="22" />
    </div>
    <div class="page-header-copy">
      <nav v-if="section" class="page-header-breadcrumb" aria-label="Breadcrumb">
        <span>{{ section }}</span>
        <Icon name="chevron-right" :size="12" />
        <span aria-current="page">{{ title }}</span>
      </nav>
      <h1>{{ title }}</h1>
      <p v-if="subtitle">{{ subtitle }}</p>
    </div>
    <div v-if="$slots.actions" class="page-header-actions">
      <slot name="actions" />
    </div>
  </header>
</template>

<script setup lang="ts">
import Icon from "@/components/base/Icon.vue";

defineProps<{
  title: string;
  subtitle?: string;
  section?: string;
  icon?: string;
}>();
</script>

<style scoped>
.page-header {
  display: flex;
  align-items: center;
  gap: var(--space-4);
  min-height: 88px;
  padding: var(--space-4) var(--space-5);
  background: var(--surface-raised);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  box-shadow: var(--shadow-sm);
}

.page-header-icon {
  display: grid;
  width: 42px;
  height: 42px;
  flex: none;
  place-items: center;
  background: var(--accent-subtle);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-sm);
  color: var(--accent);
}

.page-header-copy {
  flex: 1;
  min-width: 0;
}

.page-header-breadcrumb {
  display: flex;
  align-items: center;
  gap: var(--space-1);
  margin-bottom: var(--space-1);
  color: var(--text-muted);
  font-size: var(--text-xs);
  font-weight: var(--font-semibold);
}

.page-header-breadcrumb [aria-current="page"] {
  color: var(--text);
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
    grid-template-columns: auto minmax(0, 1fr);
    min-height: auto;
    padding: var(--space-4);
  }

  .page-header-actions {
    grid-column: 1 / -1;
    width: 100%;
  }

  .page-header-actions :deep(.btn-primary) {
    flex: 1;
  }
}
</style>
