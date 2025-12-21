<template>
  <div class="database-manager">
    <DatabaseHeader
      :connection="connection"
      :selected-database="selectedDatabase"
      :table-count="tables.length"
      :connection-status="connectionStatus"
      :latency="connectionLatency"
      :refreshing="refreshing"
      @back="goBack"
      @refresh="refreshServerData"
      @delete-database="confirmDeleteDatabase"
    />

    <div v-if="loading" class="loading-state">
      <RefreshCw :size="32" class="spinning" />
      <p>Connecting to server...</p>
    </div>

    <div v-else-if="error && !selectedDatabase" class="error-state">
      <AlertCircle :size="48" />
      <h3>Connection Failed</h3>
      <p>{{ error }}</p>
      <button class="btn btn-primary" @click="connect">
        <RefreshCw :size="16" />
        Retry
      </button>
    </div>

    <ServerOverview
      v-else-if="!selectedDatabase"
      :databases="databases"
      :users="users"
      :server-info="serverInfo"
      @create-database="showCreateDb = true"
      @create-user="showCreateUser = true"
      @open-database="selectDatabase"
      @export-database="handleExportDatabase"
      @delete-database="confirmDeleteDatabase"
      @edit-user="handleEditUser"
      @delete-user="confirmDeleteUser"
    />

    <div v-else class="database-context">
      <div class="context-tabs">
        <button
          v-for="tab in tabs"
          :key="tab.id"
          class="tab-btn"
          :class="{ active: activeTab === tab.id }"
          @click="activeTab = tab.id"
        >
          <component :is="tab.icon" :size="16" />
          {{ tab.label }}
          <span v-if="tab.count !== null" class="tab-count">{{ tab.count }}</span>
          <span v-if="tab.badge" class="tab-badge">{{ tab.badge }}</span>
        </button>
      </div>

      <div class="tab-content">
        <template v-if="activeTab === 'tables'">
          <TableList
            v-if="!selectedTable"
            :tables="tables"
            :selected-table="selectedTable"
            :loading="loadingTables"
            @select="selectTable"
            @view-schema="viewTableSchema"
            @export="handleExportTable"
          />
          <TableDataGrid
            v-else
            :table-name="selectedTable"
            :data="tableData"
            :loading="loadingTableData"
            :error="tableError"
            :offset="currentOffset"
            :page-size="pageSize"
            :execution-time="queryExecutionTime"
            @back="clearTableSelection"
            @refresh="loadTableData"
            @export="handleExportTable(selectedTable)"
            @prev-page="prevPage"
            @next-page="nextPage"
          />
        </template>

        <TableSchemaView
          v-else-if="activeTab === 'schema'"
          :connection="getConnectionConfig()"
          :database="selectedDatabase"
          :table-name="schemaTable || (tables[0]?.name ?? '')"
        />

        <div v-else-if="activeTab === 'query'" class="query-panel">
          <SqlEditor
            v-model="sqlQuery"
            :db-type="connection?.type"
            :tables="tables.map((t) => t.name)"
            :disabled="executingQuery"
            @execute="executeQuery"
          />
          <QueryResults
            :results="queryResults"
            :loading="executingQuery"
            :error="queryError"
            :execution-time="queryExecutionTime"
          />
        </div>

        <QueryHistory
          v-else-if="activeTab === 'history'"
          :connection-id="connection?.id || ''"
          @load-query="loadQueryFromHistory"
        />

        <BackupRestorePanel v-else-if="activeTab === 'backup'" :database="selectedDatabase" />
      </div>
    </div>

    <Teleport to="body">
      <div v-if="showCreateDb" class="modal-overlay" @click.self="showCreateDb = false">
        <div class="modal-container">
          <div class="modal-header">
            <h3>
              <Database :size="20" />
              Create Database
            </h3>
            <button class="close-btn" @click="showCreateDb = false">
              <X :size="18" />
            </button>
          </div>
          <div class="modal-body">
            <div class="form-group">
              <label>Database Name</label>
              <input
                v-model="newDbName"
                type="text"
                class="form-input"
                placeholder="my_new_database"
                @keyup.enter="createDatabase"
              />
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" @click="showCreateDb = false">Cancel</button>
            <button class="btn btn-primary" :disabled="!newDbName || creatingDb" @click="createDatabase">
              <Plus :size="14" :class="{ spinning: creatingDb }" />
              Create
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <Teleport to="body">
      <div v-if="showCreateUser" class="modal-overlay" @click.self="showCreateUser = false">
        <div class="modal-container">
          <div class="modal-header">
            <h3>
              <UserPlus :size="20" />
              Create User
            </h3>
            <button class="close-btn" @click="showCreateUser = false">
              <X :size="18" />
            </button>
          </div>
          <div class="modal-body">
            <div class="form-group">
              <label>Username</label>
              <input v-model="newUserForm.username" type="text" class="form-input" placeholder="new_user" />
            </div>
            <div class="form-group">
              <label>Password</label>
              <input v-model="newUserForm.password" type="password" class="form-input" placeholder="••••••••" />
            </div>
            <div v-if="connection?.type === 'mysql' || connection?.type === 'mariadb'" class="form-group">
              <label>Host (optional)</label>
              <input v-model="newUserForm.host" type="text" class="form-input" placeholder="% (any host)" />
            </div>
            <div class="form-group">
              <label class="checkbox-label">
                <input v-model="newUserForm.grantDb" type="checkbox" />
                <span>Grant privileges on a database</span>
              </label>
            </div>
            <div v-if="newUserForm.grantDb" class="form-group">
              <label>Database</label>
              <select v-model="newUserForm.grantDatabase" class="form-select">
                <option value="">Select database...</option>
                <option v-for="db in databases" :key="db.name" :value="db.name">
                  {{ db.name }}
                </option>
              </select>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" @click="showCreateUser = false">Cancel</button>
            <button
              class="btn btn-primary"
              :disabled="!newUserForm.username || !newUserForm.password || creatingUser"
              @click="createUser"
            >
              <UserPlus :size="14" :class="{ spinning: creatingUser }" />
              Create
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <Teleport to="body">
      <div v-if="showDeleteDb" class="modal-overlay" @click.self="showDeleteDb = false">
        <div class="modal-container modal-sm">
          <div class="modal-header danger">
            <h3>
              <Trash2 :size="20" />
              Delete Database
            </h3>
            <button class="close-btn" @click="showDeleteDb = false">
              <X :size="18" />
            </button>
          </div>
          <div class="modal-body">
            <p class="confirm-text">
              Are you sure you want to delete the database
              <strong>{{ deleteDbName }}</strong
              >?
            </p>
            <p class="warning-text">This action cannot be undone. All data will be lost.</p>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" @click="showDeleteDb = false">Cancel</button>
            <button class="btn btn-danger" :disabled="deletingDb" @click="deleteDatabase">
              <Trash2 :size="14" :class="{ spinning: deletingDb }" />
              Delete
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <Teleport to="body">
      <div v-if="showDeleteUser" class="modal-overlay" @click.self="showDeleteUser = false">
        <div class="modal-container modal-sm">
          <div class="modal-header danger">
            <h3>
              <Trash2 :size="20" />
              Delete User
            </h3>
            <button class="close-btn" @click="showDeleteUser = false">
              <X :size="18" />
            </button>
          </div>
          <div class="modal-body">
            <p class="confirm-text">
              Are you sure you want to delete the user
              <strong>{{ deleteUserInfo?.name }}{{ deleteUserInfo?.host ? `@${deleteUserInfo.host}` : "" }}</strong
              >?
            </p>
            <p class="warning-text">This action cannot be undone.</p>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" @click="showDeleteUser = false">Cancel</button>
            <button class="btn btn-danger" :disabled="deletingUser" @click="deleteUser">
              <Trash2 :size="14" :class="{ spinning: deletingUser }" />
              Delete
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <DataExportModal
      :visible="showExportModal"
      :table-name="exportTableName"
      :columns="exportColumns"
      :rows="exportRows"
      :row-count="exportRowCount"
      @close="showExportModal = false"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useNotificationsStore } from "@/stores/notifications";
