<template>
  <div class="database-manager">
    <!-- Server Header (when no database selected) -->
    <div v-if="!selectedDatabase" class="manager-header">
      <div class="header-left">
        <button class="btn btn-secondary" @click="goBack">
          <ArrowLeft :size="16" />
          Back
        </button>
        <div class="server-info">
          <Database :size="24" />
          <div class="server-details">
            <h1>{{ connection?.name || "Database Server" }}</h1>
            <code>{{ connection?.host }}:{{ connection?.port }}</code>
          </div>
        </div>
      </div>
      <div class="header-right">
        <button class="btn btn-secondary btn-sm" @click="refreshServerData" :disabled="refreshing">
          <RefreshCw :size="14" :class="{ spinning: refreshing }" />
        </button>
        <span class="status-badge" :class="connectionStatus">
          {{ connectionStatus }}
        </span>
      </div>
    </div>

    <!-- Database Context Header (when database selected) -->
    <div v-else class="manager-header db-context">
      <div class="header-left">
        <button class="btn btn-secondary" @click="clearDatabaseSelection">
          <ArrowLeft :size="16" />
          All Databases
        </button>
        <div class="db-info">
          <Database :size="24" class="db-icon" />
          <div class="db-details">
            <h1>{{ selectedDatabase }}</h1>
            <span class="db-meta"> {{ tables.length }} tables · {{ connection?.type }} </span>
          </div>
        </div>
      </div>
      <div class="header-right">
        <button class="btn btn-danger btn-sm" @click="confirmDeleteDatabase(selectedDatabase)">
          <Trash2 :size="14" />
          Drop Database
        </button>
      </div>
    </div>

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

    <!-- Server Overview (no database selected) -->
    <div v-else-if="!selectedDatabase" class="server-overview">
      <div class="overview-header">
        <h2>Databases</h2>
        <button class="btn btn-primary btn-sm" @click="showCreateDb = true">
          <Plus :size="14" />
          New Database
        </button>
      </div>

      <div class="databases-grid">
        <div v-for="db in databases" :key="db.name" class="database-card" @click="selectDatabase(db.name)">
          <div class="card-icon">
            <Database :size="24" />
          </div>
          <div class="card-content">
            <h3>{{ db.name }}</h3>
            <span class="card-meta">Click to explore</span>
          </div>
          <button class="card-action" title="Delete database" @click.stop="confirmDeleteDatabase(db.name)">
            <Trash2 :size="14" />
          </button>
        </div>
        <div v-if="databases.length === 0" class="empty-databases">
          <Database :size="48" />
          <p>No databases found</p>
          <button class="btn btn-primary" @click="showCreateDb = true">
            <Plus :size="14" />
            Create Database
          </button>
        </div>
      </div>

      <div class="users-section">
        <div class="section-header">
          <h2>Users</h2>
          <button class="btn btn-secondary btn-sm" @click="showCreateUser = true">
            <UserPlus :size="14" />
            New User
          </button>
        </div>
        <div v-if="users.length > 0" class="users-grid">
          <div v-for="user in users" :key="user.name + user.host" class="user-card">
            <User :size="18" />
            <span class="user-name">{{ user.name }}</span>
            <span v-if="user.host" class="user-host">@{{ user.host }}</span>
            <button class="card-action" title="Delete user" @click.stop="confirmDeleteUser(user)">
              <Trash2 :size="12" />
            </button>
          </div>
        </div>
        <div v-else class="empty-users">
          <User :size="24" />
          <span>No users found</span>
        </div>
      </div>
    </div>

    <!-- Database Context (database selected) -->
    <div v-else class="database-context">
      <!-- Tabs -->
      <div class="context-tabs">
        <button class="tab-btn" :class="{ active: activeTab === 'tables' }" @click="activeTab = 'tables'">
          <Table2 :size="16" />
          Tables
          <span class="tab-count">{{ tables.length }}</span>
        </button>
        <button class="tab-btn" :class="{ active: activeTab === 'query' }" @click="activeTab = 'query'">
          <Code :size="16" />
          Query
        </button>
      </div>

      <!-- Tables Tab -->
      <div v-if="activeTab === 'tables'" class="tab-content">
        <div v-if="!selectedTable" class="tables-view">
          <div class="tables-grid">
            <div v-for="table in tables" :key="table.name" class="table-card" @click="selectTable(table.name)">
              <Table2 :size="20" />
              <div class="table-info">
                <h4>{{ table.name }}</h4>
                <span v-if="table.rows !== undefined" class="table-rows"> {{ table.rows }} rows </span>
                <span v-if="table.engine" class="table-engine">{{ table.engine }}</span>
              </div>
              <ChevronRight :size="16" class="table-arrow" />
            </div>
          </div>
          <div v-if="tables.length === 0" class="empty-tables">
            <Table2 :size="48" />
            <p>No tables in this database</p>
          </div>
        </div>

        <div v-else class="table-view">
          <div class="table-header">
            <div class="table-title">
              <button class="btn btn-ghost btn-sm" @click="clearTableSelection">
                <ArrowLeft :size="14" />
              </button>
              <h2>{{ selectedTable }}</h2>
            </div>
            <div class="table-actions">
              <button class="btn btn-secondary btn-sm" @click="refreshTableData">
                <RefreshCw :size="14" :class="{ spinning: loadingTableData }" />
                Refresh
              </button>
            </div>
          </div>

          <div v-if="queryError" class="query-error">
            <AlertCircle :size="16" />
            {{ queryError }}
          </div>

          <div v-if="loadingTableData" class="table-loading">
            <RefreshCw :size="24" class="spinning" />
            <span>Loading data...</span>
          </div>

          <div v-else-if="tableData" class="data-grid-container">
            <div class="data-grid">
              <table>
                <thead>
                  <tr>
                    <th v-for="col in tableData.columns" :key="col">{{ col }}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(row, idx) in tableData.rows" :key="idx">
                    <td v-for="(cell, cidx) in row" :key="cidx">
                      <span v-if="cell === null" class="null-value">NULL</span>
                      <span v-else>{{ formatCell(cell) }}</span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div class="data-footer">
              <span class="row-count">{{ tableData.count }} rows returned</span>
              <div class="pagination">
                <button class="btn btn-secondary btn-sm" :disabled="currentOffset === 0" @click="prevPage">
                  Previous
                </button>
                <span class="page-info">Offset: {{ currentOffset }}</span>
                <button class="btn btn-secondary btn-sm" :disabled="tableData.count < pageSize" @click="nextPage">
                  Next
                </button>
              </div>
            </div>
          </div>

          <div v-else class="empty-table">
            <Table2 :size="32" />
            <p>No data to display</p>
          </div>
        </div>
      </div>

      <!-- Query Tab -->
      <div v-else-if="activeTab === 'query'" class="tab-content query-tab">
        <div class="query-editor">
          <div class="editor-header">
            <h3>SQL Query</h3>
            <span class="query-hint">SELECT, SHOW, DESCRIBE, EXPLAIN only</span>
          </div>
          <textarea
            v-model="sqlQuery"
            class="query-input large"
            placeholder="SELECT * FROM table_name WHERE condition..."
            rows="6"
            @keydown="handleQueryKeydown"
          />
          <div class="query-toolbar">
            <button class="btn btn-primary" :disabled="!sqlQuery || executingQuery" @click="executeQuery">
              <Play :size="16" :class="{ spinning: executingQuery }" />
              Run
            </button>
            <button
              class="btn btn-secondary"
              @click="
                sqlQuery = '';
                queryResults = null;
                queryError = '';
              "
            >
              Clear
            </button>
            <span class="shortcut-hint">Ctrl+Enter to run</span>
          </div>
        </div>

        <div v-if="queryError" class="query-error-box">
          <AlertCircle :size="16" />
          <span>{{ queryError }}</span>
        </div>

        <div v-if="executingQuery" class="table-loading">
          <RefreshCw :size="24" class="spinning" />
          <span>Executing query...</span>
        </div>

        <div v-else-if="queryResults && queryResults.columns.length > 0" class="query-results">
          <div class="results-header">
            <h4>Results</h4>
            <span class="row-count">{{ queryResults.count }} rows</span>
          </div>
          <div class="data-grid">
            <table>
              <thead>
                <tr>
                  <th v-for="col in queryResults.columns" :key="col">{{ col }}</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(row, idx) in queryResults.rows" :key="idx">
                  <td v-for="(cell, cidx) in row" :key="cidx">
                    <span v-if="cell === null" class="null-value">NULL</span>
                    <span v-else>{{ formatCell(cell) }}</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div v-else-if="!executingQuery && !queryError" class="query-placeholder">
          <Code :size="48" />
          <p>Write a query and press Ctrl+Enter to see results</p>
        </div>
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
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useNotificationsStore } from "@/stores/notifications";
import { databasesApi, type DatabaseConnectionConfig } from "@/services/api";
import {
  Database,
  Table2,
  User,
  UserPlus,
  Plus,
  ArrowLeft,
  RefreshCw,
  AlertCircle,
  X,
  Trash2,
  Code,
  Play,
  ChevronRight,
} from "lucide-vue-next";

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

