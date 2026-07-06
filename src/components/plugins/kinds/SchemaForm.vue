<template>
  <div class="schema-form">
    <div v-if="loading" class="form-loading"><Icon name="loader-circle" spin :size="20" /></div>
    <template v-else>
      <div v-for="field in fields" :key="field.key" class="field">
        <label :for="field.key">{{ field.label }}</label>
        <input v-if="field.type === 'boolean'" :id="field.key" v-model="values[field.key]" type="checkbox" />
        <input
          v-else-if="field.type === 'number'"
          :id="field.key"
          v-model.number="values[field.key]"
          type="number"
          :min="field.min"
        />
        <input v-else :id="field.key" v-model="values[field.key]" type="text" />
      </div>
      <div class="form-actions">
        <span v-if="saved" class="saved-note"><Icon name="check" :size="14" /> Saved</span>
        <span v-if="error" class="error-note"><Icon name="circle-alert" :size="14" /> {{ error }}</span>
        <button class="btn btn-primary" :disabled="saving" @click="save">
          <Icon v-if="saving" name="loader-circle" spin :size="14" />
          Save
        </button>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from "vue";
import Icon from "@/components/base/Icon.vue";
import { pluginApi } from "@/services/pluginApi";
import { usePluginsStore } from "@/stores/plugins";

const props = defineProps<{
  pluginName: string;
  endpoint: string;
}>();

interface Field {
  key: string;
  label: string;
  type: string;
  min?: number;
}

const api = pluginApi(props.pluginName);
const pluginsStore = usePluginsStore();

const fields = ref<Field[]>([]);
const values = reactive<Record<string, unknown>>({});
const loading = ref(true);
const saving = ref(false);
const saved = ref(false);
const error = ref("");

function schemaFields(): Field[] {
  const plugin = pluginsStore.plugins.find((p) => p.name === props.pluginName);
  const schema = plugin?.config_schema || {};
  return Object.entries(schema).map(([key, def]) => {
    const d = (def && typeof def === "object" ? def : {}) as Record<string, unknown>;
    return {
      key,
      label: String(d.label ?? key),
      type: String(d.type ?? "string"),
      min: typeof d.min === "number" ? d.min : undefined,
    };
  });
}

async function load() {
  loading.value = true;
  fields.value = schemaFields();
  try {
    const res = await api.get<Record<string, unknown>>(props.endpoint);
    for (const f of fields.value) values[f.key] = res.data[f.key];
  } catch {
    // fall back to schema defaults already reflected as undefined
  } finally {
    loading.value = false;
  }
}

async function save() {
  saving.value = true;
  saved.value = false;
  error.value = "";
  try {
    await api.put(props.endpoint, { ...values });
    saved.value = true;
    setTimeout(() => (saved.value = false), 2000);
  } catch {
    error.value = "Could not save. Please try again.";
  } finally {
    saving.value = false;
  }
}

onMounted(load);
</script>

<style scoped>
.schema-form {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  max-width: 460px;
}

.form-loading {
  color: var(--text-muted);
}

.field {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.field label {
  font-size: var(--text-sm);
  color: var(--text);
}

.field input[type="text"],
.field input[type="number"] {
  padding: var(--space-2) var(--space-3);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  background: var(--surface);
  color: var(--text);
  font-size: var(--text-md);
}

.field input[type="checkbox"] {
  width: 18px;
  height: 18px;
}

.form-actions {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  margin-top: var(--space-2);
}

.saved-note {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  color: var(--color-success-600);
  font-size: var(--text-sm);
}

.error-note {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  color: var(--color-danger-600);
  font-size: var(--text-sm);
}

.btn {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  padding: var(--space-2) var(--space-4);
  border-radius: var(--radius-sm);
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  cursor: pointer;
  border: 1px solid transparent;
}

.btn-primary {
  background: var(--color-primary-500);
  color: white;
}

.btn-primary:disabled {
  opacity: 0.6;
  cursor: default;
}
</style>
