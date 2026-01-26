<template>
  <div class="users-view">
    <div class="view-header">
      <h1>Users</h1>
      <div class="header-actions">
        <button class="btn btn-icon" :disabled="loading" @click="loadUsers">
          <i class="pi pi-refresh" :class="{ 'pi-spin': loading }" />
        </button>
        <button class="btn btn-primary" @click="showCreateDialog = true">
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
              <th>Status</th>
              <th>Last Login</th>
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
                <span class="status-badge" :class="user.is_active ? 'active' : 'inactive'">
                  {{ user.is_active ? "Active" : "Inactive" }}
                </span>
              </td>
              <td>{{ formatDate(user.last_login_at) }}</td>
              <td class="actions-cell">
                <button class="btn btn-icon btn-sm" title="Edit" @click="editUser(user)">
                  <i class="pi pi-pencil" />
                </button>
                <button class="btn btn-icon btn-sm" title="Manage Deployments" @click="manageDeployments(user)">
                  <i class="pi pi-box" />
                </button>
                <button
                  v-if="user.id !== currentUser?.id"
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
    <div v-if="showCreateDialog || showEditDialog" class="modal-overlay" @click.self="closeDialogs">
      <div class="modal-content">
        <div class="modal-header">
          <h2>{{ showEditDialog ? "Edit User" : "Create User" }}</h2>
          <button class="btn btn-icon" @click="closeDialogs">
            <i class="pi pi-times" />
          </button>
        </div>
        <form @submit.prevent="showEditDialog ? updateUser() : createUser()">
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
          <div class="modal-actions">
            <button type="button" class="btn" @click="closeDialogs">Cancel</button>
            <button type="submit" class="btn btn-primary" :disabled="saving">
              {{ saving ? "Saving..." : showEditDialog ? "Update" : "Create" }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Deployments Dialog -->
    <div v-if="showDeploymentsDialog" class="modal-overlay" @click.self="closeDialogs">
      <div class="modal-content modal-lg">
        <div class="modal-header">
          <h2>Deployment Access for {{ selectedUser?.username }}</h2>
          <button class="btn btn-icon" @click="closeDialogs">
            <i class="pi pi-times" />
          </button>
        </div>
        <div class="deployments-manager">
          <div class="add-deployment-form">
            <select v-model="newDeployment.name">
              <option value="">Select deployment...</option>
              <option v-for="dep in availableDeployments" :key="dep" :value="dep">{{ dep }}</option>
            </select>
            <select v-model="newDeployment.access_level">
              <option value="read">Read</option>
              <option value="write">Write</option>
              <option value="admin">Admin</option>
            </select>
            <button class="btn btn-primary btn-sm" :disabled="!newDeployment.name" @click="addDeploymentAccess">
              Add
            </button>
          </div>
          <div v-if="userDeployments.length" class="deployments-list">
            <div v-for="dep in userDeployments" :key="dep.deployment_name" class="deployment-item">
              <span class="deployment-name">{{ dep.deployment_name }}</span>
              <select :value="dep.access_level" @change="updateDeploymentAccess(dep.deployment_name, ($event.target as HTMLSelectElement).value)">
                <option value="read">Read</option>
                <option value="write">Write</option>
                <option value="admin">Admin</option>
              </select>
              <button class="btn btn-icon btn-sm btn-danger" @click="removeDeploymentAccess(dep.deployment_name)">
                <i class="pi pi-times" />
              </button>
            </div>
          </div>
          <div v-else class="no-deployments">
            <i class="pi pi-info-circle" />
            <span>No deployment access assigned</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Delete Confirmation -->
    <div v-if="showDeleteDialog" class="modal-overlay" @click.self="closeDialogs">
      <div class="modal-content modal-sm">
        <div class="modal-header">
          <h2>Delete User</h2>
        </div>
        <p>Are you sure you want to delete user <strong>{{ selectedUser?.username }}</strong>?</p>
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
import { ref, onMounted, computed } from "vue";
import type { User, UserRole, UserDeploymentAccess } from "@/types";
import { useUsersStore } from "@/stores/users";
import { useAuthStore } from "@/stores/auth";
import { deploymentsApi } from "@/services/api";

const usersStore = useUsersStore();
const authStore = useAuthStore();

const users = computed(() => usersStore.users);
const loading = computed(() => usersStore.loading);
const error = computed(() => usersStore.error);
const currentUser = computed(() => authStore.currentUser);

const showCreateDialog = ref(false);
const showEditDialog = ref(false);
const showDeleteDialog = ref(false);
const showDeploymentsDialog = ref(false);
const selectedUser = ref<User | null>(null);
const saving = ref(false);

const formData = ref({
  username: "",
  email: "",
  password: "",
  role: "viewer" as UserRole,
  is_active: true,
});

const userDeployments = ref<UserDeploymentAccess[]>([]);
const allDeployments = ref<string[]>([]);
const newDeployment = ref({ name: "", access_level: "read" });

const availableDeployments = computed(() => {
  const assigned = new Set(userDeployments.value.map((d) => d.deployment_name));
  return allDeployments.value.filter((d) => !assigned.has(d));
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

const editUser = (user: User) => {
  selectedUser.value = user;
  formData.value = {
    username: user.username,
    email: user.email || "",
    password: "",
    role: user.role,
    is_active: user.is_active,
  };
  showEditDialog.value = true;
};

const manageDeployments = async (user: User) => {
  selectedUser.value = user;
  try {
    userDeployments.value = await usersStore.getUserDeployments(user.id);
  } catch {
    userDeployments.value = [];
  }
  showDeploymentsDialog.value = true;
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
    });
    closeDialogs();
  } catch (e: any) {
    alert(e.message);
  } finally {
    saving.value = false;
  }
};