const connection = ref<DatabaseConnection | null>(null);
const loading = ref(true);
const error = ref("");
const connectionStatus = ref<"connected" | "disconnected" | "error">("disconnected");

const databases = ref<{ name: string }[]>([]);
const tables = ref<TableInfo[]>([]);
const users = ref<{ name: string; host?: string }[]>([]);

const selectedDatabase = ref("");
const selectedTable = ref("");
const activeTab = ref<"tables" | "query">("tables");
const refreshing = ref(false);

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

// Table data state
const tableData = ref<{ columns: string[]; rows: any[][]; count: number } | null>(null);
const loadingTableData = ref(false);
const currentOffset = ref(0);
const pageSize = 100;

// Query tab state
const sqlQuery = ref("");
const queryResults = ref<{ columns: string[]; rows: any[][]; count: number } | null>(null);
const executingQuery = ref(false);
const queryError = ref("");

const selectedTableInfo = computed(() => {
  return tables.value.find((t) => t.name === selectedTable.value);
});

const getConnectionConfig = (): DatabaseConnectionConfig | null => {
  if (!connection.value) return null;
  return {
    type: connection.value.type,
    host: connection.value.host,
    port: connection.value.port,
    username: connection.value.username,
    password: connection.value.password || "",
    database: connection.value.database,
    container: connection.value.container,
  };
};

