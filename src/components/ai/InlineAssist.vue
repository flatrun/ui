<template>
  <div class="inline-assist">
    <div class="ia-header">
      <div class="ia-title">
        <span class="ia-icon"><Icon name="bot" :size="15" /></span>
        <span>Assistant</span>
      </div>
      <button class="ia-close" title="Close assistant" @click="$emit('close')">
        <Icon name="x" :size="16" />
      </button>
    </div>

    <div ref="scrollEl" class="ia-body">
      <div v-if="!turns.length && !store.loading" class="ia-empty">
        <span class="ia-empty-icon"><Icon name="bot" :size="22" /></span>
        <p>{{ emptyPrompt }}</p>
        <button v-for="(q, i) in samples" :key="i" class="ia-sample" :disabled="inputDisabled" @click="runSample(q)">
          {{ q }}
        </button>
      </div>

      <div v-for="(turn, i) in turns" :key="i" class="ia-turn" :class="turn.role">
        <div v-if="turn.role === 'user'" class="ia-bubble user">{{ turn.content }}</div>
        <div v-else class="ia-bubble assistant">
          <!-- eslint-disable-next-line vue/no-v-html -->
          <div v-if="turn.content" class="markdown" v-html="renderMarkdown(turn.content)" />
        </div>
      </div>

      <div v-if="pending.length" class="ia-approval">
        <p class="ia-approval-title"><Icon name="circle-alert" :size="13" /> Allow a read-only lookup?</p>
        <div v-for="call in pending" :key="call.id" class="ia-approval-item">
          <code>{{ toolDisplay(call) }}</code>
          <div class="ia-approval-btns">
            <button class="btn btn-xs btn-secondary" :disabled="store.loading" @click="store.decide(call.id, false)">
              Decline
            </button>
            <button class="btn btn-xs btn-primary" :disabled="store.loading" @click="store.decide(call.id, true)">
              Allow
            </button>
          </div>
        </div>
      </div>

      <div v-if="store.loading" class="ia-thinking"><Icon name="loader-circle" spin :size="13" /> Thinking...</div>
      <div v-else-if="store.error" class="ia-error"><Icon name="triangle-alert" :size="14" /> {{ store.error }}</div>
    </div>

    <div class="ia-composer">
      <input
        v-model="draft"
        type="text"
        class="ia-input"
        :placeholder="placeholder"
        :disabled="inputDisabled"
        @keyup.enter="submit"
      />
      <button class="ia-send" :disabled="inputDisabled || !draft.trim()" title="Send" @click="submit">
        <Icon name="send" :size="16" />
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from "vue";
import { marked } from "marked";
import DOMPurify from "dompurify";
import Icon from "@/components/base/Icon.vue";
import { useAssistStore } from "@/stores/assist";
import type { AIToolCall } from "@/services/api";

defineEmits<{ close: [] }>();

const store = useAssistStore();
const draft = ref("");
const scrollEl = ref<HTMLElement | null>(null);

const turns = computed(() => store.session?.messages ?? []);
const pending = computed(() => store.session?.pending ?? []);
const inputDisabled = computed(() => store.loading || pending.value.length > 0);

const emptyPrompt = computed(() =>
  store.scope === "deployment"
    ? `Ask about ${store.subject}, or what to change.`
    : `Ask about ${store.subject || "this"}.`,
);
const placeholder = computed(() => (pending.value.length ? "Resolve the lookup above..." : "Ask a question..."));

const samples = computed(() => ["Explain this", "Is anything wrong here?", "Suggest an improvement"]);

const submit = () => {
  const text = draft.value.trim();
  if (!text || inputDisabled.value) return;
  draft.value = "";
  store.send(text);
};

const runSample = (q: string) => {
  if (inputDisabled.value) return;
  store.send(q);
};

const renderMarkdown = (content: string) => DOMPurify.sanitize(marked.parse(content, { async: false }) as string);

const parseArgs = (raw: string): Record<string, string> => {
  try {
    return JSON.parse(raw || "{}");
  } catch {
    return {};
  }
};
const humanTool = (name: string) => name.replace(/_/g, " ");
const toolDisplay = (call: AIToolCall) => {
  const args = parseArgs(call.arguments);
  const detail = args.command || args.path || args.service || args.deployment || "";
  return detail ? `${humanTool(call.name)}: ${detail}` : humanTool(call.name);
};

