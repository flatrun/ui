<template>
  <div class="users-view">
    <div class="view-header">
      <h1>Users</h1>
      <div class="header-actions">
        <button class="btn btn-icon" :disabled="loading" @click="loadUsers">
          <i class="pi pi-refresh" :class="{ 'pi-spin': loading }" />
        </button>
        <button v-if="canWrite" class="btn btn-primary" @click="showCreateDialog = true">
          <i class="pi pi-plus" />
          <span>Add User</span>
        </button>
      </div>
    </div>

    <div v-if="loading && !users.length" class="loading-state">
      <i class="pi pi-spin pi-spinner" />
      <span>Loading users...</span>
    </div>

    <div v-else-if="error" class="error-state">
      <i class="pi pi-exclamation-circle" />
      <span>{{ error }}</span>
      <button class="btn btn-sm" @click="loadUsers">Retry</button>
    </div>

    <div v-else class="users-content">
      <div class="users-table-container">
        <table class="data-table">
          <thead>
            <tr>
              <th>Username</th>
              <th>Email</th>
              <th>Role</th>
              <th>Permissions</th>
              <th>Deployments</th>
              <th>Status</th>
              <th>Actions</th>
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
                <span class="role-badge" :class="user.role">{{ user.role }}</span>
              </td>
              <td>
                <span v-if="user.permissions && user.permissions.length" class="perm-indicator custom">
                  Custom ({{ user.permissions.length }})
                </span>
                <span v-else class="perm-indicator default">Role defaults</span>
              </td>
              <td>
                <span class="deploy-count">{{ user.deployment_count ?? 0 }}</span>
              </td>
              <td>
                <span class="status-badge" :class="user.is_active ? 'active' : 'inactive'">
                  {{ user.is_active ? "Active" : "Inactive" }}
                </span>
              </td>
              <td class="actions-cell">
                <button v-if="canWrite" class="btn btn-icon btn-sm" title="Edit" @click="editUser(user)">
                  <i class="pi pi-pencil" />
                </button>
                <button
                  v-if="canDelete && user.id !== currentUser?.id"
                  class="btn btn-icon btn-sm btn-danger"
                  title="Delete"
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
    <TabbedFormModal
      v-if="showCreateDialog || showEditDialog"
      :title="showEditDialog ? 'Edit User' : 'Create User'"
      :tabs="userTabs"
      :active-tab="activeTab"
      :submitting="saving"
      :submit-label="showEditDialog ? 'Update' : 'Create'"
      submitting-label="Saving..."
      @update:active-tab="activeTab = $event as 'profile' | 'permissions' | 'deployments'"
      @close="closeDialogs"
      @submit="showEditDialog ? updateUser() : createUser()"
    >
      <template #profile>
        <div class="form-group">
          <label>Username</label>
          <input v-model="formData.username" type="text" required :disabled="showEditDialog" />
        </div>
        <div class="form-group">
          <label>Email</label>
          <input v-model="formData.email" type="email" />
        </div>
        <div v-if="!showEditDialog" class="form-group">
          <label>Password</label>
          <input v-model="formData.password" type="password" required />
        </div>
        <div class="form-group">
          <label>Role</label>
          <select v-model="formData.role" required>
            <option value="admin">Admin</option>
            <option value="operator">Operator</option>
            <option value="viewer">Viewer</option>
          </select>
        </div>
        <div v-if="showEditDialog" class="form-group">
          <label class="checkbox-label">
            <input v-model="formData.is_active" type="checkbox" />
            <span>Active</span>
          </label>
        </div>
      </template>

      <template #permissions>
        <div class="form-group">
          <label class="checkbox-label">
            <input v-model="formData.useCustomPermissions" type="checkbox" @change="onCustomPermissionsToggle" />
            <span>Customize permissions</span>
          </label>
          <p v-if="!formData.useCustomPermissions" class="tab-hint">
            Using <span class="role-perm-badge" :class="formData.role">{{ formData.role }}</span> role defaults. Enable
            the checkbox above to override.
          </p>
        </div>
        <PermissionPicker v-if="formData.useCustomPermissions" v-model="formData.customPermissions" />
        <PermissionPicker v-else :model-value="selectedRolePermissions" readonly />
      </template>

      <template #deployments>
        <DeploymentAccessField
          v-model="userDeploymentsMap"
          :available="allDeployments"
          hint="Control which deployments this user can access and at what level. Changes take effect when you save."
          empty-hint="No deployment access assigned"
          default-level="read"
        />
      </template>
    </TabbedFormModal>

    <!-- Delete Confirmation -->
    <div v-if="showDeleteDialog" class="modal-overlay" @click.self="closeDialogs">
      <div class="modal-content modal-sm">
        <div class="modal-header">
          <h2>Delete User</h2>
        </div>
        <p>
          Are you sure you want to delete user <strong>{{ selectedUser?.username }}</strong
          >?
        </p>
        <div class="modal-actions">
          <button class="btn" @click="closeDialogs">Cancel</button>
          <button class="btn btn-danger" :disabled="saving" @click="deleteUser">
            {{ saving ? "Deleting..." : "Delete" }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, watch } from "vue";
