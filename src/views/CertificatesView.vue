<template>
  <div class="certificates-view">
    <DataTable
      :items="certificates"
      :columns="columns"
      item-key="domain"
      :loading="loading"
      :searchable="true"
      :search-placeholder="t('certificates.table.searchPlaceholder')"
      :search-fields="['domain', 'issuer', 'status']"
      :toggleable="true"
      default-view-mode="grid"
      empty-icon="pi pi-shield"
      :empty-title="t('certificates.table.emptyTitle')"
      :empty-text="t('certificates.table.emptyText')"
      :loading-text="t('certificates.table.loadingText')"
    >
      <template #actions>
        <button v-if="canWrite" class="btn btn-primary" @click="showRequestModal = true">
          <i class="pi pi-plus" />
          {{ t("certificates.actions.requestCertificate") }}
        </button>
        <button v-if="canWrite" class="btn btn-secondary" :disabled="renewingAll" @click="handleRenewAll">
          <i class="pi pi-sync" :class="{ 'pi-spin': renewingAll }" />
          {{ t("certificates.actions.renewAll") }}
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
          {{ formatStatus(item.status) }}
        </span>
      </template>

      <template #cell-days_left="{ item }">
        <span class="days-left" :class="daysLeftClass(item.days_left)">
          {{ t("certificates.table.days", { n: item.days_left }) }}
        </span>
      </template>

      <template #cell-not_before="{ item }">
        {{ formatDate(item.not_before) }}
      </template>

      <template #cell-not_after="{ item }">
        {{ formatDate(item.not_after) }}
      </template>

      <template #grid="{ items }">
        <div class="certificates-grid">
          <div v-for="cert in items" :key="cert.domain" class="cert-card" :class="cert.status">
            <div class="cert-header">
              <div class="cert-status">
                <span class="status-badge" :class="cert.status">
                  <i :class="statusIcon(cert.status)" />
                  {{ formatStatus(cert.status) }}
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
                  <span class="info-label">{{ t("certificates.table.columns.issuer") }}</span>
                  <span class="info-value">{{ cert.issuer }}</span>
                </div>
                <div class="info-item">
                  <span class="info-label">{{ t("certificates.table.columns.daysLeft") }}</span>
                  <span class="info-value days-left" :class="daysLeftClass(cert.days_left)">
                    {{ t("certificates.table.days", { n: cert.days_left }) }}
                  </span>
                </div>
                <div class="info-item">
                  <span class="info-label">{{ t("certificates.table.columns.validFrom") }}</span>
                  <span class="info-value">{{ formatDate(cert.not_before) }}</span>
                </div>
                <div class="info-item">
                  <span class="info-label">{{ t("certificates.table.columns.expires") }}</span>
                  <span class="info-value">{{ formatDate(cert.not_after) }}</span>
                </div>
              </div>
            </div>

            <div class="cert-footer">
              <div class="cert-path">
                <i class="pi pi-folder" />
                <span>{{ cert.path }}</span>
              </div>
              <button
                v-if="canDelete"
                class="btn btn-danger-sm"
                :disabled="deleting === cert.domain"
                @click.stop="handleDelete(cert.domain)"
              >
                <i :class="deleting === cert.domain ? 'pi pi-spin pi-spinner' : 'pi pi-trash'" />
              </button>
            </div>
          </div>
        </div>
      </template>
    </DataTable>

    <ConfirmModal
      :visible="showDeleteModal"
      :title="t('certificates.modals.delete.title')"
      :message="t('certificates.modals.delete.message', { domain: domainToDelete || '' })"
      :warning="t('certificates.modals.delete.warning')"
      variant="danger"
      :confirm-text="t('certificates.modals.delete.confirm')"
      :loading="!!deleting"
      @confirm="confirmDelete"
      @cancel="showDeleteModal = false"
    />

    <Teleport to="body">
      <div v-if="showRequestModal" class="modal-overlay" @click.self="showRequestModal = false">
        <div class="modal-container">
          <div class="modal-header">
            <h3>
              <i class="pi pi-shield" />
              {{ t("certificates.modals.request.title") }}
            </h3>
            <button class="close-btn" @click="showRequestModal = false">
              <i class="pi pi-times" />
            </button>
          </div>

          <div class="modal-body">
            <div class="form-group">
              <label for="domain">{{ t("certificates.modals.request.domainLabel") }}</label>
              <input
                id="domain"
                v-model="newDomain"
                type="text"
                :placeholder="t('certificates.modals.request.domainPlaceholder')"
                :disabled="requesting"
              />
              <span class="hint">{{ t("certificates.modals.request.hint") }}</span>
            </div>
          </div>

          <div class="modal-footer">
            <button class="btn btn-secondary" :disabled="requesting" @click="showRequestModal = false">
              {{ t("certificates.modals.request.cancel") }}
            </button>
            <button class="btn btn-primary" :disabled="requesting || !newDomain.trim()" @click="handleRequest">
              <i v-if="requesting" class="pi pi-spin pi-spinner" />
              {{ requesting ? t("certificates.modals.request.requesting") : t("certificates.modals.request.request") }}
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
          <span class="summary-label">{{ t("certificates.summary.valid") }}</span>
        </div>
      </div>
      <div class="summary-card">
        <div class="summary-icon expiring">
          <i class="pi pi-exclamation-circle" />
        </div>
        <div class="summary-info">
          <span class="summary-count">{{ expiringCount }}</span>
          <span class="summary-label">{{ t("certificates.summary.expiringSoon") }}</span>
        </div>
      </div>
      <div class="summary-card">
        <div class="summary-icon expired">
          <i class="pi pi-times-circle" />
        </div>
        <div class="summary-info">
          <span class="summary-count">{{ expiredCount }}</span>
          <span class="summary-label">{{ t("certificates.summary.expired") }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { useI18n } from "vue-i18n";
import { certificatesApi } from "@/services/api";
import { useNotificationsStore } from "@/stores/notifications";
import { useAuthStore } from "@/stores/auth";
import DataTable from "@/components/DataTable.vue";
import ConfirmModal from "@/components/ConfirmModal.vue";
import type { Certificate } from "@/types";

const notifications = useNotificationsStore();
const authStore = useAuthStore();
const { t, locale, te } = useI18n();
const canWrite = authStore.hasPermission("certificates:write");
const canDelete = authStore.hasPermission("certificates:delete");
const certificates = ref<Certificate[]>([]);
const loading = ref(false);
const showRequestModal = ref(false);
const newDomain = ref("");
const requesting = ref(false);
const renewingAll = ref(false);
const deleting = ref<string | null>(null);

const showDeleteModal = ref(false);
const domainToDelete = ref<string | null>(null);

const columns = computed(() => [
  { key: "domain", label: t("certificates.table.columns.domain"), sortable: true },
  { key: "status", label: t("certificates.table.columns.status"), sortable: true },
  { key: "issuer", label: t("certificates.table.columns.issuer"), sortable: true },
  { key: "days_left", label: t("certificates.table.columns.daysLeft"), sortable: true },
  { key: "not_before", label: t("certificates.table.columns.validFrom"), sortable: true },
  { key: "not_after", label: t("certificates.table.columns.expires"), sortable: true },
]);

const validCount = computed(() => certificates.value.filter((c) => c.status === "valid").length);
const expiringCount = computed(() => certificates.value.filter((c) => c.status === "expiring").length);
const expiredCount = computed(() => certificates.value.filter((c) => c.status === "expired").length);

const fetchCertificates = async () => {
  loading.value = true;

  try {
    const response = await certificatesApi.list();
    certificates.value = response.data.certificates || [];
  } catch (e: any) {
    notifications.error(t("certificates.notifications.loadFailedTitle"), t("certificates.notifications.loadFailed"));
  } finally {
    loading.value = false;
  }
};

const handleRequest = async () => {
  if (!newDomain.value.trim()) return;

  requesting.value = true;

  try {
    await certificatesApi.request(newDomain.value.trim());
    notifications.success(
      t("certificates.notifications.requestedTitle"),
      t("certificates.notifications.requested", { domain: newDomain.value.trim() }),
    );
    showRequestModal.value = false;
    newDomain.value = "";
    await fetchCertificates();
  } catch (e: any) {
    const msg = e.response?.data?.error || e.message;
    notifications.error(t("certificates.notifications.requestFailedTitle"), msg);
  } finally {
    requesting.value = false;
  }
};

const handleRenewAll = async () => {
  renewingAll.value = true;

  try {
    await certificatesApi.renew();
    notifications.success(
      t("certificates.notifications.renewCompleteTitle"),
      t("certificates.notifications.renewComplete"),
    );
    await fetchCertificates();
  } catch (e: any) {
    const msg = e.response?.data?.error || e.message;
    notifications.error(t("certificates.notifications.renewFailedTitle"), msg);
  } finally {
    renewingAll.value = false;
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
    notifications.success(
      t("certificates.notifications.deletedTitle"),
      t("certificates.notifications.deleted", { domain: domainToDelete.value }),
    );
    await fetchCertificates();
  } catch (e: any) {
    const msg = e.response?.data?.error || e.message;
    notifications.error(t("certificates.notifications.deleteFailedTitle"), msg);
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

const formatStatus = (status: string) => {
  const key = `certificates.status.${status}`;
  return te(key) ? t(key) : t("certificates.status.unknown");
};

const daysLeftClass = (days: number) => {
  if (days <= 0) return "critical";
  if (days <= 30) return "warning";
  return "good";
};

const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return t("common.na");
  return date.toLocaleDateString(locale.value || "en-US", {
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
  background: white;
  border: 1px solid #e5e7eb;
  color: #6b7280;
}

.btn-icon:hover:not(:disabled) {
  background: #f9fafb;
  color: #374151;
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
  background: white;
  border: 1px solid #e5e7eb;
  color: #374151;
}

.btn-secondary:hover:not(:disabled) {
  background: #f9fafb;
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
  background: white;
  border-radius: var(--radius-sm);
  width: 100%;
  max-width: 480px;
  box-shadow: 0 25px 50px rgba(0, 0, 0, 0.25);
}

.modal-header {
  padding: 1.25rem 1.5rem;
  border-bottom: 1px solid #e5e7eb;
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
  color: #111827;
  margin: 0;
}

.modal-header h3 i {
  color: #6366f1;
}

.close-btn {
  background: none;
  border: none;
  color: #9ca3af;
  cursor: pointer;
  padding: 0.5rem;
  border-radius: var(--radius-sm);
  transition: all 0.2s;
}

.close-btn:hover {
  background: #f3f4f6;
  color: #6b7280;
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
  color: #374151;
  margin-bottom: 0.5rem;
}

.form-group input {
  width: 100%;
  padding: 0.75rem 1rem;
  border: 1px solid #d1d5db;
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
  background: #f9fafb;
  color: #9ca3af;
}

.hint {
  display: block;
  font-size: 0.75rem;
  color: #6b7280;
  margin-top: 0.375rem;
}

.modal-footer {
  padding: 1rem 1.5rem;
  border-top: 1px solid #e5e7eb;
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
}

.domain-cell {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: 600;
  color: #1f2937;
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
  background: white;
  border-radius: var(--radius-sm);
  border: 1px solid #e5e7eb;
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
  border-bottom: 1px solid #f3f4f6;
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
  color: #1f2937;
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
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.025em;
}

.info-value {
  font-size: 0.875rem;
  color: #1f2937;
  font-weight: 500;
}

.cert-footer {
  padding: 1rem 1.25rem;
  background: #f9fafb;
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
  color: #6b7280;
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
  background: white;
  border-radius: var(--radius-sm);
  border: 1px solid #e5e7eb;
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
  color: #1f2937;
}

.summary-label {
  font-size: 0.875rem;
  color: #6b7280;
}

@media (max-width: 768px) {
  .certificates-grid {
    grid-template-columns: 1fr;
  }
}
</style>
