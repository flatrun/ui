<template>
  <div class="notifications-settings">
    <div class="settings-card">
      <div class="card-header">
        <h3><Icon name="bell" :size="16" /> Notification targets</h3>
      </div>
      <div class="card-body">
        <p class="hint">Apps (like Observability) send alerts here, for example when a container is auto-restarted.</p>

        <div v-if="loading" class="muted"><Icon name="loader-circle" spin :size="18" /></div>

        <div v-else class="target-list">
          <div v-for="t in targets" :key="t.id" class="target-row">
            <input v-model="t.enabled" type="checkbox" :disabled="!canWrite" title="Enabled" />
            <div class="target-summary">
              <span class="t-name">{{ t.name || "Untitled" }}</span>
              <span class="t-kind">{{ kindOf(t.url) }}</span>
            </div>
            <button class="btn btn-ghost" :disabled="testing === t.id || !t.url" @click="test(t)">
              <Icon v-if="testing === t.id" name="loader-circle" spin :size="14" />
              <Icon v-else name="send" :size="14" />
              Test
            </button>
            <button v-if="canWrite" class="btn btn-ghost danger" @click="remove(t.id)">
              <Icon name="trash-2" :size="14" />
            </button>
          </div>
          <p v-if="!targets.length" class="muted">No targets yet. Add one below.</p>
        </div>

        <!-- Add target with structured, per-service fields -->
        <div v-if="canWrite" class="add-target">
          <div class="add-head">
            <span class="add-title">Add a target</span>
            <div class="type-tabs">
              <button
                v-for="opt in typeOptions"
                :key="opt.id"
                class="type-tab"
                :class="{ active: form.type === opt.id }"
                @click="form.type = opt.id"
              >
                <Icon :name="opt.icon" :size="14" />
                {{ opt.label }}
              </button>
            </div>
          </div>

          <div class="field">
            <label>Name</label>
            <input v-model="form.name" placeholder="e.g. Ops email" />
          </div>

          <template v-if="form.type === 'email'">
            <div class="grid2">
              <div class="field">
                <label>SMTP host</label><input v-model="form.email.host" placeholder="smtp.example.com" />
              </div>
              <div class="field"><label>Port</label><input v-model="form.email.port" placeholder="587" /></div>
            </div>
            <div class="grid2">
              <div class="field">
                <label>Username</label><input v-model="form.email.username" placeholder="user@example.com" />
              </div>
              <div class="field"><label>Password</label><input v-model="form.email.password" type="password" /></div>
            </div>
            <div class="grid2">
              <div class="field">
                <label>From</label><input v-model="form.email.from" placeholder="alerts@example.com" />
              </div>
              <div class="field"><label>To</label><input v-model="form.email.to" placeholder="ops@example.com" /></div>
            </div>
          </template>

          <template v-else-if="form.type === 'webhook'">
            <div class="field">
              <label>Webhook URL</label>
              <input v-model="form.webhook" placeholder="https://hooks.example.com/services/…" />
            </div>
          </template>

          <template v-else>
            <div class="field">
              <label>
                Shoutrrr URL
                <a href="https://github.com/nicholas-fedor/shoutrrr" target="_blank" rel="noopener">(format)</a>
              </label>
              <input v-model="form.custom" placeholder="slack://token-a/token-b/token-c" />
            </div>
          </template>

          <div class="add-actions">
            <button class="btn btn-ghost" :disabled="testing === 'new' || !previewUrl" @click="testDraft">
              <Icon v-if="testing === 'new'" name="loader-circle" spin :size="14" />
              <Icon v-else name="send" :size="14" />
              Test
            </button>
            <button class="btn btn-secondary" :disabled="!previewUrl" @click="add">
              <Icon name="plus" :size="14" /> Add
            </button>
          </div>
        </div>
      </div>

      <div v-if="canWrite" class="save-footer">
        <span v-if="savedNote" class="saved-note"><Icon name="check" :size="14" /> Saved</span>
        <button class="btn btn-primary" :disabled="saving" @click="save">
          <Icon v-if="saving" name="loader-circle" spin :size="14" />
          Save targets
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from "vue";
import Icon from "@/components/base/Icon.vue";
import { notificationsApi, type NotificationTarget } from "@/services/api";
import { useAuthStore } from "@/stores/auth";
import { useNotificationsStore } from "@/stores/notifications";

const auth = useAuthStore();
const notifications = useNotificationsStore();
const canWrite = auth.hasPermission("settings:write");

const typeOptions = [
  { id: "email", label: "Email", icon: "mail" },
  { id: "webhook", label: "Webhook", icon: "webhook" },
  { id: "custom", label: "Custom", icon: "settings-2" },
] as const;

const targets = ref<NotificationTarget[]>([]);
const loading = ref(true);
const saving = ref(false);
const testing = ref<string | null>(null);
const savedNote = ref(false);

const form = reactive({
  type: "email" as "email" | "webhook" | "custom",
  name: "",
  email: { host: "", port: "587", username: "", password: "", from: "", to: "" },
  webhook: "",
  custom: "",
});