import { useDatabaseStore } from "@/stores/database";
import { databasesApi, type DatabaseConnectionConfig } from "@/services/api";
import {
  Database,
  Table2,
  Code,
  History,
  HardDrive,
  Plus,
  UserPlus,
  RefreshCw,
  AlertCircle,
  X,
  Trash2,
  Columns,
} from "lucide-vue-next";

import DatabaseHeader from "@/components/database/DatabaseHeader.vue";
import ServerOverview from "@/components/database/ServerOverview.vue";
import TableList from "@/components/database/TableList.vue";
import TableDataGrid from "@/components/database/TableDataGrid.vue";
import TableSchemaView from "@/components/database/TableSchemaView.vue";
import SqlEditor from "@/components/database/SqlEditor.vue";
import QueryResults from "@/components/database/QueryResults.vue";
import QueryHistory from "@/components/database/QueryHistory.vue";
import BackupRestorePanel from "@/components/database/BackupRestorePanel.vue";
import DataExportModal from "@/components/database/DataExportModal.vue";

interface DatabaseConnection {
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

interface TableInfo {
  name: string;
  rows?: number;
  engine?: string;
}

const route = useRoute();
const router = useRouter();
const notifications = useNotificationsStore();
const databaseStore = useDatabaseStore();

const connection = ref<DatabaseConnection | null>(null);
const loading = ref(true);
const error = ref("");
const connectionStatus = ref<"connected" | "disconnected" | "error">("disconnected");
const connectionLatency = ref<number | null>(null);

const databases = ref<
  {
    name: string;
    size?: string;
    tables?: number;
    views?: number;
    routines?: number;
    triggers?: number;
    charset?: string;
    collation?: string;
  }[]
>([]);
const tables = ref<TableInfo[]>([]);
const users = ref<{ name: string; host?: string }[]>([]);
const serverInfo = ref<{ version?: string; uptime?: string }>({});

const selectedDatabase = ref("");
const selectedTable = ref("");
const schemaTable = ref("");
const activeTab = ref<"tables" | "schema" | "query" | "history" | "backup">("tables");
const refreshing = ref(false);
const loadingTables = ref(false);

const showCreateDb = ref(false);
const showCreateUser = ref(false);
const showDeleteDb = ref(false);
const showDeleteUser = ref(false);
const creatingDb = ref(false);
const creatingUser = ref(false);
const deletingDb = ref(false);
const deletingUser = ref(false);
const newDbName = ref("");
const deleteDbName = ref("");
const deleteUserInfo = ref<{ name: string; host?: string } | null>(null);
const newUserForm = ref({
  username: "",
  password: "",
  host: "",
  grantDb: false,
  grantDatabase: "",
});

const tableData = ref<{ columns: string[]; rows: any[][]; count: number } | null>(null);
const loadingTableData = ref(false);
const tableError = ref("");
const currentOffset = ref(0);
const pageSize = 100;

const sqlQuery = ref("");
const queryResults = ref<{ columns: string[]; rows: any[][]; count: number } | null>(null);
const executingQuery = ref(false);
const queryError = ref("");
const queryExecutionTime = ref<number | undefined>(undefined);

const showExportModal = ref(false);
const exportTableName = ref("");
const exportColumns = ref<string[]>([]);
const exportRows = ref<any[][]>([]);
const exportRowCount = ref<number | undefined>(undefined);

const tabs = computed(() => [
  { id: "tables" as const, label: "Tables", icon: Table2, count: tables.value.length, badge: null },
  { id: "schema" as const, label: "Schema", icon: Columns, count: null, badge: null },
  { id: "query" as const, label: "Query", icon: Code, count: null, badge: null },
  { id: "history" as const, label: "History", icon: History, count: null, badge: null },
  { id: "backup" as const, label: "Backup", icon: HardDrive, count: null, badge: "Soon" },
]);

function getConnectionConfig(): DatabaseConnectionConfig {
  if (!connection.value) throw new Error("Not connected");
  return {
    type: connection.value.type,
    host: connection.value.host,
    port: connection.value.port,
    username: connection.value.username,
    password: connection.value.password || "",
    database: connection.value.database,
    container: connection.value.container,
  };
}

function loadConnection() {
  const id = route.params.id as string;
  const stored = localStorage.getItem("db_connections");
  if (stored) {
    const connections = JSON.parse(stored) as DatabaseConnection[];
    connection.value = connections.find((c) => c.id === id) || null;
  }
}

async function connect() {
  if (!connection.value) {
    error.value = "Connection not found";
    loading.value = false;
    return;
  }

  loading.value = true;
  error.value = "";

  try {
    const config = getConnectionConfig();
    const startTime = Date.now();
    const [dbsRes, usersRes] = await Promise.all([databasesApi.listDatabases(config), databasesApi.listUsers(config)]);
    connectionLatency.value = Date.now() - startTime;

    databases.value = dbsRes.data.databases || [];
    users.value = usersRes.data.users || [];
    connectionStatus.value = "connected";

    fetchServerInfo(config);

    if (connection.value.database) {
      selectedDatabase.value = connection.value.database;
      await loadTables(connection.value.database);
    }

    updateConnectionStatus("connected");
    databaseStore.setConnectionState(connection.value.id, {
      status: "connected",
      latency: connectionLatency.value,
      lastPing: Date.now(),
    });
  } catch (err: any) {
    error.value = err.response?.data?.error || err.message;
    connectionStatus.value = "error";
    updateConnectionStatus("error");
  } finally {
    loading.value = false;
  }
}

async function refreshServerData() {
  refreshing.value = true;
  try {
    const config = getConnectionConfig();
    const [dbsRes, usersRes] = await Promise.all([databasesApi.listDatabases(config), databasesApi.listUsers(config)]);

    databases.value = dbsRes.data.databases || [];
    users.value = usersRes.data.users || [];
  } catch (err: any) {
    notifications.error("Refresh Failed", err.response?.data?.error || err.message);
  } finally {
    refreshing.value = false;
  }
}

function updateConnectionStatus(status: "connected" | "disconnected" | "error") {
  const stored = localStorage.getItem("db_connections");
  if (stored && connection.value) {
    const connections = JSON.parse(stored) as DatabaseConnection[];
    const idx = connections.findIndex((c) => c.id === connection.value!.id);
    if (idx !== -1) {
      connections[idx].status = status;
      localStorage.setItem("db_connections", JSON.stringify(connections));
    }
  }
}

async function fetchServerInfo(config: DatabaseConnectionConfig) {
  try {
    const versionQuery = config.type === "postgresql" ? "SELECT version()" : "SELECT VERSION() as version";
    const systemDb = config.type === "postgresql" ? "postgres" : "mysql";
    const res = await databasesApi.executeQuery(config, systemDb, versionQuery);
    if (res.data.rows?.[0]) {
      const version = res.data.rows[0][0];
      serverInfo.value = { version: String(version).split("-")[0] };
    }
  } catch {
    serverInfo.value = {};
  }
}

async function loadTables(dbName: string) {
  loadingTables.value = true;
  try {
    const config = getConnectionConfig();
    const res = await databasesApi.listTables(config, dbName);
    tables.value = res.data.tables || [];
  } catch {
    tables.value = [];
  } finally {
    loadingTables.value = false;
  }
}

async function selectDatabase(dbName: string) {
  selectedDatabase.value = dbName;
  selectedTable.value = "";
  activeTab.value = "tables";
  tableData.value = null;
  queryError.value = "";
  await loadTables(dbName);
}

function clearTableSelection() {
  selectedTable.value = "";
  tableData.value = null;
  tableError.value = "";
}

async function selectTable(tableName: string) {
  selectedTable.value = tableName;
  currentOffset.value = 0;
  tableError.value = "";
  await loadTableData();
}

function viewTableSchema(tableName: string) {
  schemaTable.value = tableName;
  activeTab.value = "schema";
}

async function loadTableData() {
  if (!selectedDatabase.value || !selectedTable.value) return;

  loadingTableData.value = true;
  tableError.value = "";

  try {
    const config = getConnectionConfig();
    const startTime = Date.now();
    const res = await databasesApi.queryTableData(
      config,
      selectedDatabase.value,
      selectedTable.value,
      pageSize,
      currentOffset.value,
    );
    queryExecutionTime.value = Date.now() - startTime;
    tableData.value = res.data;
  } catch (err: any) {
    tableError.value = err.response?.data?.error || err.message;
    tableData.value = null;
  } finally {
    loadingTableData.value = false;
  }
}

function prevPage() {
  if (currentOffset.value >= pageSize) {
    currentOffset.value -= pageSize;
    loadTableData();
  }
}

function nextPage() {
  currentOffset.value += pageSize;
  loadTableData();
}

async function executeQuery(query: string) {
  if (!query || !selectedDatabase.value) return;

  executingQuery.value = true;
  queryError.value = "";
  queryResults.value = null;

  try {
    const config = getConnectionConfig();
    const startTime = Date.now();
    const res = await databasesApi.executeQuery(config, selectedDatabase.value, query);
    queryExecutionTime.value = Date.now() - startTime;
    queryResults.value = res.data;

    if (connection.value) {
      databaseStore.addToHistory(connection.value.id, {
        query,
        database: selectedDatabase.value,
        rowCount: res.data.count,
        executionTime: queryExecutionTime.value,
        success: true,
      });
    }
  } catch (err: any) {
    queryError.value = err.response?.data?.error || err.message;
    if (connection.value) {
      databaseStore.addToHistory(connection.value.id, {
        query,
        database: selectedDatabase.value,
        success: false,
        error: queryError.value,
      });
    }
  } finally {
    executingQuery.value = false;
  }
}

function loadQueryFromHistory(query: string) {
  sqlQuery.value = query;
  activeTab.value = "query";
}

function handleExportDatabase(dbName: string) {
  notifications.info("Export", `Database export for ${dbName} - feature coming soon`);
}

function handleExportTable(tableName: string) {
  if (tableData.value) {
    exportTableName.value = tableName;
    exportColumns.value = tableData.value.columns;
    exportRows.value = tableData.value.rows;
    exportRowCount.value = tableData.value.count;
    showExportModal.value = true;
  }
}

function handleEditUser(user: { name: string; host?: string }) {
  notifications.info("Edit User", `Editing privileges for ${user.name} - feature coming soon`);
}

async function createDatabase() {
  if (!newDbName.value) return;

  creatingDb.value = true;
  try {
    const config = getConnectionConfig();
    await databasesApi.createDatabase(config, newDbName.value);
    notifications.success("Database Created", `Database '${newDbName.value}' created`);
    showCreateDb.value = false;
    newDbName.value = "";

    const res = await databasesApi.listDatabases(config);
    databases.value = res.data.databases || [];
  } catch (err: any) {
    notifications.error("Failed", err.response?.data?.error || err.message);
  } finally {
    creatingDb.value = false;
  }
}

async function createUser() {
  if (!newUserForm.value.username || !newUserForm.value.password) return;

  creatingUser.value = true;
  try {
    const config = getConnectionConfig();
    await databasesApi.createUser(
      config,
      newUserForm.value.username,
      newUserForm.value.password,
      newUserForm.value.host || undefined,
    );

    if (newUserForm.value.grantDb && newUserForm.value.grantDatabase) {
      await databasesApi.grantPrivileges(
        config,
        newUserForm.value.username,
        newUserForm.value.grantDatabase,
        newUserForm.value.host || undefined,
      );
    }

    notifications.success("User Created", `User '${newUserForm.value.username}' created`);
    showCreateUser.value = false;
    newUserForm.value = { username: "", password: "", host: "", grantDb: false, grantDatabase: "" };

    const res = await databasesApi.listUsers(config);
    users.value = res.data.users || [];
  } catch (err: any) {
    notifications.error("Failed", err.response?.data?.error || err.message);
  } finally {
    creatingUser.value = false;
  }
}

function confirmDeleteDatabase(dbName: string) {
  deleteDbName.value = dbName;
  showDeleteDb.value = true;
}

function confirmDeleteUser(user: { name: string; host?: string }) {
  deleteUserInfo.value = user;
  showDeleteUser.value = true;
}

async function deleteDatabase() {
  if (!deleteDbName.value) return;

  deletingDb.value = true;
  try {
    const config = getConnectionConfig();
    await databasesApi.deleteDatabase(config, deleteDbName.value);
    notifications.success("Database Deleted", `Database '${deleteDbName.value}' deleted`);
    showDeleteDb.value = false;

    if (selectedDatabase.value === deleteDbName.value) {
      selectedDatabase.value = "";
      selectedTable.value = "";
      tables.value = [];
    }
    deleteDbName.value = "";

    const res = await databasesApi.listDatabases(config);
    databases.value = res.data.databases || [];
  } catch (err: any) {
    notifications.error("Failed", err.response?.data?.error || err.message);
  } finally {
    deletingDb.value = false;
  }
}

async function deleteUser() {
  if (!deleteUserInfo.value) return;

  deletingUser.value = true;
  try {
    const config = getConnectionConfig();
    await databasesApi.deleteUser(config, deleteUserInfo.value.name, deleteUserInfo.value.host);
    notifications.success("User Deleted", `User '${deleteUserInfo.value.name}' deleted`);
    showDeleteUser.value = false;
    deleteUserInfo.value = null;

    const res = await databasesApi.listUsers(config);
    users.value = res.data.users || [];
  } catch (err: any) {
    notifications.error("Failed", err.response?.data?.error || err.message);
  } finally {
    deletingUser.value = false;
  }
}

function goBack() {
  if (selectedDatabase.value) {
    selectedDatabase.value = "";
    selectedTable.value = "";
    tables.value = [];
    tableData.value = null;
    queryResults.value = null;
    queryError.value = "";
    sqlQuery.value = "";
    activeTab.value = "tables";
  } else {
    router.push({ name: "databases" });
  }
}

onMounted(() => {
  loadConnection();
  connect();
});
</script>

<style scoped>
.database-manager {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--color-gray-50);
}

