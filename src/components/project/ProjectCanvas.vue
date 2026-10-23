<template>
  <div class="project-canvas">
    <div v-if="environments.length > 1" class="env-switch" role="tablist" aria-label="Environment">
      <button
        v-for="env in environments"
        :key="env"
        type="button"
        role="tab"
        :aria-selected="env === environment"
        :class="{ active: env === environment }"
        @click="environment = env"
      >
        <Icon :name="env === PRODUCTION ? 'globe' : 'git-branch'" :size="14" />
        {{ env }}
      </button>
    </div>
    <VueFlow
      :key="environment"
      :nodes="nodes"
      :edges="edges"
      :min-zoom="0.3"
      :max-zoom="1.5"
      class="flow"
      @pane-ready="(flow: VueFlowStore) => flow.fitView({ maxZoom: 1, padding: 0.2 })"
      @node-click="(e: NodeMouseEvent) => emit('open', byName.get(e.node.id)!)"
      @node-drag-stop="(e: NodeDragEvent) => savePosition(e.node.id, e.node.position, POSITIONS_KEY)"
    >
      <CanvasControls />
      <template #node-project="nodeProps">
        <ProjectNode v-bind="nodeProps" />
      </template>
    </VueFlow>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue";
import {
  MarkerType,
  VueFlow,
  type Edge,
  type Node,
  type NodeDragEvent,
  type NodeMouseEvent,
  type VueFlowStore,
} from "@vue-flow/core";
import "@vue-flow/core/dist/style.css";
import Icon from "@/components/base/Icon.vue";
import CanvasControls from "@/components/canvas/CanvasControls.vue";
import ProjectNode from "./ProjectNode.vue";
import { loadEdges, type CanvasEdge } from "@/canvas/edges";
import { PRODUCTION, layoutDeployments, readSavedPositions, savePosition } from "@/canvas/layout";
import type { Project } from "@/model/project";
import type { Deployment } from "@/types";

const props = defineProps<{ projects: Project[] }>();
const emit = defineEmits<{ open: [deployment: Deployment] }>();

const environment = ref(PRODUCTION);
const relations = ref<CanvasEdge[]>([]);

const environments = computed(() => {
  const names = new Set(props.projects.flatMap((p) => p.environments.map((e) => e.name)));
  names.delete(PRODUCTION);
  return [PRODUCTION, ...[...names].sort()];
});

const visible = computed(() =>
  props.projects.flatMap((p) => p.environments.filter((e) => e.name === environment.value).map((e) => e.deployment)),
);
const byName = computed(() => new Map(visible.value.map((d) => [d.name, d])));

const POSITIONS_KEY = "flatrun-project-canvas-positions";
const CARD = { width: 300, height: 170 };
const GAP = 56;

// Cards sit in a grid of up to three columns, read left to right in the
// order variables flow between them; a card the viewer dragged keeps its spot.
const nodes = computed<Node[]>(() => {
  const saved = readSavedPositions(POSITIONS_KEY);
  const order = layoutDeployments(
    visible.value,
    relations.value.filter((e) => e.kind === "reference"),
    {},
    CARD,
  ).sort((a, b) => a.position.x - b.position.x || a.name.localeCompare(b.name));
  const columns = Math.min(3, Math.max(1, Math.ceil(Math.sqrt(order.length))));
  return order.map(({ name }, i) => ({
    id: name,
    type: "project",
    position: saved[name] ?? {
      x: (i % columns) * (CARD.width + GAP),
      y: Math.floor(i / columns) * (CARD.height + GAP),
    },
    data: { deployment: byName.value.get(name)! },
  }));
});

const edges = computed<Edge[]>(() => {
  const names = new Set(visible.value.map((d) => d.name));
  return relations.value
    .filter((e) => names.has(e.source) && names.has(e.target))
    .map((e) => ({
      id: e.id,
      source: e.source,
      target: e.target,
      type: "smoothstep",
      class: `edge-${e.kind}`,
      markerEnd: e.kind === "reference" ? MarkerType.ArrowClosed : undefined,
    }));
});

watch(
  visible,
  async (list) => {
    relations.value = list.length ? await loadEdges(list) : [];
  },
  { immediate: true },
);

watch(environments, (names) => {
  if (!names.includes(environment.value)) environment.value = PRODUCTION;
});

defineExpose({ nodes, edges, environment });
</script>

<style scoped>
.project-canvas {
  position: relative;
  height: calc(100vh - 210px);
  min-height: 480px;
  overflow: hidden;
  background-color: var(--canvas-bg);
  background-image: radial-gradient(var(--canvas-dot) 1px, transparent 1px);
  background-size: 18px 18px;
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
}

.flow {
  width: 100%;
  height: 100%;
}

.flow :deep(.vue-flow__edge path) {
  stroke: var(--border-strong);
  stroke-dasharray: 4 4;
  stroke-width: 1.5;
}

.env-switch {
  position: absolute;
  z-index: 5;
  top: var(--space-3);
  left: var(--space-3);
  display: inline-flex;
  padding: 3px;
  background: var(--surface-raised);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
}

.env-switch button {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: var(--space-1) var(--space-3);
  background: transparent;
  border: 0;
  border-radius: var(--radius-sm);
  color: var(--text-muted);
  cursor: pointer;
  font: inherit;
  font-size: var(--text-sm);
  text-transform: capitalize;
}

.env-switch button.active {
  background: var(--surface-inset);
  color: var(--text);
}
</style>
