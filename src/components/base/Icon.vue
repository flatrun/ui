<template>
  <IconifyIcon
    :icon="resolvedName"
    :width="size"
    :height="size"
    :color="color"
    class="app-icon"
    :class="{ 'app-icon--spin': spin }"
    aria-hidden="true"
  />
</template>

<script setup lang="ts">
import { computed } from "vue";
import { Icon as IconifyIcon } from "@iconify/vue";
import "@/lib/icons";

const props = withDefaults(
  defineProps<{
    name: string;
    size?: number | string;
    color?: string;
    spin?: boolean;
  }>(),
  {
    size: 18,
    color: undefined,
    spin: false,
  },
);

// Bare names resolve to the lucide set; an explicit "set:name" passes through
// (only lucide is registered offline today).
const resolvedName = computed(() => (props.name.includes(":") ? props.name : `lucide:${props.name}`));
</script>

<style scoped>
.app-icon {
  display: inline-block;
  flex-shrink: 0;
  vertical-align: middle;
}

.app-icon--spin {
  animation: app-icon-spin 1s linear infinite;
}

@keyframes app-icon-spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
