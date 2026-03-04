<template>
  <div class="apikeys-view">
    <div class="view-header">
      <h1>{{ t("apiKeys.title") }}</h1>
      <div class="header-actions">
        <button class="btn btn-icon" :disabled="loading" @click="loadAPIKeys">
          <i class="pi pi-refresh" :class="{ 'pi-spin': loading }" />
        </button>
        <button v-if="canWrite" class="btn btn-primary" @click="showCreateDialog = true">
          <i class="pi pi-plus" />
          <span>{{ t("apiKeys.actions.createKey") }}</span>
        </button>
      </div>
    </div>

    <div v-if="loading && !apiKeys.length" class="loading-state">
      <i class="pi pi-spin pi-spinner" />
      <span>{{ t("apiKeys.loading") }}</span>
    </div>

    <div v-else-if="error" class="error-state">
      <i class="pi pi-exclamation-circle" />
      <span>{{ error }}</span>
      <button class="btn btn-sm" @click="loadAPIKeys">{{ t("apiKeys.actions.retry") }}</button>
    </div>

    <div v-else class="apikeys-content">
      <div class="apikeys-table-container">
        <table class="data-table">
          <thead>
            <tr>
              <th>{{ t("apiKeys.table.columns.name") }}</th>
              <th>{{ t("apiKeys.table.columns.keyPrefix") }}</th>
              <th>{{ t("apiKeys.table.columns.role") }}</th>
              <th>{{ t("apiKeys.table.columns.status") }}</th>
              <th>{{ t("apiKeys.table.columns.lastUsed") }}</th>
              <th>{{ t("apiKeys.table.columns.expires") }}</th>
              <th>{{ t("apiKeys.table.columns.actions") }}</th>
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
                <span v-if="key.role" class="role-badge" :class="key.role">{{ formatRole(key.role) }}</span>
                <span v-else class="role-badge inherit">{{ t("apiKeys.roles.inherited") }}</span>
              </td>
              <td>
                <span class="status-badge" :class="key.is_active ? 'active' : 'inactive'">
                  {{ key.is_active ? t("apiKeys.status.active") : t("apiKeys.status.revoked") }}
                </span>
              </td>
              <td>{{ formatDate(key.last_used_at) }}</td>
              <td>{{ formatExpiry(key.expires_at) }}</td>
              <td class="actions-cell">
                <button
                  v-if="key.is_active && canWrite"
                  class="btn btn-icon btn-sm"
                  :title="t('apiKeys.actions.revoke')"
                  @click="confirmRevoke(key)"
                >
                  <i class="pi pi-ban" />
                </button>
                <button
                  v-if="canDelete"
                  class="btn btn-icon btn-sm btn-danger"
                  :title="t('apiKeys.actions.delete')"
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
    <div v-if="showCreateDialog" class="modal-overlay" @click.self="closeDialogs">
      <div class="modal-content">
        <div class="modal-header">
          <h2>{{ t("apiKeys.create.title") }}</h2>
          <button class="btn btn-icon" @click="closeDialogs">
            <i class="pi pi-times" />
          </button>
        </div>
        <form @submit.prevent="createAPIKey">
          <div class="form-group">
            <label>{{ t("apiKeys.create.fields.name") }}</label>
            <input v-model="formData.name" type="text" :placeholder="t('apiKeys.create.placeholders.name')" required />
          </div>
          <div class="form-group">
            <label>{{ t("apiKeys.create.fields.descriptionOptional") }}</label>
            <input
              v-model="formData.description"
              type="text"
              :placeholder="t('apiKeys.create.placeholders.description')"
            />
          </div>
          <div class="form-group">
            <label>{{ t("apiKeys.create.fields.roleOverrideOptional") }}</label>
            <select v-model="formData.role" @change="onRoleChange">
              <option value="">{{ t("apiKeys.create.options.inheritFromUser") }}</option>
              <option v-if="authStore.isAdmin" value="admin">{{ t("users.roles.admin") }}</option>
              <option value="operator">{{ t("users.roles.operator") }}</option>
              <option value="viewer">{{ t("users.roles.viewer") }}</option>
            </select>
            <small>{{ t("apiKeys.create.hints.roleInherit") }}</small>
          </div>
          <div class="form-group">
            <label class="checkbox-label">
              <input v-model="formData.useCustomPermissions" type="checkbox" @change="onCustomPermissionsToggle" />
              <span>{{ t("apiKeys.create.fields.customizePermissions") }}</span>
            </label>
            <small>{{ t("apiKeys.create.hints.customizePermissions") }}</small>
          </div>
          <div v-if="formData.useCustomPermissions" class="form-group">
            <label>{{ t("apiKeys.create.fields.permissions") }}</label>
            <PermissionPicker v-model="formData.permissions" />
          </div>
          <div v-else-if="formData.role" class="form-group">
            <label>{{ t("apiKeys.create.fields.rolePermissions", { role: formatRole(formData.role) }) }}</label>
            <PermissionPicker :model-value="roleDefaultPermissions" readonly />
          </div>
          <div class="form-group">
            <label>{{ t("apiKeys.create.fields.expiration") }}</label>
            <select v-model="formData.expires_in">
              <option :value="0">{{ t("apiKeys.expiration.never") }}</option>
              <option :value="86400">{{ t("apiKeys.expiration.days", { n: 1 }) }}</option>
              <option :value="604800">{{ t("apiKeys.expiration.days", { n: 7 }) }}</option>
              <option :value="2592000">{{ t("apiKeys.expiration.days", { n: 30 }) }}</option>
              <option :value="7776000">{{ t("apiKeys.expiration.days", { n: 90 }) }}</option>
              <option :value="31536000">{{ t("apiKeys.expiration.years", { n: 1 }) }}</option>
            </select>
          </div>
          <div class="modal-actions">
            <button type="button" class="btn" @click="closeDialogs">{{ t("common.cancel") }}</button>
            <button type="submit" class="btn btn-primary" :disabled="saving">
              {{ saving ? t("apiKeys.actions.creating") : t("apiKeys.actions.create") }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- New Key Dialog -->
    <div v-if="showNewKeyDialog" class="modal-overlay">
      <div class="modal-content">
        <div class="modal-header">
          <h2>{{ t("apiKeys.newKey.title") }}</h2>
        </div>
        <div class="new-key-content">
          <div class="warning-banner">
            <i class="pi pi-exclamation-triangle" />
            <span>{{ t("apiKeys.newKey.warning") }}</span>
          </div>
          <div class="key-display">
            <code>{{ newKeyValue }}</code>
            <button class="btn btn-icon" @click="copyKey">
              <i class="pi" :class="copied ? 'pi-check' : 'pi-copy'" />
            </button>
          </div>
        </div>
        <div class="modal-actions">
          <button class="btn btn-primary" @click="closeNewKeyDialog">{{ t("apiKeys.actions.done") }}</button>
        </div>
      </div>
    </div>

    <!-- Revoke Confirmation -->
    <div v-if="showRevokeDialog" class="modal-overlay" @click.self="closeDialogs">
      <div class="modal-content modal-sm">
        <div class="modal-header">
          <h2>{{ t("apiKeys.revoke.title") }}</h2>
        </div>
        <i18n-t keypath="apiKeys.revoke.message" tag="p">
          <strong>{{ selectedKey?.name }}</strong>
        </i18n-t>
        <div class="modal-actions">
          <button class="btn" @click="closeDialogs">{{ t("common.cancel") }}</button>
          <button class="btn btn-danger" :disabled="saving" @click="revokeKey">
            {{ saving ? t("apiKeys.actions.revoking") : t("apiKeys.actions.revoke") }}
          </button>
        </div>
      </div>
    </div>

    <!-- Delete Confirmation -->
    <div v-if="showDeleteDialog" class="modal-overlay" @click.self="closeDialogs">
      <div class="modal-content modal-sm">
        <div class="modal-header">
          <h2>{{ t("apiKeys.delete.title") }}</h2>
        </div>
        <i18n-t keypath="apiKeys.delete.message" tag="p">
          <strong>{{ selectedKey?.name }}</strong>
        </i18n-t>
        <div class="modal-actions">
          <button class="btn" @click="closeDialogs">{{ t("common.cancel") }}</button>
          <button class="btn btn-danger" :disabled="saving" @click="deleteKey">
            {{ saving ? t("apiKeys.actions.deleting") : t("apiKeys.actions.delete") }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from "vue";
import { useI18n } from "vue-i18n";
import type { APIKey, UserRole, Permission } from "@/types";
import { useUsersStore } from "@/stores/users";
import { useAuthStore } from "@/stores/auth";
import { useNotificationsStore } from "@/stores/notifications";
import PermissionPicker from "@/components/PermissionPicker.vue";
import { getRolePermissions } from "@/utils/permissions";

const usersStore = useUsersStore();
const authStore = useAuthStore();
const notifications = useNotificationsStore();
const { t, te, locale } = useI18n();

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

const formData = ref({
  name: "",
  description: "",
  role: "" as UserRole | "",
  expires_in: 0,
  useCustomPermissions: false,
  permissions: [] as string[],
});

const roleDefaultPermissions = computed(() => {
  if (!formData.value.role) return [];
  return getRolePermissions(formData.value.role as UserRole);
});

const formatRole = (role: string) => {
  const key = `users.roles.${role}`;
  return te(key) ? t(key) : role;
};

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
      expires_in: formData.value.expires_in || undefined,
    });
    newKeyValue.value = result.api_key.key || "";
    showCreateDialog.value = false;
    showNewKeyDialog.value = true;
    notifications.success(t("apiKeys.notifications.createdTitle"), t("apiKeys.notifications.createdDesc"));
    formData.value = {
      name: "",
      description: "",
      role: "",
      expires_in: 0,
      useCustomPermissions: false,
      permissions: [],
    };
  } catch (e: any) {
    notifications.error(t("apiKeys.notifications.createFailedTitle"), e.response?.data?.error || e.message);
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
    await usersStore.revokeAPIKey(selectedKey.value.id);
    notifications.success(t("apiKeys.notifications.revokedTitle"), t("apiKeys.notifications.revokedDesc"));
    closeDialogs();
  } catch (e: any) {
    notifications.error(t("apiKeys.notifications.revokeFailedTitle"), e.response?.data?.error || e.message);
  } finally {
    saving.value = false;
  }
};

const deleteKey = async () => {
  if (!selectedKey.value) return;
  saving.value = true;
  try {
    await usersStore.deleteAPIKey(selectedKey.value.id);
    notifications.success(t("apiKeys.notifications.deletedTitle"), t("apiKeys.notifications.deletedDesc"));
    closeDialogs();
  } catch (e: any) {
    notifications.error(t("apiKeys.notifications.deleteFailedTitle"), e.response?.data?.error || e.message);
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
  showRevokeDialog.value = false;
  showDeleteDialog.value = false;
  selectedKey.value = null;
};

const closeNewKeyDialog = () => {
  showNewKeyDialog.value = false;
  newKeyValue.value = "";
};

const formatDate = (date?: string) => {
  if (!date) return t("apiKeys.value.never");
  return new Date(date).toLocaleDateString(locale.value || undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const formatExpiry = (date?: string) => {
  if (!date) return t("apiKeys.value.never");
  const d = new Date(date);
  if (d < new Date()) return t("apiKeys.value.expired");
  return d.toLocaleDateString(locale.value || undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

onMounted(() => {
  loadAPIKeys();
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
  border-radius: 8px;
  width: 100%;
  max-width: 720px;
  max-height: 90vh;
  overflow-y: auto;
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
