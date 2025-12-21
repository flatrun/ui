<template>
  <div class="server-overview">
    <DatabaseSidebar
      :databases="databases"
      :users="users"
      :selected-database="selectedDatabase"
      :selected-user="selectedUser"
      @select-database="handleSelectDatabase"
      @select-user="handleSelectUser"
      @create-database="$emit('create-database')"
      @create-user="$emit('create-user')"
      @delete-database="$emit('delete-database', $event)"
      @delete-user="$emit('delete-user', $event)"
      @view-all-users="showAllUsers = true"
    />
    <DatabaseDetails
      :selected-database="selectedDatabase"
      :selected-user="selectedUser"
      :table-count="selectedDbInfo?.tables"
      :database-size="selectedDbInfo?.size"
      :database-info="selectedDbInfo"
      :database-count="databases.length"
      :user-count="users.length"
      :total-tables="totalTables"
      :server-info="serverInfo"
      :show-all-users="showAllUsers"
      :all-users="users"
      @open-database="$emit('open-database', $event)"
      @export-database="$emit('export-database', $event)"
      @delete-database="$emit('delete-database', $event)"
      @edit-user="$emit('edit-user', $event)"
      @delete-user="$emit('delete-user', $event)"
      @close-users-view="showAllUsers = false"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from "vue";
import DatabaseSidebar from "./DatabaseSidebar.vue";
import DatabaseDetails from "./DatabaseDetails.vue";

interface DatabaseInfo {
  name: string;
  size?: string;
  tables?: number;
  views?: number;
  routines?: number;
  triggers?: number;
  charset?: string;
  collation?: string;
  engine?: string;
}

interface UserInfo {
  name: string;
  host?: string;
}

interface ServerInfo {
  version?: string;
  uptime?: string;
}

const props = defineProps<{
  databases: DatabaseInfo[];
  users: UserInfo[];
  serverInfo?: ServerInfo;
}>();

defineEmits<{
  "create-database": [];
  "create-user": [];
  "open-database": [name: string];
  "export-database": [name: string];
  "delete-database": [name: string];
  "edit-user": [user: UserInfo];
  "delete-user": [user: UserInfo];
}>();

const selectedDatabase = ref<string>("");
const selectedUser = ref<UserInfo | null>(null);
const showAllUsers = ref(false);

const selectedDbInfo = computed(() => {
  if (!selectedDatabase.value) return undefined;
  return props.databases.find((db) => db.name === selectedDatabase.value);
});

const totalTables = computed(() => {
  return props.databases.reduce((sum, db) => sum + (db.tables || 0), 0);
});

function handleSelectDatabase(name: string) {
  selectedDatabase.value = name;
  selectedUser.value = null;
  showAllUsers.value = false;
}

function handleSelectUser(user: UserInfo) {
  selectedUser.value = user;
  selectedDatabase.value = "";
  showAllUsers.value = false;
}

watch(
  () => props.databases,
  () => {
    if (selectedDatabase.value && !props.databases.find((db) => db.name === selectedDatabase.value)) {
      selectedDatabase.value = "";
    }
  },
);

watch(
  () => props.users,
  () => {
    if (
      selectedUser.value &&
      !props.users.find((u) => u.name === selectedUser.value?.name && u.host === selectedUser.value?.host)
    ) {
      selectedUser.value = null;
    }
  },
);
</script>

<style scoped>
.server-overview {
  display: flex;
  flex: 1;
  overflow: hidden;
}
</style>