.loading-state,
.error-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--space-3);
  color: var(--color-gray-500);
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

.database-context {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.context-tabs {
  display: flex;
  gap: var(--space-1);
  padding: var(--space-3) var(--space-6);
  background: white;
  border-bottom: 1px solid var(--color-gray-200);
  overflow-x: auto;
}

.tab-btn {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-4);
  background: none;
  border: none;
  border-radius: var(--radius-md);
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  color: var(--color-gray-600);
  cursor: pointer;
  transition: all var(--transition-base);
  white-space: nowrap;
}

.tab-btn:hover {
  background: var(--color-gray-100);
}

.tab-btn.active {
  background: var(--color-primary-50);
  color: var(--color-primary-700);
}

.tab-count {
  background: var(--color-gray-200);
  padding: 0 var(--space-2);
  border-radius: var(--radius-full);
  font-size: var(--text-xs);
}

.tab-btn.active .tab-count {
  background: var(--color-primary-200);
}

.tab-badge {
  font-size: var(--text-xs);
  padding: 0.125rem 0.375rem;
  background: var(--color-info-100);
  color: var(--color-info-700);
  border-radius: var(--radius-sm);
}

.tab-content {
  flex: 1;
  overflow: hidden;
  padding: var(--space-6);
  display: flex;
  flex-direction: column;
}

