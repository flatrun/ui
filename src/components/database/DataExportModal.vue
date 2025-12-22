<template>
  <Teleport to="body">
    <div v-if="visible" class="modal-overlay" @click.self="$emit('close')">
      <div class="modal-container">
        <div class="modal-header">
          <h3>
            <Download :size="20" />
            Export Data
          </h3>
          <button class="close-btn" @click="$emit('close')">
            <X :size="18" />
          </button>
        </div>

        <div class="modal-body">
          <div class="export-info">
            <div class="info-row">
              <span class="info-label">Table</span>
              <code class="info-value">{{ tableName }}</code>
            </div>
            <div v-if="rowCount !== undefined" class="info-row">
              <span class="info-label">Rows</span>
              <span class="info-value">{{ rowCount.toLocaleString() }}</span>
            </div>
          </div>

          <div class="form-group">
            <label>Export Format</label>
            <div class="format-options">
              <label class="format-option" :class="{ selected: format === 'csv' }">
                <input v-model="format" type="radio" value="csv" />
                <FileText :size="20" />
                <div class="format-info">
                  <span class="format-name">CSV</span>
                  <span class="format-desc">Comma-separated values</span>
                </div>
              </label>
              <label class="format-option" :class="{ selected: format === 'json' }">
                <input v-model="format" type="radio" value="json" />
                <FileJson :size="20" />
                <div class="format-info">
                  <span class="format-name">JSON</span>
                  <span class="format-desc">JavaScript Object Notation</span>
                </div>
              </label>
              <label class="format-option" :class="{ selected: format === 'sql' }">
                <input v-model="format" type="radio" value="sql" />
                <Code :size="20" />
                <div class="format-info">
                  <span class="format-name">SQL</span>
                  <span class="format-desc">INSERT statements</span>
                </div>
              </label>
            </div>
          </div>

          <div class="form-group">
            <label>Export Options</label>
            <label class="checkbox-label">
              <input v-model="options.includeHeaders" type="checkbox" :disabled="format === 'sql'" />
              <span>Include column headers</span>
            </label>
            <label v-if="format === 'json'" class="checkbox-label">
              <input v-model="options.prettyPrint" type="checkbox" />
              <span>Pretty print (formatted)</span>
            </label>
          </div>

          <div class="form-group">
            <label>Row Limit</label>
            <div class="limit-options">
              <label class="radio-label">
                <input v-model="limitOption" type="radio" value="current" />
                <span>Current page only</span>
              </label>
              <label class="radio-label">
                <input v-model="limitOption" type="radio" value="all" />
                <span>All rows (may be slow for large tables)</span>
              </label>
              <label class="radio-label">
                <input v-model="limitOption" type="radio" value="custom" />
                <span>Custom limit:</span>
                <input
                  v-model.number="customLimit"
                  type="number"
                  min="1"
                  max="100000"
                  class="limit-input"
                  :disabled="limitOption !== 'custom'"
                />
              </label>
            </div>
          </div>
        </div>

        <div class="modal-footer">
          <button class="btn btn-secondary" @click="$emit('close')">Cancel</button>
          <button class="btn btn-primary" :disabled="exporting" @click="startExport">
            <Download :size="14" :class="{ spinning: exporting }" />
            {{ exporting ? "Exporting..." : "Export" }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { Download, X, FileText, FileJson, Code } from "lucide-vue-next";

const props = defineProps<{
  visible: boolean;
  tableName: string;
  columns: string[];
  rows: any[][];
  rowCount?: number;
}>();

const emit = defineEmits<{
  close: [];
  export: [format: string, options: ExportOptions];
}>();

interface ExportOptions {
  includeHeaders: boolean;
  prettyPrint: boolean;
  limit: number | null;
}

const format = ref<"csv" | "json" | "sql">("csv");
const limitOption = ref<"current" | "all" | "custom">("current");
const customLimit = ref(1000);
const exporting = ref(false);

const options = ref({
  includeHeaders: true,
  prettyPrint: true,
});

function downloadFile(content: string, mimeType: string, filename: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function escapeCSV(val: any): string {
  if (val === null) return "";
  const str = String(val);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function escapeSQL(val: any): string {
  if (val === null) return "NULL";
  if (typeof val === "number") return String(val);
  if (typeof val === "boolean") return val ? "1" : "0";
  return `'${String(val).replace(/'/g, "''")}'`;
}

async function startExport() {
  exporting.value = true;

  try {
    await new Promise((r) => setTimeout(r, 100));

    const rows = props.rows;
    const timestamp = Date.now();

    if (format.value === "csv") {
      let csv = "";
      if (options.value.includeHeaders) {
        csv = props.columns.map(escapeCSV).join(",") + "\n";
      }
      csv += rows.map((row) => row.map(escapeCSV).join(",")).join("\n");
      downloadFile(csv, "text/csv", `${props.tableName}_${timestamp}.csv`);
    } else if (format.value === "json") {
      const data = rows.map((row) => {
        const obj: Record<string, any> = {};
        props.columns.forEach((col, i) => {
          obj[col] = row[i];
        });
        return obj;
      });
      const json = options.value.prettyPrint ? JSON.stringify(data, null, 2) : JSON.stringify(data);
      downloadFile(json, "application/json", `${props.tableName}_${timestamp}.json`);
    } else if (format.value === "sql") {
      const statements = rows.map((row) => {
        const values = row.map(escapeSQL).join(", ");
        return `INSERT INTO \`${props.tableName}\` (${props.columns.map((c) => `\`${c}\``).join(", ")}) VALUES (${values});`;
      });
      downloadFile(statements.join("\n"), "text/plain", `${props.tableName}_${timestamp}.sql`);
    }

    emit("close");
  } finally {
    exporting.value = false;
  }
}
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-container {
  background: white;
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-xl);
  width: 500px;
  max-width: 90vw;
  max-height: 90vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--space-4);
  border-bottom: 1px solid var(--color-gray-200);
}

.modal-header h3 {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  margin: 0;
  font-size: var(--text-lg);
}

.close-btn {
  background: none;
  border: none;
  color: var(--color-gray-400);
  cursor: pointer;
  padding: var(--space-1);
  border-radius: var(--radius-sm);
}

.close-btn:hover {
  color: var(--color-gray-600);
  background: var(--color-gray-100);
}

.modal-body {
  padding: var(--space-4);
  overflow-y: auto;
}

.export-info {
  background: var(--color-gray-50);
  border: 1px solid var(--color-gray-200);
  border-radius: var(--radius-sm);
  padding: var(--space-3);
  margin-bottom: var(--space-4);
}

.info-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--space-1) 0;
}

.info-label {
  font-size: var(--text-sm);
  color: var(--color-gray-600);
}

.info-value {
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
}

code.info-value {
  background: var(--color-gray-100);
  padding: 0.125rem 0.5rem;
  border-radius: var(--radius-sm);
  font-family: var(--font-mono);
}

.form-group {
  margin-bottom: var(--space-4);
}

.form-group:last-child {
  margin-bottom: 0;
}

.form-group > label {
  display: block;
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  color: var(--color-gray-700);
  margin-bottom: var(--space-2);
}

.format-options {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.format-option {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-3);
  border: 1px solid var(--color-gray-200);
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: all var(--transition-base);
}

.format-option:hover {
  border-color: var(--color-gray-300);
}

.format-option.selected {
  border-color: var(--color-primary-500);
  background: var(--color-primary-50);
}

.format-option input {
  display: none;
}

.format-option svg {
  color: var(--color-gray-400);
}

.format-option.selected svg {
  color: var(--color-primary-500);
}

.format-info {
  display: flex;
  flex-direction: column;
}

.format-name {
  font-weight: var(--font-medium);
}

.format-desc {
  font-size: var(--text-xs);
  color: var(--color-gray-500);
}

.checkbox-label,
.radio-label {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-2) 0;
  cursor: pointer;
  font-size: var(--text-sm);
}

.checkbox-label input,
.radio-label input[type="radio"] {
  width: 16px;
  height: 16px;
}

.limit-options {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.limit-input {
  width: 100px;
  padding: var(--space-1) var(--space-2);
  margin-left: var(--space-2);
  border: 1px solid var(--color-gray-200);
  border-radius: var(--radius-sm);
  font-size: var(--text-sm);
}

.limit-input:disabled {
  opacity: 0.5;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: var(--space-2);
  padding: var(--space-4);
  border-top: 1px solid var(--color-gray-200);
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

.btn-secondary:hover {
  background: var(--color-gray-50);
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.spinning {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}
</style>
