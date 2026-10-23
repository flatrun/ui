<template>
  <span class="workspace-logo" :class="{ 'has-image': src }" aria-hidden="true">
    <img v-if="src" :src="src" alt="" />
    <template v-else>{{ initial }}</template>
  </span>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { workspacesApi } from "@/services/api";
import type { Workspace } from "@/types";

const props = defineProps<{ workspace: Pick<Workspace, "slug" | "name" | "logo"> }>();

// The logo is served behind the API's auth, so it is fetched once per version
// and shown from an object URL rather than linked directly.
const cache = new Map<string, Promise<string>>();

const src = ref("");
const initial = computed(() => props.workspace.name.charAt(0).toUpperCase());

watch(
  () => [props.workspace.slug, props.workspace.logo] as const,
  async ([slug, version]) => {
    src.value = "";
    if (!version) return;
    const key = `${slug}:${version}`;
    if (!cache.has(key)) {
      cache.set(
        key,
        workspacesApi.logo(slug).then((r) => URL.createObjectURL(r.data)),
      );
    }
    try {
      src.value = await cache.get(key)!;
    } catch {
      cache.delete(key);
    }
  },
  { immediate: true },
);
</script>

<style scoped>
.workspace-logo {
  overflow: hidden;
}

.workspace-logo.has-image {
  background: transparent;
}

.workspace-logo img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: contain;
}
</style>