import type { User, UserRole, UserDeploymentAccess, Permission, DeploymentAccessMap } from "@/types";
import { useUsersStore } from "@/stores/users";
import { useAuthStore } from "@/stores/auth";
import { deploymentsApi } from "@/services/api";
import PermissionPicker from "@/components/PermissionPicker.vue";
import TabbedFormModal, { type TabbedFormModalTab } from "@/components/TabbedFormModal.vue";
import DeploymentAccessField from "@/components/DeploymentAccessField.vue";
import { getRolePermissions } from "@/utils/permissions";
import { useNotificationsStore } from "@/stores/notifications";

const notifications = useNotificationsStore();

const usersStore = useUsersStore();
const authStore = useAuthStore();

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
const userDeploymentsMap = ref<DeploymentAccessMap>({});
const userDeploymentsBaseline = ref<DeploymentAccessMap>({});
const allDeployments = ref<string[]>([]);

const selectedRolePermissions = computed(() => getRolePermissions(formData.value.role));

const onCustomPermissionsToggle = () => {
  if (formData.value.useCustomPermissions) {
    formData.value.customPermissions = [...getRolePermissions(formData.value.role)];
  }
};

const userTabs = computed<TabbedFormModalTab[]>(() => [
  { id: "profile", label: "Profile", icon: "pi pi-user" },
  { id: "permissions", label: "Permissions", icon: "pi pi-shield" },
  {
    id: "deployments",
    label: "Deployments",
    icon: "pi pi-box",
    visible: showEditDialog.value,
    count: Object.keys(userDeploymentsMap.value).length || undefined,
  },
]);

watch([showCreateDialog, showEditDialog], ([create, edit]) => {
  if (create || edit) activeTab.value = "profile";
});

const loadUsers = async () => {
  await usersStore.fetchUsers();
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
  const initial: DeploymentAccessMap = {};
  for (const dep of userDeployments.value) {
    initial[dep.deployment_name] = dep.access_level as DeploymentAccessMap[string];
  }
  userDeploymentsMap.value = { ...initial };
  userDeploymentsBaseline.value = { ...initial };
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
    notifications.success("User Created", `${formData.value.username} added.`);
    closeDialogs();
  } catch (e: any) {
    notifications.error("Create Failed", e.message || "Could not create user");
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
    await applyDeploymentChanges(selectedUser.value.id);
    notifications.success("User Updated", `${selectedUser.value.username} saved.`);
    closeDialogs();
  } catch (e: any) {
    notifications.error("Update Failed", e.message || "Could not update user");
  } finally {
    saving.value = false;
  }
};

