<template>
  <div class="agents-view">
    <ContextBanner id="agents" icon="bot">
      Scheduled agents use only the permissions selected for unattended runs. Interactive changes still require
      approval.
      <template #actions>
        <BaseButton v-if="canWrite" size="sm" variant="primary" icon="plus" @click="openEditor(null)">
          New agent
        </BaseButton>
        <BaseButton size="sm" variant="ghost" icon="refresh-cw" :loading="loading" @click="fetchAgents">
          Refresh
        </BaseButton>
      </template>
    </ContextBanner>

    <div v-if="loading && agents.length === 0" class="loading-state">
      <i class="pi pi-spin pi-spinner" />
      Loading agents...
    </div>

    <div v-else-if="agents.length === 0" class="empty-state">
      <Icon name="bot" :size="40" />
      <h3>No agents yet</h3>
      <p>
        An agent is a markdown file in <code>{{ dir || ".flatrun/agents" }}</code
        >: optional frontmatter for its scope, a body of instructions. Drop a file there and it appears here.
      </p>
      <pre class="example"><code>---
description: Summarize recent errors in the logs
scope: deployment
deployment: my-api
---
Read the recent logs and the compose file. Summarize any
errors you find, and propose a fix for each.</code></pre>
    </div>

    <div v-else class="agent-list">
      <div v-for="agent in agents" :key="agent.name" class="agent-card">
        <div class="agent-info">
          <div class="agent-title">
            <Icon name="bot" :size="16" />
            <h3>{{ agent.name }}</h3>
            <span class="scope-badge" :class="agent.scope">
              {{ agent.scope === "deployment" ? agent.deployment : "system" }}
            </span>
            <span v-if="agent.schedule" class="scope-badge scheduled">
              <Icon name="clock" :size="12" />
              scheduled
            </span>
          </div>
          <p v-if="agent.description" class="agent-description">{{ agent.description }}</p>
        </div>
        <div class="agent-actions">
          <button class="btn btn-secondary btn-sm" @click="openRuns(agent)">
            <Icon name="history" :size="14" />
            Runs
          </button>
          <button v-if="canWrite" class="btn btn-secondary btn-sm" @click="openEditor(agent)">
            <i class="pi pi-pencil" />
            Edit
          </button>
          <button class="btn btn-primary btn-sm" :disabled="runningName !== null" @click="runAgent(agent)">
            <i v-if="runningName === agent.name" class="pi pi-spin pi-spinner" />
            <Icon v-else name="play" :size="14" />
            Run
          </button>
        </div>
      </div>
    </div>

    <Teleport to="body">
      <div v-if="editorOpen" class="modal-overlay">
        <div class="modal-container agent-editor">
          <div class="modal-header">
            <h3>
              <Icon name="bot" :size="16" />
              {{ editingName || "New agent" }}
            </h3>
            <button class="close-btn" @click="closeEditor">
              <i class="pi pi-times" />
            </button>
          </div>
          <div class="modal-body">
            <div v-if="!editingName" class="form-group">
              <label class="form-label">Name</label>
              <input
                v-model="nameInput"
                type="text"
                class="form-control"
                placeholder="e.g. log-triage (letters, digits, dots, dashes, underscores)"
              />
            </div>
            <div class="form-group">
              <label class="form-label">Schedule</label>
              <select v-model="schedulePreset" class="form-control">
                <option v-for="o in cadenceOptions" :key="o.value" :value="o.value">{{ o.label }}</option>
              </select>
              <input
                v-if="schedulePreset === 'custom'"
                v-model="customCron"
                type="text"
                class="form-control agent-cron"
                placeholder="Cron, e.g. 0 3 * * *"
              />
              <p class="form-hint">A scheduled agent runs without a human present, using only the permissions below.</p>
            </div>

            <div v-if="schedulePreset !== 'none'" class="form-group">
              <label class="form-label">Permissions for scheduled runs</label>
              <label v-for="p in permissionOptions" :key="p.value" class="agent-perm">
                <input
                  type="checkbox"
                  :checked="grantedPermissions.includes(p.value)"
                  @change="togglePermission(p.value)"
                />
                {{ p.label }}
              </label>
              <p class="form-hint">Nothing checked means read-only: the run can look but not change anything.</p>
            </div>

            <Codemirror v-model="editorContent" :extensions="editorExtensions" :style="{ height: '300px' }" />
          </div>
          <div class="modal-footer">
            <button v-if="editingName" class="btn btn-danger" :disabled="savingAgent" @click="deleteAgent(editingName)">
              Delete
            </button>
            <span class="footer-spacer" />
            <button class="btn btn-secondary" @click="closeEditor">Cancel</button>
            <button class="btn btn-primary" :disabled="savingAgent" @click="saveAgent">
              <i v-if="savingAgent" class="pi pi-spin pi-spinner" />
              Save
            </button>
          </div>
        </div>
      </div>

      <div v-if="runsOpen" class="modal-overlay" @click.self="runsOpen = false">
        <div class="modal-container agent-runs">
          <div class="modal-header">
            <h3>
              <Icon name="history" :size="16" />
              Runs of {{ runsAgent }}
            </h3>
            <button class="close-btn" @click="runsOpen = false">
              <i class="pi pi-times" />
            </button>
          </div>
          <div class="modal-body">
            <div v-if="runsLoading" class="runs-empty">Loading runs...</div>
            <div v-else-if="!runsList.length" class="runs-empty">This agent has not run yet.</div>
            <ul v-else class="runs-list">
              <li v-for="r in runsList" :key="r.id">
                <button class="run-row" @click="openRun(r.id)">
                  <span class="run-title">{{ r.title }}</span>
                  <span class="run-status" :class="r.status">{{ r.status }}</span>
                  <span class="run-when">{{ formatWhen(r.updated_at) }}</span>
                </button>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </Teleport>

    <ConfirmModal
      :visible="agentToDelete !== null"
      title="Delete agent?"
      :message="`The ${agentToDelete || ''} agent will be removed.`"
      warning="This action cannot be undone."
      confirm-text="Delete agent"
      :loading="deletingAgent"
      @confirm="confirmDeleteAgent"
      @cancel="agentToDelete = null"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { Codemirror } from "vue-codemirror";
