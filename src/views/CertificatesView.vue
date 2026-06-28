<template>
  <div class="certificates-view">
    <DataTable
      :items="certificates"
      :columns="columns"
      item-key="domain"
      :loading="loading"
      :searchable="true"
      search-placeholder="Search certificates..."
      :search-fields="['domain', 'issuer', 'status']"
      :toggleable="true"
      default-view-mode="grid"
      empty-icon="pi pi-shield"
      empty-title="No Certificates Found"
      empty-text="SSL certificates will appear here once configured in your nginx deployment."
      loading-text="Loading certificates..."
    >
      <template #actions>
        <button v-if="canWrite" class="btn btn-primary" @click="showRequestModal = true">
          <i class="pi pi-plus" />
          Request Certificate
        </button>
        <button v-if="canWrite" class="btn btn-secondary" :disabled="renewingAll" @click="handleRenewAll">
          <i class="pi pi-sync" :class="{ 'pi-spin': renewingAll }" />
          Renew All
        </button>
        <button class="btn btn-icon" :disabled="loading" @click="fetchCertificates">
          <i class="pi pi-refresh" :class="{ 'pi-spin': loading }" />
        </button>
      </template>

      <template #cell-domain="{ item }">
        <div class="domain-cell">
          <i class="pi pi-lock" />
          {{ item.domain }}
        </div>
      </template>

      <template #cell-status="{ item }">
        <span class="status-badge" :class="item.status">
          {{ item.status }}
        </span>
      </template>

      <template #cell-days_left="{ item }">
        <span class="days-left" :class="daysLeftClass(item.days_left)"> {{ item.days_left }} days </span>
      </template>

      <template #cell-not_before="{ item }">
        {{ formatDate(item.not_before) }}
      </template>

      <template #cell-not_after="{ item }">
        {{ formatDate(item.not_after) }}
      </template>

      <template #grid="{ items }">
        <div class="certificates-grid">
          <div
            v-for="cert in items"
            :key="cert.domain"
            class="cert-card"
            :class="cert.status"
            @click="openDetails(cert)"
          >
            <div class="cert-header">
              <div class="cert-status">
                <span class="status-badge" :class="cert.status">
                  <i :class="statusIcon(cert.status)" />
                  {{ cert.status }}
                </span>
                <span v-if="cert.auto_renew" class="auto-renew-chip" title="Auto-renew enabled">
                  <i class="pi pi-sync" /> auto
                </span>
              </div>
              <div class="cert-domain">
                <i class="pi pi-lock" />
                <span>{{ cert.domain }}</span>
              </div>
            </div>

            <div class="cert-body">
              <div class="cert-info-grid">
                <div class="info-item">
                  <span class="info-label">Issuer</span>
                  <span class="info-value">{{ cert.issuer }}</span>
                </div>
                <div class="info-item">
                  <span class="info-label">Days Left</span>
                  <span class="info-value days-left" :class="daysLeftClass(cert.days_left)">
                    {{ cert.days_left }} days
                  </span>
                </div>
                <div class="info-item">
                  <span class="info-label">Valid From</span>
                  <span class="info-value">{{ formatDate(cert.not_before) }}</span>
                </div>
                <div class="info-item">
                  <span class="info-label">Expires</span>
                  <span class="info-value">{{ formatDate(cert.not_after) }}</span>
                </div>
              </div>
            </div>

            <div class="cert-footer">
              <div class="cert-path">
                <i class="pi pi-folder" />
                <span>{{ cert.path }}</span>
              </div>
              <div class="cert-actions">
                <button
                  v-if="canWrite"
                  class="btn btn-icon-sm"
                  :disabled="renewingDomain === cert.domain"
                  title="Renew certificate"
                  @click.stop="handleRenewOne(cert.domain)"
                >
                  <i :class="renewingDomain === cert.domain ? 'pi pi-spin pi-spinner' : 'pi pi-sync'" />
                </button>
                <button
                  v-if="canDelete"
                  class="btn btn-danger-sm"
                  :disabled="deleting === cert.domain"
                  title="Delete certificate"
                  @click.stop="handleDelete(cert.domain)"
                >
                  <i :class="deleting === cert.domain ? 'pi pi-spin pi-spinner' : 'pi pi-trash'" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </template>
    </DataTable>

    <ConfirmModal
      :visible="showDeleteModal"
      title="Delete Certificate"
      :message="`Are you sure you want to delete the certificate for ${domainToDelete}?`"
      warning="This action cannot be undone."
      variant="danger"
      confirm-text="Delete"
      :loading="!!deleting"
      @confirm="confirmDelete"
      @cancel="showDeleteModal = false"
    />

    <Teleport to="body">
      <div v-if="detailsCert" class="modal-overlay" @click.self="closeDetails">
        <div class="modal-container modal-lg">
          <div class="modal-header">
            <h3>
              <i class="pi pi-shield" />
              Certificate Details
            </h3>
            <button class="close-btn" @click="closeDetails">
              <i class="pi pi-times" />
            </button>
          </div>
          <div class="modal-body">
            <div class="details-grid">
              <div class="info-item">
                <span class="info-label">Domain</span>
                <span class="info-value">{{ detailsCert.domain }}</span>
              </div>
              <div class="info-item">
                <span class="info-label">Status</span>
                <span class="status-badge" :class="detailsCert.status">
                  <i :class="statusIcon(detailsCert.status)" />
                  {{ detailsCert.status }}
                </span>
              </div>
              <div class="info-item">
                <span class="info-label">Issuer</span>
                <span class="info-value">{{ detailsCert.issuer }}</span>
              </div>
              <div class="info-item">
                <span class="info-label">Days Left</span>
                <span class="info-value days-left" :class="daysLeftClass(detailsCert.days_left)">
                  {{ detailsCert.days_left }} days
                </span>
              </div>
              <div class="info-item">
                <span class="info-label">Valid From</span>
                <span class="info-value">{{ formatDate(detailsCert.not_before) }}</span>
              </div>
              <div class="info-item">
                <span class="info-label">Expires</span>
                <span class="info-value">{{ formatDate(detailsCert.not_after) }}</span>
              </div>
              <div v-if="detailsCert.deployment_id" class="info-item info-item-wide">
                <span class="info-label">Deployment</span>
                <router-link
                  class="info-value deployment-link"
                  :to="`/deployments/${detailsCert.deployment_id}`"
                  @click="closeDetails"
                >
                  <i class="pi pi-box" />
                  {{ detailsCert.deployment_id }}
                </router-link>
              </div>
              <div class="info-item info-item-wide">
                <span class="info-label">Path</span>
                <span class="info-value path">{{ detailsCert.path }}</span>
              </div>
            </div>

            <div v-if="canWrite" class="auto-renew-row">
              <div>
                <div class="auto-renew-title">Auto-Renewal</div>
                <div class="hint">When enabled, this certificate will be renewed automatically before it expires.</div>
              </div>
              <label class="switch">
                <input
                  type="checkbox"
                  :checked="detailsCert.auto_renew"
                  :disabled="autoRenewSaving"
                  @change="handleAutoRenewToggle($event)"
                />
                <span class="slider" />
              </label>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" @click="closeDetails">Close</button>
            <button
              v-if="canWrite"
              class="btn btn-primary"
              :disabled="renewingDomain === detailsCert.domain"
              @click="handleRenewOne(detailsCert.domain)"
            >
              <i :class="renewingDomain === detailsCert.domain ? 'pi pi-spin pi-spinner' : 'pi pi-sync'" />
              {{ renewingDomain === detailsCert.domain ? "Renewing..." : "Renew Now" }}
            </button>
          </div>
        </div>
      </div>
      <div v-if="showRequestModal" class="modal-overlay" @click.self="showRequestModal = false">
        <div class="modal-container">
          <div class="modal-header">
            <h3>
              <i class="pi pi-shield" />
              Request SSL Certificate
            </h3>
            <button class="close-btn" @click="showRequestModal = false">
              <i class="pi pi-times" />
            </button>
          </div>

          <div class="modal-body">
            <div class="form-group">
              <label for="domain">Domain</label>
              <input id="domain" v-model="newDomain" type="text" placeholder="example.com" :disabled="requesting" />
              <span class="hint">Enter the domain to request a Let's Encrypt certificate for</span>
            </div>
          </div>

          <div class="modal-footer">
            <button class="btn btn-secondary" :disabled="requesting" @click="showRequestModal = false">Cancel</button>
            <button class="btn btn-primary" :disabled="requesting || !newDomain.trim()" @click="handleRequest">
              <i v-if="requesting" class="pi pi-spin pi-spinner" />
              {{ requesting ? "Requesting..." : "Request Certificate" }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <div v-if="certificates.length > 0" class="certificates-summary">
      <div class="summary-card">
        <div class="summary-icon valid">
          <i class="pi pi-check-circle" />
        </div>
        <div class="summary-info">
          <span class="summary-count">{{ validCount }}</span>
          <span class="summary-label">Valid</span>
        </div>
      </div>
      <div class="summary-card">
        <div class="summary-icon expiring">
          <i class="pi pi-exclamation-circle" />
        </div>
        <div class="summary-info">
          <span class="summary-count">{{ expiringCount }}</span>
          <span class="summary-label">Expiring Soon</span>
        </div>
      </div>
      <div class="summary-card">
        <div class="summary-icon expired">
          <i class="pi pi-times-circle" />
        </div>
        <div class="summary-info">
          <span class="summary-count">{{ expiredCount }}</span>
          <span class="summary-label">Expired</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { certificatesApi } from "@/services/api";
import { useNotificationsStore } from "@/stores/notifications";
import { useAuthStore } from "@/stores/auth";
import DataTable from "@/components/DataTable.vue";
import ConfirmModal from "@/components/ConfirmModal.vue";
import type { Certificate } from "@/types";

const notifications = useNotificationsStore();
const authStore = useAuthStore();
const canWrite = authStore.hasPermission("certificates:write");
const canDelete = authStore.hasPermission("certificates:delete");
const certificates = ref<Certificate[]>([]);
const loading = ref(false);
const showRequestModal = ref(false);
const newDomain = ref("");
const requesting = ref(false);
const renewingAll = ref(false);
const renewingDomain = ref<string | null>(null);
const deleting = ref<string | null>(null);

const showDeleteModal = ref(false);
const domainToDelete = ref<string | null>(null);

const detailsCert = ref<Certificate | null>(null);
const autoRenewSaving = ref(false);

const columns = [
  { key: "domain", label: "Domain", sortable: true },
  { key: "status", label: "Status", sortable: true },
  { key: "issuer", label: "Issuer", sortable: true },
  { key: "days_left", label: "Days Left", sortable: true },
  { key: "not_before", label: "Valid From", sortable: true },
  { key: "not_after", label: "Expires", sortable: true },
];

const validCount = computed(() => certificates.value.filter((c) => c.status === "valid").length);
const expiringCount = computed(() => certificates.value.filter((c) => c.status === "expiring").length);
const expiredCount = computed(() => certificates.value.filter((c) => c.status === "expired").length);

const fetchCertificates = async () => {
  loading.value = true;

  try {
    const response = await certificatesApi.list();
    certificates.value = response.data.certificates || [];
  } catch (e: any) {
    notifications.error("Error", "Failed to load certificates");
  } finally {
    loading.value = false;
  }
};

const handleRequest = async () => {
  if (!newDomain.value.trim()) return;

  requesting.value = true;

  try {
    await certificatesApi.request(newDomain.value.trim());
    notifications.success("Certificate Requested", `Certificate for ${newDomain.value} has been requested`);
    showRequestModal.value = false;
    newDomain.value = "";
    await fetchCertificates();
  } catch (e: any) {
    const msg = e.response?.data?.error || e.message;
    notifications.error("Request Failed", msg);
  } finally {
    requesting.value = false;
  }
};

const handleRenewAll = async () => {
  renewingAll.value = true;

  try {
    await certificatesApi.renew();
    notifications.success("Renewal Complete", "All certificates have been renewed");
    await fetchCertificates();
  } catch (e: any) {
    const msg = e.response?.data?.error || e.message;
    notifications.error("Renewal Failed", msg);
  } finally {
    renewingAll.value = false;
  }
};

const handleRenewOne = async (domain: string) => {
  renewingDomain.value = domain;
  try {
    await certificatesApi.renewOne(domain);
    notifications.success("Certificate Renewed", `Certificate for ${domain} has been renewed`);
    await fetchCertificates();
    if (detailsCert.value?.domain === domain) {
      const refreshed = certificates.value.find((c) => c.domain === domain);
      if (refreshed) detailsCert.value = refreshed;
    }
  } catch (e: any) {
    const msg = e.response?.data?.error || e.message;
    notifications.error("Renewal Failed", msg);
  } finally {
    renewingDomain.value = null;
  }
};

const openDetails = (cert: Certificate) => {
  detailsCert.value = { ...cert };
};

const closeDetails = () => {
  detailsCert.value = null;
};

const handleAutoRenewToggle = async (event: Event) => {
  if (!detailsCert.value) return;
  const target = event.target as HTMLInputElement;
  const enabled = target.checked;
  const domain = detailsCert.value.domain;
  autoRenewSaving.value = true;
  try {
    await certificatesApi.setAutoRenew(domain, enabled);
    detailsCert.value.auto_renew = enabled;
    const idx = certificates.value.findIndex((c) => c.domain === domain);
    if (idx >= 0) certificates.value[idx] = { ...certificates.value[idx], auto_renew: enabled };
    notifications.success(
      enabled ? "Auto-Renew Enabled" : "Auto-Renew Disabled",
      `${domain} will ${enabled ? "now be" : "no longer be"} renewed automatically`,
    );
  } catch (e: any) {
    target.checked = !enabled;
    const msg = e.response?.data?.error || e.message;
    notifications.error("Update Failed", msg);
  } finally {
    autoRenewSaving.value = false;
  }
};

const handleDelete = (domain: string) => {
  domainToDelete.value = domain;
  showDeleteModal.value = true;
};

const confirmDelete = async () => {
  if (!domainToDelete.value) return;

  deleting.value = domainToDelete.value;

  try {
    await certificatesApi.delete(domainToDelete.value);
    notifications.success("Certificate Deleted", `Certificate for ${domainToDelete.value} has been deleted`);
    await fetchCertificates();
  } catch (e: any) {
    const msg = e.response?.data?.error || e.message;
    notifications.error("Delete Failed", msg);
  } finally {
    deleting.value = null;
    showDeleteModal.value = false;
    domainToDelete.value = null;
  }
};

const statusIcon = (status: string) => {
  switch (status) {
    case "valid":
      return "pi pi-check";
    case "expiring":
      return "pi pi-exclamation-triangle";
    case "expired":
      return "pi pi-times";
    default:
      return "pi pi-question";
  }
};

const daysLeftClass = (days: number) => {
  if (days <= 0) return "critical";
  if (days <= 30) return "warning";
  return "good";
};

const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

onMounted(() => {
  fetchCertificates();
});
</script>

<style scoped>
.certificates-view {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.btn {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.625rem 1.25rem;
  border-radius: var(--radius-sm);
  font-weight: 500;
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.2s;
  border: none;
}

.btn-icon {
  padding: 0.625rem;
  background: var(--surface);
  border: 1px solid var(--border);
  color: var(--text-muted);
}

.btn-icon:hover:not(:disabled) {
  background: var(--surface-sunken);
  color: var(--text);
}

.btn-icon:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-primary {
  background: #6366f1;
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: #4f46e5;
}

.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-secondary {
  background: var(--surface);
  border: 1px solid var(--border);
  color: var(--text);
}

.btn-secondary:hover:not(:disabled) {
  background: var(--surface-sunken);
}

.btn-secondary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-danger-sm {
  padding: 0.375rem;
  background: #fee2e2;
  color: #dc2626;
  border: none;
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all 0.2s;
}

.btn-danger-sm:hover:not(:disabled) {
  background: #fecaca;
}

.btn-danger-sm:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-container {
  background: var(--surface-raised);
  border: 1px solid var(--border);
  border-radius: var(--radius-xl);
  width: 100%;
  max-width: 480px;
  box-shadow: 0 25px 50px rgba(0, 0, 0, 0.25);
}

.modal-header {
  padding: 1.25rem 1.5rem;
  border-bottom: 1px solid var(--border);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.modal-header h3 {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 1.125rem;
  font-weight: 600;
  color: var(--text);
  margin: 0;
}

.modal-header h3 i {
  color: #6366f1;
}

.close-btn {
  background: none;
  border: none;
  color: var(--text-subtle);
  cursor: pointer;
  padding: 0.5rem;
  border-radius: var(--radius-sm);
  transition: all 0.2s;
}

.close-btn:hover {
  background: var(--surface-inset);
  color: var(--text-muted);
}

.modal-body {
  padding: 1.5rem;
}

.form-group {
  margin-bottom: 1rem;
}

.form-group:last-child {
  margin-bottom: 0;
}

.form-group label {
  display: block;
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--text);
  margin-bottom: 0.5rem;
}

.form-group input {
  width: 100%;
  padding: 0.75rem 1rem;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  font-size: 0.875rem;
  transition: all 0.2s;
}

.form-group input:focus {
  outline: none;
  border-color: #6366f1;
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
}

.form-group input:disabled {
  background: var(--surface-sunken);
  color: var(--text-subtle);
}

.hint {
  display: block;
  font-size: 0.75rem;
  color: var(--text-muted);
  margin-top: 0.375rem;
}

.modal-footer {
  padding: 1rem 1.5rem;
  border-top: 1px solid var(--border);
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
}

.domain-cell {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: 600;
  color: var(--text);
}

.domain-cell i {
  color: #22c55e;
}

.status-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.25rem 0.75rem;
  border-radius: 9999px;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
}

.status-badge.valid {
  background: #dcfce7;
  color: #166534;
}

.status-badge.expiring {
  background: #fef3c7;
  color: #92400e;
}

.status-badge.expired {
  background: #fee2e2;
  color: #991b1b;
}

.days-left.good {
  color: #16a34a;
  font-weight: 500;
}

.days-left.warning {
  color: #d97706;
  font-weight: 500;
}

.days-left.critical {
  color: #dc2626;
  font-weight: 500;
}

.certificates-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
  gap: 1.5rem;
}

