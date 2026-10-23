<template>
  <div class="staged-bar" role="region" aria-label="Staged changes">
    <Icon name="layers" :size="16" class="lead" />
    <div class="text">
      <strong>Changes staged for {{ plan.resource.id }}</strong>
      <span>{{ detail }}</span>
    </div>
    <div class="actions">
      <BaseButton size="sm" variant="ghost" :disabled="applying" @click="emit('discard')">Discard</BaseButton>
      <BaseButton size="sm" :disabled="applying" @click="emit('details')">Details</BaseButton>
      <BaseButton size="sm" :variant="destructive ? 'danger' : 'primary'" :loading="applying" @click="emit('apply')"
        >Apply changes</BaseButton
      >
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import type { Plan } from "@/types";
import BaseButton from "@/components/base/BaseButton.vue";
import Icon from "@/components/base/Icon.vue";

const props = defineProps<{ plan: Plan; applying?: boolean }>();
const emit = defineEmits<{ apply: []; discard: []; details: [] }>();

const destructive = computed(() => props.plan.summary.delete > 0 && props.plan.summary.create === 0);

const detail = computed(() => {
  const changes = props.plan.changes;
  const own = changes.filter((c) => c.type !== "container").map((c) => c.reason || `${c.actions.join(", ")} ${c.id}`);
  const recreated = changes.filter((c) => c.type === "container" && c.actions.includes("create")).length;
  if (recreated) own.push(`${recreated} container${recreated === 1 ? "" : "s"} recreated on the next deploy`);
  return own.join(" · ");
});
</script>

<style scoped>
.staged-bar {
  position: fixed;
  bottom: var(--space-4);
  left: 50%;
  z-index: var(--z-dropdown);
  display: flex;
  width: min(720px, calc(100vw - 32px));
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-2) var(--space-2) var(--space-2) var(--space-4);
  background: var(--surface-raised);
  border: 1px solid var(--border-strong);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-lg);
  transform: translateX(-50%);
}

.lead {
  flex: 0 0 auto;
  color: var(--accent);
}

.text {
  display: flex;
  min-width: 0;
  flex: 1;
  flex-direction: column;
}

.text strong {
  font-size: var(--text-sm);
  font-weight: var(--font-semibold);
}

.text span {
  overflow: hidden;
  color: var(--text-muted);
  font-size: var(--text-xs);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.actions {
  display: flex;
  flex: 0 0 auto;
  gap: var(--space-1);
}

@media (max-width: 600px) {
  .staged-bar {
    flex-wrap: wrap;
  }

  .text {
    flex-basis: calc(100% - 32px);
  }

  .actions {
    width: 100%;
    justify-content: flex-end;
  }
}
</style>
