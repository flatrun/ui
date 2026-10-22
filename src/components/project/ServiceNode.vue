<template>
  <div class="service-node" :class="{ selected }">
    <Handle type="target" :position="Position.Top" class="handle" />
    <div class="card">
      <div class="head">
        <span class="icon"><Icon :name="icon" :size="16" /></span>
        <span class="name" :title="service.name">{{ service.name }}</span>
      </div>
      <a v-if="domain" class="domain" :href="`https://${domain}`" target="_blank" rel="noopener" @click.stop>{{
        domain
      }}</a>
      <div class="status" :class="state">
        <span class="dot" />
        <span>{{ statusText }}</span>
      </div>
    </div>
    <div v-for="m in volumes" :key="m.target" class="volume" :title="`${m.source} → ${m.target}`">
      <Icon name="hard-drive" :size="12" />
      <span>{{ m.source || m.target }}</span>
    </div>
    <Handle type="source" :position="Position.Bottom" class="handle" />
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { Handle, Position } from "@vue-flow/core";
import Icon from "@/components/base/Icon.vue";
import { serviceIcon } from "@/lib/brand";
import type { Service } from "@/types";

const props = defineProps<{ data: { service: Service }; selected?: boolean }>();

const service = computed(() => props.data.service);
const volumes = computed(() =>
  (service.value.mounts ?? []).filter((m) => m.type === "volume" || m.source.startsWith("./")),
);

const icon = computed(() => serviceIcon(service.value.image));
const domain = computed(() => service.value.domains?.[0]);

const state = computed(() => {
  if (service.value.status === "running" && service.value.health !== "unhealthy") return "running";
  if (service.value.status === "running") return "unhealthy";
  if (service.value.status === "exited" || service.value.status === "dead") return "failed";
  return "stopped";
});

const statusText = computed(() => {
  const s = service.value;
  const label =
    state.value === "running"
      ? "Running"
      : state.value === "unhealthy"
        ? "Unhealthy"
        : state.value === "failed"
          ? "Exited"
          : "Not running";
  const replicas = s.replicas ?? 1;
  return replicas > 1 ? `${label} · ${s.running_replicas ?? 0}/${replicas} replicas` : label;
});
</script>

<style scoped>
.service-node {
  width: 220px;
}

.card {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  padding: var(--space-3);
  background: var(--surface-raised);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: border-color var(--transition-fast);
}

.service-node:hover .card {
  border-color: var(--border-strong);
}

.service-node.selected .card {
  border-color: var(--accent);
  box-shadow: 0 0 0 1px var(--accent);
}

.head {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.icon {
  display: inline-grid;
  width: 24px;
  height: 24px;
  place-items: center;
  background: var(--surface-inset);
  border-radius: var(--radius-sm);
  color: var(--text-muted);
}

.name {
  overflow: hidden;
  font-size: var(--text-base);
  font-weight: var(--font-semibold);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.domain {
  overflow: hidden;
  color: var(--text-muted);
  font-size: var(--text-xs);
  text-decoration: none;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.domain:hover {
  color: var(--accent);
}

.status {
  display: flex;
  align-items: center;
  gap: 6px;
  color: var(--text-muted);
  font-size: var(--text-xs);
}

.dot {
  width: 7px;
  height: 7px;
  background: var(--status-stopped);
  border-radius: 50%;
}

.status.running .dot {
  background: var(--status-running);
}

.status.unhealthy .dot {
  background: var(--status-warning);
}

.status.failed {
  color: var(--status-failed);
}

.status.failed .dot {
  background: var(--status-failed);
}

.volume {
  display: flex;
  align-items: center;
  gap: 6px;
  margin: 0 var(--space-2);
  padding: 4px var(--space-2);
  background: var(--surface-sunken);
  border: 1px solid var(--border);
  border-top: 0;
  border-radius: 0 0 var(--radius-sm) var(--radius-sm);
  color: var(--text-muted);
  font-family: var(--font-mono);
  font-size: 11px;
}

.handle {
  opacity: 0;
}
</style>
