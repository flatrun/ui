<template>
  <div class="database-details">
    <template v-if="showAllUsers">
      <div class="users-view">
        <div class="users-header">
          <div class="users-title">
            <Users :size="16" />
            <span>All Users</span>
            <span class="users-count">{{ allUsers?.length ?? 0 }}</span>
          </div>
          <button class="close-btn" @click="$emit('close-users-view')">
            <X :size="14" />
          </button>
        </div>
        <div class="users-search">
          <Search :size="14" class="search-icon" />
          <input v-model="userSearch" type="text" class="search-input" placeholder="Search users..." />
        </div>
        <div class="users-table">
          <table>
            <thead>
              <tr>
                <th>Username</th>
                <th>Host</th>
                <th />
              </tr>
            </thead>
            <tbody>
              <tr v-for="user in filteredAllUsers" :key="user.name + (user.host || '')">
                <td>
                  <code>{{ user.name }}</code>
                </td>
                <td>
                  <code>{{ user.host || "%" }}</code>
                </td>
                <td class="actions-cell">
                  <button class="table-action" title="Edit" @click="$emit('edit-user', user)">
                    <Pencil :size="12" />
                  </button>
                  <button class="table-action danger" title="Delete" @click="$emit('delete-user', user)">
                    <Trash2 :size="12" />
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
          <div v-if="filteredAllUsers.length === 0" class="no-results">No users match your search</div>
        </div>
      </div>
    </template>

    <template v-else-if="showAllDatabases">
      <div class="databases-view">
        <div class="users-header">
          <div class="users-title">
            <Database :size="16" />
            <span>All Databases</span>
            <span class="users-count">{{ allDatabases?.length ?? 0 }}</span>
          </div>
          <button class="close-btn" @click="$emit('close-databases-view')">
            <X :size="14" />
          </button>
        </div>
        <div class="users-search">
          <Search :size="14" class="search-icon" />
          <input v-model="dbSearch" type="text" class="search-input" placeholder="Search databases..." />
        </div>
        <div class="users-table">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Tables</th>
                <th>Size</th>
                <th />
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="db in filteredAllDatabases"
                :key="db.name"
                class="clickable-row"
                @click="$emit('select-database', db.name)"
              >
                <td>
                  <code>{{ db.name }}</code>
                </td>
                <td>{{ db.tables ?? "—" }}</td>
                <td>{{ db.size ?? "—" }}</td>
                <td class="actions-cell">
                  <button class="table-action" title="Open" @click.stop="$emit('open-database', db.name)">
                    <ArrowRight :size="12" />
                  </button>
                  <button class="table-action danger" title="Delete" @click.stop="$emit('delete-database', db.name)">
                    <Trash2 :size="12" />
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
          <div v-if="filteredAllDatabases.length === 0" class="no-results">No databases match your search</div>
        </div>
      </div>
    </template>

    <template v-else-if="selectedDatabase">
      <div class="item-header">
        <Database :size="14" class="item-icon database" />
        <code class="item-name">{{ selectedDatabase }}</code>
        <div class="item-actions">
          <button class="icon-btn" title="Export" @click="$emit('export-database', selectedDatabase)">
            <Download :size="14" />
          </button>
          <button class="icon-btn danger" title="Delete" @click="$emit('delete-database', selectedDatabase)">
            <Trash2 :size="14" />
          </button>
        </div>
      </div>

      <div class="info-section">
        <div class="section-title">Schema Objects</div>
        <div class="info-grid">
          <div class="info-cell">
            <span class="cell-value">{{ tableCount ?? 0 }}</span>
            <span class="cell-label">Tables</span>
          </div>
          <div class="info-cell">
            <span class="cell-value">{{ databaseInfo?.views ?? 0 }}</span>
            <span class="cell-label">Views</span>
          </div>
          <div class="info-cell">
            <span class="cell-value">{{ databaseInfo?.routines ?? 0 }}</span>
            <span class="cell-label">Routines</span>
          </div>
          <div class="info-cell">
            <span class="cell-value">{{ databaseInfo?.triggers ?? 0 }}</span>
            <span class="cell-label">Triggers</span>
          </div>
        </div>
      </div>

      <div class="info-section">
        <div class="section-title">Properties</div>
        <div class="props-list">
          <div class="prop-row">
            <span class="prop-label">Size</span>
            <span class="prop-value">{{ databaseSize || "—" }}</span>
          </div>
          <div class="prop-row">
            <span class="prop-label">Charset</span>
            <code class="prop-value mono">{{ databaseInfo?.charset || "utf8mb4" }}</code>
          </div>
          <div class="prop-row">
            <span class="prop-label">Collation</span>
            <code class="prop-value mono">{{ databaseInfo?.collation || "utf8mb4_general_ci" }}</code>
          </div>
          <div v-if="databaseInfo?.engine" class="prop-row">
            <span class="prop-label">Engine</span>
            <code class="prop-value mono">{{ databaseInfo.engine }}</code>
          </div>
        </div>
      </div>

      <div class="action-row">
        <button class="open-btn" @click="$emit('open-database', selectedDatabase)">
          <ArrowRight :size="12" />
          Open
        </button>
      </div>
    </template>

    <template v-else-if="selectedUser">
      <div class="item-header">
        <User :size="14" class="item-icon user" />
        <code class="item-name">{{ selectedUser.name }}@{{ selectedUser.host || "%" }}</code>
        <div class="item-actions">
          <button class="icon-btn" title="Edit" @click="$emit('edit-user', selectedUser)">
            <Pencil :size="14" />
          </button>
          <button class="icon-btn danger" title="Delete" @click="$emit('delete-user', selectedUser)">
            <Trash2 :size="14" />
          </button>
        </div>
      </div>

      <div class="info-section">
        <div class="section-title">Connection</div>
        <div class="props-list">
          <div class="prop-row">
            <span class="prop-label">User</span>
            <code class="prop-value mono">{{ selectedUser.name }}</code>
          </div>
          <div class="prop-row">
            <span class="prop-label">Host</span>
            <code class="prop-value mono">{{ selectedUser.host || "%" }}</code>
          </div>
        </div>
      </div>

      <div class="action-row">
        <button class="action-link" @click="$emit('edit-user', selectedUser)">
          <Pencil :size="12" />
          Edit Privileges
        </button>
      </div>
    </template>

    <template v-else>
      <div class="info-section">
        <div class="section-title">Server Overview</div>
        <div class="props-list">
          <div class="prop-row">
            <span class="prop-label">Databases</span>
            <span class="prop-value">{{ databaseCount }}</span>
          </div>
          <div class="prop-row">
            <span class="prop-label">Users</span>
            <span class="prop-value">{{ userCount }}</span>
          </div>
          <div v-if="(totalTables ?? 0) > 0" class="prop-row">
            <span class="prop-label">Tables</span>
            <span class="prop-value">{{ totalTables }}</span>
          </div>
          <div v-if="serverInfo?.version" class="prop-row">
            <span class="prop-label">Version</span>
            <code class="prop-value mono">{{ serverInfo.version }}</code>
          </div>
          <div v-if="serverInfo?.uptime" class="prop-row">
            <span class="prop-label">Uptime</span>
            <span class="prop-value">{{ serverInfo.uptime }}</span>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from "vue";
