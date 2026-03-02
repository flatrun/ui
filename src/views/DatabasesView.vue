<template>
  <div class="databases-view">
    <DataTable
      :items="connections"
      :columns="columns"
      :loading="loading"
      :searchable="true"
      :search-placeholder="t('databases.list.searchPlaceholder')"
      :search-fields="['name', 'type', 'host', 'database']"
      item-key="id"
      :empty-icon="Database"
      :empty-title="t('databases.list.emptyTitle')"
      :empty-text="t('databases.list.emptyText')"
      :loading-text="t('databases.list.loading')"
      :default-page-size="25"
    >
      <template #actions>
        <button class="btn btn-primary" @click="showAddModal = true">
          <Plus :size="16" />
          {{ t("databases.list.actions.addServer") }}
        </button>
        <button class="btn btn-secondary" :disabled="loading" @click="loadConnections">
          <RefreshCw :size="16" :class="{ spinning: loading }" />
          {{ t("databases.list.actions.refresh") }}
        </button>
      </template>

      <template #cell-type="{ item }">
        <div class="db-type">
          <component :is="getDbIcon(item.type)" :size="18" />
          <span class="db-type-name">{{ item.type }}</span>
        </div>
      </template>

      <template #cell-name="{ item }">
        <div class="connection-info">
          <span class="connection-name">{{ item.name }}</span>
          <span v-if="item.container" class="connection-source">
            <Box :size="12" />
            {{ item.container }}
          </span>
        </div>
      </template>

      <template #cell-host="{ item }">
        <code class="host-info">{{ item.host }}:{{ item.port }}</code>
      </template>

      <template #cell-status="{ item }">
        <ConnectionStatus :status="item.status" :latency="item.latency" />
      </template>

      <template #cell-actions="{ item }">
        <div class="action-buttons">
          <button
            class="action-btn connect"
            :title="t('databases.list.tooltips.openManager')"
            @click.stop="openConnection(item)"
          >
            <Link :size="14" />
          </button>
          <button
            class="action-btn test"
            :title="t('databases.list.tooltips.testConnection')"
            @click.stop="testConnection(item)"
          >
            <Zap :size="14" />
          </button>
          <button class="action-btn edit" :title="t('databases.list.tooltips.edit')" @click.stop="editConnection(item)">
            <Pencil :size="14" />
          </button>
          <button
            class="action-btn delete"
            :title="t('databases.list.tooltips.delete')"
            @click.stop="confirmDelete(item)"
          >
            <Trash2 :size="14" />
          </button>
        </div>
      </template>
    </DataTable>

    <Teleport to="body">
      <div v-if="showAddModal" class="modal-overlay" @click.self="showAddModal = false">
        <div class="modal-container">
          <div class="modal-header">
            <h3>
              <Database :size="20" />
              {{ editingConnection ? t("databases.list.modal.editTitle") : t("databases.list.modal.addTitle") }}
            </h3>
            <button class="close-btn" @click="closeModal">
              <X :size="18" />
            </button>
          </div>
          <div class="modal-body">
            <div class="form-group">
              <label>{{ t("databases.list.modal.fields.connectionName") }}</label>
              <input
                v-model="connectionForm.name"
                type="text"
                class="form-input"
                :placeholder="t('databases.list.modal.placeholders.connectionName')"
              />
            </div>

            <div class="form-group">
              <label>{{ t("databases.list.modal.fields.databaseType") }}</label>
              <select v-model="connectionForm.type" class="form-select">
                <option v-for="dbType in dbTypeOptions" :key="dbType.value" :value="dbType.value">
                  {{ dbType.label }}
                </option>
              </select>
            </div>

            <div class="form-row">
              <div class="form-group flex-grow">
                <label>{{ t("databases.list.modal.fields.host") }}</label>
                <input
                  v-model="connectionForm.host"
                  type="text"
                  class="form-input"
                  :placeholder="t('databases.list.modal.placeholders.host')"
                />
              </div>
              <div class="form-group port-field">
                <label>{{ t("databases.list.modal.fields.port") }}</label>
                <input
                  v-model.number="connectionForm.port"
                  type="number"
                  class="form-input"
                  :placeholder="getDefaultPort(connectionForm.type)"
                />
              </div>
            </div>

            <div class="form-group">
              <label>{{ t("databases.list.modal.fields.databaseName") }}</label>
              <input
                v-model="connectionForm.database"
                type="text"
                class="form-input"
                :placeholder="t('databases.list.modal.placeholders.databaseName')"
              />
            </div>

            <div class="form-row">
              <div class="form-group flex-grow">
                <label>{{ t("databases.list.modal.fields.username") }}</label>
                <input
                  v-model="connectionForm.username"
                  type="text"
                  class="form-input"
                  :placeholder="t('databases.list.modal.placeholders.username')"
                />
              </div>
              <div class="form-group flex-grow">
                <label>{{ t("databases.list.modal.fields.password") }}</label>
                <input
                  v-model="connectionForm.password"
                  type="password"
                  class="form-input"
                  :placeholder="t('databases.list.modal.placeholders.password')"
                />
              </div>
            </div>

            <div class="form-group">
              <label class="checkbox-label">
                <input v-model="connectionForm.fromContainer" type="checkbox" />
                <span>{{ t("databases.list.modal.fields.linkToContainer") }}</span>
              </label>
            </div>

            <div v-if="connectionForm.fromContainer" class="form-group">
              <label>{{ t("databases.list.modal.fields.selectContainer") }}</label>
              <select
                v-model="connectionForm.container"
                class="form-select"
                @change="onContainerSelect(connectionForm.container)"
              >
                <option value="">{{ t("databases.list.modal.placeholders.selectContainer") }}</option>
                <option v-for="container in dbContainers" :key="container.id" :value="container.name">
                  {{ container.name }} ({{ container.image }})
                </option>
              </select>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" @click="closeModal">{{ t("databases.common.cancel") }}</button>
            <button class="btn btn-secondary" :disabled="testing" @click="testFormConnection">
              <Zap :size="14" :class="{ spinning: testing }" />
              {{ t("databases.common.test") }}
            </button>
            <button class="btn btn-primary" :disabled="saving" @click="saveConnection">
              <Save :size="14" :class="{ spinning: saving }" />
              {{ editingConnection ? t("databases.common.update") : t("databases.common.save") }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <ConfirmModal
      :visible="showDeleteModal"
      :title="t('databases.list.confirmDelete.title')"
      :message="t('databases.list.confirmDelete.message', { name: connectionToDelete?.name || '' })"
      variant="danger"
      :confirm-text="t('databases.list.confirmDelete.confirm')"
      @confirm="deleteConnection"
      @cancel="showDeleteModal = false"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from "vue";
import { useI18n } from "vue-i18n";
import { useRouter } from "vue-router";
import { useNotificationsStore } from "@/stores/notifications";
import { containersApi, databasesApi, type DatabaseConnectionConfig } from "@/services/api";
import DataTable from "@/components/DataTable.vue";
import ConfirmModal from "@/components/ConfirmModal.vue";
import ConnectionStatus from "@/components/database/ConnectionStatus.vue";
import { Database, Plus, RefreshCw, Box, Link, Zap, Pencil, Trash2, X, Save } from "lucide-vue-next";

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
  latency?: number;
}

