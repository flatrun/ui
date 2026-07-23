<template>
  <div class="agents-view">
    <div class="view-header">
      <div class="header-left">
        <h2>Agents</h2>
        <p class="subtitle">
          Agents defined as plain markdown files, run by FlatRun through the assistant's permissioned tools
        </p>
      </div>
      <div class="header-actions">
        <button v-if="canWrite" class="btn btn-primary" @click="openEditor(null)">
          <i class="pi pi-plus" />
          New Agent
        </button>
        <button class="btn btn-icon" :disabled="loading" @click="fetchAgents">
          <i class="pi pi-refresh" :class="{ 'pi-spin': loading }" />
        </button>
      </div>
    </div>

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
          </div>
          <p v-if="agent.description" class="agent-description">{{ agent.description }}</p>
        </div>
        <div class="agent-actions">
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
            <Codemirror v-model="editorContent" :extensions="editorExtensions" :style="{ height: '380px' }" />
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
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { Codemirror } from "vue-codemirror";
import { yaml } from "@codemirror/lang-yaml";
import { oneDark } from "@codemirror/theme-one-dark";
import { agentsApi, type AgentDefinition } from "@/services/api";
import { useAssistStore } from "@/stores/assist";
import { useAuthStore } from "@/stores/auth";
import { useNotificationsStore } from "@/stores/notifications";
import Icon from "@/components/base/Icon.vue";

const agents = ref<AgentDefinition[]>([]);
const dir = ref("");
const loading = ref(false);
const runningName = ref<string | null>(null);
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

const openEditor = async (agent: AgentDefinition | null) => {
  editingName.value = agent?.name ?? null;
  nameInput.value = "";
  editorContent.value = editorTemplate;
  if (agent) {
    try {
      const { data } = await agentsApi.get(agent.name);
      editorContent.value = data.content;
    } catch (err: any) {
      notifications.error("Error", err.response?.data?.error || "Failed to load agent");
      return;
    }
  }
  editorOpen.value = true;
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
  savingAgent.value = true;
  try {
    await agentsApi.put(name, editorContent.value);
    notifications.success("Saved", `Agent "${name}" saved`);
    editorOpen.value = false;
    await fetchAgents();
  } catch (err: any) {
    notifications.error("Invalid agent", err.response?.data?.error || err.message);
  } finally {
    savingAgent.value = false;
  }
};

const deleteAgent = async (name: string) => {
  if (!confirm(`Delete the "${name}" agent?`)) return;
  try {
    await agentsApi.remove(name);
    notifications.success("Deleted", `Agent "${name}" removed`);
    editorOpen.value = false;
    await fetchAgents();
  } catch (err: any) {
    notifications.error("Error", err.response?.data?.error || err.message);
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

onMounted(fetchAgents);
</script>

<style scoped>
.agents-view {
  padding: var(--space-6);
}

.view-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: var(--space-6);
}

.subtitle {
  color: var(--text-secondary);
  margin-top: var(--space-1);
}

.loading-state,
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-10) var(--space-6);
  color: var(--text-secondary);
  text-align: center;
}

.empty-state .example {
  text-align: left;
  background: var(--surface-ground);
  border: 1px solid var(--border-color);
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
  background: var(--surface-card);
  border: 1px solid var(--border-color);
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
  background: var(--surface-ground);
  border: 1px solid var(--border-color);
  color: var(--text-secondary);
}

.agent-description {
  margin: var(--space-1) 0 0;
  color: var(--text-secondary);
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
  z-index: 1000;
}

.modal-container.agent-editor {
  width: min(720px, 92vw);
  background: var(--surface-card);
  border: 1px solid var(--border-color);
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
  border-bottom: 1px solid var(--border-color);
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
  color: var(--text-secondary);
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
  color: var(--text-secondary);
}

.form-control {
  width: 100%;
  padding: 0.5rem 0.75rem;
  background: var(--surface-ground);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  color: var(--text-color);
}

.modal-footer {
  display: flex;
  gap: var(--space-2);
  align-items: center;
  padding: var(--space-4);
  border-top: 1px solid var(--border-color);
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