import { yaml } from "@codemirror/lang-yaml";
import { oneDark } from "@codemirror/theme-one-dark";
import { agentsApi, aiApi, type AgentDefinition, type AISessionSummary } from "@/services/api";
import { useAssistStore } from "@/stores/assist";
import { useAuthStore } from "@/stores/auth";
import { useNotificationsStore } from "@/stores/notifications";
import Icon from "@/components/base/Icon.vue";
import ContextBanner from "@/components/base/ContextBanner.vue";
import BaseButton from "@/components/base/BaseButton.vue";
import ConfirmModal from "@/components/ConfirmModal.vue";

const agents = ref<AgentDefinition[]>([]);
const dir = ref("");
const loading = ref(false);
const runningName = ref<string | null>(null);
const agentToDelete = ref<string | null>(null);
const deletingAgent = ref(false);
const assist = useAssistStore();
const notifications = useNotificationsStore();
const authStore = useAuthStore();
const canWrite = computed(() => authStore.hasPermission("settings:write"));

const editorExtensions = [yaml(), oneDark];
const editorOpen = ref(false);
const editingName = ref<string | null>(null);
const nameInput = ref("");
const editorContent = ref("");
const savingAgent = ref(false);

const editorTemplate = `---
description: What this agent does
scope: system
---
Describe the work here. The agent runs these instructions with the
assistant's tools; anything that changes state waits for approval.
`;

type SchedulePreset = "none" | "hourly" | "daily" | "weekly" | "custom";
const schedulePreset = ref<SchedulePreset>("none");
const customCron = ref("");
const grantedPermissions = ref<string[]>([]);

const cadenceOptions: { value: SchedulePreset; label: string; cron: string }[] = [
  { value: "none", label: "No schedule", cron: "" },
  { value: "hourly", label: "Hourly", cron: "0 * * * *" },
  { value: "daily", label: "Daily at 03:00", cron: "0 3 * * *" },
  { value: "weekly", label: "Weekly (Mon 03:00)", cron: "0 3 * * 1" },
  { value: "custom", label: "Custom cron", cron: "" },
];

// The permissions a scheduled run may use. Empty means read-only, since a cron
// run has no human to approve a change.
const permissionOptions = [
  { value: "deployments:read", label: "Read deployments" },
  { value: "deployments:write", label: "Change deployments (start, stop, files)" },
  { value: "settings:write", label: "Change host settings" },
];

const scheduleCron = () => {
  const opt = cadenceOptions.find((o) => o.value === schedulePreset.value);
  if (schedulePreset.value === "custom") return customCron.value.trim();
  return opt?.cron ?? "";
};

function presetFromCron(cron: string): SchedulePreset {
  if (!cron) return "none";
  const match = cadenceOptions.find((o) => o.cron && o.cron === cron);
  return match ? match.value : "custom";
}

