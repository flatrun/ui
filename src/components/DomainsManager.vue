<template>
  <div class="domains-manager">
    <div v-if="loading" class="loading-state">
      <i class="pi pi-spin pi-spinner" />
      Loading...
    </div>

    <template v-else>
      <div class="domains-table">
        <div v-for="d in domains" :key="d.id" class="domain-row">
          <div class="domain-info">
            <a :href="getDomainUrl(d)" target="_blank" class="domain-name">
              {{ d.domain }}{{ d.path_prefix || "" }}
              <i class="pi pi-external-link" />
            </a>
            <span class="domain-target">
              <i class="pi pi-arrow-right" />
              {{ d.service || deploymentName }}:{{ d.container_port || 80 }}
            </span>
          </div>

          <div class="domain-status">
            <span v-if="d.ssl?.enabled" class="status-pill" :class="hasCertificate(d.domain) ? 'success' : 'warning'">
              <i :class="hasCertificate(d.domain) ? 'pi pi-lock' : 'pi pi-lock-open'" />
              {{ hasCertificate(d.domain) ? "SSL" : "No cert" }}
            </span>
            <span v-if="!proxyConfigured" class="status-pill warning">
              <i class="pi pi-exclamation-triangle" />
              No proxy
            </span>
          </div>

          <div class="domain-actions">
            <button
              v-if="canEdit && !proxyConfigured"
              class="action-btn primary"
              title="Setup Proxy"
              :disabled="settingUpProxy"
              @click="$emit('setupProxy')"
            >
              <i :class="settingUpProxy ? 'pi pi-spin pi-spinner' : 'pi pi-cog'" />
            </button>
            <button
              v-if="canEdit && d.ssl?.enabled && d.ssl?.auto_cert && !hasCertificate(d.domain)"
              class="action-btn success"
              title="Request SSL Certificate"
              :disabled="requestingCerts[d.domain]"
              @click="requestCertificate(d.domain)"
            >
              <i :class="requestingCerts[d.domain] ? 'pi pi-spin pi-spinner' : 'pi pi-shield'" />
            </button>
            <button v-if="canEdit" class="action-btn" title="Edit" @click="editDomain(d)">
              <i class="pi pi-pencil" />
            </button>
            <button v-if="canEdit" class="action-btn danger" title="Delete" @click="confirmDeleteDomain(d)">
              <i class="pi pi-trash" />
            </button>
          </div>
        </div>
      </div>
      <button v-if="canEdit" class="add-link" @click="showAddModal = true"><i class="pi pi-plus" /> Add domain</button>
    </template>

    <DomainFormModal
      v-if="showAddModal || showEditModal"
      :visible="showAddModal || showEditModal"
      :domain="editingDomain"
      :services="services"
      :deployment-name="deploymentName"
      :loading="saving"
      @save="handleSaveDomain"
      @cancel="closeModals"
    />

    <ConfirmModal
      :visible="showDeleteModal"
      title="Delete Domain"
      :message="`Are you sure you want to delete ${deletingDomain?.domain}${deletingDomain?.path_prefix || ''}?`"
      variant="danger"
      confirm-text="Delete"
      :loading="deleting"
      @confirm="handleDeleteDomain"
      @cancel="showDeleteModal = false"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from "vue";
import type { DomainConfig, Service, ProxyStatus, Certificate } from "@/types";
import { deploymentsApi, certificatesApi } from "@/services/api";
import { useNotificationsStore } from "@/stores/notifications";
import DomainFormModal from "./DomainFormModal.vue";
import ConfirmModal from "./ConfirmModal.vue";

const notifications = useNotificationsStore();

const props = defineProps<{
  deploymentName: string;
  services: Service[];
  proxyStatus?: ProxyStatus | null;
  canEdit?: boolean;
  settingUpProxy?: boolean;
}>();

const emit = defineEmits<{
  updated: [];
  setupProxy: [];
}>();

const loading = ref(false);
const saving = ref(false);
const deleting = ref(false);
const domains = ref<DomainConfig[]>([]);
const requestingCerts = ref<Record<string, boolean>>({});

const showAddModal = ref(false);
const showEditModal = ref(false);
const showDeleteModal = ref(false);
const editingDomain = ref<DomainConfig | null>(null);
const deletingDomain = ref<DomainConfig | null>(null);

const proxyConfigured = computed(() => props.proxyStatus?.virtual_host_exists ?? false);

const certificates = computed(() => props.proxyStatus?.certificates || []);

function hasCertificate(domain: string): boolean {
  return certificates.value.some((cert: Certificate) => cert.domain === domain);
}

onMounted(() => {
  fetchDomains();
});

watch(
  () => props.proxyStatus,
  () => {
    fetchDomains();
  },
);

async function fetchDomains() {
  loading.value = true;
  try {
    const response = await deploymentsApi.listDomains(props.deploymentName);
    domains.value = response.data.domains || [];
  } catch {
    domains.value = [];
  } finally {
    loading.value = false;
  }
}

function getDomainUrl(domain: DomainConfig): string {
  const protocol = domain.ssl?.enabled ? "https" : "http";
  return `${protocol}://${domain.domain}${domain.path_prefix || ""}`;
}

function editDomain(domain: DomainConfig) {
  editingDomain.value = { ...domain };
  showEditModal.value = true;
}

