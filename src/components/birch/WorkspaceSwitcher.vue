<template>
  <Popover v-model:open="open" width="280px">
    <template #trigger="{ toggle }">
      <button type="button" class="crumb" :aria-expanded="open" aria-haspopup="dialog" @click="toggle">
        <span class="avatar" aria-hidden="true">{{ initial }}</span>
        <span class="crumb-label">{{ store.current?.name ?? "All workspaces" }}</span>
        <Icon name="chevrons-up-down" :size="14" />
      </button>
    </template>
    <template #default="{ close }">
      <ul class="rows">
        <li class="row" :class="{ current: !store.slug }">
          <button type="button" class="row-main" @click="pick('', close)">
            <Icon name="layers" :size="14" />
            <span class="row-name">All workspaces</span>
          </button>
        </li>
        <li v-for="w in store.workspaces" :key="w.slug" class="row" :class="{ current: w.slug === store.slug }">
          <button type="button" class="row-main" @click="pick(w.slug, close)">
            <span class="avatar small" aria-hidden="true">{{ w.name.charAt(0).toUpperCase() }}</span>
            <span class="row-name">{{ w.name }}</span>
            <span v-if="w.role" class="role">{{ w.role }}</span>
          </button>
        </li>
      </ul>
      <form v-if="creating" class="create" @submit.prevent="create(close)">
        <input
          ref="nameInput"
          v-model="name"
          placeholder="Workspace name"
          aria-label="Workspace name"
          :disabled="busy"
        />
        <button type="submit" class="btn btn-primary btn-sm" :disabled="!name.trim() || busy">Create</button>
      </form>
      <p v-if="error" class="error">{{ error }}</p>
      <div class="footer">
        <button v-if="canWrite && !creating" type="button" class="link" @click="startCreate">
          <Icon name="plus" :size="14" />New workspace
        </button>
        <RouterLink v-if="store.current" to="/workspace" class="link" @click="close">
          <Icon name="users" :size="14" />Members
        </RouterLink>
      </div>
    </template>
  </Popover>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, ref } from "vue";
import { RouterLink } from "vue-router";
import Popover from "@/components/base/Popover.vue";
import Icon from "@/components/base/Icon.vue";
import { useWorkspaceStore } from "@/stores/workspace";
import { useAuthStore } from "@/stores/auth";

const store = useWorkspaceStore();
const auth = useAuthStore();
const open = ref(false);
const creating = ref(false);
const name = ref("");
const busy = ref(false);
const error = ref("");
const nameInput = ref<HTMLInputElement>();

const canWrite = computed(() => auth.hasPermission("workspaces:write"));
const initial = computed(() => (store.current?.name ?? "A").charAt(0).toUpperCase());

function pick(slug: string, close: () => void) {
  close();
  store.select(slug);
}

async function startCreate() {
  creating.value = true;
  error.value = "";
  await nextTick();
  nameInput.value?.focus();
}

async function create(close: () => void) {
  busy.value = true;
  error.value = "";
  try {
    await store.create(name.value.trim());
    name.value = "";
    creating.value = false;
    close();
  } catch (e: any) {
    error.value = e.response?.data?.error || "Could not create the workspace";
  } finally {
    busy.value = false;
  }
}

onMounted(() => {
  if (!store.loaded) store.load();
});
</script>

<style scoped>
.crumb {
  display: inline-flex;
  max-width: 220px;
  height: var(--control-h-sm);
  align-items: center;
  gap: 6px;
  padding: 0 var(--space-2);
  background: transparent;
  border: 1px solid transparent;
  border-radius: var(--radius-sm);
  color: var(--text);
  cursor: pointer;
  font: inherit;
  font-size: var(--text-base);
  font-weight: var(--font-medium);
}

.crumb:hover,
.crumb[aria-expanded="true"] {
  background: var(--surface-inset);
}

.crumb-label {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.avatar {
  display: inline-grid;
  width: 18px;
  height: 18px;
  flex-shrink: 0;
  place-items: center;
  background: var(--accent);
  border-radius: var(--radius-sm);
  color: var(--accent-contrast);
  font-size: 11px;
  font-weight: var(--font-semibold);
}

.avatar.small {
  width: 16px;
  height: 16px;
  font-size: 10px;
}

.rows {
  max-height: 300px;
  overflow-y: auto;
  margin: var(--space-1) 0;
  padding: 0;
  list-style: none;
}

.row {
  border-radius: var(--radius-sm);
}

.row:hover {
  background: var(--surface-inset);
}

.row-main {
  display: flex;
  width: 100%;
  align-items: center;
  gap: var(--space-2);
  padding: 6px var(--space-2);
  background: transparent;
  border: 0;
  color: var(--text);
  cursor: pointer;
  font: inherit;
  font-size: var(--text-base);
  text-align: left;
}

.row.current .row-name {
  font-weight: var(--font-semibold);
}

.row-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.role {
  margin-left: auto;
  color: var(--text-subtle);
  font-size: var(--text-xs);
}

.create {
  display: flex;
  gap: var(--space-2);
  padding: var(--space-2);
  border-top: 1px solid var(--border-subtle);
}

.create input {
  min-width: 0;
  flex: 1;
  height: var(--control-h-sm);
  padding: 0 var(--space-2);
  background: var(--surface);
  border: 1px solid var(--border-strong);
  border-radius: var(--radius-sm);
  color: var(--text);
  font: inherit;
  font-size: var(--text-base);
}

.error {
  margin: 0;
  padding: 0 var(--space-2) var(--space-2);
  color: var(--status-failed);
  font-size: var(--text-sm);
}

.footer {
  display: flex;
  gap: var(--space-3);
  padding: var(--space-2);
  border-top: 1px solid var(--border-subtle);
}

.link {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 0;
  background: none;
  border: 0;
  color: var(--text-muted);
  cursor: pointer;
  font: inherit;
  font-size: var(--text-sm);
  text-decoration: none;
}

.link:hover {
  color: var(--text);
}

@media (max-width: 600px) {
  .crumb-label {
    display: none;
  }
}
</style>