const loadConnection = () => {
  const id = route.params.id as string;
  const stored = localStorage.getItem("db_connections");
  if (stored) {
    const connections = JSON.parse(stored) as DatabaseConnection[];
    connection.value = connections.find((c) => c.id === id) || null;
  }
};

const connect = async () => {
  if (!connection.value) {
    error.value = "Connection not found";
    loading.value = false;
    return;
  }

  loading.value = true;
  error.value = "";

  try {
    const config = getConnectionConfig();
    if (!config) throw new Error("Invalid connection");

    const [dbsRes, usersRes] = await Promise.all([databasesApi.listDatabases(config), databasesApi.listUsers(config)]);

    databases.value = dbsRes.data.databases || [];
    users.value = usersRes.data.users || [];
    connectionStatus.value = "connected";

    if (connection.value.database) {
      selectedDatabase.value = connection.value.database;
      await loadTables(connection.value.database);
    }

    updateConnectionStatus("connected");
  } catch (err: any) {
    error.value = err.response?.data?.error || err.message;
    connectionStatus.value = "error";
    updateConnectionStatus("error");
  } finally {
    loading.value = false;
  }
};

const refreshServerData = async () => {
  refreshing.value = true;
  try {
    const config = getConnectionConfig();
    if (!config) return;

    const [dbsRes, usersRes] = await Promise.all([databasesApi.listDatabases(config), databasesApi.listUsers(config)]);

    databases.value = dbsRes.data.databases || [];
    users.value = usersRes.data.users || [];
  } catch (err: any) {
    notifications.error("Refresh Failed", err.response?.data?.error || err.message);
  } finally {
    refreshing.value = false;
  }
};

const updateConnectionStatus = (status: "connected" | "disconnected" | "error") => {
  const stored = localStorage.getItem("db_connections");
  if (stored && connection.value) {
    const connections = JSON.parse(stored) as DatabaseConnection[];
    const idx = connections.findIndex((c) => c.id === connection.value!.id);
    if (idx !== -1) {
      connections[idx].status = status;
      localStorage.setItem("db_connections", JSON.stringify(connections));
    }
  }
};

const loadTables = async (dbName: string) => {
  const config = getConnectionConfig();
  if (!config) return;

  try {
    const res = await databasesApi.listTables(config, dbName);
    tables.value = res.data.tables || [];
  } catch {
    tables.value = [];
  }
};

const selectDatabase = async (dbName: string) => {
  selectedDatabase.value = dbName;
  selectedTable.value = "";
  activeTab.value = "tables";
  tableData.value = null;
  queryError.value = "";
  await loadTables(dbName);
};

const clearDatabaseSelection = () => {
  selectedDatabase.value = "";
  selectedTable.value = "";
  tables.value = [];
  tableData.value = null;
  queryResults.value = null;
  queryError.value = "";
  sqlQuery.value = "";
  activeTab.value = "tables";
};