function confirmDeleteDomain(domain: DomainConfig) {
  deletingDomain.value = domain;
  showDeleteModal.value = true;
}

function closeModals() {
  showAddModal.value = false;
  showEditModal.value = false;
  editingDomain.value = null;
}

async function handleSaveDomain(domain: DomainConfig) {
  saving.value = true;
  try {
    if (editingDomain.value && editingDomain.value.id) {
      await deploymentsApi.updateDomain(props.deploymentName, editingDomain.value.id, domain);
      notifications.success("Domain Updated", `${domain.domain} has been updated`);
    } else {
      await deploymentsApi.addDomain(props.deploymentName, domain);
      notifications.success("Domain Added", `${domain.domain} has been added`);
    }
    await fetchDomains();
    closeModals();
    emit("updated");
  } catch (err: any) {
    const msg = err.response?.data?.error || err.message;
    notifications.error("Save Failed", msg);
  } finally {
    saving.value = false;
  }
}

async function handleDeleteDomain() {
  if (!deletingDomain.value) return;
  deleting.value = true;
  try {
    await deploymentsApi.deleteDomain(props.deploymentName, deletingDomain.value.id);
    notifications.success("Domain Deleted", `${deletingDomain.value.domain} has been removed`);
    await fetchDomains();
    showDeleteModal.value = false;
    deletingDomain.value = null;
    emit("updated");
  } catch (err: any) {
    const msg = err.response?.data?.error || err.message;
    notifications.error("Delete Failed", msg);
  } finally {
    deleting.value = false;
  }
}

async function requestCertificate(domain: string) {
  requestingCerts.value[domain] = true;
  try {
    await certificatesApi.request(domain);
    notifications.success("Certificate Requested", `SSL certificate for ${domain} has been requested`);
    emit("updated");
  } catch (err: any) {
    const msg = err.response?.data?.error || err.message;
    notifications.error("Certificate Request Failed", msg);
  } finally {
    requestingCerts.value[domain] = false;
  }
}

defineExpose({ fetchDomains });
</script>

<style scoped>
.domains-manager {
  font-size: var(--text-sm);
}

.loading-state {
  padding: var(--space-2);
  color: var(--color-gray-500);
  font-size: var(--text-xs);
}

.loading-state i {
  margin-right: var(--space-1);
}

.empty-state {
  padding: var(--space-2);
  color: var(--color-gray-500);
  font-size: var(--text-xs);
}

.empty-state p {
  margin: 0 0 var(--space-1);
}

.domains-table {
  display: flex;
  flex-direction: column;
  gap: 1px;
  background: var(--color-gray-200);
  border-radius: var(--radius-sm);
  overflow: hidden;
}

.domain-row {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-2);
  background: var(--color-gray-50);
}

.domain-row:hover {
  background: white;
}

.domain-info {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.domain-name {
  color: var(--color-primary-600);
  text-decoration: none;
  font-weight: var(--font-medium);
  font-size: var(--text-xs);
  white-space: nowrap;
}

.domain-name:hover {
  text-decoration: underline;
}

.domain-name i {
  font-size: 9px;
  opacity: 0.6;
  margin-left: 2px;
}

.domain-target {
  font-size: var(--text-xs);
  color: var(--color-gray-400);
  font-family: var(--font-mono);
  white-space: nowrap;
}

.domain-target i {
  font-size: 8px;
  margin-right: 2px;
}

.domain-status {
  display: flex;
  gap: 4px;
  flex-shrink: 0;
}

.status-pill {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  padding: 1px 5px;
  font-size: 9px;
  border-radius: 3px;
  white-space: nowrap;
}

.status-pill.success {
  background: var(--color-success-100);
  color: var(--color-success-700);
}

.status-pill.warning {
  background: var(--color-warning-100);
  color: var(--color-warning-700);
}

.status-pill i {
  font-size: 9px;
}

.domain-actions {
  display: flex;
  gap: 2px;
  flex-shrink: 0;
}

.action-btn {
  width: 22px;
  height: 22px;
  border: none;
  background: transparent;
  color: var(--color-gray-400);
  cursor: pointer;
  border-radius: 3px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
}

.action-btn:hover {
  background: var(--color-gray-200);
  color: var(--color-gray-600);
}

.action-btn.danger:hover {
  background: var(--color-danger-100);
  color: var(--color-danger-600);
}

.action-btn.primary {
  color: var(--color-primary-500);
}

.action-btn.primary:hover {
  background: var(--color-primary-100);
  color: var(--color-primary-600);
}

.action-btn.success {
  color: var(--color-success-500);
}

.action-btn.success:hover {
  background: var(--color-success-100);
  color: var(--color-success-600);
}

.action-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-link {
  background: none;
  border: none;
  color: var(--color-primary-500);
  cursor: pointer;
  font-size: var(--text-xs);
  display: inline-flex;
  align-items: center;
  gap: 3px;
  padding: 0;
}

.btn-link:hover {
  color: var(--color-primary-600);
  text-decoration: underline;
}

.add-link {
  background: none;
  border: none;
  color: var(--color-gray-400);
  cursor: pointer;
  font-size: var(--text-xs);
  display: inline-flex;
  align-items: center;
  gap: 3px;
  padding: var(--space-1) 0;
  margin-top: var(--space-1);
}

.add-link:hover {
  color: var(--color-primary-500);
}

.add-link i {
  font-size: 10px;
}
</style>