import { Database, User, Users, ArrowRight, Download, Trash2, Pencil, X, Search } from "lucide-vue-next";

interface UserInfo {
  name: string;
  host?: string;
}

interface DatabaseInfo {
  name?: string;
  views?: number;
  routines?: number;
  triggers?: number;
  charset?: string;
  collation?: string;
  engine?: string;
  size?: string;
  tables?: number;
}

interface ServerInfo {
  version?: string;
  uptime?: string;
}

const props = defineProps<{
  selectedDatabase?: string;
  selectedUser?: UserInfo | null;
  tableCount?: number;
  databaseSize?: string;
  databaseInfo?: DatabaseInfo;
  databaseCount: number;
  userCount: number;
  totalTables?: number;
  serverInfo?: ServerInfo;
  showAllUsers?: boolean;
  showAllDatabases?: boolean;
  allUsers?: UserInfo[];
  allDatabases?: DatabaseInfo[];
}>();

defineEmits<{
  "open-database": [name: string];
  "export-database": [name: string];
  "delete-database": [name: string];
  "edit-user": [user: UserInfo];
  "delete-user": [user: UserInfo];
  "close-users-view": [];
  "close-databases-view": [];
  "select-database": [name: string];
}>();

const userSearch = ref("");
const dbSearch = ref("");

const filteredAllUsers = computed(() => {
  if (!props.allUsers) return [];
  if (!userSearch.value) return props.allUsers;
  const term = userSearch.value.toLowerCase();
  return props.allUsers.filter(
    (u) => u.name.toLowerCase().includes(term) || (u.host && u.host.toLowerCase().includes(term)),
  );
});

const filteredAllDatabases = computed(() => {
  if (!props.allDatabases) return [];
  const dbs = props.allDatabases.filter((db): db is DatabaseInfo & { name: string } => !!db.name);
  if (!dbSearch.value) return dbs;
  const term = dbSearch.value.toLowerCase();
  return dbs.filter((db) => db.name.toLowerCase().includes(term));
});
</script>

<style scoped>
.database-details {
  flex: 1;
  padding: var(--space-3);
  background: var(--color-gray-50);
  overflow-y: auto;
}

.item-header {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding-bottom: var(--space-3);
  margin-bottom: var(--space-3);
  border-bottom: 1px solid var(--color-gray-200);
}

.item-icon {
  flex-shrink: 0;
}

.item-icon.database {
  color: var(--color-primary-500);
}

.item-icon.user {
  color: var(--color-success-500);
}

