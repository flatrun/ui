<template>
  <div class="apikeys-view">
    <div class="view-header">
      <h1>API Keys</h1>
      <div class="header-actions">
        <button class="btn btn-icon" :disabled="loading" @click="loadAPIKeys">
          <i class="pi pi-refresh" :class="{ 'pi-spin': loading }" />
        </button>
        <button class="btn btn-primary" @click="showCreateDialog = true">
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
                <button
                  v-if="key.is_active"
                  class="btn btn-icon btn-sm"
                  title="Revoke"
                  @click="confirmRevoke(key)"
                >
                  <i class="pi pi-ban" />
                </button>
                <button class="btn btn-icon btn-sm btn-danger" title="Delete" @click="confirmDelete(key)">
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
          <h2>Create API Key</h2>
          <button class="btn btn-icon" @click="closeDialogs">
            <i class="pi pi-times" />
          </button>
        </div>
        <form @submit.prevent="createAPIKey">
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
            <select v-model="formData.role">
              <option value="">Inherit from user</option>
              <option value="admin">Admin</option>
              <option value="operator">Operator</option>
              <option value="viewer">Viewer</option>
            </select>
            <small>Leave empty to inherit the role from the user account</small>
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
          <div class="modal-actions">
            <button type="button" class="btn" @click="closeDialogs">Cancel</button>
            <button type="submit" class="btn btn-primary" :disabled="saving">
              {{ saving ? "Creating..." : "Create" }}
            </button>
          </div>
        </form>
      </div>
    </div>

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
        <p>Are you sure you want to revoke API key <strong>{{ selectedKey?.name }}</strong>? This action cannot be undone.</p>
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
        <p>Are you sure you want to delete API key <strong>{{ selectedKey?.name }}</strong>?</p>
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
import type { APIKey, UserRole } from "@/types";
import { useUsersStore } from "@/stores/users";

const usersStore = useUsersStore();

const apiKeys = computed(() => usersStore.apiKeys);
const loading = computed(() => usersStore.loading);
const error = computed(() => usersStore.error);

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
});

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
      expires_in: formData.value.expires_in || undefined,
    });
    newKeyValue.value = result.api_key.key || "";
    showCreateDialog.value = false;
    showNewKeyDialog.value = true;
    formData.value = { name: "", description: "", role: "", expires_in: 0 };
  } catch (e: any) {
    alert(e.message);
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
    closeDialogs();
  } catch (e: any) {
    alert(e.message);
  } finally {
    saving.value = false;
  }
};

const deleteKey = async () => {
  if (!selectedKey.value) return;
  saving.value = true;
  try {
    await usersStore.deleteAPIKey(selectedKey.value.id);
    closeDialogs();
  } catch (e: any) {
    alert(e.message);
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
  if (!date) return "Never";
  return new Date(date).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const formatExpiry = (date?: string) => {
  if (!date) return "Never";
  const d = new Date(date);
  if (d < new Date()) return "Expired";
  return d.toLocaleDateString(undefined, {
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
  max-width: 480px;
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
