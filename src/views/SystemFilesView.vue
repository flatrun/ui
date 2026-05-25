<template>
  <div class="system-files-view">
    <div class="view-header">
      <h1>System Files</h1>
    </div>
    <FileBrowser v-if="initialPathReady" :api="api" :enable-mount="false" :initial-path="initialPath" />
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from "vue";
import FileBrowser from "@/components/FileBrowser.vue";
import { createSystemFileApi, apiClient } from "@/services/api";

const api = createSystemFileApi();
const initialPath = ref("/");
const initialPathReady = ref(false);

onMounted(async () => {
  try {
    const response = await apiClient.get<{ home_path?: string }>("/system/files-info?usage=false");
    if (response.data?.home_path) {
      initialPath.value = response.data.home_path;
    }
  } catch {
    // Fall back to root if the info endpoint is unavailable.
  } finally {
    initialPathReady.value = true;
  }
});
</script>

<style scoped>
.system-files-view {
  padding: 1.5rem;
}
.view-header h1 {
  margin: 0 0 1rem;
  font-size: 1.5rem;
}
</style>
