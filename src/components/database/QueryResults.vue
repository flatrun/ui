<template>
  <div class="query-results">
    <div v-if="loading" class="loading-state">
      <RefreshCw :size="24" class="spinning" />
      <span>Executing query...</span>
    </div>

    <div v-else-if="error" class="error-box">
      <AlertCircle :size="16" />
      <span>{{ error }}</span>
    </div>

    <template v-else-if="results && results.columns.length > 0">
      <div class="results-header">
        <div class="results-info">
          <h4>Results</h4>
          <span class="row-count">{{ results.count }} rows</span>
          <span v-if="executionTime" class="execution-time">{{ executionTime }}ms</span>
        </div>
        <div class="results-actions">
          <div class="export-dropdown" ref="dropdownRef">
            <button class="btn btn-secondary btn-sm" @click="showExportMenu = !showExportMenu">
              <Download :size="14" />
              Export
              <ChevronDown :size="12" />
            </button>
            <div v-if="showExportMenu" class="export-menu">
              <button class="menu-item" @click="exportCSV">
                <FileText :size="14" />
                Export as CSV
              </button>
              <button class="menu-item" @click="exportJSON">
                <FileJson :size="14" />
                Export as JSON
              </button>
            </div>
          </div>
        </div>
      </div>

      <div class="results-grid">
        <table>
          <thead>
            <tr>
              <th v-for="col in results.columns" :key="col">{{ col }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(row, idx) in results.rows" :key="idx">
              <td v-for="(cell, cidx) in row" :key="cidx">
                <span v-if="cell === null" class="null-value">NULL</span>
                <span v-else class="cell-value" :title="formatCell(cell)">
                  {{ formatCell(cell) }}
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>

    <div v-else-if="!loading && !error" class="placeholder">
      <Code :size="32" />
      <p>Run a query to see results</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from "vue";
import { RefreshCw, AlertCircle, Download, ChevronDown, FileText, FileJson, Code } from "lucide-vue-next";

interface QueryResult {
  columns: string[];
  rows: any[][];
  count: number;
}

const props = defineProps<{
  results: QueryResult | null;
  loading?: boolean;
  error?: string;
  executionTime?: number;
}>();

const showExportMenu = ref(false);
const dropdownRef = ref<HTMLElement | null>(null);

function formatCell(value: any): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "object") return JSON.stringify(value);
  const str = String(value);
  if (str.length > 100) return str.substring(0, 100) + "...";
  return str;
}

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

function exportCSV() {
  if (!props.results) return;

  const escapeCSV = (val: any): string => {
    if (val === null) return "";
    const str = String(val);
    if (str.includes(",") || str.includes('"') || str.includes("\n")) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const header = props.results.columns.map(escapeCSV).join(",");
  const rows = props.results.rows.map((row) => row.map(escapeCSV).join(","));
  const csv = [header, ...rows].join("\n");

  downloadFile(csv, "text/csv", `query_results_${Date.now()}.csv`);
  showExportMenu.value = false;
}

function exportJSON() {
  if (!props.results) return;

  const data = props.results.rows.map((row) => {
    const obj: Record<string, any> = {};
    props.results!.columns.forEach((col, i) => {
      obj[col] = row[i];
    });
    return obj;
  });

  downloadFile(JSON.stringify(data, null, 2), "application/json", `query_results_${Date.now()}.json`);
  showExportMenu.value = false;
}

function handleClickOutside(event: MouseEvent) {
  if (dropdownRef.value && !dropdownRef.value.contains(event.target as Node)) {
    showExportMenu.value = false;
  }
}

onMounted(() => {
  document.addEventListener("click", handleClickOutside);
});

onUnmounted(() => {
  document.removeEventListener("click", handleClickOutside);
});
</script>

<style scoped>
.query-results {
  display: flex;
  flex-direction: column;
  background: white;
  border-radius: var(--radius-lg);
  overflow: hidden;
  box-shadow: var(--shadow-sm);
}

.loading-state,
.placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--space-8);
  color: var(--color-gray-400);
  gap: var(--space-2);
}

.error-box {
  display: flex;
  align-items: flex-start;
  gap: var(--space-2);
  padding: var(--space-3) var(--space-4);
  background: var(--color-danger-50);
  color: var(--color-danger-700);
  font-size: var(--text-sm);
  border: 1px solid var(--color-danger-200);
  border-radius: var(--radius-lg);
  margin: var(--space-4);
}

.error-box svg {
  flex-shrink: 0;
  margin-top: 2px;
}

.results-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--space-3) var(--space-4);
  background: var(--color-gray-50);
  border-bottom: 1px solid var(--color-gray-200);
}

.results-info {
  display: flex;
  align-items: center;
  gap: var(--space-3);
}

.results-info h4 {
  margin: 0;
  font-size: var(--text-sm);
  font-weight: var(--font-semibold);
}

.row-count {
  font-size: var(--text-sm);
  color: var(--color-gray-600);
}

.execution-time {
  font-size: var(--text-xs);
  font-family: var(--font-mono);
  color: var(--color-gray-400);
  padding: 0.125rem 0.5rem;
  background: var(--color-gray-100);
  border-radius: var(--radius-sm);
}

.results-actions {
  display: flex;
  gap: var(--space-2);
}

.export-dropdown {
  position: relative;
}

.export-menu {
  position: absolute;
  top: 100%;
  right: 0;
  margin-top: var(--space-1);
  background: white;
  border: 1px solid var(--color-gray-200);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-lg);
  min-width: 160px;
  z-index: var(--z-dropdown);
  overflow: hidden;
}

.menu-item {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  width: 100%;
  padding: var(--space-2) var(--space-3);
  background: none;
  border: none;
  font-size: var(--text-sm);
  color: var(--color-gray-700);
  cursor: pointer;
  text-align: left;
}

.menu-item:hover {
  background: var(--color-gray-50);
}

.results-grid {
  overflow: auto;
  max-height: 400px;
}

.results-grid table {
  width: 100%;
  border-collapse: collapse;
  font-size: var(--text-sm);
}

.results-grid th,
.results-grid td {
  padding: var(--space-2) var(--space-3);
  text-align: left;
  border-bottom: 1px solid var(--color-gray-100);
  white-space: nowrap;
  max-width: 300px;
  overflow: hidden;
  text-overflow: ellipsis;
}

.results-grid th {
  position: sticky;
  top: 0;
  background: var(--color-gray-50);
  font-weight: var(--font-semibold);
  color: var(--color-gray-700);
  z-index: 1;
}

.results-grid tr:hover {
  background: var(--color-gray-50);
}

.null-value {
  color: var(--color-gray-400);
  font-style: italic;
}

.btn {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-4);
  border-radius: var(--radius-md);
  font-weight: var(--font-medium);
  font-size: var(--text-sm);
  cursor: pointer;
  transition: all var(--transition-base);
  border: none;
}

.btn-secondary {
  background: white;
  border: 1px solid var(--color-gray-200);
  color: var(--color-gray-700);
}

.btn-secondary:hover {
  background: var(--color-gray-50);
}

.btn-sm {
  padding: var(--space-1) var(--space-3);
  font-size: var(--text-xs);
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
