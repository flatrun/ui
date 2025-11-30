<template>
  <div class="database-manager">
    <div class="manager-header">
      <div class="header-left">
        <button class="btn btn-secondary" @click="goBack">
          <ArrowLeft :size="16" />
          Back
        </button>
        <div class="server-info">
          <component :is="Database" :size="24" />
          <div class="server-details">
            <h1>{{ connection?.name || "Database Server" }}</h1>
            <code>{{ connection?.host }}:{{ connection?.port }}</code>
          </div>
        </div>
      </div>
      <div class="header-right">
        <span class="status-badge" :class="connectionStatus">
          {{ connectionStatus }}
        </span>
      </div>
    </div>

    <div v-if="loading" class="loading-state">
      <RefreshCw :size="32" class="spinning" />
      <p>Connecting to server...</p>
    </div>

    <div v-else-if="error" class="error-state">
      <AlertCircle :size="48" />
      <h3>Connection Failed</h3>
      <p>{{ error }}</p>
      <button class="btn btn-primary" @click="connect">
        <RefreshCw :size="16" />
        Retry
      </button>
    </div>

    <div v-else class="manager-content">
      <div class="sidebar">
        <div class="sidebar-section">
          <h4>Databases</h4>
          <div class="item-list">
            <div
              v-for="db in databases"
              :key="db.name"
              class="list-item"
              :class="{ active: selectedDatabase === db.name }"
              @click="selectDatabase(db.name)"
            >
              <Database :size="14" />
              {{ db.name }}
            </div>
            <div v-if="databases.length === 0" class="empty-list">No databases found</div>
          </div>
        </div>

        <div v-if="selectedDatabase && tables.length > 0" class="sidebar-section">
          <h4>Tables in {{ selectedDatabase }}</h4>
          <div class="item-list">
            <div
              v-for="table in tables"
              :key="table.name"
              class="list-item"
              :class="{ active: selectedTable === table.name }"
              @click="selectTable(table.name)"
            >
              <Table2 :size="14" />
              <span class="item-name">{{ table.name }}</span>
              <span v-if="table.rows !== undefined" class="item-count">{{ table.rows }}</span>
            </div>
          </div>
        </div>

        <div class="sidebar-section">
          <h4>Quick Actions</h4>
          <button class="sidebar-btn" @click="showCreateDb = true">
            <Plus :size="14" />
            New Database
          </button>
          <button class="sidebar-btn" @click="showCreateUser = true">
            <UserPlus :size="14" />
            New User
          </button>
        </div>

        <div class="sidebar-section">
          <h4>Users ({{ users.length }})</h4>
          <div class="item-list compact">
            <div v-for="user in users" :key="user.name + user.host" class="list-item small">
              <User :size="12" />
              <span>{{ user.name }}</span>
              <span v-if="user.host" class="user-host">@{{ user.host }}</span>
            </div>
          </div>
        </div>
      </div>

      <div class="main-content">
        <div v-if="!selectedDatabase" class="welcome-state">
          <Database :size="64" />
          <h2>Server Overview</h2>
          <div class="stats-grid">
            <div class="stat-card">
              <span class="stat-value">{{ databases.length }}</span>
              <span class="stat-label">Databases</span>
            </div>
            <div class="stat-card">
              <span class="stat-value">{{ users.length }}</span>
              <span class="stat-label">Users</span>
            </div>
          </div>
          <p class="help-text">Select a database from the sidebar to view its tables.</p>
        </div>

        <div v-else-if="!selectedTable" class="welcome-state">
          <Table2 :size="64" />
          <h2>{{ selectedDatabase }}</h2>
          <div class="stats-grid">
            <div class="stat-card">
              <span class="stat-value">{{ tables.length }}</span>
              <span class="stat-label">Tables</span>
            </div>
          </div>
          <p v-if="tables.length > 0" class="help-text">
            Select a table from the sidebar to view details.
          </p>
          <p v-else class="help-text">This database has no tables.</p>
        </div>

        <div v-else class="table-view">
          <div class="table-header">
            <h2>{{ selectedTable }}</h2>
            <div class="table-meta">
              <span v-if="selectedTableInfo?.rows !== undefined">
                {{ selectedTableInfo.rows }} rows
              </span>
              <span v-if="selectedTableInfo?.engine">
                {{ selectedTableInfo.engine }}
              </span>
            </div>
          </div>
          <div class="table-content">
            <p class="placeholder-text">Table browsing and SQL queries coming soon.</p>
          </div>
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
            <button
              class="btn btn-primary"
              :disabled="!newDbName || creatingDb"
              @click="createDatabase"
            >
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
              <input
                v-model="newUserForm.username"
                type="text"
                class="form-input"
                placeholder="new_user"
              />
            </div>
            <div class="form-group">
              <label>Password</label>
              <input
                v-model="newUserForm.password"
                type="password"
                class="form-input"
                placeholder="••••••••"
              />
            </div>
            <div
              v-if="connection?.type === 'mysql' || connection?.type === 'mariadb'"
              class="form-group"
            >
              <label>Host (optional)</label>
              <input
                v-model="newUserForm.host"
                type="text"
                class="form-input"
                placeholder="% (any host)"
              />
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

