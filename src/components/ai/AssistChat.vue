<template>
  <SlidePanel
    :visible="store.visible && !store.embedded"
    size="xl"
    :close-on-overlay="!store.loading"
    @close="store.close"
  >
    <template #header>
      <div class="chat-header">
        <div class="chat-header-icon"><Icon name="bot" :size="20" /></div>
        <div class="chat-header-text">
          <h3>AI Assistant</h3>
          <p>{{ headerSubtitle }}</p>
        </div>
        <div class="chat-header-actions">
          <button class="chat-icon-btn" title="New chat" @click="newChat">
            <Icon name="plus" :size="16" />
          </button>
          <button
            class="chat-icon-btn"
            :class="{ active: view === 'history' }"
            :title="view === 'history' ? 'Back to chat' : 'Chat history'"
            @click="toggleHistory"
          >
            <Icon name="history" :size="16" />
          </button>
        </div>
      </div>
    </template>

    <div v-if="settingsHint" class="chat-settings-hint">
      <Sparkles :size="16" />
      <div>
        <p>{{ store.error }}</p>
        <router-link to="/settings" class="btn btn-sm btn-primary" @click="store.close">Open AI Settings</router-link>
      </div>
    </div>

    <template v-else>
      <div v-if="view === 'history'" class="history-view">
        <div class="history-head">
          <span>Past conversations</span>
          <button class="btn btn-xs btn-secondary" @click="newChat"><Icon name="plus" :size="12" /> New chat</button>
        </div>
        <div v-if="store.listing" class="history-empty">
          <p>Loading conversations</p>
        </div>
        <div v-else-if="!store.sessions.length" class="history-empty">
          <Icon name="message-square" :size="28" />
          <p>Your past conversations will appear here.</p>
        </div>
        <button v-for="s in store.sessions" v-else :key="s.id" class="history-item" @click="loadPast(s.id)">
          <Icon name="message-square" :size="16" class="history-item-icon" />
          <span class="history-item-title">{{ s.title }}</span>
          <span class="history-item-meta">{{ formatWhen(s.updated_at) }}</span>
        </button>
      </div>

      <div v-else ref="scrollEl" class="chat-body">
        <div v-if="!turns.length && !store.loading" class="chat-empty">
          <div class="chat-empty-icon"><Icon name="bot" :size="30" /></div>
          <p class="chat-empty-prompt">{{ emptyPrompt }}</p>
          <div class="sample-queries">
            <button
              v-for="(q, qi) in sampleQueries"
              :key="qi"
              class="sample-chip"
              :disabled="inputDisabled"
              @click="runSample(q)"
            >
              <Icon name="sparkles" :size="13" />
              <span>{{ q }}</span>
            </button>
          </div>
          <label class="autorun-toggle" :title="autoRunTitle">
            <input v-model="store.autoRun" type="checkbox" :disabled="hasSession" />
            <span>Auto-run read-only lookups</span>
          </label>
        </div>

        <div v-for="(turn, i) in turns" :key="i" class="turn" :class="turn.role">
          <div v-if="turn.role === 'user'" class="bubble user">{{ turn.content }}</div>
          <div v-else class="bubble assistant">
            <div v-if="turn.tool_steps?.length" class="tool-steps">
              <div v-for="(step, si) in turn.tool_steps" :key="si" class="tool-step">
                <button class="tool-step-head" @click="toggleStep(i, si)">
                  <Search :size="12" />
                  <span class="tool-name">{{ stepLabel(step) }}</span>
                  <ChevronDown :size="12" :class="{ open: isStepOpen(i, si) }" />
                </button>
                <pre v-if="isStepOpen(i, si) && step.result" class="tool-result">{{ step.result }}</pre>
              </div>
            </div>
            <!-- eslint-disable-next-line vue/no-v-html -->
            <div v-if="turn.content" class="markdown" v-html="renderMarkdown(turn.content)" />
          </div>
        </div>

        <div v-if="pending.length" class="approval-card">
          <p class="approval-title"><CircleAlert :size="14" /> The assistant wants to run a read-only lookup</p>
          <div v-for="call in pending" :key="call.id" class="approval-item">
            <code>{{ toolDisplay(call) }}</code>
            <div
              v-if="call.id in store.decisions"
              class="approval-decided"
              :class="{ allowed: store.decisions[call.id] }"
            >
              {{ store.decisions[call.id] ? "Allowed" : "Declined" }}
            </div>
            <div v-else class="approval-buttons">
              <button class="btn btn-xs btn-secondary" :disabled="store.loading" @click="store.decide(call.id, false)">
                Decline
              </button>
              <button class="btn btn-xs btn-primary" :disabled="store.loading" @click="store.decide(call.id, true)">
                Allow
              </button>
            </div>
          </div>
          <div v-if="pending.length > 1" class="approval-actions">
            <button class="btn btn-xs btn-secondary" :disabled="store.loading" @click="store.declineAll">
              Decline all
            </button>
            <button class="btn btn-xs btn-primary" :disabled="store.loading" @click="store.approveAll">
              Allow all
            </button>
          </div>
        </div>

        <div v-if="suggestions.length" class="suggestions">
          <h4><Zap :size="14" /> Suggested actions</h4>
          <div v-for="(s, idx) in suggestions" :key="idx" class="suggestion-card">
            <div class="suggestion-info">
              <span class="suggestion-title">{{ s.title }}</span>
              <code v-if="s.kind === 'exec'" class="suggestion-command">{{ s.command }}</code>
              <span v-else class="suggestion-command plain">{{ s.action }} {{ s.service }}</span>
              <span v-if="s.reason" class="suggestion-reason">{{ s.reason }}</span>
            </div>
            <button
              class="btn btn-sm btn-primary"
              :disabled="store.runningIndex !== null"
              @click="store.runSuggestion(s, idx)"
            >
              <Play :size="12" /> Run
            </button>
            <pre v-if="store.suggestionOutputs[idx]" class="suggestion-output">{{ store.suggestionOutputs[idx] }}</pre>
          </div>
        </div>

        <div v-if="store.loading" class="chat-thinking">
          <Icon name="loader-circle" spin :size="14" /> {{ thinkingLabel }}
        </div>
        <div v-else-if="store.error" class="chat-error">
          <Icon name="triangle-alert" :size="16" class="chat-error-icon" />
          <div class="chat-error-body">
            <p>{{ store.error }}</p>
            <button class="btn btn-xs btn-secondary" @click="newChat">Start over</button>
          </div>
        </div>
      </div>
    </template>

    <template v-if="!settingsHint && view === 'chat'" #footer>
      <div class="composer">
        <div v-if="attachments.length" class="composer-attachments">
          <div v-for="(file, idx) in attachments" :key="idx" class="attachment-chip">
            <Icon name="paperclip" :size="12" />
            <span class="attachment-name">{{ file.name }}</span>
            <button class="attachment-remove" title="Remove" @click="removeAttachment(idx)">
              <Icon name="x" :size="12" />
            </button>
          </div>
        </div>
        <div class="composer-row">
          <input ref="fileInput" type="file" multiple class="composer-file" @change="onFilesSelected" />
          <button class="composer-attach" title="Attach files" :disabled="inputDisabled" @click="fileInput?.click()">
            <Icon name="paperclip" :size="18" />
          </button>
          <input
            v-model="draft"
            type="text"
            class="composer-input"
            :placeholder="inputPlaceholder"
            :disabled="inputDisabled"
            @keyup.enter="submit"
          />
          <button class="composer-send" :disabled="inputDisabled || !draft.trim()" title="Send" @click="submit">
            <Icon name="send" :size="18" />
          </button>
        </div>
      </div>
    </template>
  </SlidePanel>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from "vue";
