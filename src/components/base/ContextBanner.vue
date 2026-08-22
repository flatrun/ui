<template>
  <aside
    v-if="!dismissed || $slots.actions"
    class="context-banner"
    :class="[`width-${width}`, `align-${align}`, { 'information-dismissed': dismissed }]"
  >
    <div v-if="!dismissed" class="context-banner-information">
      <span v-if="icon" class="context-banner-icon">
        <Icon :name="icon" :size="18" />
      </span>
      <p><slot /></p>
      <button v-if="dismissible" type="button" aria-label="Dismiss information" @click="dismiss">
        <Icon name="x" :size="15" />
      </button>
    </div>
    <div v-if="$slots.actions" class="context-banner-actions">
      <slot name="actions" />
    </div>
  </aside>
</template>

<script setup lang="ts">
import { ref } from "vue";
import Icon from "@/components/base/Icon.vue";

const props = withDefaults(
  defineProps<{
    id: string;
    icon?: string;
    dismissible?: boolean;
    width?: "full" | "half" | "content";
    align?: "start" | "end";
  }>(),
  { dismissible: false, width: "full", align: "start" },
);

const storageKey = `flatrun-context-${props.id}`;
const dismissed = ref(props.dismissible && localStorage.getItem(storageKey) === "dismissed");

function dismiss() {
  dismissed.value = true;
  localStorage.setItem(storageKey, "dismissed");
}
</script>

<style scoped>
.context-banner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
  min-height: 38px;
  padding: var(--space-1) var(--space-3);
  background: var(--surface-raised);
  border: 1px solid var(--border);
  border-left: 3px solid var(--accent);
  border-radius: var(--radius-sm);
  box-shadow: var(--shadow-sm);
  color: var(--accent-hover);
}

.context-banner.width-half {
  width: 50%;
}

.context-banner.width-content {
  width: fit-content;
  max-width: 100%;
}

.context-banner.align-end {
  margin-left: auto;
}

.context-banner.information-dismissed {
  justify-content: flex-end;
  padding-block: 0;
  background: transparent;
  border-color: transparent;
  box-shadow: none;
}

.context-banner-icon {
  display: grid;
  width: 30px;
  height: 30px;
  place-items: center;
  background: var(--accent-subtle);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-sm);
  color: var(--accent-hover);
}

.context-banner-information {
  display: grid;
  min-width: 0;
  flex: 1;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: var(--space-3);
}

.context-banner-information p {
  margin: 0;
  color: var(--text-muted);
  font-size: var(--text-base);
  font-weight: var(--font-medium);
  line-height: 1.4;
}

.context-banner-information button {
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

.context-banner-information button:hover {
  background: var(--surface-inset);
  color: var(--text);
}

.context-banner-information button:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}

.context-banner-actions {
  display: flex;
  flex: none;
  align-items: center;
  gap: var(--space-2);
}

@media (max-width: 760px) {
  .context-banner {
    width: 100%;
    align-items: stretch;
    flex-direction: column;
  }

  .context-banner-actions {
    justify-content: flex-end;
  }

  .context-banner-actions :deep(.btn-primary) {
    flex: 1;
  }
}
</style>
