<template>
  <aside v-if="!dismissed" class="context-banner">
    <Icon v-if="icon" :name="icon" :size="17" />
    <p><slot /></p>
    <button type="button" aria-label="Dismiss information" @click="dismiss">
      <Icon name="x" :size="15" />
    </button>
  </aside>
</template>

<script setup lang="ts">
import { ref } from "vue";
import Icon from "@/components/base/Icon.vue";

const props = defineProps<{
  id: string;
  icon?: string;
}>();

const storageKey = `flatrun-context-${props.id}`;
const dismissed = ref(localStorage.getItem(storageKey) === "dismissed");

function dismiss() {
  dismissed.value = true;
  localStorage.setItem(storageKey, "dismissed");
}
</script>

<style scoped>
.context-banner {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: var(--space-3);
  min-height: 42px;
  padding: var(--space-2) var(--space-3);
  background: var(--accent-subtle);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-sm);
  color: var(--accent-hover);
}

.context-banner p {
  margin: 0;
  color: var(--text-muted);
  font-size: var(--text-sm);
  line-height: 1.4;
}

.context-banner button {
  display: grid;
  width: 28px;
  height: 28px;
  padding: 0;
  place-items: center;
  background: transparent;
  border: 0;
  border-radius: var(--radius-xs);
  color: var(--text-muted);
  cursor: pointer;
}

.context-banner button:hover {
  background: var(--surface-inset);
  color: var(--text);
}

.context-banner button:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}
</style>
