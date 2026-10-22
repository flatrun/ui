<template>
  <div class="service-node">
    <Handle type="target" :position="Position.Top" class="handle" />
    <CanvasCard
      :icon="serviceIcon(service.image)"
      :title="service.name"
      :link="domain ? { href: `https://${domain}`, text: domain } : undefined"
      :subtitle="domain ? undefined : service.image"
      :state="status.state"
      :label="status.label"
      :selected="selected"
    >
      <template v-if="volume || replicas > 1" #footer>
        <template v-if="replicas > 1">
          <Icon name="layers" :size="14" />
          <span>{{ service.running_replicas ?? 0 }}/{{ replicas }} replicas active</span>
        </template>
        <template v-else-if="volume">
          <Icon name="hard-drive" :size="14" />
          <span class="mono" :title="`${volume.source} → ${volume.target}`">{{ volume.source || volume.target }}</span>
        </template>
      </template>
    </CanvasCard>
    <Handle type="source" :position="Position.Bottom" class="handle" />
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { Handle, Position } from "@vue-flow/core";
import Icon from "@/components/base/Icon.vue";
import CanvasCard from "@/components/canvas/CanvasCard.vue";
import { serviceIcon } from "@/lib/brand";
import { serviceState } from "@/model/project";
import type { Service } from "@/types";

const props = defineProps<{ data: { service: Service }; selected?: boolean }>();

const service = computed(() => props.data.service);
const domain = computed(() => service.value.domains?.[0]);
const replicas = computed(() => service.value.replicas ?? 1);
const status = computed(() => serviceState(service.value));
const volume = computed(() =>
  (service.value.mounts ?? []).find((m) => m.type === "volume" || m.source.startsWith("./")),
);
</script>

<style scoped>
.service-node {
  width: 280px;
}

.mono {
  overflow: hidden;
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.handle {
  opacity: 0;
}
</style>
