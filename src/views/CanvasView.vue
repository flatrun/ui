<template>
  <div class="canvas-view">
    <header class="canvas-bar">
      <div v-if="modern" class="fleet-title">
        <strong>Fleet</strong>
        <span>{{ scopeText }}</span>
      </div>
      <div class="env-switch" role="tablist" aria-label="Environment">
        <button
          v-for="env in environments"
          :key="env"
          role="tab"
          :aria-selected="env === environment"
          :class="{ active: env === environment }"
          @click="environment = env"
        >
          <Icon :name="env === PRODUCTION ? 'globe' : 'git-branch'" :size="14" />
          {{ env }}
        </button>
      </div>
      <div class="legend">
        <span v-for="source in edgeSources" :key="source.kind" class="legend-item" :class="`edge-${source.kind}`">
          <span class="legend-line" />{{ source.label }}
        </span>
      </div>
      <BaseButton size="sm" icon="refresh-cw" :loading="loading" @click="load">Refresh</BaseButton>
    </header>

    <div class="canvas-stage">
      <div v-if="loaded && !visible.length" class="canvas-empty">
        <Icon name="layout-grid" :size="28" />
        <p>No deployments in {{ environment }}.</p>
        <RouterLink to="/deployments" class="btn btn-primary btn-sm">Go to deployments</RouterLink>
      </div>
      <VueFlow
        v-else-if="loaded"
        :key="environment"
        :nodes="nodes"
        :edges="edges"
        :min-zoom="0.3"
        :max-zoom="1.6"
        fit-view-on-init
        class="flow"
        @node-click="onNodeClick"
        @node-drag-stop="onNodeDragStop"
        @pane-click="selected = null"
      >
        <template #node-deployment="nodeProps">
          <DeploymentNode v-bind="nodeProps" :selected="nodeProps.id === selected?.name" />
        </template>
      </VueFlow>
    </div>

    <DeploymentPanel :deployment="selected" @close="selected = null" @changed="load" />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { RouterLink } from "vue-router";
import { MarkerType, VueFlow, type Edge, type Node, type NodeDragEvent, type NodeMouseEvent } from "@vue-flow/core";
import "@vue-flow/core/dist/style.css";
import type { Deployment } from "@/types";
import { deploymentsApi } from "@/services/api";
import { listEdgeSources, loadEdges, type CanvasEdge } from "@/canvas/edges";
import { PRODUCTION, environmentNames, environmentOf, layoutDeployments, savePosition } from "@/canvas/layout";
import BaseButton from "@/components/base/BaseButton.vue";
import Icon from "@/components/base/Icon.vue";
import DeploymentNode from "@/components/canvas/DeploymentNode.vue";
import DeploymentPanel from "@/components/canvas/DeploymentPanel.vue";
import { useTheme } from "@/composables/useTheme";
import { useWorkspaceStore } from "@/stores/workspace";

const { current: currentStyle } = useTheme();
const modern = computed(() => currentStyle.value.layout === "modern");
const workspaceStore = useWorkspaceStore();
const scopeText = computed(() => {
  const name = workspaceStore.current?.name;
  return name ? `Every deployment in ${name}` : "Every deployment on this server";
});

const ENV_KEY = "flatrun-canvas-environment";

const deployments = ref<Deployment[]>([]);
const relations = ref<CanvasEdge[]>([]);
const loading = ref(false);
const loaded = ref(false);
const selectedName = ref<string | null>(null);
const environment = ref(readEnvironment());
const edgeSources = listEdgeSources();

function readEnvironment(): string {
  try {
    return localStorage.getItem(ENV_KEY) || PRODUCTION;
  } catch {
    return PRODUCTION;
  }
}

watch(environment, (env) => {
  selectedName.value = null;
  try {
    localStorage.setItem(ENV_KEY, env);
  } catch {
    // Remembering the environment is a convenience only.
  }
});

const environments = computed(() => environmentNames(deployments.value));
const visible = computed(() => deployments.value.filter((d) => environmentOf(d) === environment.value));

