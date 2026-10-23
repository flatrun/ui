<template>
  <div class="project-node">
    <Handle type="target" :position="Position.Left" class="handle" />
    <CanvasCard
      :icon="sleeping ? 'moon' : undefined"
      :title="deployment.name"
      :link="link"
      :subtitle="subtitle"
      :state="state"
      :label="label"
      :selected="selected"
    >
      <template v-if="!sleeping" #logo><ProjectLogo :deployment="deployment" :size="22" /></template>
      <template v-if="services.length" #footer>
        <span class="logos">
          <Icon v-for="s in services.slice(0, 5)" :key="s.name" :name="serviceIcon(s.image)" :size="14" />
        </span>
        <span>{{ services.length === 1 ? "1 service" : `${services.length} services` }}</span>
        <span v-if="down" class="down">· {{ down }} down</span>
      </template>
    </CanvasCard>
    <Handle type="source" :position="Position.Right" class="handle" />
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { Handle, Position } from "@vue-flow/core";
import Icon from "@/components/base/Icon.vue";
import CanvasCard from "@/components/canvas/CanvasCard.vue";
import ProjectLogo from "@/components/project/ProjectLogo.vue";
import { serviceIcon } from "@/lib/brand";
import { projectState } from "@/model/project";
import type { Deployment } from "@/types";

const props = defineProps<{ data: { deployment: Deployment }; selected?: boolean }>();

const deployment = computed(() => props.data.deployment);
const services = computed(() => deployment.value.services ?? []);
const down = computed(
  () => services.value.filter((s) => s.status && !["running", "unknown"].includes(s.status)).length,
);
const sleeping = computed(() => !!deployment.value.metadata?.sleep?.sleeping);
const status = computed(() => projectState(deployment.value));
const state = computed(() => status.value.state);
const label = computed(() => status.value.label);

const link = computed(() => {
  const domain = deployment.value.metadata?.networking?.domain;
  if (!domain || !deployment.value.metadata?.networking?.expose) return undefined;
  return { href: `${deployment.value.metadata?.ssl?.enabled ? "https" : "http"}://${domain}`, text: domain };
});

const subtitle = computed(() => {
  const source = deployment.value.metadata?.source;
  if (source?.ref && /^https?:\/\//.test(source.ref))
    return source.ref.replace(/^https?:\/\/(www\.)?/, "").replace(/\.git$/, "");
  return services.value.find((s) => s.is_primary)?.image ?? services.value[0]?.image;
});
</script>

<style scoped>
.project-node {
  width: 300px;
}

.logos {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.down {
  color: var(--status-warning);
}

.handle {
  opacity: 0;
}
</style>
