<template>
  <div class="database-sidebar">
    <div class="sidebar-search">
      <Search :size="14" class="search-icon" />
      <input v-model="searchTerm" type="text" class="search-input" placeholder="Search..." @input="handleSearch" />
      <button v-if="searchTerm" class="clear-search" @click="clearSearch">
        <X :size="12" />
      </button>
    </div>

    <div class="sidebar-sections">
      <div class="sidebar-section">
        <button class="section-header" @click="toggleSection('databases')">
          <component :is="sectionsOpen.databases ? ChevronDown : ChevronRight" :size="14" />
          <Database :size="14" />
          <span class="section-title">Databases</span>
          <span class="section-count">{{ filteredDatabases.length }}</span>
        </button>
        <div v-if="sectionsOpen.databases" class="section-content">
          <button
            v-for="db in filteredDatabases"
            :key="db.name"
            class="sidebar-item"
            :class="{ selected: selectedDatabase === db.name }"
            @click="$emit('select-database', db.name)"
          >
            <Database :size="14" class="item-icon" />
            <span class="item-name">{{ db.name }}</span>
            <button class="item-action" title="Delete" @click.stop="$emit('delete-database', db.name)">
              <Trash2 :size="12" />
            </button>
          </button>
          <div v-if="filteredDatabases.length === 0" class="empty-section">
            {{ searchTerm ? "No matches" : "No databases" }}
          </div>
        </div>
      </div>

      <div class="sidebar-section">
        <button class="section-header" @click="toggleSection('users')">
          <component :is="sectionsOpen.users ? ChevronDown : ChevronRight" :size="14" />
          <Users :size="14" />
          <span class="section-title">Users</span>
          <span class="section-count">{{ filteredUsers.length }}</span>
        </button>
        <div v-if="sectionsOpen.users" class="section-content">
          <button
            v-for="user in displayedUsers"
            :key="user.name + (user.host || '')"
            class="sidebar-item"
            :class="{ selected: selectedUser?.name === user.name && selectedUser?.host === user.host }"
            @click="$emit('select-user', user)"
          >
            <User :size="14" class="item-icon" />
            <span class="item-name">
              {{ user.name }}<span v-if="user.host" class="user-host">@{{ user.host }}</span>
            </span>
            <button class="item-action" title="Delete" @click.stop="$emit('delete-user', user)">
              <Trash2 :size="12" />
            </button>
          </button>
          <button v-if="filteredUsers.length > maxDisplayedUsers" class="view-all-btn" @click="$emit('view-all-users')">
            View all {{ filteredUsers.length }} users
          </button>
          <div v-if="filteredUsers.length === 0" class="empty-section">
            {{ searchTerm ? "No matches" : "No users" }}
          </div>
        </div>
      </div>
    </div>

    <div class="sidebar-actions">
      <button class="action-btn" @click="$emit('create-database')">
        <Plus :size="14" />
        Database
      </button>
      <button class="action-btn" @click="$emit('create-user')">
        <UserPlus :size="14" />
        User
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from "vue";
import { Search, X, ChevronDown, ChevronRight, Database, Users, User, UserPlus, Plus, Trash2 } from "lucide-vue-next";

interface DatabaseInfo {
  name: string;
  size?: string;
  tables?: number;
}

interface UserInfo {
  name: string;
  host?: string;
}

const props = defineProps<{
  databases: DatabaseInfo[];
  users: UserInfo[];
  selectedDatabase?: string;
  selectedUser?: UserInfo | null;
}>();

defineEmits<{
  "select-database": [name: string];
  "select-user": [user: UserInfo];
  "create-database": [];
  "create-user": [];
  "delete-database": [name: string];
  "delete-user": [user: UserInfo];
  "view-all-users": [];
}>();

const searchTerm = ref("");
const sectionsOpen = ref({
  databases: true,
  users: true,
});
const maxDisplayedUsers = 15;

const filteredDatabases = computed(() => {
  if (!searchTerm.value) return props.databases;
  const term = searchTerm.value.toLowerCase();
  return props.databases.filter((db) => db.name.toLowerCase().includes(term));
});

const filteredUsers = computed(() => {
  if (!searchTerm.value) return props.users;
  const term = searchTerm.value.toLowerCase();
  return props.users.filter(
    (user) => user.name.toLowerCase().includes(term) || (user.host && user.host.toLowerCase().includes(term)),
  );
});

const displayedUsers = computed(() => {
  return filteredUsers.value.slice(0, maxDisplayedUsers);
});

function toggleSection(section: "databases" | "users") {
  sectionsOpen.value[section] = !sectionsOpen.value[section];
}