const showCreateDb = ref(false);
const showCreateUser = ref(false);
const creatingDb = ref(false);
const creatingUser = ref(false);
const newDbName = ref("");
const newUserForm = ref({
  username: "",
  password: "",
  host: "",
  grantDb: false,
  grantDatabase: "",
});

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

    const [dbsRes, usersRes] = await Promise.all([
      databasesApi.listDatabases(config),
      databasesApi.listUsers(config),
    ]);

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
  await loadTables(dbName);
};

const selectTable = (tableName: string) => {
  selectedTable.value = tableName;
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
  font-size: var(--text-xl);
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

.manager-content {
  flex: 1;
  display: flex;
  overflow: hidden;
}

.sidebar {
  width: 280px;
  background: white;
  border-right: 1px solid var(--color-gray-200);
  overflow-y: auto;
  padding: var(--space-4);
}

.sidebar-section {
  margin-bottom: var(--space-4);
}

.sidebar-section h4 {
  font-size: var(--text-xs);
  font-weight: var(--font-semibold);
  color: var(--color-gray-500);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin: 0 0 var(--space-2) 0;
}

.item-list {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.item-list.compact {
  max-height: 150px;
  overflow-y: auto;
}

.list-item {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-2);
  border-radius: var(--radius-sm);
  cursor: pointer;
  font-size: var(--text-sm);
  color: var(--color-gray-700);
}

.list-item:hover {
  background: var(--color-gray-100);
}

.list-item.active {
  background: var(--color-primary-50);
  color: var(--color-primary-700);
}

.list-item.small {
  padding: var(--space-1) var(--space-2);
  font-size: var(--text-xs);
}

.item-name {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.item-count {
  font-size: var(--text-xs);
  color: var(--color-gray-400);
  background: var(--color-gray-100);
  padding: 0 0.25rem;
  border-radius: var(--radius-sm);
}

.user-host {
  color: var(--color-gray-400);
}

.empty-list {
  font-size: var(--text-sm);
  color: var(--color-gray-400);
  padding: var(--space-2);
  text-align: center;
}

.sidebar-btn {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  width: 100%;
  padding: var(--space-2);
  border: none;
  background: var(--color-gray-100);
  border-radius: var(--radius-sm);
  cursor: pointer;
  font-size: var(--text-sm);
  color: var(--color-gray-700);
  margin-bottom: var(--space-2);
}

.sidebar-btn:hover {
  background: var(--color-gray-200);
}

.main-content {
  flex: 1;
  overflow-y: auto;
  padding: var(--space-6);
}

.welcome-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  text-align: center;
  color: var(--color-gray-400);
}

.welcome-state h2 {
  margin: var(--space-4) 0 var(--space-2) 0;
  color: var(--color-gray-900);
}

.stats-grid {
  display: flex;
  gap: var(--space-4);
  margin: var(--space-4) 0;
}

.stat-card {
  background: white;
  padding: var(--space-4) var(--space-6);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-sm);
  text-align: center;
  min-width: 120px;
}

.stat-value {
  display: block;
  font-size: var(--text-3xl);
  font-weight: var(--font-bold);
  color: var(--color-gray-900);
}

.stat-label {
  font-size: var(--text-sm);
  color: var(--color-gray-500);
}

.help-text {
  color: var(--color-gray-500);
  font-size: var(--text-sm);
}

.table-view {
  background: white;
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-sm);
  overflow: hidden;
}

.table-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--space-4);
  border-bottom: 1px solid var(--color-gray-200);
}

.table-header h2 {
  margin: 0;
  font-family: var(--font-mono);
  font-size: var(--text-lg);
}

.table-meta {
  display: flex;
  gap: var(--space-3);
  font-size: var(--text-sm);
  color: var(--color-gray-500);
}

.table-content {
  padding: var(--space-8);
}

.placeholder-text {
  color: var(--color-gray-400);
  text-align: center;
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
</style>
