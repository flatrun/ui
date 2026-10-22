<template>
  <div class="connections">
    <p v-if="error" class="error" role="alert">{{ error }}</p>

    <ul v-if="connections.length" class="list">
      <li v-for="c in connections" :key="c.id" class="item">
        <Icon name="plug" :size="14" class="lead" />
        <span class="main">
          <strong>{{ c.name }}</strong>
          <small
            >{{ label(c.provider)
            }}<template v-if="c.settings.site_url || c.settings.address || c.settings.api_url">
              · {{ c.settings.site_url || c.settings.address || c.settings.api_url }}</template
            ></small
          >
        </span>
        <button
          v-if="canWrite"
          type="button"
          class="icon-btn"
          :aria-label="`Remove ${c.name}`"
          title="Remove"
          @click="remove(c)"
        >
          <Icon name="trash-2" :size="14" />
        </button>
      </li>
    </ul>
    <p v-else-if="loaded && !adding" class="empty">No secret managers connected.</p>

    <form v-if="adding" class="editor" @submit.prevent="create">
      <div class="row">
        <select v-model="draft.provider" name="connection-provider" class="form-input" aria-label="Provider">
          <option v-for="p in providers" :key="p.type" :value="p.type">{{ p.label }}</option>
        </select>
        <BaseInput v-model="draft.name" name="connection-name" placeholder="Name" aria-label="Connection name" />
      </div>
      <BaseField v-for="f in fields" :key="f.key" :label="f.label + (f.required ? '' : ' (optional)')">
        <BaseInput
          v-model="draft.settings[f.key]"
          :name="`connection-${f.key}`"
          :type="f.secret ? 'password' : 'text'"
          :placeholder="f.default"
          autocomplete="off"
        />
      </BaseField>
      <div class="actions">
        <BaseButton size="sm" @click="adding = false">Cancel</BaseButton>
        <BaseButton size="sm" variant="primary" type="submit" :loading="busy" :disabled="!canSave">Connect</BaseButton>
      </div>
    </form>
    <BaseButton v-else-if="canWrite" size="sm" icon="plus" @click="startAdd">Connect a secret manager</BaseButton>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from "vue";
import BaseButton from "@/components/base/BaseButton.vue";
import BaseField from "@/components/base/BaseField.vue";
import BaseInput from "@/components/base/BaseInput.vue";
import Icon from "@/components/base/Icon.vue";
import { secretsApi, type SecretConnection, type SecretProvider } from "@/services/api";

defineProps<{ canWrite?: boolean }>();

const connections = ref<SecretConnection[]>([]);
const providers = ref<SecretProvider[]>([]);
const loaded = ref(false);
const adding = ref(false);
const busy = ref(false);
const error = ref("");
const draft = reactive({ provider: "", name: "", settings: {} as Record<string, string> });

const fields = computed(() => providers.value.find((p) => p.type === draft.provider)?.connection_fields ?? []);
const canSave = computed(
  () => !!draft.name.trim() && fields.value.every((f) => !f.required || !!draft.settings[f.key]?.trim()),
);

function label(type: string): string {
  return providers.value.find((p) => p.type === type)?.label ?? type;
}

function message(e: any, fallback: string): string {
  return e?.response?.data?.error || fallback;
}

async function load() {
  const [conns, provs] = await Promise.allSettled([secretsApi.connections(), secretsApi.providers()]);
  connections.value = conns.status === "fulfilled" ? conns.value.data.items : [];
  providers.value = provs.status === "fulfilled" ? provs.value.data.items : [];
  if (conns.status === "rejected") error.value = message(conns.reason, "Could not load connections.");
  loaded.value = true;
}

function startAdd() {
  draft.provider = providers.value[0]?.type ?? "";
  draft.name = "";
  draft.settings = {};
  adding.value = true;
}

async function create() {
  busy.value = true;
  error.value = "";
  try {
    const settings = Object.fromEntries(Object.entries(draft.settings).filter(([, v]) => v?.trim()));
    await secretsApi.createConnection({ name: draft.name.trim(), provider: draft.provider, settings });
    adding.value = false;
    await load();
  } catch (e) {
    error.value = message(e, "Could not save the connection.");
  } finally {
    busy.value = false;
  }
}

async function remove(c: SecretConnection) {
  error.value = "";
  try {
    await secretsApi.removeConnection(c.id);
    await load();
  } catch (e) {
    error.value = message(e, `Could not remove ${c.name}.`);
  }
}

onMounted(load);
</script>

<style scoped>
.connections {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: var(--space-3);
}

.connections > .list,
.connections > .editor {
  align-self: stretch;
}

.list {
  margin: 0;
  padding: 0;
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  list-style: none;
}

.item {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-2) var(--space-3);
}

.item + .item {
  border-top: 1px solid var(--border-subtle);
}

.lead {
  color: var(--text-muted);
}

.main {
  display: flex;
  min-width: 0;
  flex: 1;
  flex-direction: column;
}

.main strong {
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
}

.main small {
  overflow: hidden;
  color: var(--text-muted);
  font-size: var(--text-xs);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.editor {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  padding: var(--space-3);
  background: var(--surface-sunken);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
}

.row {
  display: flex;
  gap: var(--space-2);
}

.row > * {
  min-width: 0;
  flex: 1;
}

.actions {
  display: flex;
  justify-content: flex-end;
  gap: var(--space-2);
}

.icon-btn {
  display: inline-grid;
  width: 28px;
  height: 28px;
  place-items: center;
  background: none;
  border: 0;
  border-radius: var(--radius-sm);
  color: var(--text-muted);
  cursor: pointer;
}

.icon-btn:hover {
  background: var(--surface-inset);
  color: var(--text);
}

.empty {
  margin: 0;
  color: var(--text-muted);
  font-size: var(--text-sm);
}

.error {
  margin: 0;
  color: var(--status-failed);
  font-size: var(--text-sm);
}
</style>