import { Sparkles, Search, ChevronDown, CircleAlert, Zap, Play } from "lucide-vue-next";
import { marked } from "marked";
import DOMPurify from "dompurify";
import SlidePanel from "@/components/base/SlidePanel.vue";
import Icon from "@/components/base/Icon.vue";
import { useAssistStore, AI_DISABLED_MESSAGE } from "@/stores/assist";
import type { AIToolCall, AIToolStep } from "@/services/api";

const store = useAssistStore();
const draft = ref("");
const attachments = ref<File[]>([]);
const fileInput = ref<HTMLInputElement | null>(null);
const scrollEl = ref<HTMLElement | null>(null);
const openSteps = ref<Set<string>>(new Set());

const settingsHint = computed(() => store.error === AI_DISABLED_MESSAGE);
const hasSession = computed(() => store.session !== null);
const turns = computed(() => store.session?.messages ?? []);
const pending = computed(() => store.session?.pending ?? []);
const suggestions = computed(() => store.session?.suggested_actions ?? []);

const headerSubtitle = computed(() =>
  store.scope === "deployment" ? `Deployment: ${store.subject}` : "This FlatRun instance",
);
const emptyPrompt = computed(() =>
  store.scope === "deployment"
    ? `What do you want to know about ${store.subject}, or what should I do?`
    : "What do you want to know, or what do you want me to do?",
);
const inputPlaceholder = computed(() =>
  pending.value.length ? "Resolve the lookups above to continue..." : "Ask a question...",
);
const autoRunTitle = computed(() =>
  hasSession.value
    ? "Set before the conversation starts"
    : "On: the assistant runs read-only lookups itself. Off: it asks before each one.",
);
const thinkingLabel = computed(() => (store.autoRun ? "Investigating..." : "Thinking..."));
const inputDisabled = computed(() => store.loading || pending.value.length > 0);

