<template>
  <img v-if="src" :src="src" alt="" class="project-logo" :width="size" :height="size" @error="failed = true" />
  <Icon v-else :name="icon" :size="size" />
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue";
import Icon from "@/components/base/Icon.vue";
import { deploymentsApi } from "@/services/api";
import { projectIcon } from "@/lib/brand";
import { projectLogo } from "@/lib/project-logo";
import { useTemplateLogos } from "@/composables/useTemplateLogos";
import type { Deployment } from "@/types";

const props = withDefaults(
  defineProps<{ deployment: Pick<Deployment, "name" | "services" | "metadata" | "logo_version">; size?: number }>(),
  { size: 18 },
);

// An uploaded logo is served behind the API's auth, so it is fetched once per version and shown
// from an object URL rather than linked directly.
const uploads = new Map<string, Promise<string>>();

const templates = useTemplateLogos();
const logo = computed(() => projectLogo(props.deployment, templates.value));
const uploaded = ref("");
const failed = ref(false);

watch(logo, () => (failed.value = false));

watch(
  () => ("upload" in logo.value ? `${props.deployment.name}:${logo.value.upload}` : ""),
  async (key) => {
    uploaded.value = "";
    if (!key) return;
    if (!uploads.has(key)) {
      uploads.set(
        key,
        deploymentsApi.logo(props.deployment.name).then((r) => URL.createObjectURL(r.data)),
      );
    }
    try {
      uploaded.value = await uploads.get(key)!;
    } catch {
      uploads.delete(key);
      failed.value = true;
    }
  },
  { immediate: true },
);

const src = computed(() => {
  if (failed.value) return "";
  if ("src" in logo.value) return logo.value.src;
  return uploaded.value;
});
const icon = computed(() => ("icon" in logo.value && !failed.value ? logo.value.icon : projectIcon(props.deployment)));
</script>

<style scoped>
.project-logo {
  display: inline-block;
  flex-shrink: 0;
  object-fit: contain;
  vertical-align: middle;
}
</style>
