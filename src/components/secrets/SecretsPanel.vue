<template>
  <div class="secrets-panel">
    <p v-if="error" class="error" role="alert">{{ error }}</p>
    <p v-else-if="notice" class="notice" role="status">{{ notice }}</p>

    <section class="block">
      <header class="block-head">
        <div>
          <h3>Secrets</h3>
          <p class="hint">
            Sealed: a value can be replaced but never read back. Use one in a variable as
            <code>{{ reference("NAME") }}</code
            >.
          </p>
        </div>
        <BaseButton v-if="canWrite && !adding" size="sm" icon="plus" @click="startAdd">Add secret</BaseButton>
      </header>

      <form v-if="adding" class="editor" @submit.prevent="save">
        <div class="row">
          <BaseInput
            v-model="draft.name"
            name="secret-name"
            placeholder="NAME"
            :disabled="!!editing"
            aria-label="Secret name"
          />
          <select v-model="draft.mode" name="secret-mode" class="form-input" aria-label="Value">
            <option value="value">Paste a value</option>
            <option value="generate">Generate a random value</option>
          </select>
        </div>
        <BaseInput
          v-if="draft.mode === 'value'"
          v-model="draft.value"
          name="secret-value"
          type="password"
          autocomplete="off"
          placeholder="value"
          aria-label="Secret value"
        />
        <div v-else class="row">
          <BaseInput v-model="draft.length" name="secret-length" type="number" aria-label="Length" />
          <select v-model="draft.charset" name="secret-charset" class="form-input" aria-label="Characters">
            <option value="alphanumeric">Letters and digits</option>
            <option value="hex">Hex</option>
            <option value="symbols">Letters, digits and symbols</option>
          </select>
        </div>
        <label v-if="draft.mode === 'generate'" class="check">
          <input v-model="draft.rotate" type="checkbox" name="secret-rotate" />
          Rotate on a schedule
        </label>
        <BaseInput
          v-if="draft.mode === 'generate' && draft.rotate"
          v-model="draft.schedule"
          name="secret-schedule"
          placeholder="0 3 * * 0"
          aria-label="Rotation schedule (cron)"
        />
        <div class="actions">
          <BaseButton size="sm" @click="adding = false">Cancel</BaseButton>
          <BaseButton size="sm" variant="primary" type="submit" :loading="busy" :disabled="!canSave">Save</BaseButton>
        </div>
      </form>

      <p v-if="loaded && !secrets.length && !adding" class="empty">No secrets yet.</p>
      <ul v-else class="list">
        <li v-for="s in secrets" :key="s.name" class="item">
          <Icon name="lock" :size="14" class="lead" />
          <span class="main">
            <code class="name">{{ s.name }}</code>
            <small>
              version {{ s.version }}
              <template v-if="s.rotation">
                · rotates on <code>{{ s.rotation.schedule }}</code></template
              >
              <template v-if="s.last_rotated_at"> · last rotated {{ formatDate(s.last_rotated_at) }}</template>
            </small>
          </span>
          <button type="button" class="link" :title="`Copy ${reference(s.name)}`" @click="copy(s.name)">
            {{ copied === s.name ? "Copied" : "Copy reference" }}
          </button>
          <template v-if="canWrite">
            <BaseButton v-if="s.rotation" size="sm" icon="refresh-cw" :loading="rotating === s.name" @click="rotate(s)"
              >Rotate now</BaseButton
            >
            <button type="button" class="icon-btn" :aria-label="`Replace ${s.name}`" title="Replace" @click="edit(s)">
              <Icon name="pencil" :size="14" />
            </button>
            <button type="button" class="icon-btn" :aria-label="`Delete ${s.name}`" title="Delete" @click="remove(s)">
              <Icon name="trash-2" :size="14" />
            </button>
          </template>
        </li>
      </ul>
    </section>

    <section class="block">
      <header class="block-head">
        <div>
          <h3>Sources</h3>
          <p class="hint">Read secrets from a secret manager. They are fetched again on every deploy and restart.</p>
        </div>
        <BaseButton v-if="canWrite && connections.length && !binding" size="sm" icon="plug" @click="startBind"
          >Connect a source</BaseButton
        >
      </header>

      <p v-if="loaded && !connections.length" class="empty">
        No secret manager is connected yet. Add Infisical, Vault, Doppler or 1Password on the
        <RouterLink to="/workspace">workspace page</RouterLink>.
      </p>

      <form v-if="binding" class="editor" @submit.prevent="bind">
        <select v-model="bindDraft.connectionId" name="bind-connection" class="form-input" aria-label="Connection">
          <option v-for="c in connections" :key="c.id" :value="c.id">
            {{ c.name }} ({{ providerLabel(c.provider) }})
          </option>
        </select>
        <BaseField v-for="f in bindFields" :key="f.key" :label="f.label">
          <BaseInput v-model="bindDraft.options[f.key]" :name="`bind-${f.key}`" :placeholder="f.default" />
        </BaseField>
        <div class="actions">
          <BaseButton size="sm" @click="binding = false">Cancel</BaseButton>
          <BaseButton size="sm" variant="primary" type="submit" :loading="busy">Connect</BaseButton>
        </div>
      </form>

      <ul v-if="bindings.length" class="list">
        <li v-for="b in bindings" :key="b.id" class="item source">
          <Icon name="plug" :size="14" class="lead" />
          <span class="main">
            <strong>{{ connectionName(b.connection_id) }}</strong>
            <small>
              {{ providerLabel(b.provider) }}
              <template v-for="(v, k) in b.options" :key="k"> · {{ k }} {{ v }}</template>
            </small>
            <span v-if="keys[b.id]" class="keys">
              <code v-for="k in keys[b.id]" :key="k">{{ k }}</code>
            </span>
          </span>
          <template v-if="canWrite">
            <BaseButton size="sm" icon="refresh-cw" :loading="syncing === b.id" @click="sync(b)">Sync now</BaseButton>
            <button type="button" class="icon-btn" aria-label="Disconnect" title="Disconnect" @click="unbind(b)">
              <Icon name="x" :size="14" />
            </button>
          </template>
        </li>
      </ul>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from "vue";
