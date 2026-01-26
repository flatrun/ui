<template>
  <div class="dns-view">
    <div v-if="!dnsStore.credentialsValid" class="provider-setup">
      <div class="setup-card">
        <div class="setup-header">
          <i class="pi pi-cloud" />
          <h2>External DNS Providers</h2>
          <p>Connect to external DNS providers like Cloudflare, Route53, or DigitalOcean</p>
        </div>

        <div class="setup-body">
          <div class="form-group">
            <label>Select Provider</label>
            <div class="provider-grid">
              <button
                v-for="provider in dnsStore.providers"
                :key="provider.provider"
                class="provider-btn"
                :class="{ active: dnsStore.selectedProvider === provider.provider }"
                @click="dnsStore.selectProvider(provider.provider)"
              >
                <i :class="providerIcon(provider.provider)" />
                <span>{{ provider.display_name }}</span>
              </button>
            </div>
          </div>

          <div v-if="dnsStore.currentProvider" class="credentials-form">
            <h3>Enter Credentials</h3>
            <div v-for="field in dnsStore.currentProvider.credentials" :key="field.name" class="form-group">
              <label :for="field.name">{{ field.label }}</label>
              <input
                :id="field.name"
                v-model="dnsStore.credentials[field.name]"
                :type="field.type === 'password' ? 'password' : 'text'"
                :placeholder="field.help_text"
                :required="field.required"
                :disabled="dnsStore.loading"
              />
              <span v-if="field.help_text" class="hint">{{ field.help_text }}</span>
            </div>

            <div v-if="dnsStore.error" class="error-message">
              <i class="pi pi-exclamation-circle" />
              {{ dnsStore.error }}
            </div>

            <button class="btn btn-primary" :disabled="dnsStore.loading || !hasCredentials" @click="handleConnect">
              <i v-if="dnsStore.loading" class="pi pi-spin pi-spinner" />
              <i v-else class="pi pi-link" />
              {{ dnsStore.loading ? "Connecting..." : "Connect" }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <div v-else class="dns-manager">
      <div class="dns-header">
        <div class="header-info">
          <div class="provider-badge">
            <i :class="providerIcon(dnsStore.selectedProvider)" />
            <span>{{ dnsStore.currentProvider?.display_name }}</span>
          </div>
          <button class="btn btn-secondary btn-sm" @click="handleDisconnect">
            <i class="pi pi-sign-out" />
            Disconnect
          </button>
        </div>
      </div>

      <div v-if="!dnsStore.selectedZone" class="zones-section">
        <div class="section-header">
          <h3>
            <i class="pi pi-list" />
            DNS Zones
          </h3>
          <button class="btn btn-icon" :disabled="dnsStore.loading" @click="dnsStore.fetchZones">
            <i class="pi pi-refresh" :class="{ 'pi-spin': dnsStore.loading }" />
          </button>
        </div>

        <div v-if="dnsStore.loading && dnsStore.zones.length === 0" class="loading-state">
          <i class="pi pi-spin pi-spinner" />
          <span>Loading zones...</span>
        </div>

        <div v-else-if="dnsStore.zones.length === 0" class="empty-state">
          <i class="pi pi-inbox" />
          <span>No DNS zones found</span>
        </div>

        <div v-else class="zones-grid">
          <div v-for="zone in dnsStore.zones" :key="zone.id" class="zone-card" @click="dnsStore.selectZone(zone)">
            <div class="zone-name">
              <i class="pi pi-globe" />
              {{ zone.name }}
            </div>
            <div class="zone-meta">
              <span v-if="zone.record_count !== undefined" class="zone-records"> {{ zone.record_count }} records </span>
              <span class="zone-status" :class="zone.status">{{ zone.status }}</span>
            </div>
            <i class="pi pi-chevron-right zone-arrow" />
          </div>
        </div>
      </div>

      <div v-else class="records-section">
        <div class="section-header">
          <div class="breadcrumb">
            <button class="breadcrumb-btn" @click="dnsStore.clearZone">
              <i class="pi pi-arrow-left" />
              Zones
            </button>
            <span class="breadcrumb-separator">/</span>
            <span class="breadcrumb-current">
              <i class="pi pi-globe" />
              {{ dnsStore.selectedZone.name }}
            </span>
          </div>
          <div class="section-actions">
            <button class="btn btn-primary" @click="showCreateModal = true">
              <i class="pi pi-plus" />
              Add Record
            </button>
            <button
              class="btn btn-icon"
              :disabled="dnsStore.loading"
              @click="dnsStore.fetchRecords(dnsStore.selectedZone!.id)"
            >
              <i class="pi pi-refresh" :class="{ 'pi-spin': dnsStore.loading }" />
            </button>
          </div>
        </div>

        <div v-if="dnsStore.loading && dnsStore.records.length === 0" class="loading-state">
          <i class="pi pi-spin pi-spinner" />
          <span>Loading records...</span>
        </div>

        <div v-else-if="dnsStore.records.length === 0" class="empty-state">
          <i class="pi pi-inbox" />
          <span>No DNS records found</span>
        </div>

        <div v-else class="records-table">
          <table>
            <thead>
              <tr>
                <th>Type</th>
                <th>Name</th>
                <th>Content</th>
                <th>TTL</th>
                <th v-if="dnsStore.selectedProvider === 'cloudflare'">Proxied</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="record in dnsStore.records" :key="record.id">
                <td>
                  <span class="record-type" :class="record.type.toLowerCase()">
                    {{ record.type }}
                  </span>
                </td>
                <td class="record-name">{{ record.name }}</td>
                <td class="record-content">{{ record.content }}</td>
                <td>{{ formatTTL(record.ttl) }}</td>
                <td v-if="dnsStore.selectedProvider === 'cloudflare'">
                  <span class="proxied-badge" :class="{ active: record.proxied }">
                    {{ record.proxied ? "Yes" : "No" }}
                  </span>
                </td>
                <td class="actions-cell">
                  <button class="btn-icon-sm" @click="editRecord(record)">
                    <i class="pi pi-pencil" />
                  </button>
                  <button class="btn-icon-sm danger" @click="confirmDeleteRecord(record)">
                    <i class="pi pi-trash" />
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <Teleport to="body">
      <div v-if="showCreateModal || showEditModal" class="modal-overlay" @click.self="closeModals">
        <div class="modal-container">
          <div class="modal-header">
            <h3>
              <i class="pi pi-file-edit" />
              {{ showEditModal ? "Edit Record" : "Add DNS Record" }}
            </h3>
            <button class="close-btn" @click="closeModals">
              <i class="pi pi-times" />
            </button>
          </div>

          <div class="modal-body">
            <div class="form-group">
              <label for="record-type">Type</label>
              <select id="record-type" v-model="recordForm.type" :disabled="showEditModal">
                <option value="A">A</option>
                <option value="AAAA">AAAA</option>
                <option value="CNAME">CNAME</option>
                <option value="MX">MX</option>
                <option value="TXT">TXT</option>
                <option value="NS">NS</option>
                <option value="SRV">SRV</option>
              </select>
            </div>

            <div v-if="!showEditModal" class="form-group">
              <label for="record-name">Name</label>
              <input id="record-name" v-model="recordForm.name" type="text" placeholder="@ for root, or subdomain" />
              <span class="hint">Use @ for the root domain</span>
            </div>

            <div class="form-group">
              <label for="record-content">Content</label>
              <input
                id="record-content"
                v-model="recordForm.content"
                type="text"
                placeholder="IP address or hostname"
              />
            </div>

            <div class="form-row">
              <div class="form-group">
                <label for="record-ttl">TTL</label>
                <select id="record-ttl" v-model.number="recordForm.ttl">
                  <option :value="1">Auto (Provider Default)</option>
                  <option :value="60">1 minute</option>
                  <option :value="300">5 minutes</option>
                  <option :value="600">10 minutes</option>
                  <option :value="3600">1 hour</option>
                  <option :value="86400">1 day</option>
                </select>
                <span class="hint">Time-to-live for DNS cache. Auto lets the provider choose.</span>
              </div>

              <div v-if="recordForm.type === 'MX'" class="form-group">
                <label for="record-priority">Priority</label>
                <input id="record-priority" v-model.number="recordForm.priority" type="number" placeholder="10" />
              </div>
            </div>

            <div v-if="dnsStore.selectedProvider === 'cloudflare'" class="form-group checkbox-group">
              <label>
                <input v-model="recordForm.proxied" type="checkbox" />
                <span>Proxy through Cloudflare</span>
              </label>
            </div>

            <div v-if="dnsStore.error" class="error-message">
              <i class="pi pi-exclamation-circle" />
              {{ dnsStore.error }}
            </div>
          </div>

          <div class="modal-footer">
            <button class="btn btn-secondary" :disabled="saving" @click="closeModals">Cancel</button>
            <button class="btn btn-primary" :disabled="saving || !isFormValid" @click="handleSaveRecord">
              <i v-if="saving" class="pi pi-spin pi-spinner" />
              {{ saving ? "Saving..." : showEditModal ? "Update" : "Create" }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <ConfirmModal
      :visible="showDeleteModal"
      title="Delete Record"
      :message="`Are you sure you want to delete this ${recordToDelete?.type} record for ${recordToDelete?.name}?`"
      warning="This action cannot be undone."
      variant="danger"
      confirm-text="Delete"
      :loading="deleting"
      @confirm="handleDeleteRecord"
      @cancel="showDeleteModal = false"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { useDnsStore } from "@/stores/dns";
import { useNotificationsStore } from "@/stores/notifications";
import ConfirmModal from "@/components/ConfirmModal.vue";
import type { DNSRecord, DNSRecordCreate, DNSRecordUpdate } from "@/services/api";

const dnsStore = useDnsStore();
const notifications = useNotificationsStore();

const showCreateModal = ref(false);
const showEditModal = ref(false);
const showDeleteModal = ref(false);
const saving = ref(false);
const deleting = ref(false);

const recordToDelete = ref<DNSRecord | null>(null);
const recordToEdit = ref<DNSRecord | null>(null);

const recordForm = ref<{
  type: string;
  name: string;
  content: string;
  ttl: number;
  priority?: number;
  proxied?: boolean;
}>({
  type: "A",
  name: "",
  content: "",
  ttl: 3600,
  priority: undefined,
  proxied: false,
});

const hasCredentials = computed(() => {
  if (!dnsStore.currentProvider) return false;
  return dnsStore.currentProvider.credentials
    .filter((f) => f.required)
    .every((f) => dnsStore.credentials[f.name]?.trim());
});

const isFormValid = computed(() => {
  if (showEditModal.value) {
    return recordForm.value.content?.trim();
  }
  return recordForm.value.type && recordForm.value.name?.trim() && recordForm.value.content?.trim();
});

const providerIcon = (provider: string) => {
  const icons: Record<string, string> = {
    cloudflare: "pi pi-cloud",
    route53: "pi pi-amazon",
    digitalocean: "pi pi-server",
    hetzner: "pi pi-server",
  };
  return icons[provider] || "pi pi-globe";
};

const formatTTL = (ttl: number) => {
  if (ttl === 1) return "Auto";
  if (ttl < 60) return `${ttl}s`;
  if (ttl < 3600) return `${Math.floor(ttl / 60)}m`;
  if (ttl < 86400) return `${Math.floor(ttl / 3600)}h`;
  return `${Math.floor(ttl / 86400)}d`;
};

const handleConnect = async () => {
  const valid = await dnsStore.validateCredentials();
  if (valid) {
    notifications.success("Connected", `Connected to ${dnsStore.currentProvider?.display_name}`);
    await dnsStore.fetchZones();
  }
};

const handleDisconnect = () => {
  dnsStore.reset();
};

const editRecord = (record: DNSRecord) => {
  recordToEdit.value = record;
  recordForm.value = {
    type: record.type,
    name: record.name,
    content: record.content,
    ttl: record.ttl,
    priority: record.priority,
    proxied: record.proxied,
  };
  showEditModal.value = true;
};

const confirmDeleteRecord = (record: DNSRecord) => {
  recordToDelete.value = record;
  showDeleteModal.value = true;
};

const handleSaveRecord = async () => {
  if (!dnsStore.selectedZone) return;

  saving.value = true;

  try {
    if (showEditModal.value && recordToEdit.value) {
      const update: DNSRecordUpdate = {
        content: recordForm.value.content,
        ttl: recordForm.value.ttl,
        priority: recordForm.value.priority,
        proxied: recordForm.value.proxied,
      };
      const result = await dnsStore.updateRecord(dnsStore.selectedZone.id, recordToEdit.value.id, update);
      if (result) {
        notifications.success("Record Updated", "DNS record has been updated");
        closeModals();
      }
    } else {
      const create: DNSRecordCreate = {
        type: recordForm.value.type,
        name: recordForm.value.name,
        content: recordForm.value.content,
        ttl: recordForm.value.ttl,
        priority: recordForm.value.priority,
        proxied: recordForm.value.proxied,
      };
      const result = await dnsStore.createRecord(dnsStore.selectedZone.id, create);
      if (result) {
        notifications.success("Record Created", "DNS record has been created");
        closeModals();
      }
    }
  } finally {
    saving.value = false;
  }
};

const handleDeleteRecord = async () => {
  if (!dnsStore.selectedZone || !recordToDelete.value) return;

  deleting.value = true;

  try {
    const success = await dnsStore.deleteRecord(dnsStore.selectedZone.id, recordToDelete.value.id);
    if (success) {
      notifications.success("Record Deleted", "DNS record has been deleted");
    }
  } finally {
    deleting.value = false;
    showDeleteModal.value = false;
    recordToDelete.value = null;
  }
};

const closeModals = () => {
  showCreateModal.value = false;
  showEditModal.value = false;
  recordToEdit.value = null;
  recordForm.value = {
    type: "A",
    name: "",
    content: "",
    ttl: 3600,
    priority: undefined,
    proxied: false,
  };
};

onMounted(() => {
  dnsStore.fetchProviders();
});
</script>

<style src="@/assets/dns-shared.css"></style>
<style scoped>
/* Layout */
.dns-view {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

/* Provider Setup */
.provider-setup {
  display: flex;
  justify-content: center;
  align-items: flex-start;
  padding: 2rem 0;
}

.setup-card {
  background: white;
  border-radius: var(--radius-sm);
  border: 1px solid #e5e7eb;
  width: 100%;
  max-width: 600px;
  overflow: hidden;
}

.setup-header {
  padding: 2rem;
  text-align: center;
  border-bottom: 1px solid #e5e7eb;
  background: linear-gradient(135deg, #f8fafc, #f1f5f9);
}

.setup-header i {
  font-size: 3rem;
  color: #6366f1;
  margin-bottom: 1rem;
}

.setup-header h2 {
  font-size: 1.5rem;
  font-weight: 700;
  color: #1f2937;
  margin: 0 0 0.5rem 0;
}

.setup-header p {
  color: #6b7280;
  margin: 0;
}

.setup-body {
  padding: 1.5rem;
}

/* Provider Selection */
.provider-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0.75rem;
}

.provider-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  padding: 1.25rem;
  border: 2px solid #e5e7eb;
  border-radius: var(--radius-sm);
  background: white;
  cursor: pointer;
  transition: all 0.2s;
}

.provider-btn:hover {
  border-color: #6366f1;
  background: #f5f3ff;
}

.provider-btn.active {
  border-color: #6366f1;
  background: #eef2ff;
}

.provider-btn i {
  font-size: 1.5rem;
  color: #6b7280;
}

.provider-btn.active i {
  color: #6366f1;
}

.provider-btn span {
  font-weight: 500;
  color: #374151;
}

.credentials-form {
  margin-top: 1.5rem;
  padding-top: 1.5rem;
  border-top: 1px solid #e5e7eb;
}

.credentials-form h3 {
  font-size: 1rem;
  font-weight: 600;
  color: #374151;
  margin: 0 0 1rem 0;
}

/* DNS Manager */
.dns-manager {
  background: white;
  border-radius: var(--radius-sm);
  border: 1px solid #e5e7eb;
}

.dns-header {
  padding: 1rem 1.5rem;
  border-bottom: 1px solid #e5e7eb;
}

.header-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.provider-badge {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  background: #eef2ff;
  border-radius: var(--radius-sm);
  font-weight: 600;
  color: #4f46e5;
}

.zones-section,
.records-section {
  padding: 1.5rem;
}

/* Zone-specific overrides */
.zone-card {
  gap: 1rem;
}

.zone-name {
  flex: 1;
}

.zone-arrow {
  color: #9ca3af;
}

/* Cloudflare Proxy Badge */
.proxied-badge {
  padding: 0.25rem 0.5rem;
  border-radius: 9999px;
  font-size: 0.7rem;
  font-weight: 600;
  background: #f3f4f6;
  color: #6b7280;
}

.proxied-badge.active {
  background: #fef3c7;
  color: #d97706;
}

/* Modal overrides */
.modal-body .btn-primary {
  width: auto;
}

.modal-footer .btn-primary {
  width: auto;
}

/* Responsive */
@media (max-width: 768px) {
  .provider-grid {
    grid-template-columns: 1fr;
  }
}
</style>
