<template>
  <div class="database-header" :class="{ 'db-context': !!selectedDatabase }">
    <div class="header-left">
      <button class="btn btn-secondary" @click="$emit('back')">
        <ArrowLeft :size="16" />
        {{ selectedDatabase ? "All Databases" : "Back" }}
      </button>
      <div class="server-info">
        <Database :size="24" :class="{ 'db-icon': !!selectedDatabase }" />
        <div class="server-details">
          <h1>{{ selectedDatabase || connection?.name || "Database Server" }}</h1>
          <template v-if="selectedDatabase">
            <span class="db-meta">{{ tableCount }} tables · {{ connection?.type }}</span>
          </template>
          <template v-else>
            <code>{{ connection?.host }}:{{ connection?.port }}</code>
          </template>
        </div>
      </div>
    </div>
    <div class="header-right">
      <button
        v-if="!selectedDatabase"
        class="btn btn-secondary btn-sm"
        :disabled="refreshing"
        @click="$emit('refresh')"
      >
        <RefreshCw :size="14" :class="{ spinning: refreshing }" />
      </button>
      <button v-if="selectedDatabase" class="btn btn-danger btn-sm" @click="$emit('delete-database', selectedDatabase)">
        <Trash2 :size="14" />
        Drop Database
      </button>
      <ConnectionStatus :status="connectionStatus" :latency="latency" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { Database, ArrowLeft, RefreshCw, Trash2 } from "lucide-vue-next";
import ConnectionStatus from "./ConnectionStatus.vue";

export interface DatabaseConnection {
  id: string;
  name: string;
  type: string;
  host: string;
  port: number;
  database: string;
  username: string;
  password?: string;
  status: "connected" | "disconnected" | "error";
  container?: string;
}

defineProps<{
  connection: DatabaseConnection | null;
  selectedDatabase: string;
  tableCount: number;
  connectionStatus: "connected" | "disconnected" | "error";
  latency?: number | null;
  refreshing: boolean;
}>();

defineEmits<{
  back: [];
  refresh: [];
  "delete-database": [dbName: string];
}>();
</script>

<style scoped>
.database-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--space-4);
  background: white;
  border-bottom: 1px solid var(--color-gray-200);
}

.database-header.db-context {
  background: var(--color-gray-50);
  border-bottom: 2px solid var(--color-primary-200);
}

.header-left {
  display: flex;
  align-items: center;
  gap: var(--space-4);
}

.header-right {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.server-info {
  display: flex;
  align-items: center;
  gap: var(--space-3);
}

.server-details h1 {
  margin: 0;
  font-size: var(--text-lg);
  font-weight: var(--font-semibold);
}

.server-details code {
  font-size: var(--text-sm);
  color: var(--color-gray-500);
}

.db-icon {
  color: var(--color-primary-500);
}

.db-meta {
  font-size: var(--text-sm);
  color: var(--color-gray-500);
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

.btn-danger {
  background: var(--color-danger-500);
  color: white;
}

.btn-danger:hover:not(:disabled) {
  background: var(--color-danger-600);
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
