<template>
  <div class="table-schema-view">
    <div class="schema-header">
      <div class="header-left">
        <Columns :size="20" class="header-icon" />
        <div class="header-title">
          <h2>{{ tableName }}</h2>
          <span class="header-subtitle">Table Schema</span>
        </div>
      </div>
      <div class="header-actions">
        <button class="btn btn-secondary btn-sm" :disabled="loading" @click="loadSchema">
          <RefreshCw :size="14" :class="{ spinning: loading }" />
          Refresh
        </button>
      </div>
    </div>

    <div v-if="loading" class="loading-state">
      <RefreshCw :size="24" class="spinning" />
      <span>Loading schema...</span>
    </div>

    <div v-else-if="error" class="error-state">
      <AlertCircle :size="32" />
      <h3>Failed to load schema</h3>
      <p>{{ error }}</p>
      <button class="btn btn-primary" @click="loadSchema">
        <RefreshCw :size="14" />
        Retry
      </button>
    </div>

    <template v-else-if="columns.length > 0">
      <div class="schema-section">
        <h3 class="section-title">
          <Table2 :size="16" />
          Columns
          <span class="section-count">{{ columns.length }}</span>
        </h3>
        <div class="columns-table-container">
          <table class="columns-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Type</th>
                <th>Nullable</th>
                <th>Default</th>
                <th>Key</th>
                <th>Extra</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="col in columns" :key="col.name">
                <td class="col-name">
                  <code>{{ col.name }}</code>
                </td>
                <td class="col-type">
                  <span class="type-badge">{{ col.type }}</span>
                </td>
                <td class="col-nullable">
                  <span v-if="col.nullable" class="badge badge-success">YES</span>
                  <span v-else class="badge badge-danger">NO</span>
                </td>
                <td class="col-default">
                  <code v-if="col.default !== null">{{ col.default }}</code>
                  <span v-else class="null-value">NULL</span>
                </td>
                <td class="col-key">
                  <span v-if="col.key === 'PRI'" class="key-badge primary">PRI</span>
                  <span v-else-if="col.key === 'UNI'" class="key-badge unique">UNI</span>
                  <span v-else-if="col.key === 'MUL'" class="key-badge index">MUL</span>
                </td>
                <td class="col-extra">
                  <span v-if="col.extra" class="extra-text">{{ col.extra }}</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div v-if="indexes.length > 0" class="schema-section">
        <h3 class="section-title">
          <Key :size="16" />
          Indexes
          <span class="section-count">{{ indexes.length }}</span>
        </h3>
        <div class="indexes-list">
          <div v-for="idx in indexes" :key="idx.name" class="index-item">
            <div class="index-header">
              <span class="index-name">{{ idx.name }}</span>
              <span v-if="idx.primary" class="index-badge primary">PRIMARY</span>
              <span v-else-if="idx.unique" class="index-badge unique">UNIQUE</span>
              <span v-else class="index-badge">INDEX</span>
            </div>
            <div class="index-columns">
              <code v-for="col in idx.columns" :key="col" class="index-column">{{ col }}</code>
            </div>
          </div>
        </div>
      </div>
    </template>

    <div v-else class="empty-state">
      <Columns :size="32" />
      <p>No schema information available</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from "vue";
import { Columns, RefreshCw, AlertCircle, Table2, Key } from "lucide-vue-next";
import { databasesApi, type DatabaseConnectionConfig, type ColumnSchema, type IndexSchema } from "@/services/api";

const props = defineProps<{
  connection: DatabaseConnectionConfig;
  database: string;
  tableName: string;
}>();

const loading = ref(false);
const error = ref("");
const columns = ref<ColumnSchema[]>([]);
const indexes = ref<IndexSchema[]>([]);

async function loadSchema() {
  if (!props.tableName) return;

  loading.value = true;
  error.value = "";

  try {
    const res = await databasesApi.describeTable(props.connection, props.database, props.tableName);
    columns.value = res.data.columns;
    indexes.value = res.data.indexes;
  } catch (err: any) {
    error.value = err.response?.data?.error || err.message;
    columns.value = [];
    indexes.value = [];
  } finally {
    loading.value = false;
  }
}

watch(
  () => props.tableName,
  () => {
    if (props.tableName) {
      loadSchema();
    }
  },
);

onMounted(() => {
  if (props.tableName) {
    loadSchema();
  }
});
</script>

<style scoped>
.table-schema-view {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--color-gray-50);
  overflow-y: auto;
}

.schema-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--space-4);
  background: white;
  border-bottom: 1px solid var(--color-gray-200);
}