// applyAgentMeta writes the picked schedule and permissions into the file's
// frontmatter so the pickers, not a hand-typed line, are the source of truth for
// those two keys. Other frontmatter (description, scope, deployment) is kept.
function applyAgentMeta(content: string, cron: string, perms: string[]): string {
  const m = content.match(/^---\s*\n([\s\S]*?)\n---\s*\n?/);
  const body = m ? content.slice(m[0].length) : content;
  let lines = (m ? m[1].split("\n") : []).filter((l) => l.trim() !== "" && !/^\s*(schedule|permissions)\s*:/.test(l));
  if (cron) lines.push(`schedule: "${cron}"`);
  if (perms.length) lines.push(`permissions: [${perms.join(", ")}]`);
  if (!lines.length) return body;
  return `---\n${lines.join("\n")}\n---\n${body}`;
}

const openEditor = async (agent: AgentDefinition | null) => {
  editingName.value = agent?.name ?? null;
  nameInput.value = "";
  editorContent.value = editorTemplate;
  schedulePreset.value = "none";
  customCron.value = "";
  grantedPermissions.value = [];
  if (agent) {
    try {
      const { data } = await agentsApi.get(agent.name);
      editorContent.value = data.content;
      schedulePreset.value = presetFromCron(data.agent.schedule || "");
      customCron.value = schedulePreset.value === "custom" ? data.agent.schedule || "" : "";
      grantedPermissions.value = data.agent.permissions || [];
    } catch (err: any) {
      notifications.error("Error", err.response?.data?.error || "Failed to load agent");
      return;
    }
  }
  editorOpen.value = true;
};

const togglePermission = (perm: string) => {
  const i = grantedPermissions.value.indexOf(perm);
  if (i === -1) grantedPermissions.value.push(perm);
  else grantedPermissions.value.splice(i, 1);
};

const closeEditor = () => {
  editorOpen.value = false;
};

const saveAgent = async () => {
  const name = editingName.value || nameInput.value.trim();
  if (!name) {
    notifications.warning("Name required", "Give the agent a name before saving");
    return;
  }
  if (schedulePreset.value === "custom" && !customCron.value.trim()) {
    notifications.warning("Cron required", "Enter a cron expression or pick a preset");
    return;
  }
  savingAgent.value = true;
  try {
    const content = applyAgentMeta(editorContent.value, scheduleCron(), grantedPermissions.value);
    editorContent.value = content;
    await agentsApi.put(name, content);
    notifications.success("Saved", `Agent "${name}" saved`);
    editorOpen.value = false;
    await fetchAgents();
  } catch (err: any) {
    notifications.error("Invalid agent", err.response?.data?.error || err.message);
  } finally {
    savingAgent.value = false;
  }
};

const deleteAgent = (name: string) => {
  agentToDelete.value = name;
};

const confirmDeleteAgent = async () => {
  if (!agentToDelete.value) return;
  const name = agentToDelete.value;
  deletingAgent.value = true;
  try {
    await agentsApi.remove(name);
    notifications.success("Deleted", `Agent "${name}" removed`);
    agentToDelete.value = null;
    editorOpen.value = false;
    await fetchAgents();
  } catch (err: any) {
    notifications.error("Error", err.response?.data?.error || err.message);
  } finally {
    deletingAgent.value = false;
  }
};

const fetchAgents = async () => {
  loading.value = true;
  try {
    const { data } = await agentsApi.list();
    agents.value = data.agents;
    dir.value = data.dir;
  } catch (err: any) {
    notifications.error("Error", err.response?.data?.error || "Failed to load agents");
  } finally {
    loading.value = false;
  }
};

const runAgent = async (agent: AgentDefinition) => {
  runningName.value = agent.name;
  try {
    const { data } = await agentsApi.run(agent.name);
    // The run is a session; open the assistant on it so pending tool
    // approvals and the transcript are handled by the existing chat.
    assist.embedded = false;
    assist.visible = true;
    assist.subject = agent.name;
    await assist.loadSession(data.id);
  } catch (err: any) {
    notifications.error("Run failed", err.response?.data?.error || err.message);
  } finally {
    runningName.value = null;
  }
};

const runsOpen = ref(false);
const runsAgent = ref("");
const runsLoading = ref(false);
const runsList = ref<AISessionSummary[]>([]);