const submit = () => {
  const text = draft.value.trim();
  if (!text || inputDisabled.value) return;
  draft.value = "";
  // Attachments are UI-only for now; clear them on send until the assistant
  // API accepts uploads.
  attachments.value = [];
  store.send(text);
};

const onFilesSelected = (e: Event) => {
  const input = e.target as HTMLInputElement;
  if (!input.files) return;
  attachments.value.push(...Array.from(input.files));
  input.value = "";
};

const removeAttachment = (idx: number) => {
  attachments.value.splice(idx, 1);
};

type ChatView = "chat" | "history";
const view = ref<ChatView>("chat");

const newChat = () => {
  store.reset();
  view.value = "chat";
  draft.value = "";
  attachments.value = [];
};

const toggleHistory = () => {
  view.value = view.value === "history" ? "chat" : "history";
  if (view.value === "history") store.listSessions();
};

const sampleQueries = computed(() =>
  store.scope === "deployment"
    ? [
        `Why is ${store.subject} unhealthy?`,
        `Show the recent logs for ${store.subject}`,
        `What changed in ${store.subject} recently?`,
      ]
    : [
        "Which deployments are not running?",
        "What is using the most memory right now?",
        "Summarize recent security events",
      ],
);

const runSample = (q: string) => {
  if (inputDisabled.value) return;
  store.send(q);
};