interface DbContainer {
  id: string;
  name: string;
  image: string;
}

const router = useRouter();
const notifications = useNotificationsStore();
const { t } = useI18n();
const connections = ref<DatabaseConnection[]>([]);
const loading = ref(false);
const saving = ref(false);
const testing = ref(false);

const showAddModal = ref(false);
const editingConnection = ref<DatabaseConnection | null>(null);
const showDeleteModal = ref(false);
const connectionToDelete = ref<DatabaseConnection | null>(null);

const getConnectionConfig = (conn: DatabaseConnection): DatabaseConnectionConfig => ({
  type: conn.type,
  host: conn.host,
  port: conn.port,
  username: conn.username,
  password: conn.password || "",
  database: conn.database,
  container: conn.container,
});

const dbContainers = ref<DbContainer[]>([]);

const connectionForm = ref({
  name: "",
  type: "mysql",
  host: "localhost",
  port: 3306,
  database: "",
  username: "",
  password: "",
  fromContainer: false,
  container: "",
});

const columns = computed(() => [
  { key: "type", label: t("databases.list.table.type"), width: "120px" },
  { key: "name", label: t("databases.list.table.server"), sortable: true },
  { key: "host", label: t("databases.list.table.host"), sortable: true },
  { key: "database", label: t("databases.list.table.database"), sortable: true },
  { key: "status", label: t("databases.list.table.status"), width: "120px" },
  { key: "actions", label: t("databases.list.table.actions"), width: "160px" },
]);

const dbTypeOptions = computed(() => [
  { value: "mysql", label: t("databases.list.dbTypes.mysql") },
  { value: "postgresql", label: t("databases.list.dbTypes.postgresql") },
  { value: "mariadb", label: t("databases.list.dbTypes.mariadb") },
  { value: "mongodb", label: t("databases.list.dbTypes.mongodb") },
  { value: "redis", label: t("databases.list.dbTypes.redis") },
]);

const getDbIcon = (_type: string) => {
  return Database;
};

