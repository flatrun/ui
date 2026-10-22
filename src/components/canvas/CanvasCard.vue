<template>
  <div class="canvas-card" :class="[state, { selected }]">
    <div class="body">
      <div class="head">
        <span class="logo"><Icon :name="icon" :size="22" /></span>
        <div class="titles">
          <span class="title" :title="title">{{ title }}</span>
          <a v-if="link" class="link" :href="link.href" target="_blank" rel="noopener" @click.stop>{{ link.text }}</a>
          <span v-else-if="subtitle" class="subtitle">{{ subtitle }}</span>
        </div>
      </div>
      <div class="state">
        <span class="dot" />
        <span>{{ label }}</span>
      </div>
    </div>
    <div v-if="$slots.footer" class="footer">
      <slot name="footer" />
    </div>
  </div>
</template>

<script setup lang="ts">
import Icon from "@/components/base/Icon.vue";
import type { CardState } from "@/model/project";

defineProps<{
  icon: string;
  title: string;
  subtitle?: string;
  link?: { href: string; text: string };
  state: CardState;
  label: string;
  selected?: boolean;
}>();
</script>

<style scoped>
.canvas-card {
  display: flex;
  overflow: hidden;
  flex-direction: column;
  background: var(--surface-raised);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition:
    border-color var(--transition-fast),
    box-shadow var(--transition-fast);
}

.canvas-card:hover {
  border-color: var(--border-strong);
}

.canvas-card.selected {
  border-color: var(--accent);
  box-shadow: 0 0 0 1px var(--accent);
}

.body {
  display: flex;
  min-height: 112px;
  flex-direction: column;
  justify-content: space-between;
  gap: var(--space-4);
  padding: var(--space-4);
}

.head {
  display: flex;
  min-width: 0;
  align-items: flex-start;
  gap: var(--space-3);
}

.logo {
  display: inline-grid;
  width: 24px;
  height: 24px;
  flex-shrink: 0;
  place-items: center;
  color: var(--text-muted);
}

.titles {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 2px;
}

.title {
  overflow: hidden;
  color: var(--text);
  font-size: var(--text-base);
  font-weight: var(--font-semibold);
  line-height: 24px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.link,
.subtitle {
  overflow: hidden;
  color: var(--text-muted);
  font-size: var(--text-sm);
  text-decoration: none;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.link:hover {
  color: var(--accent);
}

.state {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  color: var(--text-muted);
  font-size: var(--text-sm);
}

.dot {
  width: 8px;
  height: 8px;
  background: var(--status-stopped);
  border-radius: 50%;
}

.online .state {
  color: var(--status-running);
}

.online .dot {
  background: var(--status-running);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--status-running) 22%, transparent);
}

.degraded .state {
  color: var(--status-warning);
}

.degraded .dot {
  background: var(--status-warning);
}

.crashed .state {
  color: var(--status-failed);
}

.crashed .dot {
  background: var(--status-failed);
}

.footer {
  display: flex;
  min-height: 40px;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-4);
  background: var(--surface-sunken);
  border-top: 1px solid var(--border);
  color: var(--text-muted);
  font-size: var(--text-sm);
}
</style>