const formatWhen = (iso: string): string => {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const mins = Math.floor((Date.now() - then) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(then).toLocaleDateString();
};

const loadPast = async (id: string) => {
  await store.loadSession(id);
  view.value = "chat";
};

const renderMarkdown = (content: string) => DOMPurify.sanitize(marked.parse(content, { async: false }) as string);

const stepKey = (turn: number, step: number) => `${turn}:${step}`;
const isStepOpen = (turn: number, step: number) => openSteps.value.has(stepKey(turn, step));
const toggleStep = (turn: number, step: number) => {
  const key = stepKey(turn, step);
  const next = new Set(openSteps.value);
  next.has(key) ? next.delete(key) : next.add(key);
  openSteps.value = next;
};

const stepLabel = (step: AIToolStep) => {
  const args = parseArgs(step.arguments);
  const detail = args.path || args.command || args.deployment || args.service || "";
  return detail ? `${humanTool(step.name)}: ${detail}` : humanTool(step.name);
};
const toolDisplay = (call: AIToolCall) => {
  const args = parseArgs(call.arguments);
  const detail = args.command || args.path || args.service || args.deployment || "";
  return detail ? `${humanTool(call.name)}: ${detail}` : humanTool(call.name);
};
const parseArgs = (raw: string): Record<string, string> => {
  try {
    return JSON.parse(raw || "{}");
  } catch {
    return {};
  }
};
const humanTool = (name: string) => name.replace(/_/g, " ");

watch(
  () => [turns.value.length, store.loading, pending.value.length],
  async () => {
    await nextTick();
    if (scrollEl.value) scrollEl.value.scrollTop = scrollEl.value.scrollHeight;
  },
);
</script>

<style scoped>
.chat-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  width: 100%;
}
.chat-header-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: var(--radius-md);
  background: linear-gradient(135deg, var(--accent), var(--accent-hover));
  color: var(--accent-contrast);
  box-shadow: 0 4px 12px var(--accent-subtle);
  flex-shrink: 0;
}
.chat-header-text {
  flex: 1;
}
.chat-header-text h3 {
  margin: 0;
  font-size: 1rem;
  color: var(--text);
}
.chat-header-text p {
  margin: 0.1rem 0 0;
  font-size: 0.78rem;
  color: var(--text-muted);
}
.autorun-toggle {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.75rem;
  color: var(--text-muted);
  cursor: pointer;
}
.autorun-toggle input:disabled {
  cursor: not-allowed;
}

.chat-settings-hint {
  display: flex;
  gap: 0.6rem;
  padding: 1rem;
  background: var(--accent-subtle);
  border: 1px solid var(--accent-subtle);
  border-radius: var(--radius-lg);
  color: var(--text);
}
.chat-settings-hint p {
  margin: 0 0 0.6rem;
  font-size: 0.85rem;
}

.chat-body {
  flex: 1;
  min-height: 320px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding: 1rem;
  background:
    radial-gradient(120% 60% at 50% 0%, var(--accent-subtle) 0%, transparent 60%),
    linear-gradient(180deg, var(--surface-sunken), var(--app-bg));
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-lg);
  box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.04);
}
.chat-empty {
  margin: auto;
  text-align: center;
  color: var(--text-muted);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.85rem;
  padding: 1.5rem 0.5rem;
}
.chat-empty-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 52px;
  height: 52px;
  border-radius: var(--radius-lg);
  background: linear-gradient(135deg, var(--accent), var(--accent-hover));
  color: var(--accent-contrast);
  box-shadow: 0 6px 18px var(--accent-subtle);
}
.chat-empty-prompt {
  max-width: 26rem;
  font-size: 0.9rem;
  color: var(--text);
}
.sample-queries {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  width: 100%;
  max-width: 22rem;
}
.sample-chip {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  width: 100%;
  text-align: left;
  padding: 0.5rem 0.7rem;
  background: var(--surface-raised);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  color: var(--text);
  font-size: 0.82rem;
  cursor: pointer;
  transition: all var(--transition-base);
}
.sample-chip:hover:not(:disabled) {
  border-color: var(--accent);
  background: var(--accent-subtle);
}
.sample-chip:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.sample-chip > span {
  flex: 1;
}