watch(
  () => [turns.value.length, store.loading, pending.value.length],
  async () => {
    await nextTick();
    if (scrollEl.value) scrollEl.value.scrollTop = scrollEl.value.scrollHeight;
  },
);
</script>

<style scoped>
.inline-assist {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  background: var(--surface-raised);
  border-left: 1px solid var(--border);
}

.ia-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-3) var(--space-4);
  border-bottom: 1px solid var(--border-subtle);
  flex-shrink: 0;
}
.ia-title {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: var(--text-md);
  font-weight: var(--font-semibold);
  color: var(--text);
}
.ia-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  border-radius: var(--radius-sm);
  background: linear-gradient(135deg, var(--accent), var(--accent-hover));
  color: var(--accent-contrast);
}
.ia-close {
  display: flex;
  border: none;
  background: none;
  color: var(--text-subtle);
  cursor: pointer;
  padding: 0.25rem;
  border-radius: var(--radius-sm);
}
.ia-close:hover {
  background: var(--surface-sunken);
  color: var(--text);
}

.ia-body {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
  padding: var(--space-4);
  background: linear-gradient(180deg, var(--surface-sunken), var(--app-bg));
}

.ia-empty {
  margin: auto;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  color: var(--text-muted);
  font-size: 0.82rem;
}
.ia-empty-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  border-radius: var(--radius-lg);
  background: linear-gradient(135deg, var(--accent), var(--accent-hover));
  color: var(--accent-contrast);
}
.ia-sample {
  width: 100%;
  text-align: left;
  padding: 0.4rem 0.6rem;
  background: var(--surface-raised);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  color: var(--text);
  font-size: 0.78rem;
  cursor: pointer;
}
.ia-sample:hover:not(:disabled) {
  border-color: var(--accent);
  background: var(--accent-subtle);
}
.ia-sample:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.ia-turn {
  display: flex;
}
.ia-turn.user {
  justify-content: flex-end;
}
.ia-bubble {
  max-width: 92%;
  border-radius: var(--radius-lg);
  padding: 0.5rem 0.7rem;
  font-size: 0.82rem;
  line-height: 1.5;
}
.ia-bubble.user {
  background: var(--accent);
  color: var(--accent-contrast);
  border-bottom-right-radius: 4px;
}
.ia-bubble.assistant {
  width: 100%;
  background: var(--surface-raised);
  border: 1px solid var(--border);
  color: var(--text);
  border-bottom-left-radius: 4px;
}

.markdown :deep(pre),
.markdown :deep(code) {
  background: var(--surface-inset);
  border-radius: 4px;
  font-size: 0.74rem;
}
.markdown :deep(pre) {
  padding: 0.5rem 0.6rem;
  overflow-x: auto;
}
.markdown :deep(a) {
  color: var(--accent);
}

.ia-approval {
  border: 1px solid rgba(245, 158, 11, 0.35);
  background: rgba(245, 158, 11, 0.1);
  border-radius: var(--radius-md);
  padding: 0.6rem;
  font-size: 0.78rem;
}
.ia-approval-title {
  display: flex;
  align-items: center;
  gap: 0.3rem;
  margin: 0 0 0.4rem;
  color: var(--text);
}
.ia-approval-item {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}
.ia-approval-item code {
  font-size: 0.72rem;
  color: var(--text-muted);
  word-break: break-all;
}
.ia-approval-btns {
  display: flex;
  gap: 0.35rem;
}

.ia-thinking {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.78rem;
  color: var(--text-muted);
}
.ia-error {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.78rem;
  color: var(--c-red);
}

.ia-composer {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  padding: var(--space-3);
  border-top: 1px solid var(--border-subtle);
  flex-shrink: 0;
}
.ia-input {
  flex: 1;
  min-width: 0;
  border: 1px solid var(--border);
  background: var(--surface);
  color: var(--text);
  border-radius: var(--radius-lg);
  padding: 0.45rem 0.7rem;
  font-size: 0.82rem;
  outline: none;
}
.ia-input:focus {
  border-color: var(--accent);
}
.ia-send {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  border: none;
  background: var(--accent);
  color: var(--accent-contrast);
  border-radius: var(--radius-md);
  cursor: pointer;
  flex-shrink: 0;
}
.ia-send:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
