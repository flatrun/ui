<template>
  <div class="users-view">
    <div class="view-header">
      <h1>{{ t("users.title") }}</h1>
      <div class="header-actions">
        <button class="btn btn-icon" :disabled="loading" @click="loadUsers">
          <i class="pi pi-refresh" :class="{ 'pi-spin': loading }" />
        </button>
        <button v-if="canWrite" class="btn btn-primary" @click="showCreateDialog = true">
          <i class="pi pi-plus" />
          <span>{{ t("users.actions.addUser") }}</span>
        </button>
      </div>
    </div>

    <div v-if="loading && !users.length" class="loading-state">
      <i class="pi pi-spin pi-spinner" />
      <span>{{ t("users.loading") }}</span>
    </div>

    <div v-else-if="error" class="error-state">
      <i class="pi pi-exclamation-circle" />
      <span>{{ error }}</span>
      <button class="btn btn-sm" @click="loadUsers">{{ t("users.actions.retry") }}</button>
    </div>

    <div v-else class="users-content">
      <div class="users-table-container">
        <table class="data-table">
          <thead>
            <tr>
              <th>{{ t("users.table.columns.username") }}</th>
              <th>{{ t("users.table.columns.email") }}</th>
              <th>{{ t("users.table.columns.role") }}</th>
              <th>{{ t("users.table.columns.permissions") }}</th>
              <th>{{ t("users.table.columns.deployments") }}</th>
              <th>{{ t("users.table.columns.status") }}</th>
              <th>{{ t("users.table.columns.actions") }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="user in users" :key="user.id">
              <td class="username-cell">
                <i class="pi pi-user" />
                <span>{{ user.username }}</span>
              </td>
              <td>{{ user.email || "-" }}</td>
              <td>
                <span class="role-badge" :class="user.role">{{ formatRole(user.role) }}</span>
              </td>
              <td>
                <span v-if="user.permissions && user.permissions.length" class="perm-indicator custom">
                  {{ t("users.table.permissions.custom", { n: user.permissions.length }) }}
                </span>
                <span v-else class="perm-indicator default">{{ t("users.table.permissions.roleDefaults") }}</span>
              </td>
              <td>
                <span class="deploy-count">{{ user.deployment_count ?? 0 }}</span>
              </td>
              <td>
                <span class="status-badge" :class="user.is_active ? 'active' : 'inactive'">
                  {{ user.is_active ? t("users.status.active") : t("users.status.inactive") }}
                </span>
              </td>
              <td class="actions-cell">
                <button v-if="canWrite" class="btn btn-icon btn-sm" :title="t('users.actions.edit')" @click="editUser(user)">
                  <i class="pi pi-pencil" />
                </button>
                <button
                  v-if="canDelete && user.id !== currentUser?.id"
                  class="btn btn-icon btn-sm btn-danger"
                  :title="t('users.actions.delete')"
                  @click="confirmDelete(user)"
                >
                  <i class="pi pi-trash" />
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Create/Edit Dialog -->
    <div v-if="showCreateDialog || showEditDialog" class="modal-overlay" @click.self="closeDialogs">
      <div class="modal-content">
        <div class="modal-header">
          <h2>{{ showEditDialog ? t("users.dialog.editTitle") : t("users.dialog.createTitle") }}</h2>
          <button class="btn btn-icon" @click="closeDialogs">
            <i class="pi pi-times" />
          </button>
        </div>
        <div class="dialog-tabs">
          <button
            class="tab-btn"
            :class="{ active: activeTab === 'profile' }"
            type="button"
            @click="activeTab = 'profile'"
          >
            <i class="pi pi-user" />
            {{ t("users.dialog.tabs.profile") }}
          </button>
          <button
            class="tab-btn"
            :class="{ active: activeTab === 'permissions' }"
            type="button"
            @click="activeTab = 'permissions'"
          >
            <i class="pi pi-shield" />
            {{ t("users.dialog.tabs.permissions") }}
          </button>
          <button
            v-if="showEditDialog"
            class="tab-btn"
            :class="{ active: activeTab === 'deployments' }"
            type="button"
            @click="activeTab = 'deployments'"
          >
            <i class="pi pi-box" />
            {{ t("users.dialog.tabs.deployments") }}
            <span v-if="userDeployments.length" class="tab-count">{{ userDeployments.length }}</span>
          </button>
        </div>
        <form @submit.prevent="showEditDialog ? updateUser() : createUser()">
          <!-- Profile Tab -->
          <div v-show="activeTab === 'profile'" class="tab-panel">
            <div class="form-group">
              <label>{{ t("users.fields.username") }}</label>
              <input v-model="formData.username" type="text" required :disabled="showEditDialog" />
            </div>
            <div class="form-group">
              <label>{{ t("users.fields.email") }}</label>
              <input v-model="formData.email" type="email" />
            </div>
            <div v-if="!showEditDialog" class="form-group">
              <label>{{ t("users.fields.password") }}</label>
              <input v-model="formData.password" type="password" required />
            </div>
            <div class="form-group">
              <label>{{ t("users.fields.role") }}</label>
              <select v-model="formData.role" required>
                <option value="admin">{{ t("users.roles.admin") }}</option>
                <option value="operator">{{ t("users.roles.operator") }}</option>
                <option value="viewer">{{ t("users.roles.viewer") }}</option>
              </select>
            </div>
            <div v-if="showEditDialog" class="form-group">
              <label class="checkbox-label">
                <input v-model="formData.is_active" type="checkbox" />
                <span>{{ t("users.status.active") }}</span>
              </label>
            </div>
          </div>

          <!-- Permissions Tab -->
          <div v-show="activeTab === 'permissions'" class="tab-panel">
            <div class="form-group">
              <label class="checkbox-label">
                <input v-model="formData.useCustomPermissions" type="checkbox" @change="onCustomPermissionsToggle" />
                <span>{{ t("users.dialog.permissions.customize") }}</span>
              </label>
              <i18n-t
                v-if="!formData.useCustomPermissions"
                keypath="users.dialog.permissions.roleDefaultsHint"
                tag="p"
                class="tab-hint"
              >
                <span class="role-perm-badge" :class="formData.role">{{ formatRole(formData.role) }}</span>
              </i18n-t>
            </div>
            <PermissionPicker v-if="formData.useCustomPermissions" v-model="formData.customPermissions" />
            <PermissionPicker v-else :model-value="selectedRolePermissions" readonly />
          </div>

          <!-- Deployments Tab (edit only) -->
          <div v-if="showEditDialog" v-show="activeTab === 'deployments'" class="tab-panel">
            <p class="tab-hint">{{ t("users.dialog.deployments.hint") }}</p>
            <div class="add-deployment-form">
              <select v-model="newDeployment.name">
                <option value="">{{ t("users.dialog.deployments.selectDeployment") }}</option>
                <option v-for="dep in availableDeployments" :key="dep" :value="dep">{{ dep }}</option>
              </select>
              <select v-model="newDeployment.access_level">
                <option value="read">{{ t("users.accessLevels.read") }}</option>
                <option value="write">{{ t("users.accessLevels.write") }}</option>
                <option value="admin">{{ t("users.accessLevels.admin") }}</option>
              </select>
              <button
                type="button"
                class="btn btn-primary btn-sm"
                :disabled="!newDeployment.name"
                @click="addDeploymentAccess"
              >
                {{ t("users.actions.add") }}
              </button>
            </div>
            <div v-if="userDeployments.length" class="deployments-list">
              <div v-for="dep in userDeployments" :key="dep.deployment_name" class="deployment-item">
                <span class="deployment-name">{{ dep.deployment_name }}</span>
                <select
                  :value="dep.access_level"
                  @change="updateDeploymentAccess(dep.deployment_name, ($event.target as HTMLSelectElement).value)"
                >
                  <option value="read">{{ t("users.accessLevels.read") }}</option>
                  <option value="write">{{ t("users.accessLevels.write") }}</option>
                  <option value="admin">{{ t("users.accessLevels.admin") }}</option>
                </select>
                <button
                  type="button"
                  class="btn btn-icon btn-sm btn-danger"
                  @click="removeDeploymentAccess(dep.deployment_name)"
                >
                  <i class="pi pi-times" />
                </button>
              </div>
            </div>
            <div v-else class="no-deployments">
              <i class="pi pi-info-circle" />
              <span>{{ t("users.dialog.deployments.none") }}</span>
            </div>
          </div>

          <div class="modal-actions">
            <button type="button" class="btn" @click="closeDialogs">{{ t("common.cancel") }}</button>
            <button type="submit" class="btn btn-primary" :disabled="saving">
              {{
                saving
                  ? t("users.actions.saving")
                  : showEditDialog
                    ? t("users.actions.update")
                    : t("users.actions.create")
              }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Delete Confirmation -->
    <div v-if="showDeleteDialog" class="modal-overlay" @click.self="closeDialogs">
      <div class="modal-content modal-sm">
        <div class="modal-header">
          <h2>{{ t("users.delete.title") }}</h2>
        </div>
        <i18n-t keypath="users.delete.message" tag="p">
          <strong>{{ selectedUser?.username }}</strong>
        </i18n-t>
        <div class="modal-actions">
          <button class="btn" @click="closeDialogs">{{ t("common.cancel") }}</button>
          <button class="btn btn-danger" :disabled="saving" @click="deleteUser">
            {{ saving ? t("users.delete.deleting") : t("users.actions.delete") }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from "vue";
import { useI18n } from "vue-i18n";
import type { User, UserRole, UserDeploymentAccess, Permission } from "@/types";
import { useUsersStore } from "@/stores/users";
import { useAuthStore } from "@/stores/auth";
import { deploymentsApi } from "@/services/api";
import { useNotificationsStore } from "@/stores/notifications";
import PermissionPicker from "@/components/PermissionPicker.vue";
import { getRolePermissions } from "@/utils/permissions";

const usersStore = useUsersStore();
const authStore = useAuthStore();
const notifications = useNotificationsStore();
const { t, te } = useI18n();

const users = computed(() => usersStore.users);
const loading = computed(() => usersStore.loading);
const error = computed(() => usersStore.error);
const currentUser = computed(() => authStore.currentUser);
const canWrite = computed(() => authStore.hasPermission("users:write" as Permission));
const canDelete = computed(() => authStore.hasPermission("users:delete" as Permission));

const showCreateDialog = ref(false);
const showEditDialog = ref(false);
const showDeleteDialog = ref(false);
const selectedUser = ref<User | null>(null);
const saving = ref(false);
const activeTab = ref<"profile" | "permissions" | "deployments">("profile");

const formData = ref({
  username: "",
  email: "",
  password: "",
  role: "viewer" as UserRole,
  is_active: true,
  useCustomPermissions: false,
  customPermissions: [] as string[],
});

const userDeployments = ref<UserDeploymentAccess[]>([]);
const allDeployments = ref<string[]>([]);
const newDeployment = ref({ name: "", access_level: "read" });

const selectedRolePermissions = computed(() => getRolePermissions(formData.value.role));

const onCustomPermissionsToggle = () => {
  if (formData.value.useCustomPermissions) {
    formData.value.customPermissions = [...getRolePermissions(formData.value.role)];
  }
};

const availableDeployments = computed(() => {
  const assigned = new Set(userDeployments.value.map((d) => d.deployment_name));
  return allDeployments.value.filter((d) => !assigned.has(d));
});

const loadUsers = async () => {
  await usersStore.fetchUsers();
};

const formatRole = (role: string) => {
  const key = `users.roles.${role}`;
  return te(key) ? t(key) : role;
};

const loadAllDeployments = async () => {
  try {
    const response = await deploymentsApi.list();
    allDeployments.value = response.data.deployments.map((d) => d.name);
  } catch {
    // ignore
  }
};

const editUser = async (user: User) => {
  selectedUser.value = user;
  const hasCustom = Array.isArray(user.permissions) && user.permissions.length > 0;
  formData.value = {
    username: user.username,
    email: user.email || "",
    password: "",
    role: user.role,
    is_active: user.is_active,
    useCustomPermissions: hasCustom,
    customPermissions: hasCustom ? [...user.permissions!] : [...getRolePermissions(user.role)],
  };
  try {
    userDeployments.value = await usersStore.getUserDeployments(user.id);
  } catch {
    userDeployments.value = [];
  }
  showEditDialog.value = true;
};

const confirmDelete = (user: User) => {
  selectedUser.value = user;
  showDeleteDialog.value = true;
};

const createUser = async () => {
  saving.value = true;
  try {
    await usersStore.createUser({
      username: formData.value.username,
      email: formData.value.email || undefined,
      password: formData.value.password,
      role: formData.value.role,
      permissions: formData.value.useCustomPermissions ? formData.value.customPermissions : undefined,
    });
    notifications.success(t("users.notifications.createdTitle"), t("users.notifications.createdDesc"));
    closeDialogs();
  } catch (e: any) {
    notifications.error(t("users.notifications.createFailedTitle"), e.response?.data?.error || e.message);
  } finally {
    saving.value = false;
  }
};

const updateUser = async () => {
  if (!selectedUser.value) return;
  saving.value = true;
  try {
    const hadCustom = Array.isArray(selectedUser.value.permissions) && selectedUser.value.permissions.length > 0;
    let permissions: string[] | undefined;
    if (formData.value.useCustomPermissions) {
      permissions = formData.value.customPermissions;
    } else if (hadCustom) {
      permissions = [];
    }
    await usersStore.updateUser(selectedUser.value.id, {
      email: formData.value.email || undefined,
      role: formData.value.role,
      is_active: formData.value.is_active,
      permissions,
    });
    notifications.success(t("users.notifications.updatedTitle"), t("users.notifications.updatedDesc"));
    closeDialogs();
  } catch (e: any) {
    notifications.error(t("users.notifications.updateFailedTitle"), e.response?.data?.error || e.message);
  } finally {
    saving.value = false;
  }
};

const deleteUser = async () => {
  if (!selectedUser.value) return;
  saving.value = true;
  try {
    await usersStore.deleteUser(selectedUser.value.id);
    notifications.success(t("users.notifications.deletedTitle"), t("users.notifications.deletedDesc"));
    closeDialogs();
  } catch (e: any) {
    notifications.error(t("users.notifications.deleteFailedTitle"), e.response?.data?.error || e.message);
  } finally {
    saving.value = false;
  }
};

const addDeploymentAccess = async () => {
  if (!selectedUser.value || !newDeployment.value.name) return;
  try {
    await usersStore.assignDeployment(
      selectedUser.value.id,
      newDeployment.value.name,
      newDeployment.value.access_level,
    );
    userDeployments.value.push({
      deployment_name: newDeployment.value.name,
      access_level: newDeployment.value.access_level as "read" | "write" | "admin",
      created_at: new Date().toISOString(),
    });
    newDeployment.value = { name: "", access_level: "read" };
  } catch (e: any) {
    notifications.error(t("users.notifications.assignDeploymentFailedTitle"), e.response?.data?.error || e.message);
  }
};

const updateDeploymentAccess = async (deploymentName: string, accessLevel: string) => {
  if (!selectedUser.value) return;
  try {
    await usersStore.updateDeploymentAccess(selectedUser.value.id, deploymentName, accessLevel);
    const dep = userDeployments.value.find((d) => d.deployment_name === deploymentName);
    if (dep) {
      dep.access_level = accessLevel as "read" | "write" | "admin";
    }
  } catch (e: any) {
    notifications.error(t("users.notifications.updateDeploymentFailedTitle"), e.response?.data?.error || e.message);
  }
};

const removeDeploymentAccess = async (deploymentName: string) => {
  if (!selectedUser.value) return;
  try {
    await usersStore.removeDeploymentAccess(selectedUser.value.id, deploymentName);
    userDeployments.value = userDeployments.value.filter((d) => d.deployment_name !== deploymentName);
  } catch (e: any) {
    notifications.error(t("users.notifications.removeDeploymentFailedTitle"), e.response?.data?.error || e.message);
  }
};

const closeDialogs = () => {
  showCreateDialog.value = false;
  showEditDialog.value = false;
  showDeleteDialog.value = false;
  selectedUser.value = null;
  formData.value = {
    username: "",
    email: "",
    password: "",
    role: "viewer",
    is_active: true,
    useCustomPermissions: false,
    customPermissions: [],
  };
  userDeployments.value = [];
  newDeployment.value = { name: "", access_level: "read" };
  activeTab.value = "profile";
};

onMounted(() => {
  loadUsers();
  loadAllDeployments();
});
</script>

<style scoped>
.users-view {
  padding: 1.5rem;
}

.view-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
}

.view-header h1 {
  font-size: 1.5rem;
  font-weight: 600;
  color: var(--text-primary);
}

.header-actions {
  display: flex;
  gap: 0.5rem;
}

.loading-state,
.error-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem;
  gap: 1rem;
  color: var(--text-secondary);
}

.error-state {
  color: var(--danger);
}

.users-table-container {
  background: var(--surface-card);
  border-radius: 8px;
  border: 1px solid var(--surface-border);
  overflow: hidden;
}

.data-table {
  width: 100%;
  border-collapse: collapse;
}

.data-table th,
.data-table td {
  padding: 0.75rem 1rem;
  text-align: left;
  border-bottom: 1px solid var(--surface-border);
}

.data-table th {
  background: var(--surface-ground);
  font-weight: 600;
  color: var(--text-secondary);
  font-size: 0.8125rem;
  text-transform: uppercase;
}

.data-table tbody tr:hover {
  background: var(--surface-hover);
}

.username-cell {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.role-badge {
  display: inline-block;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 500;
  text-transform: capitalize;
}

.role-badge.admin {
  background: rgba(var(--danger-rgb), 0.1);
  color: var(--danger);
}

.role-badge.operator {
  background: rgba(var(--warning-rgb), 0.1);
  color: var(--warning);
}

.role-badge.viewer {
  background: rgba(var(--info-rgb), 0.1);
  color: var(--info);
}

.status-badge {
  display: inline-block;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 500;
}

.status-badge.active {
  background: rgba(var(--success-rgb), 0.1);
  color: var(--success);
}

.status-badge.inactive {
  background: rgba(var(--text-secondary-rgb), 0.1);
  color: var(--text-secondary);
}

.perm-indicator {
  display: inline-block;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 500;
}

.perm-indicator.custom {
  background: rgba(var(--warning-rgb), 0.1);
  color: var(--warning);
}

.perm-indicator.default {
  background: var(--surface-ground);
  color: var(--text-secondary);
}

.deploy-count {
  font-weight: 500;
  color: var(--text-secondary);
}

.actions-cell {
  display: flex;
  gap: 0.25rem;
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background: var(--surface-card);
  border-radius: 8px;
  width: 100%;
  max-width: 720px;
  max-height: 90vh;
  overflow-y: auto;
}

.modal-content.modal-lg {
  max-width: 720px;
}

.modal-content.modal-sm {
  max-width: 400px;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 1.5rem;
  border-bottom: 1px solid var(--surface-border);
}

.modal-header h2 {
  font-size: 1.125rem;
  font-weight: 600;
}

.modal-content p {
  padding: 1.5rem;
}

.dialog-tabs {
  display: flex;
  border-bottom: 1px solid var(--surface-border);
  padding: 0 1.5rem;
  gap: 0;
}

.tab-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.75rem 1rem;
  border: none;
  background: none;
  color: var(--text-secondary);
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  border-bottom: 2px solid transparent;
  margin-bottom: -1px;
  transition:
    color 0.15s,
    border-color 0.15s;
}

.tab-btn:hover {
  color: var(--text-primary);
}

.tab-btn.active {
  color: var(--primary, #3b82f6);
  border-bottom-color: var(--primary, #3b82f6);
}

.tab-count {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 1.25rem;
  height: 1.25rem;
  padding: 0 0.375rem;
  border-radius: 999px;
  background: var(--surface-ground);
  font-size: 0.6875rem;
  font-weight: 600;
  color: var(--text-secondary);
}

.tab-btn.active .tab-count {
  background: rgba(var(--primary-rgb, 59, 130, 246), 0.1);
  color: var(--primary, #3b82f6);
}

.tab-panel {
  padding: 1.5rem;
  min-height: 200px;
}

.tab-hint {
  margin: 0.25rem 0 1rem;
  font-size: 0.8125rem;
  color: var(--text-secondary);
  padding: 0;
}

.form-group {
  margin-bottom: 1rem;
}

.form-group label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 500;
  color: var(--text-secondary);
}

.form-group input,
.form-group select {
  width: 100%;
  padding: 0.5rem 0.75rem;
  border: 1px solid var(--surface-border);
  border-radius: 4px;
  background: var(--surface-ground);
  color: var(--text-primary);
}

.form-group label.checkbox-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
}

.form-group label.checkbox-label input {
  width: auto;
}

.role-perm-badge {
  display: inline-block;
  padding: 0.125rem 0.375rem;
  border-radius: 4px;
  font-size: 0.6875rem;
  font-weight: 500;
  text-transform: capitalize;
  margin-left: 0.375rem;
}

.role-perm-badge.admin {
  background: rgba(var(--danger-rgb), 0.1);
  color: var(--danger);
}

.role-perm-badge.operator {
  background: rgba(var(--warning-rgb), 0.1);
  color: var(--warning);
}

.role-perm-badge.viewer {
  background: rgba(var(--info-rgb), 0.1);
  color: var(--info);
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
  padding: 1rem 1.5rem;
  border-top: 1px solid var(--surface-border);
}

.add-deployment-form {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.add-deployment-form select {
  flex: 1;
  padding: 0.5rem;
  border: 1px solid var(--surface-border);
  border-radius: 4px;
  background: var(--surface-ground);
}

.deployments-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.deployment-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem;
  background: var(--surface-ground);
  border-radius: 4px;
}

.deployment-name {
  flex: 1;
  font-weight: 500;
}

.deployment-item select {
  padding: 0.25rem 0.5rem;
  border: 1px solid var(--surface-border);
  border-radius: 4px;
  background: var(--surface-card);
}

.no-deployments {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 2rem;
  color: var(--text-secondary);
}

.btn {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 4px;
  background: var(--surface-ground);
  color: var(--text-primary);
  cursor: pointer;
  font-size: 0.875rem;
}

.btn:hover {
  background: var(--surface-hover);
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-primary {
  background: var(--primary, #3b82f6);
  color: white;
  font-weight: 600;
}

.btn-primary:hover {
  background: var(--primary-dark, #2563eb);
}

.btn-danger {
  background: var(--danger);
  color: white;
}

.btn-danger:hover {
  background: var(--danger-dark);
}

.btn-icon {
  padding: 0.5rem;
}

.btn-sm {
  padding: 0.25rem 0.5rem;
  font-size: 0.8125rem;
}
</style>