const getDefaultPort = (type: string): string => {
  const ports: Record<string, number> = {
    mysql: 3306,
    mariadb: 3306,
    postgresql: 5432,
    mongodb: 27017,
    redis: 6379,
  };
  return String(ports[type] || 3306);
};

const getDefaultUsername = (type: string): string => {
  const users: Record<string, string> = {
    mysql: "root",
    mariadb: "root",
    postgresql: "postgres",
    mongodb: "admin",
    redis: "",
  };
  return users[type] || "";
};

const detectDbTypeFromImage = (image: string): string => {
  const img = image.toLowerCase();
  if (img.includes("mysql")) return "mysql";
  if (img.includes("mariadb")) return "mariadb";
  if (img.includes("postgres")) return "postgresql";
  if (img.includes("mongo")) return "mongodb";
  if (img.includes("redis")) return "redis";
  return "mysql";
};

const onContainerSelect = (containerName: string) => {
  const container = dbContainers.value.find((c) => c.name === containerName);
  if (!container) return;

  const dbType = detectDbTypeFromImage(container.image);
  connectionForm.value.type = dbType;
  connectionForm.value.host = container.name;
  connectionForm.value.port = parseInt(getDefaultPort(dbType));
  connectionForm.value.username = getDefaultUsername(dbType);

  if (!connectionForm.value.name) {
    connectionForm.value.name = container.name;
  }
};

const loadConnections = async () => {
  loading.value = true;
  try {
    const stored = localStorage.getItem("db_connections");
    if (stored) {
      connections.value = JSON.parse(stored);
    }
  } catch (error: any) {
    notifications.error(t("databases.list.notifications.loadFailedTitle"), error.message);
  } finally {
    loading.value = false;
  }
};

