<template>
  <BaseModal :visible="visible" size="xl" :close-on-overlay="!loading" @close="emit('close')">
    <template #header>
      <div class="assist-header">
        <div class="assist-header-icon">
          <Sparkles :size="18" />
        </div>
        <div class="assist-header-text">
          <h3>AI Assistant</h3>
          <p>{{ subject }}</p>
        </div>
      </div>
    </template>
    <div v-if="!settingsHint" class="intent-bar">
      <button
        v-for="item in intents"
        :key="item"
        class="intent-chip"
        :class="{ active: intent === item }"
        :disabled="loading"
        @click="emit('rerun', item, question || undefined)"
      >
        {{ intentLabels[item] || item }}
      </button>
    </div>

    <div v-if="loading" class="assist-loading">
      <i class="pi pi-spin pi-spinner" />
      <span>Analyzing {{ subject }}...</span>
    </div>

    <div v-else-if="error" class="assist-error" :class="{ informational: settingsHint }">
      <Sparkles v-if="settingsHint" :size="16" />
      <i v-else class="pi pi-exclamation-triangle" />
      <div class="error-body">
        <p>{{ error }}</p>
        <router-link v-if="settingsHint" to="/settings" class="btn btn-sm btn-primary" @click="emit('close')">
          Open AI Settings
        </router-link>
      </div>
    </div>

    <template v-else-if="result">
      <!-- eslint-disable-next-line vue/no-v-html -->
      <div class="analysis-markdown" v-html="renderedAnalysis" />

      <div v-if="result.suggested_actions.length" class="suggestions">
        <h4><i class="pi pi-bolt" /> Suggested actions</h4>
        <p class="suggestions-hint">
          Nothing runs without your approval. Each action goes through the same permission and protection checks as a
          manual one.
        </p>
        <div v-for="(suggestion, index) in result.suggested_actions" :key="index" class="suggestion-card">
          <div class="suggestion-info">
            <span class="suggestion-title">{{ suggestion.title }}</span>
            <code v-if="suggestion.kind === 'exec'" class="suggestion-command">{{ suggestion.command }}</code>
            <span v-else class="suggestion-command plain">{{ suggestion.action }} {{ suggestion.service }}</span>
            <span v-if="suggestion.reason" class="suggestion-reason">{{ suggestion.reason }}</span>
          </div>
          <button
            class="btn btn-sm btn-primary"
            :disabled="runningIndex !== null"
            @click="emit('run', suggestion, index)"
          >
            <i :class="runningIndex === index ? 'pi pi-spin pi-spinner' : 'pi pi-play'" />
            Run
          </button>
          <div v-if="suggestionOutputs[index]" class="suggestion-output">
            <pre>{{ suggestionOutputs[index] }}</pre>
          </div>
        </div>
      </div>
    </template>

    <div v-if="!settingsHint && !loading" class="question-bar">
      <input
        v-model="question"
        type="text"
        class="question-input"
        placeholder="Ask a follow-up question about this context..."
        @keyup.enter="askQuestion"
      />
      <button class="btn btn-sm btn-primary" :disabled="!question.trim()" @click="askQuestion">
        <i class="pi pi-send" /> Ask
      </button>
    </div>

    <template #footer>
      <span v-if="result" class="assist-meta">
        {{ result.model }} · {{ result.redactions }} secret value(s) redacted before sending
      </span>
      <button class="btn btn-secondary" @click="emit('close')">Close</button>
    </template>
  </BaseModal>
</template>

<script setup lang="ts">
import { ref, computed } from "vue";
import { Sparkles } from "lucide-vue-next";
import { marked } from "marked";
import DOMPurify from "dompurify";
import BaseModal from "@/components/base/BaseModal.vue";
import type { AIAnalysis, AISuggestedAction, AssistIntent } from "@/services/api";

const props = withDefaults(
  defineProps<{
    visible: boolean;
    subject: string;
    intent?: AssistIntent;
    intents?: AssistIntent[];
    loading?: boolean;
    error?: string;
    result?: AIAnalysis | null;
    runningIndex?: number | null;
    suggestionOutputs?: Record<number, string>;
    settingsHint?: boolean;
  }>(),
  {
    intent: "diagnose",
    intents: () => ["diagnose", "improve", "secure", "explain"],
    loading: false,
    error: "",
    result: null,
    runningIndex: null,
    suggestionOutputs: () => ({}),
    settingsHint: false,
  },
);

const emit = defineEmits<{
  close: [];
  run: [suggestion: AISuggestedAction, index: number];
  rerun: [intent: AssistIntent, question?: string];
}>();