import { RouterLink } from "vue-router";
import BaseButton from "@/components/base/BaseButton.vue";
import BaseField from "@/components/base/BaseField.vue";
import BaseInput from "@/components/base/BaseInput.vue";
import Icon from "@/components/base/Icon.vue";
import {
  secretsApi,
  type SecretBinding,
  type SecretChange,
  type SecretConnection,
  type SecretGenerator,
  type SecretProvider,
  type StoredSecret,
} from "@/services/api";

const props = defineProps<{ scope: string; canWrite?: boolean }>();

const secrets = ref<StoredSecret[]>([]);
const bindings = ref<SecretBinding[]>([]);
const connections = ref<SecretConnection[]>([]);
const providers = ref<SecretProvider[]>([]);
const keys = reactive<Record<string, string[]>>({});
const loaded = ref(false);
const error = ref("");
const notice = ref("");
const busy = ref(false);
const rotating = ref("");
const syncing = ref("");
const copied = ref("");

const adding = ref(false);
const editing = ref("");
const draft = reactive({
  name: "",
  mode: "value" as "value" | "generate",
  value: "",
  length: 32 as number | string,
  charset: "alphanumeric" as SecretGenerator["charset"],
  rotate: false,
  schedule: "0 3 * * 0",
});

const binding = ref(false);
const bindDraft = reactive({ connectionId: "", options: {} as Record<string, string> });

const canSave = computed(() => {
  if (!draft.name.trim()) return false;
  if (draft.mode === "value") return !!draft.value;
  return Number(draft.length) > 0 && (!draft.rotate || !!draft.schedule.trim());
});

const bindFields = computed(() => {
  const conn = connections.value.find((c) => c.id === bindDraft.connectionId);
  return providers.value.find((p) => p.type === conn?.provider)?.binding_fields ?? [];
});

function message(e: any, fallback: string): string {
  return e?.response?.data?.error || fallback;
}

function formatDate(value: string): string {
  return new Date(value).toLocaleString();
}

function reference(name: string): string {
  return `\${{ secret.${name} }}`;
}

function providerLabel(type: string): string {
  return providers.value.find((p) => p.type === type)?.label ?? type;
}

function connectionName(id: string): string {
  return connections.value.find((c) => c.id === id)?.name ?? id;
}

function describe(change: SecretChange): string {
  const parts: string[] = [];
  if (change.restarted?.length) parts.push(`restarted ${change.restarted.join(", ")}`);
  else if (change.refreshed.length) parts.push(`updated ${change.refreshed.join(", ")}`);
  const failed = Object.keys(change.failed ?? {});
  if (failed.length) parts.push(`could not update ${failed.join(", ")}`);
  return parts.join("; ");
}

async function load() {
  error.value = "";
  const [list, binds, conns, provs] = await Promise.allSettled([
    secretsApi.list(props.scope),
    secretsApi.bindings(props.scope),
    secretsApi.connections(),
    secretsApi.providers(),
  ]);
  secrets.value = list.status === "fulfilled" ? list.value.data.items : [];
  bindings.value = binds.status === "fulfilled" ? binds.value.data.items : [];
  connections.value = conns.status === "fulfilled" ? conns.value.data.items : [];
  providers.value = provs.status === "fulfilled" ? provs.value.data.items : [];
  if (list.status === "rejected") error.value = message(list.reason, "Could not load secrets.");
  loaded.value = true;
}

function startAdd() {
  Object.assign(draft, {
    name: "",
    mode: "value",
    value: "",
    length: 32,
    charset: "alphanumeric",
    rotate: false,
    schedule: "0 3 * * 0",
  });
  editing.value = "";
  adding.value = true;
}

function edit(s: StoredSecret) {
  startAdd();
  editing.value = s.name;
  draft.name = s.name;
  if (s.rotation) {
    Object.assign(draft, {
      mode: "generate",
      length: s.rotation.length,
      charset: s.rotation.charset,
      rotate: true,
      schedule: s.rotation.schedule,
    });
  }
}

