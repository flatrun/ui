<template>
  <div class="log-file-picker">
    <div class="picker-toolbar">
      <div class="location-tabs" role="tablist" aria-label="Log file location">
        <button type="button" :class="{ active: location === 'disk' }" @click="setLocation('disk')">
          <Icon name="hard-drive" :size="15" />
          On disk
        </button>
        <button type="button" :class="{ active: location === 'container' }" @click="setLocation('container')">
          <Icon name="container" :size="15" />
          In container
        </button>
      </div>
      <BaseSelect
        v-if="location === 'container'"
        :model-value="service"
        class="service-select"
        :disabled="loading"
        @update:model-value="selectService"
      >
        <option v-for="name in serviceNames" :key="name" :value="name">{{ name }}</option>
      </BaseSelect>
    </div>

    <nav class="picker-path" aria-label="File path">
      <button type="button" :disabled="loading" @click="browse('/')"><Icon name="home" :size="14" /></button>
      <template v-for="crumb in crumbs" :key="crumb.path">
        <Icon name="chevron-right" :size="13" />
        <button type="button" :disabled="loading" @click="browse(crumb.path)">{{ crumb.name }}</button>
      </template>
    </nav>

    <div v-if="loading" class="picker-state"><Icon name="loader-circle" spin :size="18" /> Reading files</div>
    <div v-else-if="error" class="picker-state picker-error"><Icon name="triangle-alert" :size="18" /> {{ error }}</div>
    <div v-else-if="!files.length" class="picker-state"><Icon name="folder-open" :size="20" /> No files here</div>
    <div v-else class="picker-list">
      <button v-if="path !== '/'" type="button" class="picker-row" @click="browse(parentPath)">
        <Icon name="corner-left-up" :size="15" /><span>..</span>
      </button>
      <button
        v-for="file in files"
        :key="file.path"
        type="button"
        class="picker-row"
        @click="file.is_dir ? browse(file.path) : choose(file.path)"
      >
        <Icon :name="file.is_dir ? 'folder' : 'file-text'" :size="15" />
        <span>{{ file.name }}</span>
        <Icon v-if="!file.is_dir" name="check" :size="14" class="select-mark" />
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { containerFilesApi, filesApi, type ContainerFile, type FileInfo } from "@/services/api";
import Icon from "@/components/base/Icon.vue";
import BaseSelect from "@/components/base/BaseSelect.vue";

const props = defineProps<{ deploymentName: string; serviceNames: string[] }>();
const emit = defineEmits<{
  select: [selection: { type: "file" | "container_file"; path: string; service?: string }];
}>();

const location = ref<"disk" | "container">("disk");
const service = ref(props.serviceNames[0] || "");
const path = ref("/");
const files = ref<Array<FileInfo | ContainerFile>>([]);
const loading = ref(false);
const error = ref("");

const crumbs = computed(() =>
  path.value
    .split("/")
    .filter(Boolean)
    .map((name, index, parts) => ({ name, path: `/${parts.slice(0, index + 1).join("/")}` })),
);
const parentPath = computed(() => {
  const parts = path.value.split("/").filter(Boolean);
  parts.pop();
  return `/${parts.join("/")}`;
});

async function browse(target: string) {
  loading.value = true;
  error.value = "";
  try {
    const response =
      location.value === "disk"
        ? await filesApi.list(props.deploymentName, target)
        : await containerFilesApi.list(props.deploymentName, service.value, target);
    files.value = response.data.files || [];
    path.value = "path" in response.data ? response.data.path || target : target;
  } catch (err: any) {
    files.value = [];
    error.value = err.response?.data?.error || err.message || "Could not read files";
  } finally {
    loading.value = false;
  }
}

function setLocation(next: "disk" | "container") {
  location.value = next;
  browse("/");
}

function selectService(value: string | number) {
  service.value = String(value);
  browse("/");
}

function choose(selectedPath: string) {
  emit("select", {
    type: location.value === "disk" ? "file" : "container_file",
    path: location.value === "disk" ? selectedPath.replace(/^\/+/, "") : selectedPath,
    service: location.value === "container" ? service.value : undefined,
  });
}

onMounted(() => browse("/"));
</script>

<style scoped>
.log-file-picker {
  overflow: hidden;
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  background: var(--surface-raised);
}
.picker-toolbar,
.picker-path {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-3);
  border-bottom: 1px solid var(--border);
}
.picker-toolbar {
  justify-content: space-between;
  background: var(--surface-sunken);
}
.location-tabs {
  display: flex;
  gap: var(--space-1);
}
.location-tabs button,
.picker-path button {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  border: 0;
  border-radius: var(--radius-full);
  background: transparent;
  color: var(--text-muted);
  padding: var(--space-1) var(--space-2);
  cursor: pointer;
}
.location-tabs button.active {
  background: var(--color-primary-100);
  color: var(--color-primary-700);
}
.service-select {
  width: auto;
  min-width: 140px;
}
.picker-path {
  overflow-x: auto;
  white-space: nowrap;
}
.picker-list {
  max-height: 240px;
  overflow-y: auto;
  padding: var(--space-1);
}
.picker-row {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: var(--space-2);
  width: 100%;
  padding: var(--space-2);
  border: 0;
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--text);
  text-align: left;
  cursor: pointer;
}
.picker-row:hover,
.picker-row:focus-visible {
  background: var(--surface-inset);
}
.picker-row span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.select-mark {
  color: var(--accent);
}
.picker-state {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  min-height: 120px;
  color: var(--text-muted);
}
.picker-error {
  color: var(--color-danger-700);
}
@media (max-width: 640px) {
  .picker-toolbar {
    align-items: stretch;
    flex-direction: column;
  }
  .service-select {
    width: 100%;
  }
}
</style>