const deleteUser = async () => {
  if (!selectedUser.value) return;
  saving.value = true;
  try {
    const name = selectedUser.value.username;
    await usersStore.deleteUser(selectedUser.value.id);
    notifications.success("User Deleted", `${name} removed.`);
    closeDialogs();
  } catch (e: any) {
    notifications.error("Delete Failed", e.message || "Could not delete user");
  } finally {
    saving.value = false;
  }
};

const applyDeploymentChanges = async (userId: number) => {
  const next = userDeploymentsMap.value;
  const baseline = userDeploymentsBaseline.value;
  for (const name of Object.keys(baseline)) {
    if (!(name in next)) {
      await usersStore.removeDeploymentAccess(userId, name);
    }
  }
  for (const [name, level] of Object.entries(next)) {
    const prior = baseline[name];
    if (!prior) {
      await usersStore.assignDeployment(userId, name, level);
    } else if (prior !== level) {
      await usersStore.updateDeploymentAccess(userId, name, level);
    }
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
  userDeploymentsMap.value = {};
  userDeploymentsBaseline.value = {};
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
  color: var(--text-muted);
}

.error-state {
  color: var(--color-danger-600, #dc2626);
}

.users-table-container {
  background: var(--surface-raised);
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
  background: var(--surface-sunken);
  font-weight: 600;
  color: var(--text-muted);
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
  background: var(--color-danger-50, #fef2f2);
  color: var(--color-danger-700, #b91c1c);
}

.role-badge.operator {
  background: var(--color-warning-50, #fffbeb);
  color: var(--color-warning-700, #b45309);
}

.role-badge.viewer {
  background: var(--color-info-50, #eff6ff);
  color: var(--color-info-700, #1d4ed8);
}

.status-badge {
  display: inline-block;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 500;
}

.status-badge.active {
  background: var(--color-success-50, #f0fdf4);
  color: var(--success);
}

.status-badge.inactive {
  background: var(--color-gray-100, #f3f4f6);
  color: var(--text-muted);
}

.perm-indicator {
  display: inline-block;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 500;
}

.perm-indicator.custom {
  background: var(--color-warning-50, #fffbeb);
  color: var(--color-warning-700, #b45309);
}

.perm-indicator.default {
  background: var(--surface-sunken);
  color: var(--text-muted);
}

.deploy-count {
  font-weight: 500;
  color: var(--text-muted);
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
  background: var(--surface-raised);
  border-radius: var(--radius-xl);
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
  color: var(--text-muted);
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
  background: var(--surface-sunken);
  font-size: 0.6875rem;
  font-weight: 600;
  color: var(--text-muted);
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
  color: var(--text-muted);
  padding: 0;
}

.form-group {
  margin-bottom: 1rem;
}

.form-group label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 500;
  color: var(--text-muted);
}

.form-group input,
.form-group select {
  width: 100%;
  padding: 0.5rem 0.75rem;
  border: 1px solid var(--surface-border);
  border-radius: 4px;
  background: var(--surface-sunken);
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
  background: var(--color-danger-50, #fef2f2);
  color: var(--color-danger-700, #b91c1c);
}

.role-perm-badge.operator {
  background: var(--color-warning-50, #fffbeb);
  color: var(--color-warning-700, #b45309);
}

.role-perm-badge.viewer {
  background: var(--color-info-50, #eff6ff);
  color: var(--color-info-700, #1d4ed8);
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
  background: var(--surface-sunken);
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
  background: var(--surface-sunken);
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
  background: var(--surface-raised);
}

.no-deployments {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 2rem;
  color: var(--text-muted);
}

.btn {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 4px;
  background: var(--surface-sunken);
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
  background: var(--color-danger-500, #ef4444);
  color: white;
}

.btn-danger:hover {
  background: var(--color-danger-600, #dc2626);
}

.btn-icon {
  padding: 0.5rem;
}

.btn-sm {
  padding: 0.25rem 0.5rem;
  font-size: 0.8125rem;
}
</style>