const loadDbContainers = async () => {
  try {
    const response = await containersApi.list();
    const containers = response.data.containers || [];

    dbContainers.value = containers
      .filter((c: any) => {
        const image = (c.image || "").toLowerCase();
        return (
          image.includes("mysql") ||
          image.includes("mariadb") ||
          image.includes("postgres") ||
          image.includes("mongo") ||
          image.includes("redis")
        );
      })
      .map((c: any) => ({
        id: c.id,
        name: c.names?.[0]?.replace(/^\//, "") || c.name || c.id.slice(0, 12),
        image: c.image,
      }));
  } catch {
    dbContainers.value = [];
  }
};

const saveConnections = () => {
  localStorage.setItem("db_connections", JSON.stringify(connections.value));
};

const openConnection = (conn: DatabaseConnection) => {
  router.push({ name: "database-manager", params: { id: conn.id } });
};

const testConnection = async (conn: DatabaseConnection) => {
  notifications.info(
    t("databases.list.notifications.testingTitle"),
    t("databases.list.notifications.testingDesc", { name: conn.name }),
  );
  const startTime = performance.now();
  try {
    const config = getConnectionConfig(conn);
    const res = await databasesApi.testConnection(config);
    const latency = Math.round(performance.now() - startTime);
    if (res.data.success) {
      notifications.success(
        t("databases.list.notifications.testSuccessTitle"),
        t("databases.list.notifications.testSuccessDesc", { name: conn.name, latency }),
      );
      const idx = connections.value.findIndex((c) => c.id === conn.id);
      if (idx !== -1) {
        connections.value[idx].status = "connected";
        connections.value[idx].latency = latency;
        saveConnections();
      }
    } else {
      throw new Error(res.data.error || "Connection failed");
    }
  } catch (error: any) {
    notifications.error(
      t("databases.list.notifications.testFailedTitle"),
      error.response?.data?.error || error.message,
    );
    const idx = connections.value.findIndex((c) => c.id === conn.id);
    if (idx !== -1) {
      connections.value[idx].status = "error";
      connections.value[idx].latency = undefined;
      saveConnections();
    }
  }
};

const testFormConnection = async () => {
  testing.value = true;
  try {
    const config: DatabaseConnectionConfig = {
      type: connectionForm.value.type,
      host: connectionForm.value.host,
      port: connectionForm.value.port || parseInt(getDefaultPort(connectionForm.value.type)),
      username: connectionForm.value.username,
      password: connectionForm.value.password,
      database: connectionForm.value.database,
      container: connectionForm.value.fromContainer ? connectionForm.value.container : undefined,
    };
    const res = await databasesApi.testConnection(config);
    if (res.data.success) {
      notifications.success(
        t("databases.list.notifications.testSuccessTitle"),
        t("databases.list.notifications.testFormSuccessDesc"),
      );
    } else {
      throw new Error(res.data.error || "Connection failed");
    }
  } catch (error: any) {
    notifications.error(
      t("databases.list.notifications.testFailedTitle"),
      error.response?.data?.error || error.message,
    );
  } finally {
    testing.value = false;
  }
};

const editConnection = (conn: DatabaseConnection) => {
  editingConnection.value = conn;
  connectionForm.value = {
    name: conn.name,
    type: conn.type,
    host: conn.host,
    port: conn.port,
    database: conn.database,
    username: conn.username,
    password: conn.password || "",
    fromContainer: !!conn.container,
    container: conn.container || "",
  };
  showAddModal.value = true;
};

const saveConnection = async () => {
  if (!connectionForm.value.name || !connectionForm.value.host) {
    notifications.warning(
      t("databases.list.notifications.validationTitle"),
      t("databases.list.notifications.nameHostRequired"),
    );
    return;
  }

  saving.value = true;

  try {
    await new Promise((r) => setTimeout(r, 500));

    const newConnection: DatabaseConnection = {
      id: editingConnection.value?.id || crypto.randomUUID(),
      name: connectionForm.value.name,
      type: connectionForm.value.type,
      host: connectionForm.value.host,
      port: connectionForm.value.port || parseInt(getDefaultPort(connectionForm.value.type)),
      database: connectionForm.value.database,
      username: connectionForm.value.username,
      password: connectionForm.value.password,
      status: "disconnected",
      container: connectionForm.value.fromContainer ? connectionForm.value.container : undefined,
    };

    if (editingConnection.value) {
      const idx = connections.value.findIndex((c) => c.id === editingConnection.value!.id);
      if (idx !== -1) {
        connections.value[idx] = newConnection;
      }
    } else {
      connections.value.push(newConnection);
    }

    saveConnections();
    closeModal();
    notifications.success(
      t("databases.list.notifications.savedTitle"),
      t("databases.list.notifications.savedDesc", { name: newConnection.name }),
    );
  } catch (error: any) {
    notifications.error(t("databases.list.notifications.saveFailedTitle"), error.message);
  } finally {
    saving.value = false;
  }
};

const confirmDelete = (conn: DatabaseConnection) => {
  connectionToDelete.value = conn;
  showDeleteModal.value = true;
};

const deleteConnection = () => {
  if (connectionToDelete.value) {
    connections.value = connections.value.filter((c) => c.id !== connectionToDelete.value!.id);
    saveConnections();
    notifications.success(
      t("databases.list.notifications.deletedTitle"),
      t("databases.list.notifications.deletedDesc"),
    );
  }
  showDeleteModal.value = false;
  connectionToDelete.value = null;
};

const closeModal = () => {
  showAddModal.value = false;
  editingConnection.value = null;
  connectionForm.value = {
    name: "",
    type: "mysql",
    host: "localhost",
    port: 3306,
    database: "",
    username: "",
    password: "",
    fromContainer: false,
    container: "",
  };
};

onMounted(() => {
  loadConnections();
  loadDbContainers();
});
</script>

<style scoped>
.databases-view {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.db-type {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.db-type-name {
  font-weight: var(--font-medium);
  text-transform: capitalize;
}

.connection-info {
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
}

.connection-name {
  font-weight: var(--font-semibold);
  color: var(--color-gray-900);
}

.connection-source {
  display: flex;
  align-items: center;
  gap: var(--space-1);
  font-size: var(--text-xs);
  color: var(--color-gray-500);
}

.host-info {
  font-family: var(--font-mono);
  font-size: var(--text-sm);
  background: var(--color-gray-100);
  padding: 0.125rem 0.5rem;
  border-radius: var(--radius-sm);
}

.action-buttons {
  display: flex;
  gap: 0.25rem;
}

.action-btn {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: all var(--transition-base);
}

.action-btn.connect {
  background: var(--color-primary-50);
  color: var(--color-primary-600);
}

.action-btn.connect:hover {
  background: var(--color-primary-100);
}

.action-btn.test {
  background: var(--color-warning-50);
  color: var(--color-warning-600);
}

.action-btn.test:hover {
  background: var(--color-warning-100);
}

.action-btn.edit {
  background: var(--color-info-50);
  color: var(--color-info-600);
}

.action-btn.edit:hover {
  background: var(--color-info-100);
}

.action-btn.delete {
  background: var(--color-danger-50);
  color: var(--color-danger-600);
}

.action-btn.delete:hover {
  background: var(--color-danger-100);
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
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-xl);
  width: 500px;
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
  border-radius: var(--radius-sm);
  font-size: var(--text-sm);
}

.form-input:focus,
.form-select:focus {
  outline: none;
  border-color: var(--color-primary-500);
  box-shadow: 0 0 0 3px var(--color-primary-100);
}

.form-row {
  display: flex;
  gap: var(--space-3);
}

.flex-grow {
  flex: 1;
}

.port-field {
  width: 100px;
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

.btn-sm {
  padding: var(--space-1) var(--space-3);
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
