<template>
  <div class="table-list">
    <div class="list-header">
      <div class="search-box">
        <Search :size="14" class="search-icon" />
        <input
          v-model="searchTerm"
          type="text"
          class="search-input"
          placeholder="Search tables..."
        />
      </div>
      <span class="table-count">{{ filteredTables.length }} tables</span>
    </div>

    <div v-if="loading" class="loading-state">
      <RefreshCw :size="24" class="spinning" />
      <span>Loading tables...</span>
    </div>

    <div v-else-if="filteredTables.length === 0" class="empty-state">
      <Table2 :size="32" />
      <p>{{ searchTerm ? "No tables match your search" : "No tables found" }}</p>
    </div>

    <div v-else class="tables-container">
      <table class="tables-table">
        <thead>
          <tr>
            <th class="th-name" @click="toggleSort('name')">
              Name
              <component :is="getSortIcon('name')" :size="12" class="sort-icon" />
            </th>
            <th class="th-rows" @click="toggleSort('rows')">
              Rows
              <component :is="getSortIcon('rows')" :size="12" class="sort-icon" />
            </th>
            <th class="th-engine">Engine</th>
            <th class="th-actions" />
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="table in sortedTables"
            :key="table.name"
            class="table-row"
            :class="{ selected: selectedTable === table.name }"
            @click="$emit('select', table.name)"
          >
            <td class="td-name">
              <Table2 :size="14" class="table-icon" />
              <span class="table-name">{{ table.name }}</span>
            </td>
            <td class="td-rows">
              <span v-if="table.rows !== undefined" class="row-count">
                {{ formatNumber(table.rows) }}
              </span>
              <span v-else class="no-data">-</span>
            </td>
            <td class="td-engine">
              <span v-if="table.engine" class="engine-badge">{{ table.engine }}</span>
            </td>
            <td class="td-actions">
              <button class="action-btn" title="View Schema" @click.stop="$emit('view-schema', table.name)">
                <Columns :size="14" />
              </button>
              <button class="action-btn" title="Export" @click.stop="$emit('export', table.name)">
                <Download :size="14" />
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from "vue";
import { Search, Table2, RefreshCw, Columns, Download, ArrowUp, ArrowDown, ArrowUpDown } from "lucide-vue-next";

interface TableInfo {
  name: string;
  rows?: number;
  size?: string;
  engine?: string;
}

const props = defineProps<{
  tables: TableInfo[];
  selectedTable?: string;
  loading?: boolean;
}>();

defineEmits<{
  select: [name: string];
  "view-schema": [name: string];
  export: [name: string];
}>();

const searchTerm = ref("");
const sortField = ref<"name" | "rows">("name");
const sortDirection = ref<"asc" | "desc">("asc");

const filteredTables = computed(() => {
  if (!searchTerm.value) return props.tables;
  const term = searchTerm.value.toLowerCase();
  return props.tables.filter((table) => table.name.toLowerCase().includes(term));
});

const sortedTables = computed(() => {
  const tables = [...filteredTables.value];
  tables.sort((a, b) => {
    let comparison = 0;
    if (sortField.value === "name") {
      comparison = a.name.localeCompare(b.name);
    } else if (sortField.value === "rows") {
      const aRows = a.rows ?? 0;
      const bRows = b.rows ?? 0;
      comparison = aRows - bRows;
    }
    return sortDirection.value === "asc" ? comparison : -comparison;
  });
  return tables;
});

function toggleSort(field: "name" | "rows") {
  if (sortField.value === field) {
    sortDirection.value = sortDirection.value === "asc" ? "desc" : "asc";
  } else {
    sortField.value = field;
    sortDirection.value = "asc";
  }
}

function getSortIcon(field: "name" | "rows") {
  if (sortField.value !== field) return ArrowUpDown;
  return sortDirection.value === "asc" ? ArrowUp : ArrowDown;
}

function formatNumber(num: number): string {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + "M";
  if (num >= 1000) return (num / 1000).toFixed(1) + "K";
  return num.toString();
}
</script>

<style scoped>
.table-list {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: white;
  border-radius: var(--radius-lg);
  overflow: hidden;
}

.list-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-3) var(--space-4);
  border-bottom: 1px solid var(--color-gray-200);
  background: var(--color-gray-50);
}

.search-box {
  position: relative;
  flex: 1;
  max-width: 300px;
}

.search-icon {
  position: absolute;
  left: var(--space-3);
  top: 50%;
  transform: translateY(-50%);
  color: var(--color-gray-400);
  pointer-events: none;
}

.search-input {
  width: 100%;
  padding: var(--space-2) var(--space-3);
  padding-left: calc(var(--space-3) + 18px);
  border: 1px solid var(--color-gray-200);
  border-radius: var(--radius-md);
  font-size: var(--text-sm);
}

.search-input:focus {
  outline: none;
  border-color: var(--color-primary-500);
  box-shadow: 0 0 0 3px var(--color-primary-100);
}

.table-count {
  font-size: var(--text-sm);
  color: var(--color-gray-500);
}

.loading-state,
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--space-12);
  color: var(--color-gray-400);
  gap: var(--space-2);
}

.tables-container {
  flex: 1;
  overflow: auto;
}

.tables-table {
  width: 100%;
  border-collapse: collapse;
}

.tables-table th {
  position: sticky;
  top: 0;
  background: var(--color-gray-50);
  padding: var(--space-2) var(--space-3);
  text-align: left;
  font-size: var(--text-xs);
  font-weight: var(--font-semibold);
  color: var(--color-gray-600);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  border-bottom: 1px solid var(--color-gray-200);
  cursor: pointer;
  user-select: none;
}

.tables-table th:hover {
  background: var(--color-gray-100);
}

.sort-icon {
  margin-left: var(--space-1);
  opacity: 0.5;
}

.th-name {
  width: 50%;
}

.th-rows {
  width: 100px;
  text-align: right;
}

.th-engine {
  width: 100px;
}

.th-actions {
  width: 80px;
}

.table-row {
  cursor: pointer;
  transition: background var(--transition-base);
}

.table-row:hover {
  background: var(--color-gray-50);
}

.table-row.selected {
  background: var(--color-primary-50);
}

.table-row td {
  padding: var(--space-2) var(--space-3);
  border-bottom: 1px solid var(--color-gray-100);
  font-size: var(--text-sm);
}

.td-name {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.table-icon {
  color: var(--color-gray-400);
  flex-shrink: 0;
}

.table-name {
  font-family: var(--font-mono);
  font-weight: var(--font-medium);
}

.td-rows {
  text-align: right;
  font-family: var(--font-mono);
}

.row-count {
  color: var(--color-gray-600);
}

.no-data {
  color: var(--color-gray-300);
}

.engine-badge {
  display: inline-block;
  padding: 0.125rem 0.5rem;
  background: var(--color-gray-100);
  border-radius: var(--radius-sm);
  font-size: var(--text-xs);
  color: var(--color-gray-600);
}

.td-actions {
  display: flex;
  gap: var(--space-1);
  opacity: 0;
  transition: opacity var(--transition-base);
}

.table-row:hover .td-actions {
  opacity: 1;
}

.action-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  background: none;
  border: 1px solid var(--color-gray-200);
  border-radius: var(--radius-sm);
  color: var(--color-gray-500);
  cursor: pointer;
  transition: all var(--transition-base);
}

.action-btn:hover {
  background: var(--color-primary-50);
  border-color: var(--color-primary-200);
  color: var(--color-primary-600);
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