async function save() {
  const name = draft.name.trim();
  busy.value = true;
  error.value = "";
  try {
    const generator: SecretGenerator = { length: Number(draft.length), charset: draft.charset };
    const res = await secretsApi.set(
      props.scope,
      name,
      draft.mode === "value" ? { value: draft.value } : { generate: generator },
    );
    const existing = secrets.value.find((s) => s.name === name);
    if (draft.mode === "generate" && draft.rotate) {
      await secretsApi.setRotation(props.scope, name, { schedule: draft.schedule.trim(), ...generator });
    } else if (existing?.rotation) {
      await secretsApi.clearRotation(props.scope, name);
    }
    notice.value = describe(res.data);
    adding.value = false;
    await load();
  } catch (e) {
    error.value = message(e, `Could not save ${name}.`);
  } finally {
    busy.value = false;
  }
}

async function rotate(s: StoredSecret) {
  rotating.value = s.name;
  error.value = "";
  try {
    const res = await secretsApi.rotate(props.scope, s.name);
    notice.value =
      `Rotated ${s.name} to version ${res.data.secret.version}` +
      (describe(res.data) ? `; ${describe(res.data)}` : ".");
    await load();
  } catch (e) {
    error.value = message(e, `Could not rotate ${s.name}.`);
  } finally {
    rotating.value = "";
  }
}

async function remove(s: StoredSecret) {
  error.value = "";
  try {
    await secretsApi.remove(props.scope, s.name);
    await load();
  } catch (e) {
    error.value = message(e, `Could not delete ${s.name}.`);
  }
}

async function copy(name: string) {
  try {
    await navigator.clipboard.writeText(reference(name));
    copied.value = name;
    setTimeout(() => (copied.value = ""), 1500);
  } catch {
    copied.value = "";
  }
}

function startBind() {
  bindDraft.connectionId = connections.value[0]?.id ?? "";
  bindDraft.options = {};
  binding.value = true;
}

async function bind() {
  busy.value = true;
  error.value = "";
  try {
    const options = Object.fromEntries(Object.entries(bindDraft.options).filter(([, v]) => v?.trim()));
    const res = await secretsApi.bind(props.scope, bindDraft.connectionId, options);
    keys[res.data.binding.id] = res.data.keys;
    binding.value = false;
    await load();
  } catch (e) {
    error.value = message(e, "Could not connect the source.");
  } finally {
    busy.value = false;
  }
}

async function sync(b: SecretBinding) {
  syncing.value = b.id;
  error.value = "";
  try {
    const res = await secretsApi.sync(b.id);
    keys[b.id] = res.data.keys;
    notice.value =
      `Read ${res.data.keys.length} keys from ${connectionName(b.connection_id)}` +
      (describe(res.data) ? `; ${describe(res.data)}` : ".");
  } catch (e) {
    error.value = message(e, "Could not read the source.");
  } finally {
    syncing.value = "";
  }
}

async function unbind(b: SecretBinding) {
  error.value = "";
  try {
    await secretsApi.unbind(b.id);
    delete keys[b.id];
    await load();
  } catch (e) {
    error.value = message(e, "Could not disconnect the source.");
  }
}

watch(() => props.scope, load, { immediate: true });
defineExpose({ load });
</script>

<style scoped>
.secrets-panel {
  display: flex;
  flex-direction: column;
  gap: var(--space-5);
}

.block {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.block-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--space-3);
}

.block-head h3 {
  margin: 0;
  font-size: var(--text-base);
  font-weight: var(--font-semibold);
}

.hint {
  margin: 2px 0 0;
  color: var(--text-muted);
  font-size: var(--text-sm);
}

code {
  font-family: var(--font-mono);
  font-size: 0.92em;
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

.check {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  font-size: var(--text-sm);
}

.actions {
  display: flex;
  justify-content: flex-end;
  gap: var(--space-2);
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
  flex: 0 0 auto;
  color: var(--text-muted);
}

.main {
  display: flex;
  min-width: 0;
  flex: 1;
  flex-direction: column;
  gap: 2px;
}

.main strong {
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
}

.main small {
  color: var(--text-muted);
  font-size: var(--text-xs);
}

.name {
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
}

.keys {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-top: 4px;
}

.keys code {
  padding: 1px 6px;
  background: var(--surface-inset);
  border-radius: var(--radius-sm);
  font-size: 11px;
}

.link {
  background: none;
  border: 0;
  color: var(--text-muted);
  cursor: pointer;
  font: inherit;
  font-size: var(--text-xs);
}

.link:hover {
  color: var(--accent);
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

.empty,
.notice {
  margin: 0;
  color: var(--text-muted);
  font-size: var(--text-sm);
}

.error {
  margin: 0;
  color: var(--status-failed);
  font-size: var(--text-sm);
}

.block-head > :last-child {
  flex: 0 0 auto;
  white-space: nowrap;
}

@media (max-width: 640px) {
  .item {
    flex-wrap: wrap;
  }

  .main {
    flex-basis: calc(100% - 30px);
  }

  .item .link {
    margin-left: 26px;
    margin-right: auto;
  }
}
</style>