const updateUser = async () => {
  if (!selectedUser.value) return;
  saving.value = true;
  try {
    await usersStore.updateUser(selectedUser.value.id, {
      email: formData.value.email || undefined,
      role: formData.value.role,
      is_active: formData.value.is_active,
    });
    closeDialogs();
  } catch (e: any) {
    alert(e.message);
  } finally {
    saving.value = false;
  }
};

const deleteUser = async () => {
  if (!selectedUser.value) return;
  saving.value = true;
  try {
    await usersStore.deleteUser(selectedUser.value.id);
    closeDialogs();
  } catch (e: any) {
    alert(e.message);
  } finally {
    saving.value = false;
  }
};

const addDeploymentAccess = async () => {
  if (!selectedUser.value || !newDeployment.value.name) return;
  try {
    await usersStore.assignDeployment(selectedUser.value.id, newDeployment.value.name, newDeployment.value.access_level);
    userDeployments.value.push({
      deployment_name: newDeployment.value.name,
      access_level: newDeployment.value.access_level as "read" | "write" | "admin",
      created_at: new Date().toISOString(),
    });
    newDeployment.value = { name: "", access_level: "read" };
  } catch (e: any) {
    alert(e.message);
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
    alert(e.message);
  }
};

const removeDeploymentAccess = async (deploymentName: string) => {
  if (!selectedUser.value) return;
  try {
    await usersStore.removeDeploymentAccess(selectedUser.value.id, deploymentName);
    userDeployments.value = userDeployments.value.filter((d) => d.deployment_name !== deploymentName);
  } catch (e: any) {
    alert(e.message);
  }
};

const closeDialogs = () => {
  showCreateDialog.value = false;
  showEditDialog.value = false;
  showDeleteDialog.value = false;
  showDeploymentsDialog.value = false;
  selectedUser.value = null;
  formData.value = {
    username: "",
    email: "",
    password: "",
    role: "viewer",
    is_active: true,
  };
};

const formatDate = (date?: string) => {
  if (!date) return "Never";
  return new Date(date).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
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
  max-width: 480px;
  max-height: 90vh;
  overflow-y: auto;
}

.modal-content.modal-lg {
  max-width: 640px;
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

.modal-content form,
.modal-content p {
  padding: 1.5rem;
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

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
}

.checkbox-label input {
  width: auto;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
  padding: 1rem 1.5rem;
  border-top: 1px solid var(--surface-border);
}

.deployments-manager {
  padding: 1.5rem;
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
  background: var(--primary);
  color: white;
}

.btn-primary:hover {
  background: var(--primary-dark);
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