const openRuns = async (agent: AgentDefinition) => {
  runsAgent.value = agent.name;
  runsOpen.value = true;
  runsLoading.value = true;
  runsList.value = [];
  try {
    const { data } = await aiApi.listSessions(agent.name);
    runsList.value = data.sessions || [];
  } catch (err: any) {
    notifications.error("Error", err.response?.data?.error || "Failed to load runs");
  } finally {
    runsLoading.value = false;
  }
};

const openRun = async (id: string) => {
  runsOpen.value = false;
  assist.embedded = false;
  assist.visible = true;
  await assist.loadSession(id);
};

const formatWhen = (iso: string) => {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
};

onMounted(fetchAgents);
</script>

<style scoped>
.agents-view {
  display: flex;
  flex-direction: column;
  gap: var(--space-6);
}

.loading-state,
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-10) var(--space-6);
  color: var(--text-muted);
  text-align: center;
}

.empty-state .example {
  text-align: left;
  background: var(--surface-sunken);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: var(--space-4);
  font-size: 0.82rem;
  max-width: 480px;
  overflow-x: auto;
}

.agent-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.agent-card {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: var(--space-4);
  padding: var(--space-4);
  background: var(--surface-raised);
  border: 1px solid var(--border);
  border-radius: 10px;
}

.agent-title {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.agent-title h3 {
  margin: 0;
  font-size: 1rem;
}

.scope-badge {
  font-size: 0.72rem;
  padding: 0.15rem 0.5rem;
  border-radius: 50px;
  background: var(--surface-sunken);
  border: 1px solid var(--border);
  color: var(--text-muted);
}

.agent-description {
  margin: var(--space-1) 0 0;
  color: var(--text-muted);
  font-size: 0.88rem;
}

.agent-actions {
  display: flex;
  gap: var(--space-2);
  align-items: center;
  flex-shrink: 0;
}

.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.55);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: var(--z-modal);
}

.modal-container.agent-editor {
  width: min(720px, 92vw);
  background: var(--surface-raised);
  border: 1px solid var(--border);
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.modal-header {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-4);
  border-bottom: 1px solid var(--border);
}

.modal-header h3 {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  margin: 0;
  flex: 1;
  font-size: 1rem;
}

.close-btn {
  background: none;
  border: none;
  color: var(--text-muted);
  cursor: pointer;
  padding: var(--space-1);
}

.modal-body {
  padding: var(--space-4);
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.form-label {
  display: block;
  margin-bottom: var(--space-1);
  font-size: 0.85rem;
  color: var(--text-muted);
}

.form-control {
  width: 100%;
  padding: 0.5rem 0.75rem;
  background: var(--surface-sunken);
  border: 1px solid var(--border);
  border-radius: 8px;
  color: var(--text);
}

.modal-footer {
  display: flex;
  gap: var(--space-2);
  align-items: center;
  padding: var(--space-4);
  border-top: 1px solid var(--border);
}

.footer-spacer {
  flex: 1;
}

.btn-danger {
  background: transparent;
  border: 1px solid color-mix(in srgb, #ef4444 45%, transparent);
  color: #ef4444;
}

.btn-danger:hover:not(:disabled) {
  background: color-mix(in srgb, #ef4444 12%, transparent);
}
</style>

<style scoped>
.btn-icon {
  background: var(--surface-raised);
  border-color: var(--border);
  color: var(--text-muted);
}

.scope-badge.scheduled {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  background: var(--color-primary-50);
  color: var(--color-primary-700);
}

.form-hint {
  margin: 0.35rem 0 0;
  font-size: 0.75rem;
  color: var(--text-muted);
}

.agent-cron {
  margin-top: 0.5rem;
}

.agent-perm {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.85rem;
  color: var(--text);
  padding: 0.2rem 0;
  cursor: pointer;
}

.agent-runs {
  max-width: 560px;
  width: 100%;
}

.runs-empty {
  padding: 1.5rem;
  text-align: center;
  color: var(--text-muted);
  font-size: 0.875rem;
}

.runs-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.run-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  width: 100%;
  text-align: left;
  padding: 0.6rem 0.75rem;
  background: var(--surface-raised);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  cursor: pointer;
}

.run-row:hover {
  border-color: var(--color-primary-500);
}

.run-title {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--text);
  font-size: 0.85rem;
}

.run-status {
  font-size: 0.7rem;
  text-transform: capitalize;
  color: var(--text-muted);
  flex-shrink: 0;
}

.run-status.awaiting_approval {
  color: var(--color-warning-600, #b45309);
}

.run-when {
  font-size: 0.7rem;
  color: var(--text-subtle);
  flex-shrink: 0;
}
</style>
