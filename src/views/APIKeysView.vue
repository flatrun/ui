<template>
  <div class="apikeys-view">
    <div class="view-header">
      <h1>API Keys</h1>
      <div class="header-actions">
        <button class="btn btn-icon" :disabled="loading" @click="loadAPIKeys">
          <i class="pi pi-refresh" :class="{ 'pi-spin': loading }" />
        </button>
        <button v-if="canWrite" class="btn btn-primary" @click="openCreateDialog">
          <i class="pi pi-plus" />
          <span>Create API Key</span>
        </button>
      </div>
    </div>

    <div v-if="loading && !apiKeys.length" class="loading-state">
      <i class="pi pi-spin pi-spinner" />
      <span>Loading API keys...</span>
    </div>

    <div v-else-if="error" class="error-state">
      <i class="pi pi-exclamation-circle" />
      <span>{{ error }}</span>
      <button class="btn btn-sm" @click="loadAPIKeys">Retry</button>
    </div>

    <div v-else class="apikeys-content">
      <div class="apikeys-table-container">
        <table class="data-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Key Prefix</th>
              <th>Role</th>
              <th>Status</th>
              <th>Last Used</th>
              <th>Expires</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="key in apiKeys" :key="key.id">
              <td class="name-cell">
                <i class="pi pi-key" />
                <div>
                  <span class="key-name">{{ key.name }}</span>
                  <span v-if="key.description" class="key-desc">{{ key.description }}</span>
                </div>
              </td>
              <td>
                <code>{{ key.key_prefix }}</code>
              </td>
              <td>
                <span v-if="key.role" class="role-badge" :class="key.role">{{ key.role }}</span>
                <span v-else class="role-badge inherit">Inherited</span>
              </td>
              <td>
                <span class="status-badge" :class="key.is_active ? 'active' : 'inactive'">
                  {{ key.is_active ? "Active" : "Revoked" }}
                </span>
              </td>
              <td>{{ formatDate(key.last_used_at) }}</td>
              <td>{{ formatExpiry(key.expires_at) }}</td>
              <td class="actions-cell">
                <button v-if="canWrite" class="btn btn-icon btn-sm" title="Edit" @click="confirmEdit(key)">
                  <i class="pi pi-pencil" />
                </button>
                <button
                  v-if="key.is_active && canWrite"
                  class="btn btn-icon btn-sm"
                  title="Revoke"
                  @click="confirmRevoke(key)"
                >
                  <i class="pi pi-ban" />
                </button>
                <button
                  v-if="canDelete"
                  class="btn btn-icon btn-sm btn-danger"
                  title="Delete"
                  @click="confirmDelete(key)"
                >
                  <i class="pi pi-trash" />
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Create Dialog -->
    <TabbedFormModal
      v-if="showCreateDialog"
      :title="'Create API Key'"
      :tabs="createTabs"
      :active-tab="activeTab"
      :submitting="saving"
      submit-label="Create"
      submitting-label="Creating..."
      @update:active-tab="activeTab = $event as 'profile' | 'permissions' | 'deployments'"
      @close="closeDialogs"
      @submit="createAPIKey"
    >
      <template #profile>
        <div class="form-group">
          <label>Name</label>
          <input v-model="formData.name" type="text" placeholder="e.g., CI/CD Pipeline" required />
        </div>
        <div class="form-group">
          <label>Description (optional)</label>
          <input v-model="formData.description" type="text" placeholder="What is this key used for?" />
        </div>
        <div class="form-group">
          <label>Role Override (optional)</label>
          <select v-model="formData.role" @change="onRoleChange">
            <option value="">Inherit from user</option>
            <option v-if="authStore.isAdmin" value="admin">Admin</option>
            <option value="operator">Operator</option>
            <option value="viewer">Viewer</option>
          </select>
          <small>Leave empty to inherit the role from the user account.</small>
        </div>
        <div class="form-group">
          <label>Expiration</label>
          <select v-model="formData.expires_in">
            <option :value="0">Never</option>
            <option :value="86400">1 day</option>
            <option :value="604800">7 days</option>
            <option :value="2592000">30 days</option>
            <option :value="7776000">90 days</option>
            <option :value="31536000">1 year</option>
          </select>
        </div>
      </template>

      <template #permissions>
        <div class="form-group">
          <label class="checkbox-label">
            <input v-model="formData.useCustomPermissions" type="checkbox" @change="onCustomPermissionsToggle" />
            <span>Customize permissions</span>
          </label>
          <p v-if="!formData.useCustomPermissions" class="tab-hint">
            Using
            <span class="role-perm-badge" :class="formData.role || 'inherit'">{{ formData.role || "inherited" }}</span>
            defaults. Enable the checkbox to override.
          </p>
        </div>
        <PermissionPicker v-if="formData.useCustomPermissions" v-model="formData.permissions" />
        <PermissionPicker v-else :model-value="roleDefaultPermissions" readonly />
      </template>

      <template #deployments>
        <DeploymentAccessField
          v-model="formData.deployments"
          :available="availableDeployments"
          hint="Leave empty to allow access to any deployment the user can reach. Listed deployments cap this key to those (and at most the chosen level). System-level permissions are not affected."
          empty-hint="No deployment restrictions"
          default-level="read"
        />
      </template>
    </TabbedFormModal>

    <!-- Edit Dialog -->
    <TabbedFormModal
      v-if="showEditDialog"
      :title="'Edit API Key'"
      :tabs="editTabs"
      :active-tab="activeTab"
      :submitting="saving"
      submit-label="Save"
      submitting-label="Saving..."
      @update:active-tab="activeTab = $event as 'profile' | 'permissions' | 'deployments'"
      @close="closeDialogs"
      @submit="updateKey"
    >
      <template #profile>
        <div class="form-group">
          <label>Name</label>
          <input v-model="editFormData.name" type="text" required />
        </div>
        <div class="form-group">
          <label>Description (optional)</label>
          <input v-model="editFormData.description" type="text" />
        </div>
        <div class="form-group">
          <label>Role Override (optional)</label>
          <select v-model="editFormData.role">
            <option value="">Inherit from user</option>
            <option v-if="authStore.isAdmin" value="admin">Admin</option>
            <option value="operator">Operator</option>
            <option value="viewer">Viewer</option>
          </select>
        </div>
        <div class="form-group">
          <label>Extend expiration (optional)</label>
          <select v-model="editFormData.expires_in">
            <option :value="0">Keep current</option>
            <option :value="86400">1 day from now</option>
            <option :value="604800">7 days from now</option>
            <option :value="2592000">30 days from now</option>
            <option :value="7776000">90 days from now</option>
            <option :value="31536000">1 year from now</option>
          </select>
          <small>"Keep current" leaves expiration untouched; pick a duration to reset it.</small>
        </div>
      </template>

      <template #permissions>
        <div class="form-group">
          <label class="checkbox-label">
            <input v-model="editFormData.useCustomPermissions" type="checkbox" />
            <span>Customize permissions</span>
          </label>
        </div>
        <PermissionPicker v-if="editFormData.useCustomPermissions" v-model="editFormData.permissions" />
      </template>

      <template #deployments>
        <DeploymentAccessField
          v-model="editFormData.deployments"
          :available="availableDeployments"
          hint="Leave empty to allow access to any deployment. Listed deployments cap this key to those (and at most the chosen level). System-level permissions are not affected."
          empty-hint="No deployment restrictions"
          default-level="read"
        />
      </template>
    </TabbedFormModal>

    <!-- New Key Dialog -->
    <div v-if="showNewKeyDialog" class="modal-overlay">
      <div class="modal-content">
        <div class="modal-header">
          <h2>API Key Created</h2>
        </div>
        <div class="new-key-content">
          <div class="warning-banner">
            <i class="pi pi-exclamation-triangle" />
            <span>Copy this key now. You won't be able to see it again!</span>
          </div>
          <div class="key-display">
            <code>{{ newKeyValue }}</code>
            <button class="btn btn-icon" @click="copyKey">
              <i class="pi" :class="copied ? 'pi-check' : 'pi-copy'" />
            </button>
          </div>
        </div>
        <div class="modal-actions">
          <button class="btn btn-primary" @click="closeNewKeyDialog">Done</button>
        </div>
      </div>
    </div>

    <!-- Revoke Confirmation -->
    <div v-if="showRevokeDialog" class="modal-overlay" @click.self="closeDialogs">
      <div class="modal-content modal-sm">
        <div class="modal-header">
          <h2>Revoke API Key</h2>
        </div>
        <p>
          Are you sure you want to revoke API key <strong>{{ selectedKey?.name }}</strong
          >? This action cannot be undone.
        </p>
        <div class="modal-actions">
          <button class="btn" @click="closeDialogs">Cancel</button>
          <button class="btn btn-danger" :disabled="saving" @click="revokeKey">
            {{ saving ? "Revoking..." : "Revoke" }}
          </button>
        </div>
      </div>
    </div>

    <!-- Delete Confirmation -->
    <div v-if="showDeleteDialog" class="modal-overlay" @click.self="closeDialogs">
      <div class="modal-content modal-sm">
        <div class="modal-header">
          <h2>Delete API Key</h2>
        </div>
        <p>
          Are you sure you want to delete API key <strong>{{ selectedKey?.name }}</strong
          >?
        </p>
        <div class="modal-actions">
          <button class="btn" @click="closeDialogs">Cancel</button>
          <button class="btn btn-danger" :disabled="saving" @click="deleteKey">
            {{ saving ? "Deleting..." : "Delete" }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from "vue";
import type { APIKey, UserRole, Permission } from "@/types";
import { useUsersStore } from "@/stores/users";
import { useAuthStore } from "@/stores/auth";
import PermissionPicker from "@/components/PermissionPicker.vue";
import { getRolePermissions } from "@/utils/permissions";
import { deploymentsApi } from "@/services/api";
import { useNotificationsStore } from "@/stores/notifications";
import TabbedFormModal, { type TabbedFormModalTab } from "@/components/TabbedFormModal.vue";
import DeploymentAccessField from "@/components/DeploymentAccessField.vue";
import type { DeploymentAccessMap } from "@/types";

const usersStore = useUsersStore();
const authStore = useAuthStore();
const notifications = useNotificationsStore();

const apiKeys = computed(() => usersStore.apiKeys);
const loading = computed(() => usersStore.loading);
const error = computed(() => usersStore.error);
const canWrite = computed(() => authStore.hasPermission("apikeys:write" as Permission));
const canDelete = computed(() => authStore.hasPermission("apikeys:delete" as Permission));

const showCreateDialog = ref(false);
const showNewKeyDialog = ref(false);
const showRevokeDialog = ref(false);
const showDeleteDialog = ref(false);
const selectedKey = ref<APIKey | null>(null);
const newKeyValue = ref("");
const copied = ref(false);
const saving = ref(false);

const availableDeployments = ref<string[]>([]);

const showEditDialog = ref(false);
const editingKeyId = ref<number | null>(null);
const activeTab = ref<"profile" | "permissions" | "deployments">("profile");

const createTabs = computed<TabbedFormModalTab[]>(() => [
  { id: "profile", label: "Profile", icon: "pi pi-user" },
  { id: "permissions", label: "Permissions", icon: "pi pi-shield" },
  {
    id: "deployments",
    label: "Deployments",
    icon: "pi pi-box",
    count: Object.keys(formData.value.deployments).length || undefined,
  },
]);

const editTabs = computed<TabbedFormModalTab[]>(() => [
  { id: "profile", label: "Profile", icon: "pi pi-user" },
  { id: "permissions", label: "Permissions", icon: "pi pi-shield" },
  {
    id: "deployments",
    label: "Deployments",
    icon: "pi pi-box",
    count: Object.keys(editFormData.value.deployments).length || undefined,
  },
]);

const blankForm = () => ({
  name: "",
  description: "",
  role: "" as UserRole | "",
  expires_in: 0,
  useCustomPermissions: false,
  permissions: [] as string[],
  deployments: {} as DeploymentAccessMap,
});

const formData = ref(blankForm());
const editFormData = ref(blankForm());

const roleDefaultPermissions = computed(() => {
  if (!formData.value.role) return [];
  return getRolePermissions(formData.value.role as UserRole);
});

const onRoleChange = () => {
  if (formData.value.useCustomPermissions && formData.value.role) {
    formData.value.permissions = getRolePermissions(formData.value.role as UserRole);
  }
};

const onCustomPermissionsToggle = () => {
  if (formData.value.useCustomPermissions) {
    const role = formData.value.role || authStore.currentUser?.role;
    formData.value.permissions = role ? getRolePermissions(role as UserRole) : [];
  }
};

const loadAPIKeys = async () => {
  await usersStore.fetchAPIKeys();
};

const createAPIKey = async () => {
  saving.value = true;
  try {
    const result = await usersStore.createAPIKey({
      name: formData.value.name,
      description: formData.value.description || undefined,
      role: formData.value.role || undefined,
      permissions: formData.value.useCustomPermissions ? formData.value.permissions : undefined,
      deployments: Object.keys(formData.value.deployments).length ? formData.value.deployments : undefined,
      expires_in: formData.value.expires_in || undefined,
    });
    newKeyValue.value = result.api_key.key || "";
    showCreateDialog.value = false;
    showNewKeyDialog.value = true;
    formData.value = blankForm();
  } catch (e: any) {
    notifications.error("Create Failed", e.message || "Could not create API key");
  } finally {
    saving.value = false;
  }
};

const openCreateDialog = () => {
  formData.value = blankForm();
  activeTab.value = "profile";
  showCreateDialog.value = true;
};

const confirmEdit = (key: APIKey) => {
  selectedKey.value = key;
  editingKeyId.value = key.id;
  activeTab.value = "profile";
  editFormData.value = {
    name: key.name,
    description: key.description || "",
    role: (key.role as UserRole | "") || "",
    expires_in: 0,
    useCustomPermissions: Array.isArray(key.permissions) && key.permissions.length > 0,
    permissions: Array.isArray(key.permissions) ? [...key.permissions] : [],
    deployments:
      key.deployments && typeof key.deployments === "object" ? { ...key.deployments } : ({} as DeploymentAccessMap),
  };
  showEditDialog.value = true;
};

const updateKey = async () => {
  if (editingKeyId.value === null) return;
  saving.value = true;
  try {
    const payload: {
      name: string;
      description: string;
      role: UserRole | "";
      permissions: string[];
      deployments: DeploymentAccessMap;
      expires_in?: number;
    } = {
      name: editFormData.value.name,
      description: editFormData.value.description,
      role: editFormData.value.role,
      permissions: editFormData.value.useCustomPermissions ? editFormData.value.permissions : [],
      deployments: editFormData.value.deployments,
    };
    if (editFormData.value.expires_in > 0) {
      payload.expires_in = editFormData.value.expires_in;
    }
    await usersStore.updateAPIKey(editingKeyId.value, payload);
    notifications.success("Updated", `API key "${editFormData.value.name}" updated.`);
    closeDialogs();
  } catch (e: any) {
    notifications.error("Update Failed", e.message || "Could not update API key");
  } finally {
    saving.value = false;
  }
};

const confirmRevoke = (key: APIKey) => {
  selectedKey.value = key;
  showRevokeDialog.value = true;
};

const confirmDelete = (key: APIKey) => {
  selectedKey.value = key;
  showDeleteDialog.value = true;
};

const revokeKey = async () => {
  if (!selectedKey.value) return;
  saving.value = true;
  try {
    const name = selectedKey.value.name;
    await usersStore.revokeAPIKey(selectedKey.value.id);
    notifications.success("Revoked", `API key "${name}" was revoked.`);
    closeDialogs();
  } catch (e: any) {
    notifications.error("Revoke Failed", e.message || "Could not revoke API key");
  } finally {
    saving.value = false;
  }
};

const deleteKey = async () => {
  if (!selectedKey.value) return;
  saving.value = true;
  try {
    const name = selectedKey.value.name;
    await usersStore.deleteAPIKey(selectedKey.value.id);
    notifications.success("Deleted", `API key "${name}" was deleted.`);
    closeDialogs();
  } catch (e: any) {
    notifications.error("Delete Failed", e.message || "Could not delete API key");
  } finally {
    saving.value = false;
  }
};

const copyKey = async () => {
  try {
    await navigator.clipboard.writeText(newKeyValue.value);
    copied.value = true;
    setTimeout(() => {
      copied.value = false;
    }, 2000);
  } catch {
    // fallback
  }
};

const closeDialogs = () => {
  showCreateDialog.value = false;
  showEditDialog.value = false;
  showRevokeDialog.value = false;
  showDeleteDialog.value = false;
  selectedKey.value = null;
  editingKeyId.value = null;
};

const closeNewKeyDialog = () => {
  showNewKeyDialog.value = false;
  newKeyValue.value = "";
};

const isMeaningfulDate = (date?: string | null) => {
  if (!date) return false;
  const d = new Date(date);
  return !Number.isNaN(d.getTime()) && d.getFullYear() > 1;
};

const formatDate = (date?: string | null) => {
  if (!isMeaningfulDate(date)) return "Never";
  return new Date(date as string).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const formatExpiry = (date?: string | null) => {
  if (!isMeaningfulDate(date)) return "Never";
  const d = new Date(date as string);
  if (d < new Date()) return "Expired";
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

const loadDeployments = async () => {
  try {
    const response = await deploymentsApi.list();
    availableDeployments.value = response.data.deployments.map((d) => d.name).filter((n): n is string => !!n);
  } catch {
    availableDeployments.value = [];
  }
};

onMounted(() => {
  loadAPIKeys();
  loadDeployments();
});
</script>

<style scoped>
.apikeys-view {
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

.apikeys-table-container {
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

.name-cell {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.name-cell > div {
  display: flex;
  flex-direction: column;
}

.key-name {
  font-weight: 500;
}

.key-desc {
  font-size: 0.75rem;
  color: var(--text-secondary);
}

code {
  padding: 0.25rem 0.5rem;
  background: var(--surface-ground);
  border-radius: 4px;
  font-family: monospace;
  font-size: 0.8125rem;
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

.role-badge.inherit {
  background: rgba(var(--text-secondary-rgb), 0.1);
  color: var(--text-secondary);
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
  border-radius: var(--radius-xl);
  width: 100%;
  max-width: 960px;
  max-height: 90vh;
  overflow-y: auto;
}

.modal-content.modal-sm {
  max-width: 400px;
}

.form-grid {
  display: flex;
  flex-direction: column;
  gap: 0;
}

.form-col {
  min-width: 0;
}

@media (min-width: 720px) {
  .form-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1.5rem;
  }
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

.form-group small {
  display: block;
  margin-top: 0.25rem;
  font-size: 0.75rem;
  color: var(--text-secondary);
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
}

.checkbox-label input[type="checkbox"] {
  width: auto;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
  padding: 1rem 1.5rem;
  border-top: 1px solid var(--surface-border);
}

.new-key-content {
  padding: 1.5rem;
}

.warning-banner {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  background: rgba(var(--warning-rgb), 0.1);
  border: 1px solid var(--warning);
  border-radius: 4px;
  color: var(--warning);
  margin-bottom: 1rem;
}

.key-display {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem;
  background: var(--surface-ground);
  border-radius: 4px;
}

.key-display code {
  flex: 1;
  word-break: break-all;
  background: transparent;
  padding: 0;
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