.query-panel {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  flex: 1;
  overflow: hidden;
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

.btn-danger {
  background: var(--color-danger-500);
  color: white;
}

.btn-danger:hover:not(:disabled) {
  background: var(--color-danger-600);
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

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
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-xl);
  width: 400px;
  max-width: 90vw;
}

.modal-sm {
  width: 360px;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--space-4);
  border-bottom: 1px solid var(--color-gray-200);
}

.modal-header.danger {
  background: var(--color-danger-50);
}

.modal-header.danger h3 {
  color: var(--color-danger-700);
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
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: var(--space-2);
  padding: var(--space-4);
  border-top: 1px solid var(--color-gray-200);
}

.form-group {
  margin-bottom: var(--space-4);
}

.form-group:last-child {
  margin-bottom: 0;
}

.form-group label {
  display: block;
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  color: var(--color-gray-700);
  margin-bottom: var(--space-1);
}

.form-input,
.form-select {
  width: 100%;
  padding: var(--space-2) var(--space-3);
  border: 1px solid var(--color-gray-200);
  border-radius: var(--radius-md);
  font-size: var(--text-sm);
}

.form-input:focus,
.form-select:focus {
  outline: none;
  border-color: var(--color-primary-500);
  box-shadow: 0 0 0 3px var(--color-primary-100);
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  cursor: pointer;
}

.checkbox-label input {
  width: 16px;
  height: 16px;
}

.confirm-text {
  margin: 0 0 var(--space-2) 0;
  color: var(--color-gray-700);
}

.confirm-text strong {
  color: var(--color-gray-900);
  font-family: var(--font-mono);
}

.warning-text {
  margin: 0;
  font-size: var(--text-sm);
  color: var(--color-danger-600);
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