// buildUrl turns the structured fields into a shoutrrr URL.
function buildUrl(): string {
  if (form.type === "email") {
    const e = form.email;
    if (!e.host || !e.from || !e.to) return "";
    const cred = e.username ? `${encodeURIComponent(e.username)}:${encodeURIComponent(e.password)}@` : "";
    const params = new URLSearchParams({ fromAddress: e.from, toAddresses: e.to, useStartTLS: "yes" });
    return `smtp://${cred}${e.host}:${e.port || "587"}/?${params.toString()}`;
  }
  if (form.type === "webhook") {
    return form.webhook ? `generic+${form.webhook}` : "";
  }
  return form.custom.trim();
}
const previewUrl = computed(buildUrl);

function kindOf(url: string): string {
  if (url.startsWith("smtp://")) return "Email";
  if (url.startsWith("generic")) return "Webhook";
  const scheme = url.split("://")[0];
  return scheme ? scheme[0].toUpperCase() + scheme.slice(1) : "Custom";
}

async function load() {
  loading.value = true;
  try {
    const res = await notificationsApi.getTargets();
    targets.value = res.data.targets || [];
  } catch {
    targets.value = [];
  } finally {
    loading.value = false;
  }
}

function add() {
  const url = buildUrl();
  if (!url) return;
  targets.value.push({ id: crypto.randomUUID(), name: form.name, url, enabled: true });
  form.name = "";
  form.email = { host: "", port: "587", username: "", password: "", from: "", to: "" };
  form.webhook = "";
  form.custom = "";
}

function remove(id: string) {
  targets.value = targets.value.filter((t) => t.id !== id);
}

async function save() {
  saving.value = true;
  savedNote.value = false;
  try {
    await notificationsApi.updateTargets(targets.value);
    savedNote.value = true;
    setTimeout(() => (savedNote.value = false), 2000);
  } catch (e: any) {
    notifications.error("Save failed", e.response?.data?.error || e.message);
  } finally {
    saving.value = false;
  }
}

async function runTest(id: string, url: string) {
  testing.value = id;
  try {
    await notificationsApi.test(url);
    notifications.success("Test sent", "Check the destination for a test notification.");
  } catch (e: any) {
    notifications.error("Test failed", e.response?.data?.error || e.message);
  } finally {
    testing.value = null;
  }
}
const test = (t: NotificationTarget) => runTest(t.id, t.url);
const testDraft = () => runTest("new", buildUrl());

onMounted(load);
</script>

<style scoped>
.hint {
  font-size: var(--text-sm);
  color: var(--text-muted);
  margin: 0 0 var(--space-4) 0;
}

.target-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  margin-bottom: var(--space-4);
}

.target-row {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-2) var(--space-3);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-sm);
}

.target-summary {
  flex: 1;
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.t-name {
  font-weight: var(--font-medium);
  color: var(--text);
  font-size: var(--text-sm);
}

.t-kind {
  font-size: var(--text-xs);
  padding: 0.05rem 0.4rem;
  border-radius: var(--radius-full);
  background: var(--surface-inset);
  color: var(--text-muted);
}

.add-target {
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  padding: var(--space-4);
  background: var(--surface-sunken);
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.add-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: var(--space-2);
}

.add-title {
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  color: var(--text);
}

.type-tabs {
  display: inline-flex;
  gap: 2px;
  padding: 2px;
  background: var(--surface-inset);
  border-radius: var(--radius-sm);
}

.type-tab {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  padding: 0.25rem 0.6rem;
  border: none;
  background: transparent;
  border-radius: calc(var(--radius-sm) - 2px);
  font-size: var(--text-xs);
  color: var(--text-muted);
  cursor: pointer;
}

.type-tab.active {
  background: var(--surface-raised);
  color: var(--color-primary-600);
  box-shadow: var(--shadow-sm);
}

.grid2 {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-3);
}

.field {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.field label {
  font-size: var(--text-xs);
  color: var(--text-muted);
}

.field input {
  padding: var(--space-2) var(--space-3);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  background: var(--surface);
  color: var(--text);
  font-size: var(--text-sm);
}

.add-actions {
  display: flex;
  justify-content: flex-end;
  gap: var(--space-2);
}

.btn {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  padding: var(--space-2) var(--space-3);
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
}

.btn-secondary {
  background: var(--surface-inset);
  color: var(--text);
}

.btn-secondary:disabled {
  opacity: 0.6;
}

.btn-ghost {
  background: none;
  border: 1px solid var(--border);
  color: var(--text-muted);
}

.btn-ghost.danger:hover {
  color: var(--color-danger-600, #dc2626);
}

.save-footer {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: var(--space-3);
  padding-top: var(--space-3);
}

.saved-note {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  color: var(--color-success-600);
  font-size: var(--text-sm);
}

.muted {
  color: var(--text-muted);
  font-size: var(--text-sm);
  margin: var(--space-2) 0;
}
</style>
