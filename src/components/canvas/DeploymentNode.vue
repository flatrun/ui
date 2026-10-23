<template>
  <div class="dep-node" :class="[`status-${deployment.status}`, { selected }]">
    <Handle type="target" :position="Position.Left" class="dep-handle" />
    <div class="dep-node-head">
      <span class="dep-icon"><Icon :name="icon" :size="16" /></span>
      <span class="dep-name" :title="deployment.name">{{ deployment.name }}</span>
    </div>
    <div class="dep-node-meta">
      <span class="dep-status">
        <span class="dot" />
        {{ sleeping ? "Asleep" : deployment.status }}
      </span>
      <span v-if="revision" class="dep-rev" :title="source?.ref">
        <Icon name="git-commit-horizontal" :size="12" />{{ revision }}
      </span>
      <span v-else-if="domain" class="dep-rev">{{ domain }}</span>
    </div>
    <Handle type="source" :position="Position.Right" class="dep-handle" />
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { Handle, Position } from "@vue-flow/core";
import type { Deployment } from "@/types";
import Icon from "@/components/base/Icon.vue";
import { projectIcon } from "@/lib/brand";

const props = defineProps<{ data: { deployment: Deployment }; selected?: boolean }>();

const deployment = computed(() => props.data.deployment);
const source = computed(() => deployment.value.metadata?.source);
const sleeping = computed(() => !!deployment.value.metadata?.sleep?.sleeping);
const revision = computed(() => source.value?.last_revision?.slice(0, 7));
const domain = computed(() => deployment.value.metadata?.networking?.domain);
const icon = computed(() => (sleeping.value ? "moon" : projectIcon(deployment.value)));
</script>

<style scoped>
.dep-node {
  width: 240px;
  padding: var(--space-3);
  background: var(--surface-raised);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-sm);
  color: var(--text);
  transition:
    border-color var(--transition-fast),
    box-shadow var(--transition-fast);
}

.dep-node:hover,
.dep-node.selected {
  border-color: var(--accent);
  box-shadow: 0 0 0 3px var(--accent-subtle);
}

.dep-node-head {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.dep-icon {
  display: grid;
  width: 28px;
  height: 28px;
  flex-shrink: 0;
  place-items: center;
  background: var(--accent-subtle);
  border-radius: var(--radius-md);
  color: var(--accent);
}

.dep-name {
  overflow: hidden;
  font-weight: var(--font-semibold);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.dep-node-meta {
  display: flex;
  justify-content: space-between;
  gap: var(--space-2);
  margin-top: var(--space-3);
  color: var(--text-muted);
  font-size: var(--text-xs);
}

.dep-status {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  text-transform: capitalize;
}

.dot {
  width: 8px;
  height: 8px;
  background: var(--text-subtle);
  border-radius: 50%;
}

.status-running .dot {
  background: var(--c-green);
  box-shadow: 0 0 0 3px rgba(34, 197, 94, 0.18);
}

.status-error .dot {
  background: var(--c-red);
}

.dep-rev {
  display: inline-flex;
  min-width: 0;
  align-items: center;
  gap: 4px;
  overflow: hidden;
  font-family: var(--font-mono);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.dep-handle {
  width: 8px;
  height: 8px;
  background: var(--border);
  border: none;
  opacity: 0;
}
</style>
