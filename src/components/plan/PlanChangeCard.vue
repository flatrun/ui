<template>
  <div class="change-card">
    <div class="change-header" :class="{ clickable: hasDiff }" @click="hasDiff && (expanded = !expanded)">
      <i class="change-icon" :class="typeIcon" />
      <span v-for="badge in badges" :key="badge" class="action-badge" :class="`badge-${badge}`">
        {{ badge }}
      </span>
      <code class="change-id">{{ change.id }}</code>
      <i v-if="hasDiff" class="expand-icon pi" :class="expanded ? 'pi-chevron-up' : 'pi-chevron-down'" />
    </div>
    <p class="change-reason">{{ change.reason }}</p>

    <div v-if="isRedacted" class="redacted-notice">
      <i class="pi pi-eye-slash" />
      <span>Content hidden because it contains sensitive values.</span>
      <button class="reveal-btn" @click="emit('reveal')">Reveal</button>
    </div>

    <DiffView v-else-if="hasDiff && expanded" :before="change.before" :after="change.after" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from "vue";
import type { PlanChange } from "@/types";
import DiffView from "./DiffView.vue";

const props = defineProps<{
  change: PlanChange;
}>();

const emit = defineEmits<{
  reveal: [];
}>();

const expanded = ref(false);

const badges = computed(() => {
  if (props.change.actions.includes("delete") && props.change.actions.includes("create")) {
    return ["replace"];
  }
  return props.change.actions;
});

const typeIcon = computed(() => {
  const icons: Record<string, string> = {
    file: "pi pi-file",
    container: "pi pi-box",
    certificate: "pi pi-lock",
    database: "pi pi-database",
    config: "pi pi-cog",
  };
  return icons[props.change.type] || "pi pi-circle";
});

const isRedacted = computed(
  () => props.change.sensitive && (props.change.before === "[redacted]" || props.change.after === "[redacted]"),
);

const hasDiff = computed(() => !isRedacted.value && (props.change.before !== null || props.change.after !== null));
</script>

<style scoped>
.change-card {
  border: 1px solid var(--color-gray-200);
  border-radius: var(--radius-sm);
  padding: var(--space-3);
  background: white;
}

.change-header {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.change-header.clickable {
  cursor: pointer;
}

.change-icon {
  color: var(--color-gray-500);
  font-size: var(--text-sm);
}

.action-badge {
  padding: 1px var(--space-2);
  border-radius: var(--radius-full);
  font-size: 10px;
  font-weight: var(--font-semibold);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.badge-create {
  background: var(--color-success-100);
  color: var(--color-success-700);
}

.badge-update {
  background: var(--color-info-100);
  color: var(--color-info-700);
}

.badge-replace {
  background: var(--color-warning-100);
  color: var(--color-warning-700);
}

.badge-delete {
  background: var(--color-danger-100);
  color: var(--color-danger-700);
}

.badge-no-op {
  background: var(--color-gray-100);
  color: var(--color-gray-600);
}

.change-id {
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  color: var(--color-gray-700);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
  min-width: 0;
}

.expand-icon {
  font-size: var(--text-xs);
  color: var(--color-gray-400);
  flex-shrink: 0;
}

.change-reason {
  margin: var(--space-2) 0 0;
  font-size: var(--text-xs);
  color: var(--color-gray-500);
}

.redacted-notice {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  margin-top: var(--space-2);
  padding: var(--space-2) var(--space-3);
  background: var(--color-gray-50);
  border: 1px dashed var(--color-gray-300);
  border-radius: var(--radius-sm);
  font-size: var(--text-xs);
  color: var(--color-gray-600);
}

.reveal-btn {
  margin-left: auto;
  background: none;
  border: none;
  color: var(--color-primary-500);
  cursor: pointer;
  font-size: var(--text-xs);
  font-weight: var(--font-medium);
  padding: 0;
}

.reveal-btn:hover {
  color: var(--color-primary-600);
  text-decoration: underline;
}

.change-card > .diff-view {
  margin-top: var(--space-2);
}
</style>