.cert-card {
  background: var(--surface-raised);
  border-radius: var(--radius-sm);
  border: 1px solid var(--border);
  overflow: hidden;
  transition: all 0.3s ease;
}

.cert-card:hover {
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
  transform: translateY(-2px);
}

.cert-card.expiring {
  border-color: #fbbf24;
}

.cert-card.expired {
  border-color: #ef4444;
}

.cert-header {
  padding: 1.25rem;
  border-bottom: 1px solid var(--border-subtle);
}

.cert-status {
  margin-bottom: 0.75rem;
}

.cert-domain {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 1rem;
  font-weight: 600;
  color: var(--text);
  word-break: break-all;
}

.cert-domain i {
  color: #22c55e;
}

.cert-body {
  padding: 1.25rem;
}

.cert-info-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}

.info-item {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.info-label {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.025em;
}

.info-value {
  font-size: 0.875rem;
  color: var(--text);
  font-weight: 500;
}

.cert-footer {
  padding: 1rem 1.25rem;
  background: var(--surface-sunken);
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
}

.cert-path {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.75rem;
  color: var(--text-muted);
  font-family: "SF Mono", "Fira Code", monospace;
  word-break: break-all;
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
}

.certificates-summary {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
  margin-top: 1rem;
}

.summary-card {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1.25rem;
  background: var(--surface-raised);
  border-radius: var(--radius-sm);
  border: 1px solid var(--border);
}

.summary-icon {
  width: 48px;
  height: 48px;
  border-radius: var(--radius-sm);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.25rem;
}

.summary-icon.valid {
  background: #dcfce7;
  color: #16a34a;
}

.summary-icon.expiring {
  background: #fef3c7;
  color: #d97706;
}

.summary-icon.expired {
  background: #fee2e2;
  color: #dc2626;
}

.summary-info {
  display: flex;
  flex-direction: column;
}

.summary-count {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--text);
}

