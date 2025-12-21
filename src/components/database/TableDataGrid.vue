<template>
  <div class="table-data-grid">
    <div class="grid-header">
      <div class="header-left">
        <button class="btn btn-ghost btn-sm" @click="$emit('back')">
          <ArrowLeft :size="14" />
        </button>
        <h2>{{ tableName }}</h2>
      </div>
      <div class="header-actions">
        <button class="btn btn-secondary btn-sm" :disabled="loading" @click="$emit('refresh')">
          <RefreshCw :size="14" :class="{ spinning: loading }" />
          Refresh
        </button>
        <button class="btn btn-secondary btn-sm" @click="$emit('export')">
          <Download :size="14" />
          Export
        </button>
      </div>
    </div>

    <div v-if="error" class="error-message">
      <AlertCircle :size="16" />
      {{ error }}
    </div>

    <div v-if="loading" class="loading-state">
      <RefreshCw :size="24" class="spinning" />
      <span>Loading data...</span>
    </div>

    <template v-else-if="data">
      <div class="data-container">
        <table class="data-table">
          <thead>
            <tr>
              <th v-for="col in data.columns" :key="col">{{ col }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(row, idx) in data.rows" :key="idx">
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

      <div class="grid-footer">
        <div class="row-info">
          <span class="row-count">{{ data.count }} rows</span>
          <span v-if="executionTime" class="execution-time">{{ executionTime }}ms</span>
        </div>
        <div class="pagination">
          <button class="btn btn-secondary btn-sm" :disabled="offset === 0" @click="$emit('prev-page')">
            <ChevronLeft :size="14" />
            Previous
          </button>
          <span class="page-info"> {{ offset + 1 }} - {{ Math.min(offset + pageSize, offset + data.count) }} </span>
          <button class="btn btn-secondary btn-sm" :disabled="data.count < pageSize" @click="$emit('next-page')">
            Next
            <ChevronRight :size="14" />
          </button>
        </div>
      </div>
    </template>

    <div v-else class="empty-state">
      <Table2 :size="32" />
      <p>No data to display</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ArrowLeft, RefreshCw, Download, AlertCircle, Table2, ChevronLeft, ChevronRight } from "lucide-vue-next";

interface TableData {
  columns: string[];
  rows: any[][];
  count: number;
}

withDefaults(
  defineProps<{
    tableName: string;
    data: TableData | null;
    loading?: boolean;
    error?: string;
    offset?: number;
    pageSize?: number;
    executionTime?: number;
  }>(),
  {
    loading: false,
    offset: 0,
    pageSize: 100,
  },
);

defineEmits<{
  back: [];
  refresh: [];
  export: [];
  "prev-page": [];
  "next-page": [];
}>();

function formatCell(value: any): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "object") return JSON.stringify(value);
  const str = String(value);
  if (str.length > 100) return str.substring(0, 100) + "...";
  return str;
}
</script>

<style scoped>
.table-data-grid {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: white;
  border-radius: var(--radius-lg);
  overflow: hidden;
}

.grid-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--space-3) var(--space-4);
  border-bottom: 1px solid var(--color-gray-200);
}

.header-left {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.header-left h2 {
  margin: 0;
  font-size: var(--text-lg);
  font-weight: var(--font-semibold);
  font-family: var(--font-mono);
}

.header-actions {
  display: flex;
  gap: var(--space-2);
}

.error-message {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-3) var(--space-4);
  background: var(--color-danger-50);
  color: var(--color-danger-700);
  font-size: var(--text-sm);
  border-bottom: 1px solid var(--color-danger-200);
}

.loading-state,
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  flex: 1;
  padding: var(--space-12);
  color: var(--color-gray-400);
  gap: var(--space-2);
}

.data-container {
  flex: 1;
  overflow: auto;
}

.data-table {
  width: 100%;
  border-collapse: collapse;
  font-size: var(--text-sm);
}

.data-table th,
.data-table td {
  padding: var(--space-2) var(--space-3);
  text-align: left;
  border-bottom: 1px solid var(--color-gray-100);
  white-space: nowrap;
  max-width: 300px;
  overflow: hidden;
  text-overflow: ellipsis;
}

.data-table th {
  position: sticky;
  top: 0;
  background: var(--color-gray-50);
  font-weight: var(--font-semibold);
  color: var(--color-gray-700);
  z-index: 1;
}

.data-table tr:hover {
  background: var(--color-gray-50);
}

.null-value {
  color: var(--color-gray-400);
  font-style: italic;
}

.cell-value {
  cursor: default;
}

.grid-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--space-3) var(--space-4);
  border-top: 1px solid var(--color-gray-200);
  background: var(--color-gray-50);
}

.row-info {
  display: flex;
  align-items: center;
  gap: var(--space-3);
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

.pagination {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.page-info {
  font-size: var(--text-sm);
  color: var(--color-gray-500);
  padding: 0 var(--space-2);
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

.btn-secondary:hover:not(:disabled) {
  background: var(--color-gray-50);
}

.btn-ghost {
  background: transparent;
  border: none;
  color: var(--color-gray-500);
  padding: var(--space-1);
}

.btn-ghost:hover {
  background: var(--color-gray-100);
  color: var(--color-gray-700);
}

.btn-sm {
  padding: var(--space-1) var(--space-3);
  font-size: var(--text-xs);
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