.header-left {
  display: flex;
  align-items: center;
  gap: var(--space-3);
}

.header-icon {
  color: var(--color-primary-500);
}

.header-title h2 {
  margin: 0;
  font-size: var(--text-lg);
  font-weight: var(--font-semibold);
  font-family: var(--font-mono);
}

.header-subtitle {
  font-size: var(--text-sm);
  color: var(--color-gray-500);
}

.header-actions {
  display: flex;
  gap: var(--space-2);
}

.loading-state,
.error-state,
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

.error-state {
  color: var(--color-danger-600);
}

.error-state h3 {
  margin: 0;
  color: var(--color-gray-900);
}

.error-state p {
  color: var(--color-gray-600);
  max-width: 400px;
  text-align: center;
}

.schema-section {
  margin: var(--space-4);
  background: white;
  border: 1px solid var(--color-gray-200);
  border-radius: var(--radius-md);
  overflow: hidden;
}

.section-title {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  margin: 0;
  padding: var(--space-3) var(--space-4);
  font-size: var(--text-sm);
  font-weight: var(--font-semibold);
  color: var(--color-gray-700);
  background: var(--color-gray-50);
  border-bottom: 1px solid var(--color-gray-200);
}

.section-count {
  font-size: var(--text-xs);
  color: var(--color-gray-500);
  background: var(--color-gray-200);
  padding: 0 var(--space-2);
  border-radius: var(--radius-full);
  margin-left: auto;
}

.columns-table-container {
  overflow-x: auto;
}

.columns-table {
  width: 100%;
  border-collapse: collapse;
  font-size: var(--text-sm);
}

.columns-table th {
  padding: var(--space-2) var(--space-3);
  text-align: left;
  font-size: var(--text-xs);
  font-weight: var(--font-semibold);
  color: var(--color-gray-600);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  background: var(--color-gray-50);
  border-bottom: 1px solid var(--color-gray-200);
}

.columns-table td {
  padding: var(--space-2) var(--space-3);
  border-bottom: 1px solid var(--color-gray-100);
}

.columns-table tr:last-child td {
  border-bottom: none;
}

.col-name code {
  font-family: var(--font-mono);
  font-weight: var(--font-medium);
}

.type-badge {
  display: inline-block;
  padding: 0.125rem 0.5rem;
  background: var(--color-primary-50);
  color: var(--color-primary-700);
  border-radius: var(--radius-sm);
  font-family: var(--font-mono);
  font-size: var(--text-xs);
}

.badge {
  display: inline-block;
  padding: 0.125rem 0.375rem;
  border-radius: var(--radius-sm);
  font-size: var(--text-xs);
  font-weight: var(--font-semibold);
}

.badge-success {
  background: var(--color-success-50);
  color: var(--color-success-700);
}

.badge-danger {
  background: var(--color-danger-50);
  color: var(--color-danger-700);
}

.null-value {
  color: var(--color-gray-400);
  font-style: italic;
  font-size: var(--text-xs);
}

.key-badge {
  display: inline-block;
  padding: 0.125rem 0.375rem;
  border-radius: var(--radius-sm);
  font-size: var(--text-xs);
  font-weight: var(--font-bold);
}

.key-badge.primary {
  background: var(--color-warning-100);
  color: var(--color-warning-700);
}

.key-badge.unique {
  background: var(--color-info-100);
  color: var(--color-info-700);
}

.key-badge.index {
  background: var(--color-gray-100);
  color: var(--color-gray-600);
}

.extra-text {
  font-size: var(--text-xs);
  color: var(--color-gray-500);
}

.indexes-list {
  padding: var(--space-3);
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.index-item {
  padding: var(--space-3);
  background: var(--color-gray-50);
  border-radius: var(--radius-sm);
}

.index-header {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  margin-bottom: var(--space-2);
}

.index-name {
  font-weight: var(--font-semibold);
  font-family: var(--font-mono);
  font-size: var(--text-sm);
}

.index-badge {
  padding: 0.125rem 0.375rem;
  border-radius: var(--radius-sm);
  font-size: var(--text-xs);
  font-weight: var(--font-semibold);
  background: var(--color-gray-200);
  color: var(--color-gray-600);
}

.index-badge.primary {
  background: var(--color-warning-100);
  color: var(--color-warning-700);
}

.index-badge.unique {
  background: var(--color-info-100);
  color: var(--color-info-700);
}

.index-columns {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-1);
}

.index-column {
  padding: 0.125rem 0.5rem;
  background: white;
  border: 1px solid var(--color-gray-200);
  border-radius: var(--radius-sm);
  font-size: var(--text-xs);
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

.btn-primary:hover {
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