.summary-label {
  font-size: 0.875rem;
  color: var(--text-muted);
}

.cert-card {
  cursor: pointer;
}

.cert-actions {
  display: flex;
  gap: 0.5rem;
}

.btn-icon-sm {
  padding: 0.375rem;
  background: #eef2ff;
  color: #4338ca;
  border: none;
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all 0.2s;
}

.btn-icon-sm:hover:not(:disabled) {
  background: #e0e7ff;
}

.btn-icon-sm:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.cert-status {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.75rem;
}

.auto-renew-chip {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.125rem 0.5rem;
  border-radius: 9999px;
  background: #eef2ff;
  color: #4338ca;
  font-size: 0.6875rem;
  font-weight: 600;
  text-transform: uppercase;
}

.modal-container.modal-lg {
  max-width: 640px;
}

.details-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem 1.5rem;
  padding-bottom: 1.25rem;
  border-bottom: 1px solid var(--border);
}

.details-grid .info-item {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.details-grid .info-item-wide {
  grid-column: span 2;
}

.info-value.path {
  font-family: "SF Mono", "Fira Code", monospace;
  font-size: 0.75rem;
  word-break: break-all;
}

.deployment-link {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  color: #4338ca;
  text-decoration: none;
  font-weight: 500;
}

.deployment-link:hover {
  text-decoration: underline;
}

.auto-renew-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1.5rem;
  padding-top: 1.25rem;
}

.auto-renew-title {
  font-size: 0.9375rem;
  font-weight: 600;
  color: var(--text);
  margin-bottom: 0.25rem;
}

.switch {
  position: relative;
  display: inline-block;
  width: 44px;
  height: 24px;
  flex-shrink: 0;
}

.switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.slider {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: var(--border);
  border-radius: 9999px;
  transition: 0.2s;
}

.slider::before {
  position: absolute;
  content: "";
  height: 18px;
  width: 18px;
  left: 3px;
  bottom: 3px;
  background-color: white;
  border-radius: 50%;
  transition: 0.2s;
}

.switch input:checked + .slider {
  background-color: #6366f1;
}

.switch input:checked + .slider::before {
  transform: translateX(20px);
}

.switch input:disabled + .slider {
  opacity: 0.5;
  cursor: not-allowed;
}

@media (max-width: 768px) {
  .certificates-grid {
    grid-template-columns: 1fr;
  }
  .details-grid {
    grid-template-columns: 1fr;
  }
  .details-grid .info-item-wide {
    grid-column: span 1;
  }
}
</style>
