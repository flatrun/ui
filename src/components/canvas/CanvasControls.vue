<template>
  <div class="canvas-controls" role="toolbar" aria-label="Canvas">
    <button type="button" title="Zoom in" aria-label="Zoom in" @click="zoomIn()">
      <Icon name="plus" :size="16" />
    </button>
    <button type="button" title="Zoom out" aria-label="Zoom out" @click="zoomOut()">
      <Icon name="minus" :size="16" />
    </button>
    <button
      type="button"
      title="Fit to screen"
      aria-label="Fit to screen"
      @click="fitView({ maxZoom: 1, padding: 0.2 })"
    >
      <Icon name="scan" :size="16" />
    </button>
  </div>
</template>

<script setup lang="ts">
import { useVueFlow } from "@vue-flow/core";
import Icon from "@/components/base/Icon.vue";

const { zoomIn, zoomOut, fitView } = useVueFlow();
</script>

<style scoped>
.canvas-controls {
  position: absolute;
  z-index: 5;
  bottom: var(--space-4);
  left: var(--space-4);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: var(--surface-raised);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
}

.canvas-controls button {
  display: inline-grid;
  width: 34px;
  height: 34px;
  place-items: center;
  background: transparent;
  border: 0;
  color: var(--text-muted);
  cursor: pointer;
}

.canvas-controls button + button {
  border-top: 1px solid var(--border);
}

.canvas-controls button:hover {
  background: var(--surface-inset);
  color: var(--text);
}
</style>
