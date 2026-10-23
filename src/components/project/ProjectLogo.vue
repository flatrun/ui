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
// from an object URL rather than linked directly. A project keeps only its latest version.
const uploads = new Map<string, { version: string; url: Promise<string> }>();

function uploadedLogo(name: string, version: string): Promise<string> {
  const cached = uploads.get(name);
  if (cached?.version === version) return cached.url;
  cached?.url.then((url) => URL.revokeObjectURL(url)).catch(() => undefined);
  const url = deploymentsApi.logo(name).then((r) => URL.createObjectURL(r.data));
  uploads.set(name, { version, url });
  url.catch(() => uploads.get(name)?.url === url && uploads.delete(name));
  return url;
}

const templates = useTemplateLogos();
const logo = computed(() => projectLogo(props.deployment, templates.value));
const uploaded = ref("");
const failed = ref(false);

watch(logo, () => (failed.value = false));

const uploadKey = computed(() => ("upload" in logo.value ? `${props.deployment.name}:${logo.value.upload}` : ""));

watch(
  uploadKey,
  async (key) => {
    uploaded.value = "";
    if (!key || !("upload" in logo.value)) return;
    try {
      const url = await uploadedLogo(props.deployment.name, logo.value.upload);
      if (uploadKey.value === key) uploaded.value = url;
    } catch {
      if (uploadKey.value === key) failed.value = true;
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
