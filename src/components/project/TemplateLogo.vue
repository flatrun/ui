<template>
  <img
    v-if="src"
    :src="src"
    :alt="alt"
    :width="size"
    :height="size"
    class="template-logo-image"
    @error="failed = true"
  />
  <Icon v-else :name="icon" :size="size" />
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue";
import Icon from "@/components/base/Icon.vue";
import { templateLogo } from "@/lib/project-logo";

const props = withDefaults(defineProps<{ logo?: string; alt?: string; size?: number }>(), {
  logo: "",
  alt: "",
  size: 20,
});

const failed = ref(false);
watch(
  () => props.logo,
  () => (failed.value = false),
);

const view = computed(() => templateLogo(props.logo));
const src = computed(() => (view.value && "src" in view.value && !failed.value ? view.value.src : ""));
const icon = computed(() => (view.value && "icon" in view.value && !failed.value ? view.value.icon : "box"));
</script>

<style scoped>
.template-logo-image {
  display: inline-block;
  flex-shrink: 0;
  object-fit: contain;
}
</style>
