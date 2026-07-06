<template>
  <div v-if="extensions.length" class="plugin-slot">
    <component
      :is="kindComponent(ext.extension.kind)"
      v-for="ext in extensions"
      :key="ext.plugin.name + ext.extension.slot + ext.extension.kind"
      :plugin-name="ext.plugin.name"
      :endpoint="ext.extension.endpoint || ''"
      :context="context"
    />
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { usePluginsStore, type PluginSlot } from "@/stores/plugins";
import MetricsPanel from "./kinds/MetricsPanel.vue";
import SchemaForm from "./kinds/SchemaForm.vue";

const props = defineProps<{
  slotName: PluginSlot;
  context?: Record<string, unknown>;
  pluginName?: string;
}>();

const pluginsStore = usePluginsStore();
const extensions = computed(() =>
  (pluginsStore.getPluginsForSlot(props.slotName) || []).filter(
    (e) => !props.pluginName || e.plugin.name === props.pluginName,
  ),
);

// A plugin selects a render kind; the UI owns the component, so no remote code runs.
const kinds: Record<string, unknown> = {
  "metrics-panel": MetricsPanel,
  form: SchemaForm,
};
const kindComponent = (kind: string) => kinds[kind];
</script>

<style scoped>
.plugin-slot {
  display: flex;
  flex-direction: column;
  gap: var(--space-5);
}
</style>