const clearTableSelection = () => {
  selectedTable.value = "";
  tableData.value = null;
  queryError.value = "";
};

const selectTable = async (tableName: string) => {
  selectedTable.value = tableName;
  currentOffset.value = 0;
  queryError.value = "";
  await loadTableData();
};

const loadTableData = async () => {
  if (!selectedDatabase.value || !selectedTable.value) return;

  loadingTableData.value = true;
  queryError.value = "";

  try {
    const config = getConnectionConfig();
    if (!config) throw new Error("Not connected");

    const res = await databasesApi.queryTableData(
      config,
      selectedDatabase.value,
      selectedTable.value,
      pageSize,
      currentOffset.value,
    );
    tableData.value = res.data;
  } catch (err: any) {
    queryError.value = err.response?.data?.error || err.message;
    tableData.value = null;
  } finally {
    loadingTableData.value = false;
  }
};

const refreshTableData = () => {
  loadTableData();
};

const executeQuery = async () => {
  if (!sqlQuery.value || !selectedDatabase.value) return;

  executingQuery.value = true;
  queryError.value = "";
  queryResults.value = null;

  try {
    const config = getConnectionConfig();
    if (!config) throw new Error("Not connected");

    const res = await databasesApi.executeQuery(config, selectedDatabase.value, sqlQuery.value);
    queryResults.value = res.data;
  } catch (err: any) {
    queryError.value = err.response?.data?.error || err.message;
  } finally {
    executingQuery.value = false;
  }
};

const handleQueryKeydown = (event: KeyboardEvent) => {
  if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
    event.preventDefault();
    executeQuery();
  }
};

const prevPage = () => {
  if (currentOffset.value >= pageSize) {
    currentOffset.value -= pageSize;
    loadTableData();
  }
};

const nextPage = () => {
  currentOffset.value += pageSize;
  loadTableData();
};

const formatCell = (value: any): string => {
  if (value === null || value === undefined) return "";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
};

