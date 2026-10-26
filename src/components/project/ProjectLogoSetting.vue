<template>
  <div class="logo-setting">
    <p class="row-description">
      Use an icon id such as <code>logos:postgresql</code>, a link to an image, or the path of a PNG, WebP or SVG file
      in the project, such as <code>assets/logo.svg</code>. An upload is stored in the project as
      <code>.flatrun/logo.svg</code>. Left empty, the project shows the logo of a template running the same image, or an
      icon for the image.
    </p>
    <div class="logo-form">
      <ProjectLogo :deployment="deployment" :size="32" />
      <input
        v-model="value"
        class="logo-input"
        type="text"
        placeholder="logos:postgresql, https://... or assets/logo.svg"
        :disabled="busy"
        @keyup.enter="save"
      />
      <button class="btn btn-primary btn-sm" :disabled="busy || value === current" @click="save">Save</button>
      <label class="btn btn-secondary btn-sm" :class="{ disabled: busy }">
        <Icon name="upload" :size="14" />Upload
        <input type="file" accept="image/png,image/webp,image/svg+xml" hidden :disabled="busy" @change="upload" />
      </label>
      <button v-if="current" class="btn btn-secondary btn-sm" :disabled="busy" @click="reset">Reset</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue";
import Icon from "@/components/base/Icon.vue";
import ProjectLogo from "@/components/project/ProjectLogo.vue";
import { deploymentsApi } from "@/services/api";
import { useNotificationsStore } from "@/stores/notifications";
import type { Deployment } from "@/types";

const props = defineProps<{ deployment: Deployment }>();
const emit = defineEmits<{ changed: [] }>();

const notifications = useNotificationsStore();
const current = computed(() => props.deployment.metadata?.logo ?? "");
const value = ref(current.value);
const busy = ref(false);

watch(current, (v) => (value.value = v));

async function run(action: () => Promise<unknown>, done: string) {
  busy.value = true;
  try {
    await action();
    notifications.success("Saved", done);
    emit("changed");
  } catch (e: any) {
    notifications.error("Error", e.response?.data?.error || "Failed to update the logo");
    value.value = current.value;
  } finally {
    busy.value = false;
  }
}

function save() {
  const logo = value.value.trim();
  run(() => deploymentsApi.updateMetadata(props.deployment.name, { logo }), "Logo updated");
}

function upload(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  input.value = "";
  if (file) run(() => deploymentsApi.uploadLogo(props.deployment.name, file), "Logo uploaded");
}

function reset() {
  run(() => deploymentsApi.removeLogo(props.deployment.name), "Logo reset");
}
</script>

<style scoped>
.row-description {
  margin: 0 0 0.75rem;
  font-size: 0.8125rem;
  color: var(--text-muted);
  line-height: 1.5;
}

.logo-form {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-2);
}

.logo-input {
  flex: 1;
  min-width: 14rem;
  padding: var(--space-2) var(--space-3);
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  color: var(--text);
  font: inherit;
}

.logo-form label.btn {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  cursor: pointer;
}

.logo-form label.btn.disabled {
  opacity: 0.5;
  pointer-events: none;
}
</style>