const intentLabels: Record<string, string> = {
  diagnose: "Diagnose",
  improve: "Improve",
  secure: "Secure",
  explain: "Explain",
};

const question = ref("");

const askQuestion = () => {
  if (!question.value.trim()) return;
  emit("rerun", props.intent, question.value.trim());
};

const renderedAnalysis = computed(() => {
  if (!props.result) return "";
  return DOMPurify.sanitize(marked.parse(props.result.analysis, { async: false }) as string);
});
</script>

<style scoped>
.assist-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.assist-header-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 8px;
  background: #eff6ff;
  color: #2563eb;
  flex-shrink: 0;
}

.assist-header-text h3 {
  margin: 0;
  font-size: 1rem;
  color: #111827;
}

.assist-header-text p {
  margin: 0.1rem 0 0;
  font-size: 0.78rem;
  color: #6b7280;
}

.intent-bar {
  display: flex;
  gap: 0.4rem;
  margin-bottom: 1rem;
}

.intent-chip {
  padding: 0.3rem 0.8rem;
  border: 1px solid #e5e7eb;
  border-radius: 999px;
  background: white;
  font-size: 0.78rem;
  font-weight: 500;
  color: #6b7280;
  cursor: pointer;
  transition: all 0.15s ease;
}

.intent-chip:hover {
  border-color: #bfdbfe;
  color: #2563eb;
}

.intent-chip.active {
  background: #eff6ff;
  border-color: #bfdbfe;
  color: #1d4ed8;
}

.assist-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.6rem;
  padding: 3rem 0;
  color: #6b7280;
}

.assist-loading i {
  font-size: 1.2rem;
  color: #3b82f6;
}

.assist-error {
  display: flex;
  align-items: flex-start;
  gap: 0.6rem;
  padding: 1rem;
  background: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: 6px;
  color: #b91c1c;
}

.assist-error p {
  margin: 0;
  font-size: 0.85rem;
}

.assist-error.informational {
  background: #eff6ff;
  border-color: #bfdbfe;
  color: #1e40af;
}

.error-body {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
  align-items: flex-start;
}

.analysis-markdown {
  font-size: 0.85rem;
  line-height: 1.6;
  color: #1e293b;
}

.analysis-markdown :deep(h2) {
  font-size: 0.95rem;
  margin: 1rem 0 0.4rem;
  color: #111827;
}

.analysis-markdown :deep(pre),
.analysis-markdown :deep(code) {
  background: #f3f4f6;
  border-radius: 4px;
  font-size: 0.78rem;
}

.analysis-markdown :deep(pre) {
  padding: 0.6rem 0.8rem;
  overflow-x: auto;
}

.suggestions {
  margin-top: 1.25rem;
  border-top: 1px solid #e5e7eb;
  padding-top: 1rem;
}

.suggestions h4 {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  margin: 0 0 0.25rem;
  font-size: 0.85rem;
  color: #111827;
}

.suggestions h4 i {
  color: #f59e0b;
}

.suggestions-hint {
  margin: 0 0 0.75rem;
  font-size: 0.75rem;
  color: #9ca3af;
}

.suggestion-card {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 0.5rem 1rem;
  align-items: center;
  padding: 0.75rem;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
}

.suggestion-card + .suggestion-card {
  margin-top: 0.5rem;
}

.suggestion-info {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  min-width: 0;
}

.suggestion-title {
  font-size: 0.83rem;
  font-weight: 600;
  color: #1e293b;
}

.suggestion-command {
  font-family: ui-monospace, monospace;
  font-size: 0.75rem;
  background: #f3f4f6;
  padding: 0.15rem 0.4rem;
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
  font-size: 0.75rem;
  color: #6b7280;
}

.suggestion-output {
  grid-column: 1 / -1;
}

.suggestion-output pre {
  margin: 0;
  padding: 0.5rem 0.7rem;
  background: #0f172a;
  color: #e2e8f0;
  border-radius: 6px;
  font-size: 0.72rem;
  max-height: 180px;
  overflow: auto;
  white-space: pre-wrap;
}

.question-bar {
  display: flex;
  gap: 0.5rem;
  margin-top: 1rem;
  padding-top: 0.75rem;
  border-top: 1px solid #f3f4f6;
}

.question-input {
  flex: 1;
  font-size: 0.8rem;
  padding: 0.45rem 0.7rem;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
}

.assist-meta {
  margin-right: auto;
  font-size: 0.72rem;
  color: #9ca3af;
}
</style>