function handleSearch() {
  if (searchTerm.value) {
    sectionsOpen.value.databases = true;
    sectionsOpen.value.users = true;
  }
}

function clearSearch() {
  searchTerm.value = "";
}
</script>

<style scoped>
.database-sidebar {
  display: flex;
  flex-direction: column;
  width: 240px;
  min-width: 240px;
  background: white;
  border-right: 1px solid var(--color-gray-200);
  height: 100%;
}

.sidebar-search {
  position: relative;
  padding: var(--space-3);
  border-bottom: 1px solid var(--color-gray-200);
}

.search-icon {
  position: absolute;
  left: calc(var(--space-3) + var(--space-2));
  top: 50%;
  transform: translateY(-50%);
  color: var(--color-gray-400);
  pointer-events: none;
}

.search-input {
  width: 100%;
  padding: var(--space-2) var(--space-3);
  padding-left: calc(var(--space-2) + 20px);
  padding-right: var(--space-6);
  border: 1px solid var(--color-gray-200);
  border-radius: var(--radius-md);
  font-size: var(--text-sm);
}

.search-input:focus {
  outline: none;
  border-color: var(--color-primary-500);
  box-shadow: 0 0 0 3px var(--color-primary-100);
}

.clear-search {
  position: absolute;
  right: calc(var(--space-3) + var(--space-2));
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  color: var(--color-gray-400);
  cursor: pointer;
  padding: var(--space-1);
  display: flex;
  align-items: center;
  justify-content: center;
}

.clear-search:hover {
  color: var(--color-gray-600);
}

.sidebar-sections {
  flex: 1;
  overflow-y: auto;
}

.sidebar-section {
  border-bottom: 1px solid var(--color-gray-100);
}

.section-header {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  width: 100%;
  padding: var(--space-3);
  background: var(--color-gray-50);
  border: none;
  cursor: pointer;
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  color: var(--color-gray-700);
  text-align: left;
}

.section-header:hover {
  background: var(--color-gray-100);
}

.section-title {
  flex: 1;
}

.section-count {
  font-size: var(--text-xs);
  color: var(--color-gray-500);
  background: var(--color-gray-200);
  padding: 0 var(--space-2);
  border-radius: var(--radius-full);
}

.section-content {
  max-height: 300px;
  overflow-y: auto;
}

.sidebar-item {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  width: 100%;
  padding: var(--space-2) var(--space-3);
  padding-left: var(--space-6);
  background: none;
  border: none;
  cursor: pointer;
  font-size: var(--text-sm);
  color: var(--color-gray-700);
  text-align: left;
}

.sidebar-item:hover {
  background: var(--color-gray-50);
}

.sidebar-item.selected {
  background: var(--color-primary-50);
  color: var(--color-primary-700);
}

.sidebar-item.selected .item-icon {
  color: var(--color-primary-500);
}

.item-icon {
  color: var(--color-gray-400);
  flex-shrink: 0;
}

.item-name {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-family: var(--font-mono);
  font-size: var(--text-xs);
}

.user-host {
  color: var(--color-gray-400);
}

.item-action {
  opacity: 0;
  background: none;
  border: none;
  color: var(--color-gray-400);
  cursor: pointer;
  padding: var(--space-1);
  border-radius: var(--radius-sm);
  display: flex;
  align-items: center;
  justify-content: center;
}

.sidebar-item:hover .item-action {
  opacity: 1;
}

.item-action:hover {
  color: var(--color-danger-500);
  background: var(--color-danger-50);
}

.empty-section {
  padding: var(--space-3) var(--space-6);
  font-size: var(--text-xs);
  color: var(--color-gray-400);
  text-align: center;
}

.view-all-btn {
  display: block;
  width: 100%;
  padding: var(--space-2) var(--space-3);
  padding-left: var(--space-6);
  background: none;
  border: none;
  font-size: var(--text-xs);
  font-weight: var(--font-medium);
  color: var(--color-primary-600);
  text-align: left;
  cursor: pointer;
}

.view-all-btn:hover {
  background: var(--color-primary-50);
  text-decoration: underline;
}

.sidebar-actions {
  display: flex;
  gap: var(--space-2);
  padding: var(--space-3);
  border-top: 1px solid var(--color-gray-200);
}

.action-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-1);
  padding: var(--space-2);
  background: var(--color-gray-50);
  border: 1px solid var(--color-gray-200);
  border-radius: var(--radius-md);
  font-size: var(--text-xs);
  font-weight: var(--font-medium);
  color: var(--color-gray-700);
  cursor: pointer;
  transition: all var(--transition-base);
}

.action-btn:hover {
  background: var(--color-primary-50);
  border-color: var(--color-primary-200);
  color: var(--color-primary-700);
}
</style>
