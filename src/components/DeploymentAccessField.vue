<template>
  <div class="deployment-access-field">
    <p v-if="hint" class="tab-hint">{{ hint }}</p>
    <div v-if="readOnly" class="readonly-view">
      <div v-if="!entries.length" class="empty-state">
        <i class="pi pi-info-circle" />
        <span>No deployment access</span>
      </div>
      <div v-else class="entries-list">
        <div v-for="entry in entries" :key="entry.name" class="entry-row readonly">
          <span class="entry-name">{{ entry.name }}</span>
          <span class="entry-level" :class="entry.level">{{ entry.level }}</span>
        </div>
      </div>
    </div>

    <template v-else>
      <div class="add-form">
        <select v-model="newName" class="form-input">
          <option value="">Select deployment...</option>
          <option v-for="d in selectable" :key="d" :value="d">{{ d }}</option>
        </select>
        <select v-model="newLevel" class="form-input">
          <option value="read">Read</option>
          <option value="write">Write</option>
          <option value="admin">Admin</option>
        </select>
        <button type="button" class="btn btn-primary btn-sm" :disabled="!newName" @click="addEntry">Add</button>
      </div>

      <div v-if="entries.length" class="entries-list">
        <div v-for="entry in entries" :key="entry.name" class="entry-row">
          <span class="entry-name">{{ entry.name }}</span>
          <select :value="entry.level" @change="setLevel(entry.name, ($event.target as HTMLSelectElement).value)">
            <option value="read">Read</option>
            <option value="write">Write</option>
            <option value="admin">Admin</option>
          </select>
          <button type="button" class="btn btn-icon btn-sm" title="Remove" @click="removeEntry(entry.name)">
            <i class="pi pi-times" />
          </button>
        </div>
      </div>
      <div v-else class="empty-state">
        <i class="pi pi-info-circle" />
        <span>{{ emptyHint || "No deployments selected" }}</span>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import type { DeploymentAccessLevel, DeploymentAccessMap } from "@/types";

const props = withDefaults(
  defineProps<{
    modelValue: DeploymentAccessMap;
    available: string[];
    hint?: string;
    emptyHint?: string;
    readOnly?: boolean;
    defaultLevel?: DeploymentAccessLevel;
  }>(),
  {
    readOnly: false,
    defaultLevel: "read",
  },
);

const emit = defineEmits<{
  "update:modelValue": [value: DeploymentAccessMap];
}>();

const newName = ref("");
const newLevel = ref<DeploymentAccessLevel>(props.defaultLevel);

const entries = computed(() =>
  Object.entries(props.modelValue || {})
    .map(([name, level]) => ({ name, level: level as DeploymentAccessLevel }))
    .sort((a, b) => a.name.localeCompare(b.name)),
);

const selectable = computed(() =>
  props.available.filter((d) => !(d in (props.modelValue || {}))).sort((a, b) => a.localeCompare(b)),
);

const addEntry = () => {
  if (!newName.value) return;
  emit("update:modelValue", { ...(props.modelValue || {}), [newName.value]: newLevel.value });
  newName.value = "";
  newLevel.value = props.defaultLevel;
};

const setLevel = (name: string, level: string) => {
  emit("update:modelValue", { ...(props.modelValue || {}), [name]: level as DeploymentAccessLevel });
};

const removeEntry = (name: string) => {
  const next = { ...(props.modelValue || {}) };
  delete next[name];
  emit("update:modelValue", next);
};
</script>

<style scoped>
.deployment-access-field {
  display: flex;
  flex-direction: column;
  gap: 0.625rem;
}

.tab-hint {
  margin: 0;
  font-size: 0.8125rem;
  color: var(--text-muted);
  line-height: 1.4;
}

.add-form {
  display: grid;
  grid-template-columns: 1fr auto auto;
  gap: 0.5rem;
  align-items: center;
}

.add-form .form-input {
  width: 100%;
  padding: 0.4375rem 0.625rem;
  border: 1px solid var(--border);
  border-radius: 6px;
  font-size: 0.875rem;
  background: var(--surface);
}

.add-form select:nth-child(2) {
  min-width: 100px;
}

.entries-list {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
}

.entry-row {
  display: grid;
  grid-template-columns: 1fr auto auto;
  align-items: center;
  gap: 0.5rem;
  padding: 0.4375rem 0.625rem;
  background: var(--surface-sunken);
  border: 1px solid var(--border);
  border-radius: 6px;
}

.entry-row.readonly {
  grid-template-columns: 1fr auto;
}

.entry-row select {
  padding: 0.25rem 0.5rem;
  border: 1px solid var(--border);
  border-radius: 4px;
  font-size: 0.8125rem;
  background: var(--surface);
}

.entry-name {
  font-size: 0.875rem;
  color: var(--text);
  word-break: break-all;
}

.entry-level {
  font-size: 0.6875rem;
  padding: 0.125rem 0.5rem;
  border-radius: 4px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  font-weight: 500;
  background: var(--border);
  color: var(--text);
}

.entry-level.read {
  background: var(--color-info-50, #eff6ff);
  color: var(--color-info-700, #1d4ed8);
}

.entry-level.write {
  background: var(--color-warning-50, #fffbeb);
  color: var(--color-warning-700, #b45309);
}

.entry-level.admin {
  background: var(--color-danger-50, #fef2f2);
  color: var(--color-danger-700, #b91c1c);
}

.empty-state {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.5rem 0;
  font-size: 0.8125rem;
  color: var(--text-muted);
}

.btn {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.4375rem 0.75rem;
  border: 1px solid var(--border);
  border-radius: 6px;
  background: var(--surface);
  color: var(--text);
  cursor: pointer;
  font-size: 0.8125rem;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-sm {
  padding: 0.25rem 0.5rem;
}

.btn-icon {
  padding: 0.3125rem;
  background: transparent;
  border-color: transparent;
}

.btn-icon:hover {
  background: var(--surface-inset);
}

.btn-primary {
  background: var(--color-primary-500, #3b82f6);
  color: white;
  border-color: var(--color-primary-500, #3b82f6);
}

.btn-primary:hover:not(:disabled) {
  background: var(--color-primary-600, #2563eb);
  border-color: var(--color-primary-600, #2563eb);
}
</style>