.item-name {
  flex: 1;
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  background: none;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.item-actions {
  display: flex;
  gap: var(--space-1);
}

.icon-btn {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  border-radius: var(--radius-sm);
  color: var(--color-gray-400);
  cursor: pointer;
  transition: all var(--transition-base);
}

.icon-btn:hover {
  background: var(--color-gray-200);
  color: var(--color-gray-700);
}

.icon-btn.danger:hover {
  background: var(--color-danger-100);
  color: var(--color-danger-600);
}

.info-section {
  margin-bottom: var(--space-3);
}

.section-title {
  font-size: var(--text-xs);
  font-weight: var(--font-semibold);
  color: var(--color-gray-500);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: var(--space-2);
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1px;
  background: var(--color-gray-200);
  border: 1px solid var(--color-gray-200);
  border-radius: var(--radius-md);
  overflow: hidden;
}

.info-cell {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: var(--space-2);
  background: white;
}

.cell-value {
  font-size: var(--text-lg);
  font-weight: var(--font-semibold);
  color: var(--color-gray-900);
  line-height: 1;
}

.cell-label {
  font-size: var(--text-xs);
  color: var(--color-gray-500);
  margin-top: 2px;
}

.props-list {
  background: white;
  border: 1px solid var(--color-gray-200);
  border-radius: var(--radius-md);
}

.prop-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--space-2) var(--space-3);
  font-size: var(--text-sm);
}

.prop-row:not(:last-child) {
  border-bottom: 1px solid var(--color-gray-100);
}

.prop-label {
  color: var(--color-gray-500);
  font-size: var(--text-xs);
}

.prop-value {
  color: var(--color-gray-900);
  font-size: var(--text-xs);
}

.prop-value.mono {
  font-family: var(--font-mono);
}

.open-btn {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  padding: var(--space-1) var(--space-3);
  background: var(--color-primary-500);
  border: none;
  border-radius: var(--radius-md);
  color: white;
  font-size: var(--text-xs);
  font-weight: var(--font-medium);
  cursor: pointer;
  transition: background var(--transition-base);
}

.open-btn:hover {
  background: var(--color-primary-600);
}

.users-view {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.users-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-bottom: var(--space-3);
  border-bottom: 1px solid var(--color-gray-200);
  margin-bottom: var(--space-3);
}

.users-title {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  font-size: var(--text-sm);
  font-weight: var(--font-semibold);
  color: var(--color-gray-700);
}

.users-count {
  font-size: var(--text-xs);
  font-weight: var(--font-normal);
  color: var(--color-gray-500);
  background: var(--color-gray-100);
  padding: 0 var(--space-2);
  border-radius: var(--radius-full);
}

.close-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  background: none;
  border: none;
  color: var(--color-gray-400);
  cursor: pointer;
  border-radius: var(--radius-sm);
}

.close-btn:hover {
  background: var(--color-gray-100);
  color: var(--color-gray-600);
}

.users-search {
  position: relative;
  margin-bottom: var(--space-3);
}

.users-search .search-icon {
  position: absolute;
  left: var(--space-2);
  top: 50%;
  transform: translateY(-50%);
  color: var(--color-gray-400);
  pointer-events: none;
}

.users-search .search-input {
  width: 100%;
  padding: var(--space-2);
  padding-left: calc(var(--space-2) + 20px);
  border: 1px solid var(--color-gray-200);
  border-radius: var(--radius-md);
  font-size: var(--text-sm);
}

.users-search .search-input:focus {
  outline: none;
  border-color: var(--color-primary-500);
}

.users-table {
  flex: 1;
  overflow-y: auto;
  background: white;
  border: 1px solid var(--color-gray-200);
  border-radius: var(--radius-md);
}

.users-table table {
  width: 100%;
  border-collapse: collapse;
  font-size: var(--text-sm);
}

.users-table th,
.users-table td {
  padding: var(--space-2) var(--space-3);
  text-align: left;
  border-bottom: 1px solid var(--color-gray-100);
}

.users-table th {
  background: var(--color-gray-50);
  font-size: var(--text-xs);
  font-weight: var(--font-semibold);
  color: var(--color-gray-600);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.users-table td code {
  font-family: var(--font-mono);
  font-size: var(--text-xs);
}

.users-table tr:hover {
  background: var(--color-gray-50);
}

.users-table tr.clickable-row {
  cursor: pointer;
}

.databases-view {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.actions-cell {
  width: 60px;
  text-align: right;
}

.table-action {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  background: none;
  border: none;
  color: var(--color-gray-400);
  cursor: pointer;
  border-radius: var(--radius-sm);
}

.table-action:hover {
  background: var(--color-gray-100);
  color: var(--color-gray-600);
}

.table-action.danger:hover {
  background: var(--color-danger-50);
  color: var(--color-danger-600);
}

.no-results {
  padding: var(--space-6);
  text-align: center;
  color: var(--color-gray-400);
  font-size: var(--text-sm);
}

.action-row {
  padding-top: var(--space-2);
  margin-top: var(--space-3);
}

.action-link {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  padding: 0;
  background: none;
  border: none;
  color: var(--color-primary-600);
  font-size: var(--text-xs);
  font-weight: var(--font-medium);
  cursor: pointer;
}

.action-link:hover {
  text-decoration: underline;
}
</style>
