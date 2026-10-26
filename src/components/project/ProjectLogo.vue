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

// A logo file is served behind the API's auth, so it is fetched once per version and shown from
// an object URL rather than linked directly. A project keeps only its latest version.
const files = new Map<string, { version: string; url: Promise<string> }>();

function logoFile(name: string, version: string): Promise<string> {
  const cached = files.get(name);
  if (cached?.version === version) return cached.url;
  cached?.url.then((url) => URL.revokeObjectURL(url)).catch(() => undefined);
  const url = deploymentsApi.logo(name).then((r) => URL.createObjectURL(r.data));
  files.set(name, { version, url });
  url.catch(() => files.get(name)?.url === url && files.delete(name));
  return url;
}

const templates = useTemplateLogos();
const logo = computed(() => projectLogo(props.deployment, templates.value));
const fetched = ref("");
const failed = ref(false);

watch(logo, () => (failed.value = false));

const fileKey = computed(() => ("file" in logo.value ? `${props.deployment.name}:${logo.value.file}` : ""));

watch(
  fileKey,
  async (key) => {
    fetched.value = "";
    if (!key || !("file" in logo.value)) return;
    try {
      const url = await logoFile(props.deployment.name, logo.value.file);
      if (fileKey.value === key) fetched.value = url;
    } catch {
      if (fileKey.value === key) failed.value = true;
    }
  },
  { immediate: true },
);

const src = computed(() => {
  if (failed.value) return "";
  if ("src" in logo.value) return logo.value.src;
  return fetched.value;
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
