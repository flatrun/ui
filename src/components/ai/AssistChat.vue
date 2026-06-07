<template>
  <BaseModal :visible="store.visible" size="xl" :close-on-overlay="!store.loading" @close="store.close">
    <template #header>
      <div class="chat-header">
        <div class="chat-header-icon"><Sparkles :size="18" /></div>
        <div class="chat-header-text">
          <h3>AI Assistant</h3>
          <p>{{ headerSubtitle }}</p>
        </div>
        <label class="autorun-toggle" :title="autoRunTitle">
          <input v-model="store.autoRun" type="checkbox" :disabled="hasSession" />
          <span>Auto-run lookups</span>
        </label>
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
      <div ref="scrollEl" class="chat-body">
        <div v-if="!turns.length && !store.loading" class="chat-empty">
          <Sparkles :size="28" />
          <p>{{ emptyPrompt }}</p>
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

        <div v-if="store.loading" class="chat-thinking"><i class="pi pi-spin pi-spinner" /> {{ thinkingLabel }}</div>
        <div v-else-if="store.error" class="chat-error">{{ store.error }}</div>
      </div>
    </template>

    <template v-if="!settingsHint" #footer>
      <div class="chat-input-row">
        <input
          v-model="draft"
          type="text"
          class="chat-input"
          :placeholder="inputPlaceholder"
          :disabled="inputDisabled"
          @keyup.enter="submit"
        />
        <button class="btn btn-primary" :disabled="inputDisabled || !draft.trim()" @click="submit">
          <Send :size="14" />
        </button>
      </div>
    </template>
  </BaseModal>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from "vue";
import { Sparkles, Search, ChevronDown, CircleAlert, Zap, Play, Send } from "lucide-vue-next";
import { marked } from "marked";
import DOMPurify from "dompurify";
import BaseModal from "@/components/base/BaseModal.vue";
import { useAssistStore, AI_DISABLED_MESSAGE } from "@/stores/assist";
import type { AIToolCall, AIToolStep } from "@/services/api";

const store = useAssistStore();
const draft = ref("");
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
  store.send(text);
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
  width: 36px;
  height: 36px;
  border-radius: 8px;
  background: #eff6ff;
  color: #2563eb;
}
.chat-header-text {
  flex: 1;
}
.chat-header-text h3 {
  margin: 0;
  font-size: 1rem;
  color: #111827;
}
.chat-header-text p {
  margin: 0.1rem 0 0;
  font-size: 0.78rem;
  color: #6b7280;
}
.autorun-toggle {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.75rem;
  color: #6b7280;
  cursor: pointer;
}
.autorun-toggle input:disabled {
  cursor: not-allowed;
}

.chat-settings-hint {
  display: flex;
  gap: 0.6rem;
  padding: 1rem;
  background: #eff6ff;
  border: 1px solid #bfdbfe;
  border-radius: 8px;
  color: #1e40af;
}
.chat-settings-hint p {
  margin: 0 0 0.6rem;
  font-size: 0.85rem;
}

.chat-body {
  max-height: 60vh;
  min-height: 320px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding: 0.25rem;
}
.chat-empty {
  margin: auto;
  text-align: center;
  color: #9ca3af;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
}
.chat-empty p {
  max-width: 28rem;
  font-size: 0.85rem;
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
  background: #2563eb;
  color: white;
  border-bottom-right-radius: 4px;
}
.bubble.assistant {
  background: #f8fafc;
  border: 1px solid #eef2f7;
  color: #1e293b;
  border-bottom-left-radius: 4px;
  width: 100%;
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
  background: #eef2f7;
  border-radius: 4px;
  font-size: 0.76rem;
}
.markdown :deep(pre) {
  padding: 0.5rem 0.7rem;
  overflow-x: auto;
}

.approval-card {
  border: 1px solid #fde68a;
  background: #fffbeb;
  border-radius: 8px;
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
  background: #f3f4f6;
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
  color: #6b7280;
}
.chat-error {
  font-size: 0.8rem;
  color: #b91c1c;
}

.chat-input-row {
  display: flex;
  gap: 0.5rem;
  width: 100%;
}
.chat-input {
  flex: 1;
  font-size: 0.85rem;
  padding: 0.5rem 0.7rem;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
}
.chat-input:disabled {
  background: #f9fafb;
}
</style>
