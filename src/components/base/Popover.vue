<template>
  <div ref="root" class="popover">
    <slot name="trigger" :open="open" :toggle="toggle" />
    <div v-if="open" class="popover-panel" :class="`align-${align}`" :style="{ width }" role="dialog">
      <slot :close="close" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from "vue";

withDefaults(defineProps<{ align?: "left" | "right"; width?: string }>(), { align: "left", width: "280px" });

const open = defineModel<boolean>("open", { default: false });
const root = ref<HTMLElement | null>(null);

function toggle() {
  open.value = !open.value;
}

function close() {
  open.value = false;
}

function onDocClick(e: MouseEvent) {
  if (open.value && root.value && !root.value.contains(e.target as Node)) close();
}

function onKey(e: KeyboardEvent) {
  if (open.value && e.key === "Escape") close();
}

onMounted(() => {
  document.addEventListener("mousedown", onDocClick);
  document.addEventListener("keydown", onKey);
});

onBeforeUnmount(() => {
  document.removeEventListener("mousedown", onDocClick);
  document.removeEventListener("keydown", onKey);
});

defineExpose({ close });
</script>

<style scoped>
.popover {
  position: relative;
  display: inline-flex;
}

.popover-panel {
  position: absolute;
  top: calc(100% + 6px);
  z-index: var(--z-dropdown);
  max-width: calc(100vw - 24px);
  padding: var(--space-1);
  background: var(--surface-raised);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-lg);
}

.align-left {
  left: 0;
}

.align-right {
  right: 0;
}
</style>