.history-view {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  padding: 0.5rem;
}
.history-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 0.8rem;
  font-weight: var(--font-semibold);
  color: var(--text-muted);
  padding: 0.25rem 0.25rem 0.5rem;
}
.history-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  padding: 2rem 1rem;
  color: var(--text-subtle);
  text-align: center;
  font-size: 0.85rem;
}
.history-item {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  width: 100%;
  text-align: left;
  padding: 0.6rem 0.7rem;
  background: var(--surface-raised);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  cursor: pointer;
  transition: all var(--transition-base);
}
.history-item:hover {
  border-color: var(--accent);
  background: var(--accent-subtle);
}
.history-item-icon {
  color: var(--text-muted);
  flex-shrink: 0;
}
.history-item-title {
  flex: 1;
  font-size: 0.85rem;
  color: var(--text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.history-item-meta {
  font-size: 0.7rem;
  color: var(--text-subtle);
  flex-shrink: 0;
}
.history-note {
  margin-top: 0.5rem;
  font-size: 0.7rem;
  color: var(--text-subtle);
  text-align: center;
}

.chat-header-actions {
  display: flex;
  align-items: center;
  gap: 0.25rem;
}
.chat-icon-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: 1px solid transparent;
  background: none;
  color: var(--text-muted);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all var(--transition-base);
}
.chat-icon-btn:hover {
  background: var(--surface-sunken);
  color: var(--text);
}
.chat-icon-btn.active {
  background: var(--accent-subtle);
  color: var(--accent);
}

.turn {
  display: flex;
}
.turn.user {
  justify-content: flex-end;
}
.bubble {
  max-width: 88%;
  border-radius: 12px;
  padding: 0.6rem 0.85rem;
  font-size: 0.85rem;
  line-height: 1.55;
}
.bubble.user {
  background: var(--accent);
  color: var(--accent-contrast);
  border-bottom-right-radius: 4px;
}
.bubble.assistant {
  background: var(--surface-raised);
  border: 1px solid var(--border);
  color: var(--text);
  border-bottom-left-radius: 4px;
  width: 100%;
  box-shadow: var(--shadow-xs);
}

.tool-steps {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  margin-bottom: 0.5rem;
}
.tool-step-head {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  width: 100%;
  border: none;
  background: #eef2ff;
  color: #4338ca;
  border-radius: 6px;
  padding: 0.3rem 0.5rem;
  font-size: 0.72rem;
  cursor: pointer;
}
.tool-step-head .tool-name {
  flex: 1;
  text-align: left;
  font-family: ui-monospace, monospace;
}
.tool-step-head .open {
  transform: rotate(180deg);
}
.tool-result {
  margin: 0.2rem 0 0;
  padding: 0.45rem 0.6rem;
  background: #0f172a;
  color: #e2e8f0;
  border-radius: 6px;
  font-size: 0.7rem;
  max-height: 160px;
  overflow: auto;
  white-space: pre-wrap;
}

.markdown :deep(h2) {
  font-size: 0.92rem;
  margin: 0.6rem 0 0.3rem;
}
.markdown :deep(pre),
.markdown :deep(code) {
  background: var(--surface-inset);
  border-radius: 4px;
  font-size: 0.76rem;
}
.markdown :deep(code) {
  padding: 0.05rem 0.3rem;
}
.markdown :deep(pre) {
  padding: 0.5rem 0.7rem;
  overflow-x: auto;
}
.markdown :deep(pre) code {
  padding: 0;
  background: none;
}
.markdown :deep(a) {
  color: var(--accent);
}
.markdown :deep(ul),
.markdown :deep(ol) {
  padding-left: 1.1rem;
  margin: 0.3rem 0;
}
.markdown :deep(p) {
  margin: 0.3rem 0;
}

.approval-card {
  border: 1px solid rgba(245, 158, 11, 0.35);
  background: rgba(245, 158, 11, 0.1);
  border-radius: var(--radius-lg);
  padding: 0.75rem;
}
.approval-title {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  margin: 0 0 0.5rem;
  font-size: 0.8rem;
  font-weight: 600;
  color: #92400e;
}
.approval-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.3rem 0;
}
.approval-item code {
  flex: 1;
  font-size: 0.74rem;
  color: #78350f;
  overflow-wrap: anywhere;
}
.approval-buttons {
  display: flex;
  gap: 0.35rem;
  flex-shrink: 0;
}
.approval-decided {
  font-size: 0.72rem;
  font-weight: 600;
  color: #92400e;
  flex-shrink: 0;
}
.approval-decided.allowed {
  color: #15803d;
}
.btn-xs {
  padding: 0.2rem 0.55rem;
  font-size: 0.72rem;
}
.approval-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
  margin-top: 0.5rem;
}

