<template>
  <div class="sql-editor">
    <div class="editor-header">
      <h3>SQL Query</h3>
      <span class="query-hint">SELECT, SHOW, DESCRIBE, EXPLAIN only</span>
    </div>
    <div class="editor-container">
      <Codemirror
        v-model="query"
        :extensions="extensions"
        :style="{ height: '180px' }"
        :disabled="disabled"
        placeholder="SELECT * FROM table_name WHERE condition..."
        @keydown="handleKeydown"
      />
    </div>
    <div class="editor-toolbar">
      <div class="toolbar-left">
        <button class="btn btn-primary" :disabled="!query.trim() || disabled" @click="$emit('execute', query)">
          <Play :size="14" />
          Run
        </button>
        <button class="btn btn-secondary" @click="clearEditor">
          <Eraser :size="14" />
          Clear
        </button>
      </div>
      <div class="toolbar-right">
        <span class="shortcut-hint"> <kbd>Ctrl</kbd> + <kbd>Enter</kbd> to run </span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from "vue";
import { Codemirror } from "vue-codemirror";
import { sql, MySQL, PostgreSQL } from "@codemirror/lang-sql";
import { EditorView } from "@codemirror/view";
import { Play, Eraser } from "lucide-vue-next";

const props = defineProps<{
  modelValue?: string;
  dbType?: string;
  tables?: string[];
  disabled?: boolean;
}>();

const emit = defineEmits<{
  "update:modelValue": [value: string];
  execute: [query: string];
}>();

const query = ref(props.modelValue || "");

watch(
  () => props.modelValue,
  (newVal) => {
    if (newVal !== undefined && newVal !== query.value) {
      query.value = newVal;
    }
  },
);

watch(query, (newVal) => {
  emit("update:modelValue", newVal);
});

const dialect = computed(() => {
  return props.dbType === "postgresql" ? PostgreSQL : MySQL;
});

const extensions = computed(() => {
  const schema: Record<string, string[]> = {};
  if (props.tables) {
    props.tables.forEach((table) => {
      schema[table] = [];
    });
  }

  return [
    sql({
      dialect: dialect.value,
      schema,
      upperCaseKeywords: true,
    }),
    EditorView.theme({
      "&": {
        fontSize: "13px",
        fontFamily: "var(--font-mono)",
      },
      ".cm-content": {
        padding: "12px",
      },
      ".cm-gutters": {
        backgroundColor: "var(--color-gray-50)",
        borderRight: "1px solid var(--color-gray-200)",
      },
      ".cm-activeLineGutter": {
        backgroundColor: "var(--color-gray-100)",
      },
      "&.cm-focused .cm-cursor": {
        borderLeftColor: "var(--color-primary-500)",
      },
      "&.cm-focused .cm-selectionBackground, ::selection": {
        backgroundColor: "var(--color-primary-100)",
      },
    }),
    EditorView.lineWrapping,
  ];
});

function handleKeydown(event: KeyboardEvent) {
  if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
    event.preventDefault();
    if (query.value.trim() && !props.disabled) {
      emit("execute", query.value);
    }
  }
}

function clearEditor() {
  query.value = "";
}
</script>

<style scoped>
.sql-editor {
  background: white;
  border-radius: var(--radius-md);
  overflow: hidden;
  box-shadow: var(--shadow-sm);
}

.editor-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--space-3) var(--space-4);
  background: var(--color-gray-50);
  border-bottom: 1px solid var(--color-gray-200);
}

.editor-header h3 {
  margin: 0;
  font-size: var(--text-sm);
  font-weight: var(--font-semibold);
  color: var(--color-gray-700);
}

.query-hint {
  font-size: var(--text-xs);
  color: var(--color-gray-500);
}

.editor-container {
  border-bottom: 1px solid var(--color-gray-200);
}

.editor-container :deep(.cm-editor) {
  outline: none;
}

.editor-container :deep(.cm-editor.cm-focused) {
  outline: none;
}

.editor-container :deep(.cm-scroller) {
  font-family: var(--font-mono);
}

.editor-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--space-3) var(--space-4);
}

.toolbar-left {
  display: flex;
  gap: var(--space-2);
}

.toolbar-right {
  display: flex;
  align-items: center;
}

.shortcut-hint {
  font-size: var(--text-xs);
  color: var(--color-gray-400);
}

.shortcut-hint kbd {
  display: inline-block;
  padding: 0.125rem 0.375rem;
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  background: var(--color-gray-100);
  border: 1px solid var(--color-gray-200);
  border-radius: var(--radius-sm);
}

.btn {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-4);
  border-radius: var(--radius-sm);
  font-weight: var(--font-medium);
  font-size: var(--text-sm);
  cursor: pointer;
  transition: all var(--transition-base);
  border: none;
}

.btn-primary {
  background: var(--color-primary-500);
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: var(--color-primary-600);
}

.btn-secondary {
  background: white;
  border: 1px solid var(--color-gray-200);
  color: var(--color-gray-700);
}

.btn-secondary:hover:not(:disabled) {
  background: var(--color-gray-50);
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