const selected = computed<Deployment | null>({
  get: () => deployments.value.find((d) => d.name === selectedName.value) || null,
  set: (d) => (selectedName.value = d?.name ?? null),
});

const nodes = computed<Node[]>(() =>
  layoutDeployments(
    visible.value,
    relations.value.filter((e) => e.kind === "reference"),
  ).map(({ name, position }) => ({
    id: name,
    type: "deployment",
    position,
    data: { deployment: visible.value.find((d) => d.name === name)! },
  })),
);

const edges = computed<Edge[]>(() => {
  const names = new Set(visible.value.map((d) => d.name));
  return relations.value
    .filter((e) => names.has(e.source) && names.has(e.target))
    .map((e) => ({
      id: e.id,
      source: e.source,
      target: e.target,
      label: edgeLabel(e.label),
      labelShowBg: true,
      labelBgPadding: [6, 3] as [number, number],
      labelBgBorderRadius: 4,
      class: `edge-${e.kind}`,
      markerEnd: e.kind === "reference" ? MarkerType.ArrowClosed : undefined,
    }));
});

function edgeLabel(label?: string): string | undefined {
  const parts = label?.split(", ") ?? [];
  return parts.length > 2 ? `${parts.length} variables` : label;
}

async function load() {
  loading.value = true;
  try {
    const { data } = await deploymentsApi.list();
    const list = data.deployments || [];
    relations.value = await loadEdges(list);
    deployments.value = list;
    if (!environments.value.includes(environment.value)) environment.value = PRODUCTION;
    loaded.value = true;
  } finally {
    loading.value = false;
  }
}

function onNodeClick({ node }: NodeMouseEvent) {
  selectedName.value = node.id;
}

function onNodeDragStop({ node }: NodeDragEvent) {
  savePosition(node.id, node.position);
}

onMounted(load);
</script>

<style scoped>
.canvas-view {
  display: flex;
  height: calc(100vh - 140px);
  min-height: 480px;
  flex-direction: column;
  gap: var(--space-3);
}

.canvas-bar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-3);
}

.env-switch {
  display: inline-flex;
  padding: 3px;
  background: var(--surface-sunken);
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
  background: var(--surface-raised);
  box-shadow: var(--shadow-xs);
  color: var(--text);
}

.legend {
  display: flex;
  gap: var(--space-4);
  margin-left: auto;
  color: var(--text-muted);
  font-size: var(--text-xs);
}

.legend-item {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.legend-line {
  width: 18px;
  border-top: 2px solid var(--accent);
}

.edge-network .legend-line {
  border-top: 2px dashed var(--text-subtle);
}

.canvas-stage {
  position: relative;
  flex: 1;
  overflow: hidden;
  background-color: var(--canvas-bg);
  background-image: radial-gradient(var(--canvas-dot) 1px, transparent 1px);
  background-size: 22px 22px;
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
}

.flow {
  width: 100%;
  height: 100%;
}

.canvas-empty {
  display: flex;
  height: 100%;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--space-3);
  color: var(--text-muted);
}

.flow :deep(.vue-flow__edge.edge-reference .vue-flow__edge-path) {
  stroke: var(--accent);
  stroke-width: 2;
}

.flow :deep(.vue-flow__edge.edge-network .vue-flow__edge-path) {
  stroke: var(--text-subtle);
  stroke-dasharray: 6 5;
  stroke-width: 1.5;
}

.flow :deep(.vue-flow__edge-textbg) {
  fill: var(--surface-raised);
}

.flow :deep(.vue-flow__edge-text) {
  fill: var(--text-muted);
  font-family: var(--font-mono);
  font-size: 10px;
}

.flow :deep(.vue-flow__node) {
  padding: 0;
  background: transparent;
  border: 0;
}

.fleet-title {
  display: flex;
  align-items: baseline;
  gap: var(--space-2);
  margin-right: auto;
  font-size: var(--text-sm);
}

.fleet-title span {
  color: var(--text-muted);
}
</style>