.suggestions {
  border-top: 1px solid #e5e7eb;
  padding-top: 0.75rem;
}
.suggestions h4 {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  margin: 0 0 0.5rem;
  font-size: 0.82rem;
  color: #111827;
}
.suggestion-card {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 0.4rem 1rem;
  align-items: center;
  padding: 0.6rem 0.75rem;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
}
.suggestion-card + .suggestion-card {
  margin-top: 0.4rem;
}
.suggestion-info {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
  min-width: 0;
}
.suggestion-title {
  font-size: 0.82rem;
  font-weight: 600;
}
.suggestion-command {
  font-family: ui-monospace, monospace;
  font-size: 0.74rem;
  background: var(--surface-inset);
  padding: 0.12rem 0.4rem;
  border-radius: 4px;
  width: fit-content;
  max-width: 100%;
  overflow-wrap: anywhere;
}
.suggestion-command.plain {
  font-family: inherit;
  background: #eff6ff;
  color: #1d4ed8;
}
.suggestion-reason {
  font-size: 0.74rem;
  color: #6b7280;
}
.suggestion-output {
  grid-column: 1 / -1;
  margin: 0;
  padding: 0.45rem 0.6rem;
  background: #0f172a;
  color: #e2e8f0;
  border-radius: 6px;
  font-size: 0.7rem;
  max-height: 160px;
  overflow: auto;
  white-space: pre-wrap;
}

.chat-thinking {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.8rem;
  color: var(--text-muted);
}
.chat-error {
  display: flex;
  gap: 0.6rem;
  padding: 0.75rem;
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.25);
  border-radius: var(--radius-lg);
  color: var(--c-red);
}
.chat-error-icon {
  flex-shrink: 0;
  margin-top: 1px;
}
.chat-error-body {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  align-items: flex-start;
}
.chat-error-body p {
  font-size: 0.82rem;
  margin: 0;
}

.composer {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  width: 100%;
}

.composer-attachments {
  display: flex;
  flex-wrap: wrap;
  gap: 0.375rem;
}

.attachment-chip {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.25rem 0.5rem;
  background: var(--surface-sunken);
  border: 1px solid var(--border);
  border-radius: var(--radius-full);
  font-size: var(--text-xs);
  color: var(--text-muted);
  max-width: 220px;
}

.attachment-name {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.attachment-remove {
  display: inline-flex;
  background: none;
  border: none;
  color: var(--text-subtle);
  cursor: pointer;
  padding: 0;
}

.attachment-remove:hover {
  color: var(--c-red);
}

.composer-file {
  display: none;
}

.composer-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-xl);
  padding: 0.35rem 0.4rem 0.35rem 0.5rem;
  transition:
    border-color var(--transition-base),
    box-shadow var(--transition-base);
}

.composer-row:focus-within {
  border-color: var(--accent);
  box-shadow: 0 0 0 var(--ring-width) var(--ring-color);
}

.composer-attach,
.composer-send {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  border: none;
  cursor: pointer;
  border-radius: var(--radius-md);
  flex-shrink: 0;
  transition: all var(--transition-base);
}

.composer-attach {
  background: none;
  color: var(--text-muted);
}

.composer-attach:hover:not(:disabled) {
  background: var(--surface-sunken);
  color: var(--text);
}

.composer-send {
  background: var(--accent);
  color: var(--accent-contrast);
}

.composer-send:hover:not(:disabled) {
  background: var(--accent-hover);
}

.composer-attach:disabled,
.composer-send:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.composer-input {
  flex: 1;
  border: none;
  background: none;
  outline: none;
  font-size: var(--text-md);
  color: var(--text);
  min-width: 0;
}

.composer-input::placeholder {
  color: var(--text-subtle);
}
</style>
