<template>
  <div class="service-canvas">
    <div v-if="loaded && !services.length" class="empty">
      <Icon name="boxes" :size="24" />
      <p>This deployment's compose file has no services.</p>
    </div>
    <VueFlow
      v-else-if="loaded"
      :nodes="nodes"
      :edges="edges"
      :min-zoom="0.4"
      :max-zoom="1.5"
      :nodes-draggable="false"
      fit-view-on-init
      class="flow"
      @node-click="(e: NodeMouseEvent) => (selected = e.node.id)"
      @pane-click="selected = null"
    >
      <template #node-service="nodeProps">
        <ServiceNode v-bind="nodeProps" :selected="nodeProps.id === selected" />
      </template>
    </VueFlow>

    <ServicePanel :deployment-name="deploymentName" :service="selectedService" @close="selected = null" />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { MarkerType, VueFlow, type Edge, type Node, type NodeMouseEvent } from "@vue-flow/core";
import "@vue-flow/core/dist/style.css";
import Icon from "@/components/base/Icon.vue";
import ServiceNode from "./ServiceNode.vue";
import ServicePanel from "./ServicePanel.vue";
import { deploymentsApi } from "@/services/api";
import { serviceGraph } from "@/model/project";
import type { Service } from "@/types";

const props = defineProps<{ deploymentName: string }>();

const COLUMN = 330;
const ROW = 240;

const services = ref<Service[]>([]);
const loaded = ref(false);
const selected = ref<string | null>(null);

const selectedService = computed(() => services.value.find((s) => s.name === selected.value) ?? null);

const nodes = computed<Node[]>(() => {
  const graph = serviceGraph(services.value);
  const widest = Math.max(...graph.rows.map((r) => r.length));
  return graph.rows.flatMap((row, y) =>
    row.map((name, x) => ({
      id: name,
      type: "service",
      position: { x: (x + (widest - row.length) / 2) * COLUMN, y: y * ROW },
      data: { service: services.value.find((s) => s.name === name)! },
    })),
  );
});

const edges = computed<Edge[]>(() =>
  serviceGraph(services.value).links.map((l) => ({
    id: `${l.from}->${l.to}`,
    source: l.from,
    target: l.to,
    type: "smoothstep",
    class: "service-edge",
    markerEnd: MarkerType.ArrowClosed,
  })),
);

async function load() {
  try {
    services.value = (await deploymentsApi.getServices(props.deploymentName)).data.services ?? [];
  } catch {
    services.value = [];
  }
  loaded.value = true;
}

onMounted(load);
watch(() => props.deploymentName, load);
defineExpose({ load, nodes, edges, selected });
</script>

<style scoped>
.service-canvas {
  position: relative;
  height: min(70vh, 640px);
  min-height: 420px;
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

.flow :deep(.service-edge path) {
  stroke: var(--border-strong);
  stroke-dasharray: 4 4;
  stroke-width: 1.5;
}

.empty {
  display: flex;
  height: 100%;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  color: var(--text-muted);
}
</style>