const createDatabase = async () => {
  if (!newDbName.value) return;

  creatingDb.value = true;
  try {
    const config = getConnectionConfig();
    if (!config) throw new Error("Not connected");

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
};

const createUser = async () => {
  if (!newUserForm.value.username || !newUserForm.value.password) return;

  creatingUser.value = true;
  try {
    const config = getConnectionConfig();
    if (!config) throw new Error("Not connected");

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
};

const confirmDeleteDatabase = (dbName: string) => {
  deleteDbName.value = dbName;
  showDeleteDb.value = true;
};

const confirmDeleteUser = (user: { name: string; host?: string }) => {
  deleteUserInfo.value = user;
  showDeleteUser.value = true;
};

const deleteDatabase = async () => {
  if (!deleteDbName.value) return;

  deletingDb.value = true;
  try {
    const config = getConnectionConfig();
    if (!config) throw new Error("Not connected");

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
};

const deleteUser = async () => {
  if (!deleteUserInfo.value) return;

  deletingUser.value = true;
  try {
    const config = getConnectionConfig();
    if (!config) throw new Error("Not connected");

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
};

const goBack = () => {
  router.push({ name: "databases" });
};

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

.manager-header {
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
  gap: var(--space-4);
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

.status-badge {
  font-size: var(--text-xs);
  font-weight: var(--font-semibold);
  text-transform: capitalize;
  padding: 0.25rem 0.75rem;
  border-radius: var(--radius-full);
}

.status-badge.connected {
  background: var(--color-success-50);
  color: var(--color-success-700);
}

.status-badge.disconnected {
  background: var(--color-gray-100);
  color: var(--color-gray-600);
}

.status-badge.error {
  background: var(--color-danger-50);
  color: var(--color-danger-700);
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

.user-host {
  color: var(--color-gray-400);
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

.item-action {
  opacity: 0;
  background: none;
  border: none;
  color: var(--color-gray-400);
  cursor: pointer;
  padding: var(--space-1);
  border-radius: var(--radius-sm);
  margin-left: auto;
  flex-shrink: 0;
}

.list-item:hover .item-action {
  opacity: 1;
}

.item-action:hover {
  color: var(--color-danger-500);
  background: var(--color-danger-50);
}

.modal-sm {
  width: 360px;
}

.modal-header.danger {
  background: var(--color-danger-50);
}

.modal-header.danger h3 {
  color: var(--color-danger-700);
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

.btn.active {
  background: var(--color-primary-100);
  border-color: var(--color-primary-300);
  color: var(--color-primary-700);
}

.table-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--space-4);
  border-bottom: 1px solid var(--color-gray-200);
  background: white;
  border-radius: var(--radius-lg) var(--radius-lg) 0 0;
}

.table-header h2 {
  margin: 0;
  font-family: var(--font-mono);
  font-size: var(--text-lg);
}

.table-actions {
  display: flex;
  gap: var(--space-2);
}

.query-panel {
  padding: var(--space-4);
  background: var(--color-gray-50);
  border-bottom: 1px solid var(--color-gray-200);
}

.query-input {
  width: 100%;
  font-family: var(--font-mono);
  font-size: var(--text-sm);
  padding: var(--space-3);
  border: 1px solid var(--color-gray-200);
  border-radius: var(--radius-md);
  resize: vertical;
  min-height: 60px;
}

.query-input:focus {
  outline: none;
  border-color: var(--color-primary-500);
  box-shadow: 0 0 0 3px var(--color-primary-100);
}

.query-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: var(--space-2);
}

.query-hint {
  font-size: var(--text-xs);
  color: var(--color-gray-500);
}

.query-error {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-3) var(--space-4);
  background: var(--color-danger-50);
  color: var(--color-danger-700);
  font-size: var(--text-sm);
  border-bottom: 1px solid var(--color-danger-200);
}

.table-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  padding: var(--space-8);
  color: var(--color-gray-500);
}

.data-grid-container {
  display: flex;
  flex-direction: column;
  background: white;
  border-radius: 0 0 var(--radius-lg) var(--radius-lg);
  overflow: hidden;
}

.data-grid {
  overflow: auto;
  max-height: 500px;
}

.data-grid table {
  width: 100%;
  border-collapse: collapse;
  font-size: var(--text-sm);
}

.data-grid th,
.data-grid td {
  padding: var(--space-2) var(--space-3);
  text-align: left;
  border-bottom: 1px solid var(--color-gray-100);
  white-space: nowrap;
  max-width: 300px;
  overflow: hidden;
  text-overflow: ellipsis;
}

.data-grid th {
  background: var(--color-gray-50);
  font-weight: var(--font-semibold);
  color: var(--color-gray-700);
  position: sticky;
  top: 0;
  z-index: 1;
}

.data-grid tr:hover {
  background: var(--color-gray-50);
}

.null-value {
  color: var(--color-gray-400);
  font-style: italic;
}

.data-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--space-3) var(--space-4);
  border-top: 1px solid var(--color-gray-200);
  background: var(--color-gray-50);
}

.row-count {
  font-size: var(--text-sm);
  color: var(--color-gray-600);
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

.empty-table {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--space-8);
  color: var(--color-gray-400);
  background: white;
  border-radius: 0 0 var(--radius-lg) var(--radius-lg);
}

.empty-table p {
  margin: var(--space-2) 0 0;
}

.table-view {
  background: white;
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-sm);
  overflow: hidden;
}

/* New Layout Styles */
.server-overview {
  flex: 1;
  padding: var(--space-6);
  overflow-y: auto;
}

.overview-header,
.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--space-4);
}

.overview-header h2,
.section-header h2 {
  margin: 0;
  font-size: var(--text-base);
  font-weight: var(--font-semibold);
  color: var(--color-gray-700);
}

.databases-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: var(--space-4);
  margin-bottom: var(--space-8);
}

.database-card {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-4);
  background: white;
  border: 1px solid var(--color-gray-200);
  border-radius: var(--radius-lg);
  cursor: pointer;
  transition: all var(--transition-base);
}

.database-card:hover {
  border-color: var(--color-primary-300);
  box-shadow: var(--shadow-md);
}

.card-icon {
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, var(--color-primary-100), var(--color-primary-50));
  color: var(--color-primary-600);
  border-radius: var(--radius-lg);
}

.card-content {
  flex: 1;
  min-width: 0;
}

.card-content h3 {
  margin: 0;
  font-size: var(--text-base);
  font-weight: var(--font-semibold);
  font-family: var(--font-mono);
}

.card-meta {
  font-size: var(--text-sm);
  color: var(--color-gray-500);
}

.card-action {
  opacity: 0;
  background: none;
  border: none;
  color: var(--color-gray-400);
  cursor: pointer;
  padding: var(--space-2);
  border-radius: var(--radius-md);
}

.database-card:hover .card-action,
.user-card:hover .card-action {
  opacity: 1;
}

.card-action:hover {
  color: var(--color-danger-500);
  background: var(--color-danger-50);
}

.empty-databases {
  grid-column: 1 / -1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--space-12);
  color: var(--color-gray-400);
  background: var(--color-gray-50);
  border-radius: var(--radius-lg);
  border: 2px dashed var(--color-gray-200);
}

.empty-databases p {
  margin: var(--space-3) 0;
}

.users-section {
  border-top: 1px solid var(--color-gray-200);
  padding-top: var(--space-6);
}

.users-grid {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
}

.user-card {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-3);
  background: var(--color-gray-50);
  border: 1px solid var(--color-gray-200);
  border-radius: var(--radius-md);
  font-size: var(--text-sm);
}

.user-name {
  font-weight: var(--font-medium);
}

.empty-users {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-4);
  color: var(--color-gray-400);
  background: var(--color-gray-50);
  border: 1px dashed var(--color-gray-200);
  border-radius: var(--radius-md);
}

.header-right {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.db-context {
  background: var(--color-gray-50);
  border-bottom: 2px solid var(--color-primary-200);
}

.db-context .btn-secondary {
  background: white;
}

.db-info {
  display: flex;
  align-items: center;
  gap: var(--space-3);
}

.db-icon {
  color: var(--color-primary-500);
}

.db-details h1 {
  font-family: var(--font-mono);
  font-size: var(--text-lg);
  color: var(--color-gray-900);
  margin: 0;
}

.db-meta {
  font-size: var(--text-sm);
  color: var(--color-gray-500);
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

.tab-content {
  flex: 1;
  overflow-y: auto;
  padding: var(--space-6);
  background: var(--color-gray-50);
}

.tables-view {
  display: flex;
  flex-direction: column;
}

.tables-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: var(--space-3);
}

.table-card {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-4);
  background: white;
  border: 1px solid var(--color-gray-200);
  border-radius: var(--radius-lg);
  cursor: pointer;
  transition: all var(--transition-base);
}

.table-card:hover {
  border-color: var(--color-primary-300);
  box-shadow: var(--shadow-sm);
}

.table-card svg:first-child {
  color: var(--color-gray-400);
  flex-shrink: 0;
}

.table-info {
  flex: 1;
  min-width: 0;
}

.table-info h4 {
  margin: 0;
  font-family: var(--font-mono);
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
}

.table-rows,
.table-engine {
  font-size: var(--text-xs);
  color: var(--color-gray-500);
  margin-right: var(--space-2);
}

.table-arrow {
  color: var(--color-gray-300);
  flex-shrink: 0;
}

.empty-tables {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--space-12);
  color: var(--color-gray-400);
}

.table-title {
  display: flex;
  align-items: center;
  gap: var(--space-2);
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

.query-tab {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.query-editor {
  background: white;
  border-radius: var(--radius-lg);
  padding: var(--space-4);
  box-shadow: var(--shadow-sm);
}

.editor-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--space-3);
}

.editor-header h3 {
  margin: 0;
  font-size: var(--text-base);
  font-weight: var(--font-semibold);
}

.query-input.large {
  min-height: 120px;
}

.query-toolbar {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  margin-top: var(--space-3);
}

.shortcut-hint {
  margin-left: auto;
  font-size: var(--text-xs);
  color: var(--color-gray-400);
}

.query-error-box {
  display: flex;
  align-items: flex-start;
  gap: var(--space-2);
  padding: var(--space-3) var(--space-4);
  background: var(--color-danger-50);
  color: var(--color-danger-700);
  font-size: var(--text-sm);
  border-radius: var(--radius-lg);
  border: 1px solid var(--color-danger-200);
}

.query-error-box svg {
  flex-shrink: 0;
  margin-top: 2px;
}

.query-results {
  background: white;
  border-radius: var(--radius-lg);
  overflow: hidden;
  box-shadow: var(--shadow-sm);
}

.results-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--space-3) var(--space-4);
  background: var(--color-gray-50);
  border-bottom: 1px solid var(--color-gray-200);
}

.results-header h4 {
  margin: 0;
  font-size: var(--text-sm);
  font-weight: var(--font-semibold);
}

.query-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--space-12);
  color: var(--color-gray-400);
  background: white;
  border-radius: var(--radius-lg);
}

.query-placeholder p {
  margin: var(--space-3) 0 0;
}
</style>
